import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../lib/cart.jsx';
import { useSettings } from '../lib/settings.jsx';

export default function ShopLayout() {
  const { count, notice } = useCart();
  const settings = useSettings();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shop">
      {settings.announcement ? <div className="announcement">{settings.announcement}</div> : null}

      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="logo">
            <span className="logo__mark" aria-hidden="true">🐝</span>
            <span>{settings.shop_name}</span>
          </Link>
          <nav className="site-nav" aria-label="Основна навигация">
            <NavLink to="/" end>Начало</NavLink>
            <NavLink to="/products">Продукти</NavLink>
            <NavLink to="/cart" className="cart-link">
              Количка
              {count > 0 ? <span className="cart-link__count">{count}</span> : null}
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div>
            <div className="logo logo--footer">
              <span aria-hidden="true">🐝</span> {settings.shop_name}
            </div>
            <p className="muted small">Натурален пчелен мед и пчелни продукти директно от пчелина.</p>
          </div>
          <div className="small">
            <strong>Контакти</strong>
            {settings.phone ? <div>Тел.: <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>{settings.phone}</a></div> : null}
            {settings.email ? <div>Имейл: <a href={`mailto:${settings.email}`}>{settings.email}</a></div> : null}
          </div>
          <div className="small">
            <strong>Магазин</strong>
            <div><Link to="/products">Всички продукти</Link></div>
            <div><Link to="/admin">Админ панел</Link></div>
          </div>
        </div>
        <div className="container site-footer__copy muted small">
          © {new Date().getFullYear()} {settings.shop_name}
        </div>
      </footer>

      <div className={`toast ${notice ? 'toast--visible' : ''}`} role="status" aria-live="polite">
        {notice}
        {notice ? <Link to="/cart">Виж количката →</Link> : null}
      </div>
    </div>
  );
}
