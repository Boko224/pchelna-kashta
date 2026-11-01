import { Link } from 'react-router-dom';
import ProductImage from '../components/ProductImage.jsx';
import QuantityInput from '../components/QuantityInput.jsx';
import { useCart } from '../lib/cart.jsx';
import { useSettings } from '../lib/settings.jsx';
import { formatMoney, shippingFor } from '../lib/format.js';

export function OrderSummary({ subtotal, children }) {
  const settings = useSettings();
  const shipping = shippingFor(subtotal, settings);
  const freeFrom = settings.free_shipping_from_cents;
  const missing = freeFrom > 0 ? freeFrom - subtotal : 0;

  return (
    <aside className="summary">
      <h2>Обобщение</h2>
      <div className="summary__row"><span>Продукти</span><span>{formatMoney(subtotal)}</span></div>
      <div className="summary__row">
        <span>Доставка</span>
        <span>{shipping === 0 ? 'Безплатна' : formatMoney(shipping)}</span>
      </div>
      {missing > 0 ? (
        <div className="free-ship">
          <div className="free-ship__bar"><span style={{ width: `${Math.min(100, (subtotal / freeFrom) * 100)}%` }} /></div>
          <span className="small muted">Още {formatMoney(missing)} до безплатна доставка</span>
        </div>
      ) : null}
      <div className="summary__row summary__total"><span>Общо</span><span>{formatMoney(subtotal + shipping)}</span></div>
      {children}
    </aside>
  );
}

export default function CartPage() {
  const { items, subtotal, setQuantity, remove } = useCart();

  if (items.length === 0) {
    return (
      <div className="container empty-state">
        <div className="empty-state__icon">🛒</div>
        <h1>Количката е празна</h1>
        <p className="muted">Разгледайте нашия мед и пчелни продукти.</p>
        <Link to="/products" className="btn">Към продуктите</Link>
      </div>
    );
  }

  return (
    <div className="container section">
      <h1>Количка</h1>
      <div className="checkout-layout">
        <ul className="cart-list">
          {items.map((item) => (
            <li key={item.id} className="cart-item">
              <Link to={`/products/${item.slug}`} className="cart-item__img">
                <ProductImage product={item} />
              </Link>
              <div className="cart-item__info">
                <Link to={`/products/${item.slug}`} className="cart-item__name">{item.name}</Link>
                <span className="muted small">{item.unit} · {formatMoney(item.price_cents)}</span>
              </div>
              <QuantityInput value={item.quantity} max={item.stock || 99} onChange={(q) => setQuantity(item.id, q)} />
              <strong className="cart-item__total">{formatMoney(item.price_cents * item.quantity)}</strong>
              <button type="button" className="icon-btn" onClick={() => remove(item.id)} aria-label={`Премахни ${item.name}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <OrderSummary subtotal={subtotal}>
          <Link to="/checkout" className="btn btn-lg btn-block">Към поръчка</Link>
          <Link to="/products" className="btn btn-ghost btn-block">Продължи пазаруването</Link>
        </OrderSummary>
      </div>
    </div>
  );
}
