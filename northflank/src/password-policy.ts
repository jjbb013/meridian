import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import db from './db-enhanced';

const router = Router();

/**
 * 密码策略模块
 * 
 * 功能：
 * 1. 管理员密码有效期检查
 * 2. 密码修改功能
 * 3. 密码强度验证
 */

// 密码有效期：90天
const PASSWORD_MAX_AGE_DAYS = 90;

/**
 * 密码强度验证
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码需包含大写字母' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码需包含小写字母' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码需包含数字' };
  }
  
  return { valid: true };
}

/**
 * 哈希密码
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 检查密码是否过期
 */
export function isPasswordExpired(): boolean {
  const setting = db.prepare("SELECT value, updated_at FROM settings WHERE key = 'admin_password'").get();
  if (!setting?.updated_at) return false;
  
  const lastUpdate = new Date(setting.updated_at);
  const maxAge = PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  
  return Date.now() - lastUpdate.getTime() > maxAge;
}

/**
 * 密码过期检查中间件
 */
export function passwordExpiryMiddleware(req: Request, res: Response, next: NextFunction) {
  // 跳过登录和修改密码页面
  const skipPaths = ['/login', '/api/login', '/api/change-password', '/health'];
  if (skipPaths.includes(req.path)) {
    return next();
  }
  
  // 检查密码是否过期
  if (isPasswordExpired()) {
    return res.status(401).json({
      error: '密码已过期，请修改密码',
      code: 'PASSWORD_EXPIRED',
      redirect: '/change-password'
    });
  }
  
  next();
}

/**
 * 修改密码
 * POST /api/change-password
 */
router.post('/api/change-password', (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    
    if (!old_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: '请提供旧密码和新密码'
      });
    }
    
    // 验证旧密码
    const currentHash = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
    if (currentHash?.value !== hashPassword(old_password)) {
      return res.status(401).json({
        success: false,
        error: '旧密码不正确'
      });
    }
    
    // 验证新密码强度
    const strength = validatePasswordStrength(new_password);
    if (!strength.valid) {
      return res.status(400).json({
        success: false,
        error: strength.message
      });
    }
    
    // 更新密码
    db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at) 
      VALUES ('admin_password', ?, datetime('now'))
    `).run(hashPassword(new_password));
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 获取密码状态
 * GET /api/password-status
 */
router.get('/api/password-status', (req, res) => {
  try {
    const setting = db.prepare("SELECT updated_at FROM settings WHERE key = 'admin_password'").get();
    const lastUpdate = setting?.updated_at ? new Date(setting.updated_at) : null;
    const daysSinceUpdate = lastUpdate 
      ? Math.floor((Date.now() - lastUpdate.getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    
    res.json({
      expired: isPasswordExpired(),
      days_since_update: daysSinceUpdate,
      max_age_days: PASSWORD_MAX_AGE_DAYS,
      days_remaining: Math.max(0, PASSWORD_MAX_AGE_DAYS - daysSinceUpdate)
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
