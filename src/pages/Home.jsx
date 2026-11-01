import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { useSettings } from '../lib/settings.jsx';
import { formatMoney } from '../lib/format.js';

const CATEGORY_ICONS = {
  med: '🍯',
  'pchelni-produkti': '🐝',
  'kozmetika-i-sveshti': '🕯️',
  podaratsi: '🎁',
};

export default function Home() {
  const settings = useSettings();
  const categories = useFetch(() => api.get('/api/categories'), []);
  const featured = useFetch(() => api.get('/api/products?featured=1'), []);

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__text">
            <span className="eyebrow">Директно от пчелина</span>
            <h1>Истински мед, събран с грижа</h1>
            <p>
              Акациев, липов, билков и манов мед, пчелен прашец, прополис и натурална козметика от собствените
              ни кошери в Стара планина.
            </p>
            <div className="hero__actions">
              <Link to="/products" className="btn btn-lg">Разгледай продуктите</Link>
              <Link to="/products?category=podaratsi" className="btn btn-lg btn-ghost">Подаръчни комплекти</Link>
            </div>
          </div>
          <div className="hero__art" aria-hidden="true">
            <div className="hero__jar">🍯</div>
            <span className="hero__bee hero__bee--1">🐝</span>
            <span className="hero__bee hero__bee--2">🐝</span>
          </div>
        </div>
      </section>

      <section className="container section">
        <h2 className="section__title">Категории</h2>
        <div className="category-grid">
          {(categories.data || []).map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`} className="category-tile">
              <span className="category-tile__icon">{CATEGORY_ICONS[c.slug] || '🍯'}</span>
              <span className="category-tile__name">{c.name}</span>
              <span className="muted small">{c.product_count} продукта</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="section__head">
          <h2 className="section__title">Препоръчани продукти</h2>
          <Link to="/products">Виж всички →</Link>
        </div>
        {featured.error ? <p className="alert alert--error">{featured.error.message}</p> : null}
        <div className="product-grid">
          {(featured.data || []).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className="container section">
        <div className="features">
          <div className="feature">
            <span className="feature__icon">🌼</span>
            <h3>100% натурално</h3>
            <p className="muted">Без добавки, без нагряване и без смесване. Само това, което пчелите са направили.</p>
          </div>
          <div className="feature">
            <span className="feature__icon">🔬</span>
            <h3>Лабораторно изследван</h3>
            <p className="muted">Всяка партида мед е с протокол от акредитирана лаборатория.</p>
          </div>
          <div className="feature">
            <span className="feature__icon">🚚</span>
            <h3>Бърза доставка</h3>
            <p className="muted">
              Доставка до 2 работни дни.
              {settings.free_shipping_from_cents > 0
                ? ` Безплатна над ${formatMoney(settings.free_shipping_from_cents)}.`
                : ''}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
