import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { OrderSummary } from './CartPage.jsx';
import { useCart } from '../lib/cart.jsx';
import { api } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';

const EMPTY = { name: '', phone: '', email: '', city: '', address: '', note: '', payment_method: 'cod' };

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0 && !submitting) return <Navigate to="/cart" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const order = await api.post('/api/orders', {
        customer: form,
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
      });
      clear();
      navigate(`/order/${order.id}`, { replace: true, state: { order } });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="container section">
      <h1>Поръчка</h1>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="card form-card">
          <h2>Данни за доставка</h2>
          <div className="form-grid">
            <label className="field">
              <span>Име и фамилия *</span>
              <input className="input" required maxLength={100} value={form.name} onChange={set('name')} autoComplete="name" />
            </label>
            <label className="field">
              <span>Телефон *</span>
              <input className="input" required type="tel" maxLength={20} value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
            <label className="field field--full">
              <span>Имейл</span>
              <input className="input" type="email" maxLength={120} value={form.email} onChange={set('email')} autoComplete="email" />
            </label>
            <label className="field">
              <span>Град *</span>
              <input className="input" required maxLength={80} value={form.city} onChange={set('city')} autoComplete="address-level2" />
            </label>
            <label className="field">
              <span>Адрес или офис на куриер *</span>
              <input className="input" required maxLength={250} value={form.address} onChange={set('address')} autoComplete="street-address" />
            </label>
            <label className="field field--full">
              <span>Бележка към поръчката</span>
              <textarea className="input" rows={3} maxLength={500} value={form.note} onChange={set('note')} />
            </label>
          </div>

          <h2>Начин на плащане</h2>
          <div className="radio-group">
            <label className={`radio-card ${form.payment_method === 'cod' ? 'radio-card--active' : ''}`}>
              <input type="radio" name="payment" value="cod" checked={form.payment_method === 'cod'} onChange={set('payment_method')} />
              <span><strong>Наложен платеж</strong><br /><span className="muted small">Плащате на куриера при получаване</span></span>
            </label>
            <label className={`radio-card ${form.payment_method === 'bank' ? 'radio-card--active' : ''}`}>
              <input type="radio" name="payment" value="bank" checked={form.payment_method === 'bank'} onChange={set('payment_method')} />
              <span><strong>Банков превод</strong><br /><span className="muted small">Ще получите данни за превод след потвърждение</span></span>
            </label>
          </div>
        </div>

        <OrderSummary subtotal={subtotal}>
          <ul className="summary__items">
            {items.map((i) => (
              <li key={i.id}>
                <span>{i.quantity} × {i.name}</span>
                <span>{formatMoney(i.price_cents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          {error ? <p className="alert alert--error">{error}</p> : null}
          <button type="submit" className="btn btn-lg btn-block" disabled={submitting}>
            {submitting ? 'Изпращане…' : 'Потвърди поръчката'}
          </button>
          <Link to="/cart" className="btn btn-ghost btn-block">Назад към количката</Link>
        </OrderSummary>
      </form>
    </div>
  );
}
