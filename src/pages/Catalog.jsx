import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const sort = params.get('sort') || '';
  const q = params.get('q') || '';
  const [search, setSearch] = useState(q);

  const categories = useFetch(() => api.get('/api/categories'), []);
  const products = useFetch(() => {
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (sort) qs.set('sort', sort);
    if (q) qs.set('q', q);
    return api.get(`/api/products?${qs}`);
  }, [category, sort, q]);

  // Debounce the search box into the URL.
  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim() === q) return;
      setParam('q', search.trim());
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const current = (categories.data || []).find((c) => c.slug === category);

  return (
    <div className="container section">
      <div className="catalog-head">
        <div>
          <h1>{current ? current.name : 'Всички продукти'}</h1>
          {current?.description ? <p className="muted">{current.description}</p> : null}
        </div>
        <div className="catalog-tools">
          <input
            type="search"
            className="input"
            placeholder="Търсене…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Търсене на продукти"
          />
          <select className="input" value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Подредба">
            <option value="">Препоръчани</option>
            <option value="price_asc">Цена: възходящо</option>
            <option value="price_desc">Цена: низходящо</option>
            <option value="name">Име</option>
            <option value="new">Най-нови</option>
          </select>
        </div>
      </div>

      <div className="chips" role="tablist" aria-label="Категории">
        <button type="button" className={`chip ${!category ? 'chip--active' : ''}`} onClick={() => setParam('category', '')}>
          Всички
        </button>
        {(categories.data || []).map((c) => (
          <button
            type="button"
            key={c.id}
            className={`chip ${category === c.slug ? 'chip--active' : ''}`}
            onClick={() => setParam('category', c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {products.error ? <p className="alert alert--error">{products.error.message}</p> : null}
      {products.loading && !products.data ? <p className="muted">Зареждане…</p> : null}
      {products.data && products.data.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <p>Няма намерени продукти.</p>
        </div>
      ) : null}
      <div className="product-grid">
        {(products.data || []).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
