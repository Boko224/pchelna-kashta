import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from './db.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { HttpError } from './utils.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Няма такъв ресурс' }));

// In production, serve the built frontend (npm run build) and fall back to index.html for SPA routes.
const dist = path.resolve('dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Невалидни данни' });
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Файлът е твърде голям (макс. 5 MB)' : 'Грешка при качване';
    return res.status(400).json({ error: msg });
  }
  console.error(err);
  res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
});

// `--port=N` (used by `npm run dev`) wins over PORT, so a PORT meant for the frontend can't clash.
const portArg = process.argv.find((a) => a.startsWith('--port='))?.slice('--port='.length);
const PORT = Number(portArg || process.env.PORT) || 5000;
app.listen(PORT, () => console.log(`🐝 API сървърът работи на http://localhost:${PORT}`));
