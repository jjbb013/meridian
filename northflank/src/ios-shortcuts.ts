import { Router } from 'express';
import db from './db-enhanced';

const router = Router();

/**
 * iOS 快捷指令 API 端点
 * 
 * 快捷指令配置：
 * 1. URL: https://your-domain.com/api/ios/chat
 * 2. Method: POST
 * 3. Headers: 
 *    - Content-Type: application/json
 *    - Authorization: Bearer YOUR_API_KEY
 * 4. Body: JSON
 *    {
 *      "message": "你的问题",
 *      "model": "kimi-coding"  // 可选
 *    }
 * 5. 获取响应中的 "response" 字段
 */

/**
 * 简化版聊天接口（适合 iOS 快捷指令）
 * POST /api/ios/chat
 */
router.post('/api/ios/chat', async (req, res) => {
  try {
    const { message, model = 'kimi-coding' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    // 获取 API Key
    const keyRecord = db.prepare(`
      SELECT id, key FROM api_keys 
      WHERE enabled = 1 
      ORDER BY last_used_at ASC 
      LIMIT 1
    `).get();
    
    if (!keyRecord) {
      return res.status(503).json({
        success: false,
        error: 'No API keys available'
      });
    }
    
    // 构建请求
    const upstreamBase = process.env.UPSTREAM_BASE || 'https://api.kimi.com/coding';
    const response = await fetch(`${upstreamBase}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyRecord.key}`,
        'User-Agent': 'claude-code/1.0'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: message }
        ],
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Upstream error: ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // 更新 key 使用时间
    db.prepare('UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?').run(keyRecord.id);
    
    // 返回简化格式（适合快捷指令解析）
    res.json({
      success: true,
      response: content,
      model: data.model,
      usage: data.usage
    });
    
  } catch (error) {
    console.error('iOS shortcut error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 快捷指令健康检查
 * GET /api/ios/health
 */
router.get('/api/ios/health', (req, res) => {
  const keyCount = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE enabled = 1').get();
  
  res.json({
    success: true,
    status: 'ok',
    available_keys: keyCount?.count || 0,
    timestamp: new Date().toISOString()
  });
});

/**
 * 快捷指令配置信息
 * GET /api/ios/config
 */
router.get('/api/ios/config', (req, res) => {
  res.json({
    success: true,
    config: {
      endpoint: '/api/ios/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
      },
      body_template: {
        message: '{{prompt}}',
        model: 'kimi-coding'
      },
      response_path: 'response'
    }
  });
});

export default router;
