import { Router } from 'express';
import db from './db-enhanced';

const router = Router();

/**
 * 健康检查模块
 * 
 * 功能：
 * 1. 服务健康状态
 * 2. 数据库连接检查
 * 3. API Key 可用性检查
 * 4. 上游服务检查
 */

/**
 * 健康检查
 * GET /health
 */
router.get('/health', (req, res) => {
  try {
    // 检查数据库
    const dbCheck = db.prepare('SELECT 1').get();
    const dbHealthy = !!dbCheck;
    
    // 检查 API Keys
    const keyCount = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE enabled = 1').get();
    const keysHealthy = (keyCount?.count || 0) > 0;
    
    // 检查最近错误率
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const recentStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as success
      FROM request_logs
      WHERE timestamp >= datetime(?)
    `).get(fiveMinutesAgo);
    
    const errorRate = recentStats?.total > 0 
      ? ((recentStats.total - (recentStats.success || 0)) / recentStats.total * 100).toFixed(1)
      : '0.0';
    
    const healthy = dbHealthy && keysHealthy && parseFloat(errorRate) < 50;
    
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'ok' : 'error',
        api_keys: keysHealthy ? 'ok' : 'no_keys',
        error_rate: `${errorRate}%`
      },
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 详细健康检查
 * GET /health/detailed
 */
router.get('/health/detailed', (req, res) => {
  try {
    // 数据库详情
    const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
    
    // Key 详情
    const keys = db.prepare(`
      SELECT id, name, enabled, weight, failure_count, last_used_at
      FROM api_keys
      ORDER BY id
    `).all();
    
    // 最近请求统计
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const hourlyStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as success,
        AVG(response_latency_ms) as avg_latency
      FROM request_logs
      WHERE timestamp >= datetime(?)
    `).get(oneHourAgo);
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        type: 'sqlite',
        size_bytes: dbSize?.size || 0
      },
      api_keys: {
        total: keys.length,
        enabled: keys.filter((k: any) => k.enabled).length,
        keys: keys.map((k: any) => ({
          id: k.id,
          name: k.name,
          enabled: !!k.enabled,
          failure_count: k.failure_count,
          last_used: k.last_used_at
        }))
      },
      requests: {
        last_hour: {
          total: hourlyStats?.total || 0,
          success: hourlyStats?.success || 0,
          avg_latency_ms: Math.round(hourlyStats?.avg_latency || 0)
        }
      },
      system: {
        uptime_seconds: Math.round(process.uptime()),
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
