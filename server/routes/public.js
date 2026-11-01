import { Router } from 'express';
import { db, getSettings, transaction } from '../db.js';
import { HttpError, text, int, EMAIL_RE, PHONE_RE, shippingFor, createLimiter } from '../utils.js';

const router = Router();

const PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
  FROM products p LEFT JOIN categories c ON c.id = p.category_id
`;

router.get('/settings', (req, res) => {
  res.json(getSettings());
});

router.get('/categories', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
    GROUP BY c.id ORDER BY c.sort_order, c.name
  `).all();
  res.json(rows);
});

const SORTERS = {
  price_asc: (a, b) => a.price_cents - b.price_cents,
  price_desc: (a, b) => b.price_cents - a.price_cents,
  name: (a, b) => a.name.localeCompare(b.name, 'bg'),
  new: (a, b) => b.id - a.id,
  default: (a, b) => b.is_featured - a.is_featured || a.name.localeCompare(b.name, 'bg'),
};

router.get('/products', (req, res) => {
  const { category, q, featured, sort } = req.query;
  const where = ['p.is_active = 1'];
  const params = [];
  if (category) {
    where.push('c.slug = ?');
    params.push(String(category));
  }
  if (featured === '1') where.push('p.is_featured = 1');

  let rows = db.prepare(`${PRODUCT_SELECT} WHERE ${where.join(' AND ')}`).all(...params);

  // Filter in JS: SQLite LIKE is only case-insensitive for ASCII, not Cyrillic.
  const term = String(q || '').trim().toLocaleLowerCase('bg');
  if (term) {
    rows = rows.filter((p) =>
      `${p.name} ${p.description} ${p.category_name || ''}`.toLocaleLowerCase('bg').includes(term),
    );
  }
  rows.sort(SORTERS[sort] || SORTERS.default);
  res.json(rows);
});

router.get('/products/:slug', (req, res) => {
  const product = db.prepare(`${PRODUCT_SELECT} WHERE p.slug = ? AND p.is_active = 1`).get(req.params.slug);
  if (!product) throw new HttpError(404, 'Продуктът не е намерен');
  res.json(product);
});

// Orders reserve stock immediately, so cap how many one IP can place (5 per hour).
const orderLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 5 });

router.post('/orders', (req, res) => {
  if (orderLimiter.blocked(req.ip)) {
    throw new HttpError(429, 'Твърде много поръчки от този адрес. Опитайте отново по-късно или се обадете по телефона.');
  }
  const c = req.body?.customer || {};
  const customer = {
    name: text(c.name, 'Име и фамилия', { required: true, max: 100 }),
    phone: text(c.phone, 'Телефон', { required: true, max: 20 }),
    email: text(c.email, 'Имейл', { max: 120 }),
    city: text(c.city, 'Град', { required: true, max: 80 }),
    address: text(c.address, 'Адрес', { required: true, max: 250 }),
    note: text(c.note, 'Бележка', { max: 500 }),
    payment_method: c.payment_method === 'bank' ? 'bank' : 'cod',
  };
  if (!PHONE_RE.test(customer.phone)) throw new HttpError(400, 'Невалиден телефонен номер');
  if (customer.email && !EMAIL_RE.test(customer.email)) throw new HttpError(400, 'Невалиден имейл адрес');

  const rawItems = req.body?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new HttpError(400, 'Количката е празна');
  if (rawItems.length > 50) throw new HttpError(400, 'Твърде много артикули в поръчката');

  // Merge duplicate lines for the same product.
  const quantities = new Map();
  for (const item of rawItems) {
    const id = int(item?.productId, 'продукт', { min: 1 });
    const qty = int(item?.quantity, 'количество', { min: 1, max: 99 });
    quantities.set(id, (quantities.get(id) || 0) + qty);
  }

  const order = transaction(() => {
    const getProduct = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1');
    const lines = [];
    for (const [id, quantity] of quantities) {
      const p = getProduct.get(id);
      if (!p) throw new HttpError(400, 'Някой от продуктите вече не се предлага. Обновете количката.');
      if (p.stock < quantity) {
        throw new HttpError(409, `Няма достатъчна наличност от „${p.name}“ (налични: ${p.stock} бр.)`);
      }
      lines.push({ product: p, quantity });
    }

    const subtotal = lines.reduce((sum, l) => sum + l.product.price_cents * l.quantity, 0);
    const shipping = shippingFor(subtotal, getSettings());

    const { lastInsertRowid } = db.prepare(`
      INSERT INTO orders (customer_name, phone, email, city, address, note, payment_method,
                          subtotal_cents, shipping_cents, total_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customer.name, customer.phone, customer.email, customer.city, customer.address,
      customer.note, customer.payment_method, subtotal, shipping, subtotal + shipping);
    const orderId = Number(lastInsertRowid);

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, unit, unit_price_cents, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const decrement = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    for (const { product, quantity } of lines) {
      insertItem.run(orderId, product.id, product.name, product.unit, product.price_cents, quantity);
      decrement.run(quantity, product.id);
    }

    return {
      id: orderId,
      customer_name: customer.name,
      payment_method: customer.payment_method,
      subtotal_cents: subtotal,
      shipping_cents: shipping,
      total_cents: subtotal + shipping,
      items: lines.map((l) => ({
        name: l.product.name,
        unit: l.product.unit,
        quantity: l.quantity,
        unit_price_cents: l.product.price_cents,
      })),
    };
  });

  orderLimiter.hit(req.ip);
  res.status(201).json(order);
});

export default router;
