import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { db, getSettings, transaction, SETTING_KEYS, UPLOAD_DIR } from '../db.js';
import { requireAdmin, signToken, loginRateLimit, recordLoginFailure, clearLoginFailures } from '../auth.js';
import { HttpError, text, int, bool, uniqueSlug, EMAIL_RE } from '../utils.js';

const router = Router();

// ---------- Auth ----------

router.post('/login', loginRateLimit, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    recordLoginFailure(req.ip);
    throw new HttpError(401, 'Грешен имейл или парола');
  }
  clearLoginFailures(req.ip);
  res.json({ token: signToken(admin), admin: { id: admin.id, email: admin.email } });
});

router.use(requireAdmin);

router.get('/me', (req, res) => res.json(req.admin));

router.put('/password', (req, res) => {
  const current = String(req.body?.current || '');
  const next = String(req.body?.password || '');
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!bcrypt.compareSync(current, admin.password_hash)) throw new HttpError(400, 'Текущата парола е грешна');
  if (next.length < 8) throw new HttpError(400, 'Новата парола трябва да е поне 8 знака');
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 10), admin.id);
  res.json({ ok: true });
});

// ---------- Dashboard ----------

router.get('/stats', (req, res) => {
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  res.json({
    orders_total: one('SELECT COUNT(*) AS n FROM orders').n,
    orders_new: one("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'").n,
    revenue_cents: one("SELECT COALESCE(SUM(total_cents), 0) AS s FROM orders WHERE status != 'cancelled'").s,
    revenue_30d_cents: one(`
      SELECT COALESCE(SUM(total_cents), 0) AS s FROM orders
      WHERE status != 'cancelled' AND created_at >= datetime('now', '-30 days')
    `).s,
    products_active: one('SELECT COUNT(*) AS n FROM products WHERE is_active = 1').n,
    low_stock: db.prepare(
      'SELECT id, name, stock FROM products WHERE is_active = 1 AND stock <= 5 ORDER BY stock, name',
    ).all(),
    recent_orders: db.prepare(
      'SELECT id, customer_name, total_cents, status, created_at FROM orders ORDER BY id DESC LIMIT 6',
    ).all(),
  });
});

// ---------- Categories ----------

router.get('/categories', (req, res) => {
  res.json(db.prepare(`
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id ORDER BY c.sort_order, c.name
  `).all());
});

function readCategory(body) {
  return {
    name: text(body?.name, 'Име', { required: true, max: 80 }),
    description: text(body?.description, 'Описание', { max: 500 }),
    sort_order: int(body?.sort_order ?? 0, 'Подредба', { min: 0, max: 9999 }),
  };
}

router.post('/categories', (req, res) => {
  const c = readCategory(req.body);
  const slug = uniqueSlug(db, 'categories', c.name);
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)',
  ).run(c.name, slug, c.description, c.sort_order);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(lastInsertRowid));
});

router.put('/categories/:id', (req, res) => {
  const id = int(req.params.id, 'id', { min: 1 });
  const c = readCategory(req.body);
  const { changes } = db.prepare(
    'UPDATE categories SET name = ?, description = ?, sort_order = ? WHERE id = ?',
  ).run(c.name, c.description, c.sort_order, id);
  if (!changes) throw new HttpError(404, 'Категорията не е намерена');
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

router.delete('/categories/:id', (req, res) => {
  const id = int(req.params.id, 'id', { min: 1 });
  const { changes } = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (!changes) throw new HttpError(404, 'Категорията не е намерена');
  res.status(204).end();
});

// ---------- Products ----------

const ADMIN_PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
  FROM products p LEFT JOIN categories c ON c.id = p.category_id
`;

router.get('/products', (req, res) => {
  res.json(db.prepare(`${ADMIN_PRODUCT_SELECT} ORDER BY p.id DESC`).all());
});

router.get('/products/:id', (req, res) => {
  const product = db.prepare(`${ADMIN_PRODUCT_SELECT} WHERE p.id = ?`).get(int(req.params.id, 'id', { min: 1 }));
  if (!product) throw new HttpError(404, 'Продуктът не е намерен');
  res.json(product);
});

function readProduct(body) {
  const categoryId = body?.category_id ? int(body.category_id, 'Категория', { min: 1 }) : null;
  if (categoryId && !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(categoryId)) {
    throw new HttpError(400, 'Избраната категория не съществува');
  }
  const imageUrl = text(body?.image_url, 'Снимка', { max: 500 });
  if (imageUrl && !/^(\/uploads\/|https?:\/\/)/.test(imageUrl)) {
    throw new HttpError(400, 'Снимката трябва да е качен файл или http(s) адрес');
  }
  return {
    category_id: categoryId,
    name: text(body?.name, 'Име', { required: true, max: 150 }),
    description: text(body?.description, 'Описание', { max: 5000 }),
    unit: text(body?.unit, 'Разфасовка', { max: 60 }),
    price_cents: int(body?.price_cents, 'Цена', { min: 0, max: 10_000_000 }),
    stock: int(body?.stock, 'Наличност', { min: 0, max: 1_000_000 }),
    image_url: imageUrl,
    is_active: bool(body?.is_active),
    is_featured: bool(body?.is_featured),
  };
}

router.post('/products', (req, res) => {
  const p = readProduct(req.body);
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO products (category_id, name, slug, description, unit, price_cents, stock,
                          image_url, is_active, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(p.category_id, p.name, uniqueSlug(db, 'products', p.name), p.description, p.unit,
    p.price_cents, p.stock, p.image_url, p.is_active, p.is_featured);
  res.status(201).json(db.prepare(`${ADMIN_PRODUCT_SELECT} WHERE p.id = ?`).get(lastInsertRowid));
});

router.put('/products/:id', (req, res) => {
  const id = int(req.params.id, 'id', { min: 1 });
  const p = readProduct(req.body);
  const { changes } = db.prepare(`
    UPDATE products SET category_id = ?, name = ?, slug = ?, description = ?, unit = ?, price_cents = ?,
      stock = ?, image_url = ?, is_active = ?, is_featured = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(p.category_id, p.name, uniqueSlug(db, 'products', p.name, id), p.description, p.unit,
    p.price_cents, p.stock, p.image_url, p.is_active, p.is_featured, id);
  if (!changes) throw new HttpError(404, 'Продуктът не е намерен');
  res.json(db.prepare(`${ADMIN_PRODUCT_SELECT} WHERE p.id = ?`).get(id));
});

router.delete('/products/:id', (req, res) => {
  const id = int(req.params.id, 'id', { min: 1 });
  const { changes } = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  if (!changes) throw new HttpError(404, 'Продуктът не е намерен');
  res.status(204).end();
});

// ---------- Image upload ----------

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${IMAGE_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    IMAGE_TYPES[file.mimetype]
      ? cb(null, true)
      : cb(new HttpError(400, 'Позволени са само JPG, PNG, WEBP и GIF изображения')),
});

router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) throw new HttpError(400, 'Не е избран файл');
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

// ---------- Orders ----------

export const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'completed', 'cancelled'];

router.get('/orders', (req, res) => {
  const status = ORDER_STATUSES.includes(req.query.status) ? req.query.status : null;
  const orders = db.prepare(`
    SELECT o.*, (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id) AS item_count
    FROM orders o ${status ? 'WHERE o.status = ?' : ''} ORDER BY o.id DESC
  `).all(...(status ? [status] : []));
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all()) counts[r.status] = r.n;
  res.json({ orders, counts });
});

function loadOrder(id) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) throw new HttpError(404, 'Поръчката не е намерена');
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(id);
  return order;
}

router.get('/orders/:id', (req, res) => {
  res.json(loadOrder(int(req.params.id, 'id', { min: 1 })));
});

router.patch('/orders/:id', (req, res) => {
  const id = int(req.params.id, 'id', { min: 1 });
  const status = req.body?.status;
  if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'Невалиден статус');

  const order = transaction(() => {
    const current = loadOrder(id);
    const restock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    const take = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');

    // Cancelling returns items to stock; re-opening a cancelled order takes them again.
    if (current.status !== 'cancelled' && status === 'cancelled') {
      for (const item of current.items) if (item.product_id) restock.run(item.quantity, item.product_id);
    } else if (current.status === 'cancelled' && status !== 'cancelled') {
      for (const item of current.items) {
        if (item.product_id && !take.run(item.quantity, item.product_id, item.quantity).changes) {
          throw new HttpError(409, `Няма достатъчна наличност от „${item.product_name}“ за възстановяване на поръчката`);
        }
      }
    }
    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    return loadOrder(id);
  });
  res.json(order);
});

router.delete('/orders/:id', (req, res) => {
  const id = int(req.params.id, 'id', { min: 1 });
  transaction(() => {
    const order = loadOrder(id);
    if (order.status !== 'cancelled') throw new HttpError(400, 'Може да се изтриват само отказани поръчки');
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  });
  res.status(204).end();
});

// ---------- Settings ----------

router.get('/settings', (req, res) => res.json(getSettings()));

router.put('/settings', (req, res) => {
  const body = req.body || {};
  const values = {
    shop_name: text(body.shop_name, 'Име на магазина', { required: true, max: 80 }),
    phone: text(body.phone, 'Телефон', { max: 30 }),
    email: text(body.email, 'Имейл', { max: 120 }),
    shipping_cents: int(body.shipping_cents, 'Цена на доставка', { min: 0, max: 100_000 }),
    free_shipping_from_cents: int(body.free_shipping_from_cents, 'Безплатна доставка над', { min: 0, max: 10_000_000 }),
    announcement: text(body.announcement, 'Съобщение', { max: 200 }),
  };
  if (values.email && !EMAIL_RE.test(values.email)) throw new HttpError(400, 'Невалиден имейл адрес');
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  transaction(() => {
    for (const key of SETTING_KEYS) upsert.run(key, String(values[key]));
  });
  res.json(getSettings());
});

export default router;
