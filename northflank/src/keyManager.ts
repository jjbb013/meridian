import db from './db';

export interface ApiKey {
  id: number;
  key: string;
  name: string | null;
  enabled: number;
  weight: number;
  failure_count: number;
  last_used_at: string | null;
  created_at: string;
}

// Round-robin with weight support
let currentIndex = 0;
let weightedKeys: ApiKey[] = [];

function rebuildWeightedKeys(): void {
  const rows = db.prepare('SELECT * FROM api_keys WHERE enabled = 1 ORDER BY id').all() as ApiKey[];
  weightedKeys = [];
  for (const k of rows) {
    const w = Math.max(1, k.weight || 1);
    for (let i = 0; i < w; i++) {
      weightedKeys.push(k);
    }
  }
}

rebuildWeightedKeys();

export function getNextKey(): ApiKey | null {
  if (weightedKeys.length === 0) return null;
  const key = weightedKeys[currentIndex % weightedKeys.length];
  currentIndex = (currentIndex + 1) % weightedKeys.length;
  return key;
}

export function recordUsage(keyId: number, success: boolean, statusCode?: number, latencyMs?: number, errorMsg?: string): void {
  const mask = db.prepare('SELECT key FROM api_keys WHERE id = ?').pluck().get(keyId) as string;
  const maskDisplay = mask ? mask.slice(0, 4) + '****' + mask.slice(-4) : '';
  db.prepare(`
    INSERT INTO request_logs (model_name, api_key_id, api_key_mask, is_success, status_code, latency_ms, error_msg)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('', keyId, maskDisplay, success ? 1 : 0, statusCode || null, latencyMs || null, errorMsg || null);

  if (!success) {
    db.prepare('UPDATE api_keys SET failure_count = failure_count + 1 WHERE id = ?').run(keyId);
  } else {
    db.prepare("UPDATE api_keys SET failure_count = 0, last_used_at = datetime('now') WHERE id = ?").run(keyId);
  }
  rebuildWeightedKeys();
}

export function listKeys(): ApiKey[] {
  return db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as ApiKey[];
}

export function addKey(key: string, name?: string, weight?: number): ApiKey {
  const info = db.prepare('INSERT INTO api_keys (key, name, weight) VALUES (?, ?, ?)').run(key, name || null, weight || 1);
  rebuildWeightedKeys();
  return db.prepare('SELECT * FROM api_keys WHERE id = ?').get(info.lastInsertRowid) as ApiKey;
}

export function deleteKey(id: number): void {
  db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  rebuildWeightedKeys();
}

export function toggleKey(id: number, enabled: boolean): void {
  db.prepare('UPDATE api_keys SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
  rebuildWeightedKeys();
}

export function updateKey(id: number, updates: Partial<Pick<ApiKey, 'name' | 'weight'>>): void {
  if (updates.name !== undefined) {
    db.prepare('UPDATE api_keys SET name = ? WHERE id = ?').run(updates.name, id);
  }
  if (updates.weight !== undefined) {
    db.prepare('UPDATE api_keys SET weight = ? WHERE id = ?').run(updates.weight, id);
  }
  rebuildWeightedKeys();
}

export function getStats(): { total_requests: number; success_rate: number; avg_latency: number; key_count: number } {
  const total = (db.prepare('SELECT COUNT(*) FROM request_logs').pluck().get() as number) || 0;
  const success = (db.prepare('SELECT COUNT(*) FROM request_logs WHERE is_success = 1').pluck().get() as number) || 0;
  const avgLatency = (db.prepare('SELECT AVG(latency_ms) FROM request_logs WHERE latency_ms IS NOT NULL').pluck().get() as number) || 0;
  const keyCount = (db.prepare('SELECT COUNT(*) FROM api_keys').pluck().get() as number) || 0;
  return {
    total_requests: total,
    success_rate: total > 0 ? Math.round((success / total) * 100) : 0,
    avg_latency: Math.round(avgLatency),
    key_count: keyCount,
  };
}

export function getRecentLogs(limit = 100): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT * FROM request_logs ORDER BY request_time DESC LIMIT ?
  `).all(limit) as Array<Record<string, unknown>>;
}

export function getSetting(key: string): string | undefined {
  return db.prepare('SELECT value FROM settings WHERE key = ?').pluck().get(key) as string | undefined;
}

export function setSetting(key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(key, value);
}
