import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { formatDate, formatMoney } from '../lib/format.js';
import { ORDER_STATUSES, PAYMENT_METHODS, StatusBadge } from './orderStatus.jsx';

export default function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const { data, error } = useFetch(() => adminApi.get(`/orders${status ? `?status=${status}` : ''}`), [status]);

  const counts = data?.counts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <h1 className="admin-title">Поръчки</h1>

      <div className="chips">
        <button type="button" className={`chip ${!status ? 'chip--active' : ''}`} onClick={() => setParams({})}>
          Всички <span className="chip__count">{total}</span>
        </button>
        {Object.entries(ORDER_STATUSES).map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={`chip ${status === key ? 'chip--active' : ''}`}
            onClick={() => setParams({ status: key })}
          >
            {label} <span className="chip__count">{counts[key] || 0}</span>
          </button>
        ))}
      </div>

      {error ? <p className="alert alert--error">{error.message}</p> : null}

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>№</th><th>Дата</th><th>Клиент</th><th>Град</th><th>Плащане</th>
              <th className="num">Арт.</th><th className="num">Сума</th><th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {(data?.orders || []).map((o) => (
              <tr key={o.id} className="row--link">
                <td><Link to={`/admin/orders/${o.id}`} className="strong">№ {o.id}</Link></td>
                <td className="small">{formatDate(o.created_at)}</td>
                <td>{o.customer_name}<div className="muted small">{o.phone}</div></td>
                <td>{o.city}</td>
                <td className="small">{PAYMENT_METHODS[o.payment_method]}</td>
                <td className="num">{o.item_count}</td>
                <td className="num strong">{formatMoney(o.total_cents)}</td>
                <td><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.orders.length === 0 ? <p className="muted">Няма поръчки.</p> : null}
      </div>
    </>
  );
}
