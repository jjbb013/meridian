import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : './data';
const DB_PATH = process.env.DB_PATH || './data/meridian.db';

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    name TEXT,
    enabled INTEGER DEFAULT 1,
    weight INTEGER DEFAULT 1,
    failure_count INTEGER DEFAULT 0,
    last_used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT,
    api_key_id INTEGER,
    api_key_mask TEXT,
    is_success INTEGER DEFAULT 0,
    status_code INTEGER,
    latency_ms INTEGER,
    error_msg TEXT,
    request_time TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_logs_time ON request_logs(request_time);
  CREATE INDEX IF NOT EXISTS idx_logs_key ON request_logs(api_key_id);
`);

// Default settings
const defaults: Record<string, string> = {
  upstream_base: 'https://api.kimi.com/coding',
  user_agent: 'claude-code/1.0',
  admin_password: 'admin',
};

for (const [k, v] of Object.entries(defaults)) {
  db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run(k, v);
}

// Override admin_password from environment variable if set
if (process.env.ADMIN_PASSWORD) {
  db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`).run('admin_password', process.env.ADMIN_PASSWORD);
}

export default db;
