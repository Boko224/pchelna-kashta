import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container empty-state">
      <div className="empty-state__icon">🐝</div>
      <h1>Страницата не е намерена</h1>
      <p className="muted">Изглежда тази пчела е излетяла от кошера.</p>
      <Link to="/" className="btn">Към началото</Link>
    </div>
  );
}
