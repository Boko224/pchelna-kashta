import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminLogin } from '../lib/api.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await adminLogin(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <div className="login-card__logo">🐝</div>
        <h1>Админ панел</h1>
        <p className="muted small">Влезте, за да управлявате магазина.</p>
        <label className="field">
          <span>Имейл</span>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label className="field">
          <span>Парола</span>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error ? <p className="alert alert--error">{error}</p> : null}
        <button type="submit" className="btn btn-block" disabled={busy}>{busy ? 'Вход…' : 'Вход'}</button>
        <Link to="/" className="small">← Обратно към магазина</Link>
      </form>
    </div>
  );
}
