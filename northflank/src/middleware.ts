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
