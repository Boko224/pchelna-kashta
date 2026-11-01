import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage.jsx';
import { adminApi } from '../lib/api.js';
import { useFetch } from '../lib/useFetch.js';
import { centsToInput, inputToCents } from '../lib/format.js';

const EMPTY = {
  name: '', category_id: '', unit: '', price: '', stock: '0', description: '',
  image_url: '', is_active: true, is_featured: false,
};

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const categories = useFetch(() => adminApi.get('/categories'), []);
  const [form, setForm] = useState(EMPTY);
  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isNew) return;
    adminApi.get(`/products/${id}`)
      .then((p) => {
        setForm({
          name: p.name,
          category_id: p.category_id ? String(p.category_id) : '',
          unit: p.unit,
          price: centsToInput(p.price_cents),
          stock: String(p.stock),
          description: p.description,
          image_url: p.image_url,
          is_active: !!p.is_active,
          is_featured: !!p.is_featured,
        });
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, [id, isNew]);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const { url } = await adminApi.post('/upload', body);
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const price_cents = inputToCents(form.price);
    if (!Number.isFinite(price_cents) || price_cents < 0) {
      setError('Въведете валидна цена');
      return;
    }
    const payload = {
      ...form,
      price_cents,
      stock: parseInt(form.stock, 10),
      category_id: form.category_id ? Number(form.category_id) : null,
    };
    setSaving(true);
    try {
      if (isNew) await adminApi.post('/products', payload);
      else await adminApi.put(`/products/${id}`, payload);
      navigate('/admin/products');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!loaded) return error ? <p className="alert alert--error">{error}</p> : <p className="muted">Зареждане…</p>;

  const selectedCategory = (categories.data || []).find((c) => String(c.id) === form.category_id);

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">{isNew ? 'Нов продукт' : 'Редакция на продукт'}</h1>
        <Link to="/admin/products" className="btn btn-ghost">← Назад</Link>
      </div>

      <form className="product-form" onSubmit={submit}>
        <div className="card form-grid">
          <label className="field field--full">
            <span>Име *</span>
            <input className="input" required maxLength={150} value={form.name} onChange={set('name')} />
          </label>
          <label className="field">
            <span>Категория</span>
            <select className="input" value={form.category_id} onChange={set('category_id')}>
              <option value="">— без категория —</option>
              {(categories.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Разфасовка</span>
            <input className="input" maxLength={60} placeholder="напр. буркан 450 г" value={form.unit} onChange={set('unit')} />
          </label>
          <label className="field">
            <span>Цена (€) *</span>
            <input className="input" required inputMode="decimal" placeholder="0.00" value={form.price} onChange={set('price')} />
          </label>
          <label className="field">
            <span>Наличност (бр.) *</span>
            <input className="input" required type="number" min={0} step={1} value={form.stock} onChange={set('stock')} />
          </label>
          <label className="field field--full">
            <span>Описание</span>
            <textarea className="input" rows={6} maxLength={5000} value={form.description} onChange={set('description')} />
          </label>
          <div className="field field--full checks">
            <label className="check"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Видим в магазина</label>
            <label className="check"><input type="checkbox" checked={form.is_featured} onChange={set('is_featured')} /> Препоръчан (показва се на началната страница)</label>
          </div>
        </div>

        <div className="card image-card">
          <h2>Снимка</h2>
          <ProductImage
            product={{ id: Number(id) || 0, name: form.name, image_url: form.image_url, category_slug: selectedCategory?.slug }}
            className="image-card__preview"
          />
          <label className="btn btn-ghost btn-block file-btn">
            {uploading ? 'Качване…' : 'Качи снимка'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={uploading} hidden />
          </label>
          <label className="field">
            <span className="small muted">или адрес на снимка</span>
            <input className="input" placeholder="https://…" value={form.image_url} onChange={set('image_url')} />
          </label>
          {form.image_url ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, image_url: '' }))}>
              Премахни снимката
            </button>
          ) : null}
        </div>

        <div className="form-actions">
          {error ? <p className="alert alert--error">{error}</p> : null}
          <button type="submit" className="btn btn-lg" disabled={saving || uploading}>{saving ? 'Запазване…' : 'Запази'}</button>
        </div>
      </form>
    </>
  );
}
