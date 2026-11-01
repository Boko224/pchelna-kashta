import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api.js';
import { useSettings } from '../lib/settings.jsx';
import { centsToInput, inputToCents } from '../lib/format.js';

function ShopSettings() {
  const { setSettings } = useSettings();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    adminApi.get('/settings').then((s) =>
      setForm({
        ...s,
        shipping: centsToInput(s.shipping_cents),
        free_from: centsToInput(s.free_shipping_from_cents),
      }),
    ).catch((err) => setMessage({ type: 'error', text: err.message }));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setMessage(null);
    const shipping_cents = inputToCents(form.shipping);
    const free_shipping_from_cents = inputToCents(form.free_from || 0);
    if (![shipping_cents, free_shipping_from_cents].every((n) => Number.isFinite(n) && n >= 0)) {
      setMessage({ type: 'error', text: 'Въведете валидни суми' });
      return;
    }
    try {
      const saved = await adminApi.put('/settings', { ...form, shipping_cents, free_shipping_from_cents });
      setSettings(saved);
      setMessage({ type: 'success', text: 'Настройките са запазени' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  if (!form) return message ? <p className="alert alert--error">{message.text}</p> : <p className="muted">Зареждане…</p>;

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h2 className="field--full">Магазин</h2>
      <label className="field field--full">
        <span>Име на магазина *</span>
        <input className="input" required maxLength={80} value={form.shop_name} onChange={set('shop_name')} />
      </label>
      <label className="field">
        <span>Телефон</span>
        <input className="input" maxLength={30} value={form.phone} onChange={set('phone')} />
      </label>
      <label className="field">
        <span>Имейл</span>
        <input className="input" type="email" maxLength={120} value={form.email} onChange={set('email')} />
      </label>
      <label className="field">
        <span>Цена на доставка (€)</span>
        <input className="input" inputMode="decimal" value={form.shipping} onChange={set('shipping')} />
      </label>
      <label className="field">
        <span>Безплатна доставка над (€, 0 = изключено)</span>
        <input className="input" inputMode="decimal" value={form.free_from} onChange={set('free_from')} />
      </label>
      <label className="field field--full">
        <span>Съобщение в горната лента (празно = скрито)</span>
        <input className="input" maxLength={200} value={form.announcement} onChange={set('announcement')} />
      </label>
      <div className="field--full form-actions">
        {message ? <p className={`alert alert--${message.type}`}>{message.text}</p> : null}
        <button type="submit" className="btn">Запази</button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ current: '', password: '', confirm: '' });
  const [message, setMessage] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setMessage(null);
    if (form.password !== form.confirm) {
      setMessage({ type: 'error', text: 'Новите пароли не съвпадат' });
      return;
    }
    try {
      await adminApi.put('/password', { current: form.current, password: form.password });
      setForm({ current: '', password: '', confirm: '' });
      setMessage({ type: 'success', text: 'Паролата е сменена' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <form className="card form-grid" onSubmit={submit}>
      <h2 className="field--full">Смяна на парола</h2>
      <label className="field field--full">
        <span>Текуща парола</span>
        <input className="input" type="password" required value={form.current} onChange={set('current')} autoComplete="current-password" />
      </label>
      <label className="field">
        <span>Нова парола (мин. 8 знака)</span>
        <input className="input" type="password" required minLength={8} value={form.password} onChange={set('password')} autoComplete="new-password" />
      </label>
      <label className="field">
        <span>Повторете новата парола</span>
        <input className="input" type="password" required minLength={8} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
      </label>
      <div className="field--full form-actions">
        {message ? <p className={`alert alert--${message.type}`}>{message.text}</p> : null}
        <button type="submit" className="btn">Смени паролата</button>
      </div>
    </form>
  );
}

export default function AdminSettings() {
  return (
    <>
      <h1 className="admin-title">Настройки</h1>
      <div className="stack stack--narrow">
        <ShopSettings />
        <PasswordForm />
      </div>
    </>
  );
}
