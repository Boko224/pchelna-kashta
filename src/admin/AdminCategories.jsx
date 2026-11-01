import { useState } from 'react';
import { adminApi } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';

const EMPTY = { name: '', description: '', sort_order: 0 };

function CategoryRow({ category, onSaved, onError }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(category);

  async function save() {
    try {
      await adminApi.put(`/categories/${category.id}`, form);
      setEditing(false);
      onSaved();
    } catch (err) {
      onError(err.message);
    }
  }

  async function remove() {
    const msg = category.product_count
      ? `Категорията „${category.name}“ има ${category.product_count} продукта. Те ще останат без категория. Продължаване?`
      : `Изтриване на категорията „${category.name}“?`;
    if (!window.confirm(msg)) return;
    try {
      await adminApi.delete(`/categories/${category.id}`);
      onSaved();
    } catch (err) {
      onError(err.message);
    }
  }

  if (editing) {
    return (
      <tr>
        <td><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></td>
        <td><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></td>
        <td><input className="input input--narrow" type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></td>
        <td className="num">{category.product_count}</td>
        <td className="actions">
          <button type="button" className="btn btn-sm" onClick={save}>Запази</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setForm(category); setEditing(false); }}>Отказ</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="strong">{category.name}<div className="muted small">/{category.slug}</div></td>
      <td className="muted">{category.description}</td>
      <td>{category.sort_order}</td>
      <td className="num">{category.product_count}</td>
      <td className="actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Редактирай</button>
        <button type="button" className="btn btn-danger btn-sm" onClick={remove}>Изтрий</button>
      </td>
    </tr>
  );
}

export default function AdminCategories() {
  const { data, error, reload } = useFetch(() => adminApi.get('/categories'), []);
  const [form, setForm] = useState(EMPTY);
  const [actionError, setActionError] = useState('');

  async function add(e) {
    e.preventDefault();
    setActionError('');
    try {
      await adminApi.post('/categories', form);
      setForm(EMPTY);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <>
      <h1 className="admin-title">Категории</h1>

      <form className="card inline-form" onSubmit={add}>
        <label className="field">
          <span>Име *</span>
          <input className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="field field--grow">
          <span>Описание</span>
          <input className="input" maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="field">
          <span>Подредба</span>
          <input className="input input--narrow" type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
        </label>
        <button type="submit" className="btn">+ Добави</button>
      </form>

      {error ? <p className="alert alert--error">{error.message}</p> : null}
      {actionError ? <p className="alert alert--error">{actionError}</p> : null}

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Име</th><th>Описание</th><th>Подредба</th><th className="num">Продукти</th><th /></tr>
          </thead>
          <tbody>
            {(data || []).map((c) => (
              <CategoryRow key={`${c.id}-${c.name}-${c.sort_order}`} category={c} onSaved={reload} onError={setActionError} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
