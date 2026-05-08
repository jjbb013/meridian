import { Request, Response, NextFunction } from 'express';
import { getSetting } from './keyManager';

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
  const password = getSetting('admin_password') || 'admin';

  if (!token || token !== password) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function clientAuth(req: Request, res: Response, next: NextFunction): void {
  const clientToken = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!clientToken) {
    res.status(403).json({ error: 'Missing Authorization header' });
    return;
  }

  const allowedTokensEnv = process.env.ALLOWED_TOKENS;
  if (allowedTokensEnv) {
    // ALLOWED_TOKENS is set: client must provide a token in the list
    let allowedTokens: string[];
    try {
      allowedTokens = JSON.parse(allowedTokensEnv);
    } catch {
      res.status(500).json({ error: 'Invalid ALLOWED_TOKENS configuration' });
      return;
    }
    if (!allowedTokens.includes(clientToken)) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
  } else {
    // ALLOWED_TOKENS is not set: client must provide the admin password
    const adminPassword = getSetting('admin_password') || 'admin';
    if (clientToken !== adminPassword) {
      res.status(403).json({ error: 'Invalid credentials' });
      return;
    }
  }

  next();
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}
