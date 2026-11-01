import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { adminApi, adminLogout, getToken } from '../lib/api.js';

const NAV = [
  { to: '/admin', label: 'Табло', icon: '📊', end: true },
  { to: '/admin/orders', label: 'Поръчки', icon: '📦' },
  { to: '/admin/products', label: 'Продукти', icon: '🍯' },
  { to: '/admin/categories', label: 'Категории', icon: '🗂️' },
  { to: '/admin/settings', label: 'Настройки', icon: '⚙️' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const toLogin = () => navigate('/admin/login', { replace: true });
    if (!getToken()) {
      toLogin();
      return undefined;
    }
    adminApi.get('/me').then(setAdmin).catch(toLogin);
    window.addEventListener('admin-logout', toLogin);
    return () => window.removeEventListener('admin-logout', toLogin);
  }, [navigate]);

  if (!admin) return <div className="admin-loading muted">Зареждане…</div>;

  function logout() {
    adminLogout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <Link to="/admin" className="admin-sidebar__brand">🐝 Админ</Link>
        <nav className="admin-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <span aria-hidden="true">{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__foot">
          <a href="/" target="_blank" rel="noreferrer" className="small">Виж магазина ↗</a>
          <span className="small muted admin-sidebar__email">{admin.email}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Изход</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet context={{ admin }} />
      </main>
    </div>
  );
}
