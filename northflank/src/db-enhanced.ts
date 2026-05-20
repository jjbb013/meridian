import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_TYPE = process.env.DATABASE_TYPE || 'sqlite';
const DB_NAME = process.env.SQLITE_DATABASE || ':memory:';

let dbPath: string;
if (DB_NAME === ':memory:') {
  dbPath = ':memory:';
} else {
  const dbDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : '/tmp/data';
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  dbPath = process.env.DB_PATH || path.join(dbDir, `${DB_NAME}.db`);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  -- API Keys 表（原有）
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

  -- 增强版请求日志表
  CREATE TABLE IF NOT EXISTS request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    
    -- 请求信息
    api_key_id INTEGER,
    api_key_mask TEXT,
    client_ip TEXT,
    user_agent TEXT,
    
    -- 请求内容
    request_method TEXT,
    request_path TEXT,
    request_model TEXT,
    request_body_size INTEGER,
    
    -- 响应信息
    response_status INTEGER,
    response_latency_ms INTEGER,
    upstream_latency_ms INTEGER,
    
    -- 错误信息
    is_success INTEGER DEFAULT 0,
    error_type TEXT,
    error_code TEXT,
    error_message TEXT,
    upstream_error TEXT,
    
    -- 使用统计
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    
    -- 会话信息
    session_hash TEXT,
    
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
  );

  -- 请求日志索引
  CREATE INDEX IF NOT EXISTS idx_logs_time ON request_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_logs_key ON request_logs(api_key_id);
  CREATE INDEX IF NOT EXISTS idx_logs_status ON request_logs(response_status);
  CREATE INDEX IF NOT EXISTS idx_logs_session ON request_logs(session_hash);
  CREATE INDEX IF NOT EXISTS idx_logs_error ON request_logs(error_type);

  -- 统计汇总表（按天）
  CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    api_key_id INTEGER,
    total_requests INTEGER DEFAULT 0,
    success_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    avg_latency_ms INTEGER DEFAULT 0,
    error_400 INTEGER DEFAULT 0,
    error_429 INTEGER DEFAULT 0,
    error_500 INTEGER DEFAULT 0,
    error_502 INTEGER DEFAULT 0,
    error_503 INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- 设置表（原有）
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Load API keys from environment variable
const apiKeysEnv = process.env.API_KEYS;
if (apiKeysEnv) {
  try {
    const keys: string[] = JSON.parse(apiKeysEnv);
    db.prepare('DELETE FROM api_keys').run();
    const insert = db.prepare('INSERT INTO api_keys (key, name, weight, enabled) VALUES (?, ?, ?, ?)');
    for (let i = 0; i < keys.length; i++) {
      insert.run(keys[i], `Key ${i + 1}`, 1, 1);
    }
  } catch (e) {
    console.error('Failed to parse API_KEYS:', e);
  }
}

// Default settings
const defaults: Record<string, string> = {
  upstream_base: 'https://api.kimi.com/coding',
  user_agent: 'claude-code/1.0',
  admin_password: process.env.ADMIN_PASSWORD || 'admin',
};

for (const [k, v] of Object.entries(defaults)) {
  db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run(k, v);
}

if (process.env.ADMIN_PASSWORD) {
  db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`).run('admin_password', process.env.ADMIN_PASSWORD);
}

export default db;
