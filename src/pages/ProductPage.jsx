import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage.jsx';
import ProductCard from '../components/ProductCard.jsx';
import QuantityInput from '../components/QuantityInput.jsx';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { useCart } from '../lib/cart.jsx';
import { formatMoney } from '../lib/format.js';

export default function ProductPage() {
  const { slug } = useParams();
  const { add, items } = useCart();
  const [quantity, setQuantity] = useState(1);
  const { data: product, error, loading } = useFetch(() => api.get(`/api/products/${slug}`), [slug]);
  const related = useFetch(
    () => (product?.category_slug ? api.get(`/api/products?category=${product.category_slug}`) : Promise.resolve([])),
    [product?.category_slug],
  );

  if (loading && !product) return <div className="container section muted">Зареждане…</div>;
  if (error) {
    return (
      <div className="container empty-state">
        <div className="empty-state__icon">🍯</div>
        <h1>{error.message}</h1>
        <Link to="/products" className="btn">Към продуктите</Link>
      </div>
    );
  }

  const inCart = items.find((i) => i.id === product.id)?.quantity || 0;
  const available = Math.max(product.stock - inCart, 0);
  const others = (related.data || []).filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="container section">
      <nav className="breadcrumbs small">
        <Link to="/products">Продукти</Link>
        {product.category_name ? (
          <>
            {' / '}
            <Link to={`/products?category=${product.category_slug}`}>{product.category_name}</Link>
          </>
        ) : null}
      </nav>

      <div className="product-detail">
        <ProductImage product={product} className="product-detail__img" />
        <div className="product-detail__info">
          <h1>{product.name}</h1>
          <p className="muted">{product.unit}</p>
          <p className="price price--lg">{formatMoney(product.price_cents)}</p>
          <p className={product.stock > 0 ? 'stock stock--in' : 'stock stock--out'}>
            {product.stock > 5 ? '✓ В наличност' : product.stock > 0 ? `Последни ${product.stock} бр.` : 'Изчерпан'}
          </p>

          {product.stock > 0 ? (
            <div className="buy-row">
              <QuantityInput value={quantity} max={Math.max(available, 1)} onChange={setQuantity} />
              <button
                type="button"
                className="btn btn-lg"
                disabled={available === 0}
                onClick={() => {
                  add(product, Math.min(quantity, available));
                  setQuantity(1);
                }}
              >
                {available === 0 ? 'Цялата наличност е в количката' : 'Добави в количката'}
              </button>
            </div>
          ) : null}

          {product.description ? (
            <div className="product-detail__desc">
              <h2>Описание</h2>
              {product.description.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          ) : null}
        </div>
      </div>

      {others.length > 0 ? (
        <section className="section">
          <h2 className="section__title">Още от „{product.category_name}“</h2>
          <div className="product-grid">
            {others.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
