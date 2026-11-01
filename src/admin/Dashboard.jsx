import { Link } from 'react-router-dom';
import { adminApi } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { formatDate, formatMoney } from '../lib/format.js';
import { StatusBadge } from './orderStatus.jsx';

export default function Dashboard() {
  const { data, error } = useFetch(() => adminApi.get('/stats'), []);

  if (error) return <p className="alert alert--error">{error.message}</p>;
  if (!data) return <p className="muted">Зареждане…</p>;

  const stats = [
    { label: 'Нови поръчки', value: data.orders_new, to: '/admin/orders?status=new', accent: data.orders_new > 0 },
    { label: 'Всички поръчки', value: data.orders_total, to: '/admin/orders' },
    { label: 'Оборот (30 дни)', value: formatMoney(data.revenue_30d_cents) },
    { label: 'Общ оборот', value: formatMoney(data.revenue_cents) },
    { label: 'Активни продукти', value: data.products_active, to: '/admin/products' },
  ];

  return (
    <>
      <h1 className="admin-title">Табло</h1>
      <div className="stat-grid">
        {stats.map((s) => {
          const body = (
            <>
              <span className="stat__label">{s.label}</span>
              <span className="stat__value">{s.value}</span>
            </>
          );
          return s.to ? (
            <Link key={s.label} to={s.to} className={`stat ${s.accent ? 'stat--accent' : ''}`}>{body}</Link>
          ) : (
            <div key={s.label} className="stat">{body}</div>
          );
        })}
      </div>

      <div className="admin-columns">
        <section className="card">
          <div className="card__head">
            <h2>Последни поръчки</h2>
            <Link to="/admin/orders" className="small">Всички →</Link>
          </div>
          {data.recent_orders.length === 0 ? <p className="muted">Все още няма поръчки.</p> : (
            <table className="table">
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={`/admin/orders/${o.id}`}>№ {o.id}</Link></td>
                    <td>{o.customer_name}<div className="muted small">{formatDate(o.created_at)}</div></td>
                    <td className="num">{formatMoney(o.total_cents)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <div className="card__head"><h2>Ниска наличност</h2></div>
          {data.low_stock.length === 0 ? <p className="muted">Всички продукти са с достатъчна наличност.</p> : (
            <ul className="plain-list">
              {data.low_stock.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                  <span className={p.stock === 0 ? 'text-danger' : 'text-warn'}>{p.stock} бр.</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
