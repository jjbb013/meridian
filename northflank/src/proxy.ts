import { Request, Response } from 'express';
import { getNextKey, recordUsage, getSetting } from './keyManager';

const UPSTREAM_BASE = 'https://api.kimi.com/coding';

export async function handleProxy(req: Request, res: Response): Promise<void> {
  const url = new URL(req.originalUrl || req.url, `http://${req.headers.host}`);
  const targetPath = url.pathname + url.search;
  const targetUrl = `${UPSTREAM_BASE}${targetPath}`;

  const keyRecord = getNextKey();
  if (!keyRecord) {
    res.status(503).json({ error: { message: 'No API keys configured', type: 'service_unavailable' } });
    return;
  }

  const headers = new Headers();
  req.headers['content-type'] && headers.set('Content-Type', req.headers['content-type'] as string);
  req.headers['accept'] && headers.set('Accept', req.headers['accept'] as string);

  const userAgent = getSetting('user_agent') || 'claude-code/1.0';
  headers.set('Host', 'api.kimi.com');
  headers.set('User-Agent', userAgent);

  // Authorization from client or use our key
  const clientAuth = req.headers.authorization;
  if (clientAuth) {
    headers.set('Authorization', clientAuth as string);
  } else {
    headers.set('Authorization', `Bearer ${keyRecord.key}`);
  }

  const start = Date.now();
  let success = false;
  let statusCode = 0;
  let errorMsg: string | undefined;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    statusCode = response.status;
    success = response.ok;

    const latency = Date.now() - start;
    recordUsage(keyRecord.id, success, statusCode, latency, success ? undefined : `HTTP ${statusCode}`);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const body = await response.text();
    res.send(body);
  } catch (err) {
    const latency = Date.now() - start;
    errorMsg = err instanceof Error ? err.message : 'Unknown error';
    recordUsage(keyRecord.id, false, 0, latency, errorMsg);
    res.status(502).json({ error: { message: errorMsg, type: 'proxy_error' } });
  }
}
