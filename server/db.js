import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { slugify } from './utils.js';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'shop.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    unit        TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url   TEXT NOT NULL DEFAULT '',
    is_active   INTEGER NOT NULL DEFAULT 1,
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name  TEXT NOT NULL,
    phone          TEXT NOT NULL,
    email          TEXT NOT NULL DEFAULT '',
    city           TEXT NOT NULL,
    address        TEXT NOT NULL,
    note           TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod', 'bank')),
    status         TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new', 'confirmed', 'shipped', 'completed', 'cancelled')),
    subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL,
    total_cents    INTEGER NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

  CREATE TABLE IF NOT EXISTS order_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id       INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name     TEXT NOT NULL,
    unit             TEXT NOT NULL DEFAULT '',
    unit_price_cents INTEGER NOT NULL,
    quantity         INTEGER NOT NULL CHECK (quantity > 0)
  );
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ---------- Settings ----------

const DEFAULT_SETTINGS = {
  shop_name: 'Пчелна къща',
  phone: '+359 888 123 456',
  email: 'info@pchelnakashta.bg',
  shipping_cents: '590',
  free_shipping_from_cents: '5000',
  announcement: 'Безплатна доставка за поръчки над 50 €',
};
export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(key, value);

export function getSettings() {
  const out = {};
  for (const { key, value } of db.prepare('SELECT key, value FROM settings').all()) {
    if (SETTING_KEYS.includes(key)) out[key] = key.endsWith('_cents') ? Number(value) : value;
  }
  return out;
}

// ---------- Seed data ----------

function seedCatalog() {
  if (db.prepare('SELECT COUNT(*) AS n FROM categories').get().n > 0) return;

  const categories = [
    ['Мед', 'med', 'Натурален пчелен мед от нашите кошери', 1],
    ['Пчелни продукти', 'pchelni-produkti', 'Прашец, прополис, пчелно млечице и перга', 2],
    ['Козметика и свещи', 'kozmetika-i-sveshti', 'Натурална козметика и свещи от пчелен восък', 3],
    ['Подаръци', 'podaratsi', 'Подаръчни комплекти за любимите хора', 4],
  ];
  const insertCat = db.prepare(
    'INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)',
  );
  const catIds = {};
  for (const c of categories) catIds[c[1]] = Number(insertCat.run(...c).lastInsertRowid);

  // [category, name, unit, price_cents, stock, featured, description]
  const products = [
    ['med', 'Акациев мед', 'буркан 450 г', 950, 40, 1,
      'Светъл, нежен и бавно кристализиращ мед от цвета на бялата акация. Идеален за чай и за деца.'],
    ['med', 'Липов мед', 'буркан 450 г', 990, 25, 1,
      'Ароматен мед с характерен липов вкус. Традиционно се използва при настинка.'],
    ['med', 'Билков мед', 'буркан 900 г', 1500, 30, 0,
      'Полифлорен мед от планински билки и ливадни цветя. Богат и пълен вкус.'],
    ['med', 'Манов мед', 'буркан 450 г', 1250, 12, 0,
      'Тъмен мед с високо съдържание на минерали и леко горчив, малцов вкус.'],
    ['med', 'Мед с пита', 'кутия 400 г', 1400, 8, 1,
      'Цяла восъчна пита, запълнена с мед – директно от кошера, без никаква обработка.'],
    ['pchelni-produkti', 'Пчелен прашец', 'буркан 200 г', 850, 20, 0,
      'Изсушен цветен прашец – естествен източник на протеини, витамини и аминокиселини.'],
    ['pchelni-produkti', 'Прополисова тинктура', 'шишенце 30 мл', 690, 35, 1,
      'Спиртна тинктура от прополис 20%. За укрепване на имунитета и при възпалено гърло.'],
    ['pchelni-produkti', 'Пчелно млечице', 'бурканче 10 г', 1800, 6, 0,
      'Свежо пчелно млечице, съхранявано замразено. Мощен натурален тонизиращ продукт.'],
    ['pchelni-produkti', 'Перга', 'буркан 100 г', 1200, 10, 0,
      'Ферментирал прашец („пчелен хляб“) – по-лесно усвоим и с по-висока хранителна стойност.'],
    ['kozmetika-i-sveshti', 'Свещ от пчелен восък', 'свещ 12 см', 750, 18, 0,
      'Ръчно изработена свещ от 100% пчелен восък. Гори чисто и ухае леко на мед.'],
    ['kozmetika-i-sveshti', 'Балсам за устни', 'стик 5 г', 450, 50, 0,
      'Подхранващ балсам с пчелен восък, мед и масло от шеа.'],
    ['kozmetika-i-sveshti', 'Крем с прополис', 'бурканче 50 мл', 1100, 15, 0,
      'Успокояващ крем за суха и раздразнена кожа с прополис и пчелен восък.'],
    ['podaratsi', 'Комплект „Три вкуса“', 'кутия 3 × 250 г', 2700, 10, 1,
      'Акациев, липов и билков мед в елегантна подаръчна кутия.'],
    ['podaratsi', 'Комплект „Здраве“', 'кутия', 3200, 4, 0,
      'Билков мед, пчелен прашец и прополисова тинктура – всичко за силен имунитет.'],
  ];
  const insertProduct = db.prepare(`
    INSERT INTO products (category_id, name, slug, unit, price_cents, stock, is_featured, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const [cat, name, unit, price, stock, featured, description] of products) {
    insertProduct.run(catIds[cat], name, slugify(name), unit, price, stock, featured, description);
  }
}

function seedAdmin() {
  if (db.prepare('SELECT COUNT(*) AS n FROM admins').get().n > 0) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@pchelnakashta.bg').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn('⚠  ADMIN_PASSWORD не е зададена в .env – админ акаунт не е създаден.');
    return;
  }
  db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)').run(
    email,
    bcrypt.hashSync(password, 10),
  );
  console.log(`✔  Създаден админ акаунт: ${email}`);
}

transaction(seedCatalog);
seedAdmin();
