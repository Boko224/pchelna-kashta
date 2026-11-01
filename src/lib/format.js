const money = new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR' });

export const formatMoney = (cents) => money.format((cents || 0) / 100);

// SQLite datetime('now') is UTC in "YYYY-MM-DD HH:MM:SS" form.
export function formatDate(value) {
  if (!value) return '';
  return new Date(`${value.replace(' ', 'T')}Z`).toLocaleString('bg-BG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export const centsToInput = (cents) => ((cents || 0) / 100).toFixed(2);

export function inputToCents(value) {
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function shippingFor(subtotal, settings) {
  if (subtotal <= 0) return 0;
  const freeFrom = settings.free_shipping_from_cents;
  return freeFrom > 0 && subtotal >= freeFrom ? 0 : settings.shipping_cents;
}
