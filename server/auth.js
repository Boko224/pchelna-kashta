import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { db, DATA_DIR } from './db.js';
import { createLimiter } from './utils.js';

// Use JWT_SECRET from the environment, otherwise a random secret persisted in data/.
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = path.join(DATA_DIR, 'jwt-secret');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

const SECRET = loadSecret();

export function signToken(admin) {
  return jwt.sign({ sub: String(admin.id), email: admin.email }, SECRET, { expiresIn: '12h' });
}

export function requireAdmin(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Необходим е вход в админ панела' });
  try {
    const payload = jwt.verify(token, SECRET);
    const admin = db.prepare('SELECT id, email FROM admins WHERE id = ?').get(Number(payload.sub));
    if (!admin) throw new Error('unknown admin');
    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ error: 'Сесията е изтекла. Влезте отново.' });
  }
}

// Brute-force protection for the login endpoint: 10 failed attempts per IP per 15 minutes.
const loginFailures = createLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

export function loginRateLimit(req, res, next) {
  if (loginFailures.blocked(req.ip)) {
    return res.status(429).json({ error: 'Твърде много опити. Опитайте отново след 15 минути.' });
  }
  next();
}

export const recordLoginFailure = (ip) => loginFailures.hit(ip);
export const clearLoginFailures = (ip) => loginFailures.reset(ip);
