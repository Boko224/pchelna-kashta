import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { useCart } from '../lib/cart.jsx';
import { formatMoney } from '../lib/format.js';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const soldOut = product.stock <= 0;
  const url = `/products/${product.slug}`;

  return (
    <article className="product-card">
      <Link to={url} className="product-card__media" tabIndex={-1}>
        <ProductImage product={product} />
        {product.is_featured ? <span className="badge">Препоръчан</span> : null}
      </Link>
      <div className="product-card__body">
        <span className="eyebrow">{product.category_name}</span>
        <h3 className="product-card__title">
          <Link to={url}>{product.name}</Link>
        </h3>
        <span className="muted small">{product.unit}</span>
        <div className="product-card__footer">
          <strong className="price">{formatMoney(product.price_cents)}</strong>
          <button type="button" className="btn btn-sm" disabled={soldOut} onClick={() => add(product)}>
            {soldOut ? 'Изчерпан' : 'Купи'}
          </button>
        </div>
      </div>
    </article>
  );
}
