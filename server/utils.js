export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

export function slugify(value) {
  const latin = [...String(value).toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join('');
  return latin.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';
}

// Returns a slug that is unique in `table`, ignoring the row with `excludeId`.
export function uniqueSlug(db, table, base, excludeId = 0) {
  const stmt = db.prepare(`SELECT 1 FROM ${table} WHERE slug = ? AND id != ?`);
  let slug = slugify(base);
  for (let i = 2; stmt.get(slug, excludeId); i++) slug = `${slugify(base)}-${i}`;
  return slug;
}

export function text(value, label, { required = false, max = 255 } = {}) {
  const v = value == null ? '' : String(value).trim();
  if (required && !v) throw new HttpError(400, `Полето „${label}“ е задължително`);
  if (v.length > max) throw new HttpError(400, `Полето „${label}“ е твърде дълго (макс. ${max} знака)`);
  return v;
}

export function int(value, label, { min = 0, max = 1_000_000_000 } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `Невалидна стойност за „${label}“`);
  }
  return n;
}

export const bool = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^\+?[\d\s\-()]{6,20}$/;

export function shippingFor(subtotalCents, settings) {
  if (subtotalCents <= 0) return 0;
  const freeFrom = settings.free_shipping_from_cents;
  return freeFrom > 0 && subtotalCents >= freeFrom ? 0 : settings.shipping_cents;
}
