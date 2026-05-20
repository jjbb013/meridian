import { Router } from 'express';
import db from './db-enhanced';

const router = Router();

/**
 * 计费统计模块
 * 
 * 功能：
 * 1. 按 Key 统计 Token 使用量
 * 2. 按天/月汇总
 * 3. 费用估算
 */

/**
 * 获取计费统计
 * GET /api/billing/stats
 */
router.get('/api/billing/stats', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // 按 Key 统计
    const keyStats = db.prepare(`
      SELECT 
        api_key_id,
        api_key_mask,
        COUNT(*) as request_count,
        SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as success_count,
        SUM(total_tokens) as total_tokens,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens,
        AVG(response_latency_ms) as avg_latency,
        MIN(timestamp) as first_request,
        MAX(timestamp) as last_request
      FROM request_logs
      WHERE timestamp >= datetime(?)
      GROUP BY api_key_id
      ORDER BY total_tokens DESC
    `).all(startDate.toISOString());
    
    // 按天统计
    const dailyStats = db.prepare(`
      SELECT 
        date(timestamp) as date,
        COUNT(*) as request_count,
        SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as success_count,
        SUM(total_tokens) as total_tokens,
        AVG(response_latency_ms) as avg_latency
      FROM request_logs
      WHERE timestamp >= datetime(?)
      GROUP BY date(timestamp)
      ORDER BY date DESC
    `).all(startDate.toISOString());
    
    // 估算费用（按 $0.002/1K tokens 估算）
    const totalTokens = keyStats.reduce((sum: number, k: any) => sum + (k.total_tokens || 0), 0);
    const estimatedCost = (totalTokens / 1000) * 0.002;
    
    res.json({
      success: true,
      period_days: days,
      summary: {
        total_requests: keyStats.reduce((sum: number, k: any) => sum + k.request_count, 0),
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCost.toFixed(4),
        avg_latency_ms: Math.round(
          keyStats.reduce((sum: number, k: any) => sum + (k.avg_latency || 0) * k.request_count, 0) /
          Math.max(keyStats.reduce((sum: number, k: any) => sum + k.request_count, 0), 1)
        )
      },
      key_stats: keyStats,
      daily_stats: dailyStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 计费统计页面
 * GET /billing
 */
router.get('/billing', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head><title>计费统计</title></head>
<body>
  <h1>计费统计</h1>
  <p>请访问 /api/billing/stats?days=30 获取数据</p>
</body>
</html>
  `);
});

export default router;
