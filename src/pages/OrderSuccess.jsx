import { Link, useLocation, useParams } from 'react-router-dom';
import { useSettings } from '../lib/settings.jsx';
import { formatMoney } from '../lib/format.js';

export default function OrderSuccess() {
  const { id } = useParams();
  const order = useLocation().state?.order;
  const settings = useSettings();

  return (
    <div className="container section">
      <div className="card success-card">
        <div className="empty-state__icon">🎉</div>
        <h1>Благодарим за поръчката!</h1>
        <p>
          Вашата поръчка <strong>№ {id}</strong> е приета. Ще се свържем с вас по телефона за потвърждение.
        </p>

        {order ? (
          <>
            <ul className="summary__items">
              {order.items.map((i, idx) => (
                <li key={idx}>
                  <span>{i.quantity} × {i.name}</span>
                  <span>{formatMoney(i.unit_price_cents * i.quantity)}</span>
                </li>
              ))}
              <li><span>Доставка</span><span>{order.shipping_cents ? formatMoney(order.shipping_cents) : 'Безплатна'}</span></li>
            </ul>
            <p className="price price--lg">Общо: {formatMoney(order.total_cents)}</p>
            {order.payment_method === 'bank' ? (
              <p className="alert">
                Избрахте плащане с банков превод. Данните за превод ще ви изпратим след потвърждение на поръчката.
              </p>
            ) : null}
          </>
        ) : null}

        {settings.phone ? <p className="muted small">Въпроси? Обадете ни се на {settings.phone}.</p> : null}
        <Link to="/products" className="btn">Обратно към магазина</Link>
      </div>
    </div>
  );
}
