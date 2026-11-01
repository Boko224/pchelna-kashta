import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from '../components/ProductImage.jsx';
import { adminApi } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { formatMoney } from '../lib/format.js';

export default function AdminProducts() {
  const { data, error, reload } = useFetch(() => adminApi.get('/products'), []);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');

  const products = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('bg');
    return (data || []).filter((p) => !term || `${p.name} ${p.category_name || ''}`.toLocaleLowerCase('bg').includes(term));
  }, [data, search]);

  async function run(action) {
    setActionError('');
    try {
      await action();
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  const toggleActive = (p) => run(() => adminApi.put(`/products/${p.id}`, { ...p, is_active: !p.is_active }));
  const remove = (p) => {
    if (window.confirm(`Изтриване на „${p.name}“? Това действие е необратимо.`)) {
      run(() => adminApi.delete(`/products/${p.id}`));
    }
  };

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">Продукти</h1>
        <Link to="/admin/products/new" className="btn">+ Нов продукт</Link>
      </div>

      <div className="card">
        <input className="input" type="search" placeholder="Търсене по име или категория…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {error ? <p className="alert alert--error">{error.message}</p> : null}
        {actionError ? <p className="alert alert--error">{actionError}</p> : null}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>Продукт</th>
                <th>Категория</th>
                <th className="num">Цена</th>
                <th className="num">Наличност</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.is_active ? '' : 'row--muted'}>
                  <td className="thumb-cell"><ProductImage product={p} className="thumb" /></td>
                  <td>
                    <Link to={`/admin/products/${p.id}`} className="strong">{p.name}</Link>
                    <div className="muted small">{p.unit}{p.is_featured ? ' · ⭐ препоръчан' : ''}</div>
                  </td>
                  <td>{p.category_name || <span className="muted">—</span>}</td>
                  <td className="num">{formatMoney(p.price_cents)}</td>
                  <td className={`num ${p.stock === 0 ? 'text-danger' : p.stock <= 5 ? 'text-warn' : ''}`}>{p.stock}</td>
                  <td>
                    <button type="button" className={`toggle ${p.is_active ? 'toggle--on' : ''}`} onClick={() => toggleActive(p)}>
                      {p.is_active ? 'Активен' : 'Скрит'}
                    </button>
                  </td>
                  <td className="actions">
                    <Link to={`/admin/products/${p.id}`} className="btn btn-ghost btn-sm">Редактирай</Link>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(p)}>Изтрий</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && products.length === 0 ? <p className="muted">Няма продукти.</p> : null}
      </div>
    </>
  );
}
