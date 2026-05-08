import express from 'express';
import path from 'path';
import { corsMiddleware, adminAuth, clientAuth } from './middleware';
import { handleProxy } from './proxy';
import {
  listKeys,
  addKey,
  deleteKey,
  toggleKey,
  updateKey,
  getStats,
  getRecentLogs,
  getSetting,
  setSetting,
} from './keyManager';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'meridian' });
});

// OpenAI compatible API - catch all /v1/* routes
app.use('/v1', clientAuth, handleProxy);

// Admin API
app.get('/admin/stats', adminAuth, (_req, res) => {
  res.json(getStats());
});

app.get('/admin/keys', adminAuth, (_req, res) => {
  const keys = listKeys().map(k => ({
    ...k,
    key: `${k.key.slice(0, 4)}****${k.key.slice(-4)}`,
  }));
  res.json(keys);
});

app.post('/admin/keys', adminAuth, (req, res) => {
  const { key, name, weight } = req.body;
  if (!key || typeof key !== 'string') {
    res.status(400).json({ error: 'Key is required' });
    return;
  }
  try {
    const record = addKey(key, name, weight);
    res.json({ ...record, key: `${record.key.slice(0, 4)}****${record.key.slice(-4)}` });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/admin/keys/:id', adminAuth, (req, res) => {
  deleteKey(Number(req.params.id));
  res.json({ success: true });
});

app.patch('/admin/keys/:id', adminAuth, (req, res) => {
  const { enabled, name, weight } = req.body;
  if (enabled !== undefined) {
    toggleKey(Number(req.params.id), enabled);
  }
  if (name !== undefined || weight !== undefined) {
    updateKey(Number(req.params.id), { name, weight });
  }
  res.json({ success: true });
});

app.get('/admin/logs', adminAuth, (req, res) => {
  const limit = Math.min(1000, Number(req.query.limit) || 100);
  res.json(getRecentLogs(limit));
});

app.get('/admin/settings', adminAuth, (_req, res) => {
  res.json({
    upstream_base: getSetting('upstream_base'),
    user_agent: getSetting('user_agent'),
  });
});

app.post('/admin/settings', adminAuth, (req, res) => {
  const { user_agent, admin_password } = req.body;
  if (user_agent) setSetting('user_agent', user_agent);
  if (admin_password) setSetting('admin_password', admin_password);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Meridian server running on port ${PORT}`);
});
