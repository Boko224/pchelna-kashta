import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { formatDate, formatMoney } from '../lib/format.js';
import { ORDER_STATUSES, PAYMENT_METHODS, StatusBadge } from './orderStatus.jsx';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: order, error, setData } = useFetch(() => adminApi.get(`/orders/${id}`), [id]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  async function changeStatus(status) {
    if (status === order.status) return;
    if (status === 'cancelled' && !window.confirm('Да откажа ли поръчката? Продуктите ще бъдат върнати в наличност.')) return;
    setSaving(true);
    setActionError('');
    try {
      setData(await adminApi.patch(`/orders/${id}`, { status }));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Окончателно изтриване на поръчка № ${id}?`)) return;
    try {
      await adminApi.delete(`/orders/${id}`);
      navigate('/admin/orders');
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (error) return <p className="alert alert--error">{error.message}</p>;
  if (!order) return <p className="muted">Зареждане…</p>;

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">Поръчка № {order.id} <StatusBadge status={order.status} /></h1>
        <Link to="/admin/orders" className="btn btn-ghost">← Всички поръчки</Link>
      </div>

      <div className="admin-columns">
        <section className="card">
          <h2>Артикули</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Продукт</th><th className="num">Ед. цена</th><th className="num">Бр.</th><th className="num">Сума</th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.product_id ? <Link to={`/admin/products/${i.product_id}`}>{i.product_name}</Link> : i.product_name}
                      <div className="muted small">{i.unit}</div>
                    </td>
                    <td className="num">{formatMoney(i.unit_price_cents)}</td>
                    <td className="num">{i.quantity}</td>
                    <td className="num">{formatMoney(i.unit_price_cents * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3}>Продукти</td><td className="num">{formatMoney(order.subtotal_cents)}</td></tr>
                <tr><td colSpan={3}>Доставка</td><td className="num">{order.shipping_cents ? formatMoney(order.shipping_cents) : 'Безплатна'}</td></tr>
                <tr className="strong"><td colSpan={3}>Общо</td><td className="num">{formatMoney(order.total_cents)}</td></tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <h2>Статус</h2>
            <div className="status-buttons">
              {Object.entries(ORDER_STATUSES).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  disabled={saving}
                  className={`btn btn-sm ${order.status === key ? '' : 'btn-ghost'}`}
                  onClick={() => changeStatus(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {actionError ? <p className="alert alert--error">{actionError}</p> : null}
            <p className="muted small">Създадена: {formatDate(order.created_at)}<br />Обновена: {formatDate(order.updated_at)}</p>
            {order.status === 'cancelled' ? (
              <button type="button" className="btn btn-danger btn-sm" onClick={remove}>Изтрий поръчката</button>
            ) : null}
          </section>

          <section className="card">
            <h2>Клиент</h2>
            <dl className="details">
              <dt>Име</dt><dd>{order.customer_name}</dd>
              <dt>Телефон</dt><dd><a href={`tel:${order.phone.replace(/\s/g, '')}`}>{order.phone}</a></dd>
              {order.email ? <><dt>Имейл</dt><dd><a href={`mailto:${order.email}`}>{order.email}</a></dd></> : null}
              <dt>Град</dt><dd>{order.city}</dd>
              <dt>Адрес</dt><dd>{order.address}</dd>
              <dt>Плащане</dt><dd>{PAYMENT_METHODS[order.payment_method]}</dd>
              {order.note ? <><dt>Бележка</dt><dd className="note">{order.note}</dd></> : null}
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
