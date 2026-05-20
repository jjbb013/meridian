import { Request, Response, NextFunction } from 'express';
import db from './db-enhanced';

interface SessionBinding {
  sessionHash: string;
  apiKeyId: number;
  createdAt: Date;
  lastUsedAt: Date;
  requestCount: number;
}

const sessionCache = new Map<string, SessionBinding>();
const SESSION_TTL = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

export function generateSessionHash(req: Request): string {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const data = `${ip}:${ua}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `session_${Math.abs(hash).toString(16)}`;
}

export function getSessionBinding(sessionHash: string): SessionBinding | null {
  const binding = sessionCache.get(sessionHash);
  if (!binding) return null;
  const now = Date.now();
  if (now - binding.lastUsedAt.getTime() > SESSION_TTL) {
    sessionCache.delete(sessionHash);
    return null;
  }
  binding.lastUsedAt = new Date();
  binding.requestCount++;
  return binding;
}

export function createSessionBinding(sessionHash: string, apiKeyId: number): SessionBinding {
  const binding: SessionBinding = {
    sessionHash, apiKeyId,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    requestCount: 1
  };
  sessionCache.set(sessionHash, binding);
  return binding;
}

export function stickySessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionHash = generateSessionHash(req);
  req.sessionHash = sessionHash;
  const binding = getSessionBinding(sessionHash);
  if (binding) {
    const keyRecord = db.prepare('SELECT id, enabled FROM api_keys WHERE id = ?').get(binding.apiKeyId);
    if (keyRecord && keyRecord.enabled) {
      req.preferredKeyId = binding.apiKeyId;
    }
  }
  next();
}

export function getNextKeyWithSticky(sessionHash: string, preferredKeyId?: number): any {
  if (preferredKeyId) {
    const key = db.prepare(`
      SELECT id, key, name, weight, failure_count FROM api_keys WHERE id = ? AND enabled = 1
    `).get(preferredKeyId);
    if (key) return key;
  }
  return db.prepare(`
    SELECT id, key, name, weight, failure_count FROM api_keys WHERE enabled = 1
    ORDER BY last_used_at ASC, weight DESC LIMIT 1
  `).get();
}

export function startSessionCleanup(): void {
  console.log('[StickySession] Session cleanup scheduler started');
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [hash, binding] of sessionCache.entries()) {
      if (now - binding.lastUsedAt.getTime() > SESSION_TTL) {
        sessionCache.delete(hash);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[StickySession] Cleaned ${cleaned} expired sessions`);
    }
  }, CLEANUP_INTERVAL);
}

export function getSessionStats(): any {
  const now = Date.now();
  let active = 0;
  let expired = 0;
  for (const binding of sessionCache.values()) {
    if (now - binding.lastUsedAt.getTime() <= SESSION_TTL) {
      active++;
    } else {
      expired++;
    }
  }
  return {
    active_sessions: active,
    expired_sessions: expired,
    total_sessions: sessionCache.size,
    session_ttl_minutes: SESSION_TTL / 60000
  };
}

declare global {
  namespace Express {
    interface Request {
      sessionHash?: string;
      preferredKeyId?: number;
    }
  }
}
