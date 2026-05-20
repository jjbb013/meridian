import { Request, Response, NextFunction } from 'express';
import { logRequest } from './logger';
import db from './db-enhanced';
import { KeyManager } from './keyManager';

interface ProxyLogContext {
  requestId: string;
  apiKeyId: number;
  apiKeyMask: string;
  startTime: number;
  requestMethod: string;
  requestPath: string;
  requestModel?: string;
  requestBodySize?: number;
  clientIp?: string;
  userAgent?: string;
  sessionHash?: string;
}

/**
 * 创建代理日志中间件
 * 在请求开始时创建上下文，在响应结束时记录日志
 */
export function createProxyLogger(keyManager: KeyManager) {
  return {
    // 请求开始时调用
    start: (req: Request, apiKeyId: number, apiKey: string): ProxyLogContext => {
      const mask = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
      
      // 提取模型名称
      let model: string | undefined;
      try {
        if (req.body && req.body.model) {
          model = req.body.model;
        }
      } catch (e) {
        // ignore
      }
      
      // 计算请求体大小
      const bodySize = req.body ? JSON.stringify(req.body).length : 0;
      
      // 生成会话哈希（基于用户标识）
      const sessionHash = req.headers['x-session-id'] as string || 
                         req.ip || 
                         req.headers['x-forwarded-for'] as string ||
                         'unknown';
      
      return {
        requestId: req.headers['x-request-id'] as string || Date.now().toString(),
        apiKeyId,
        apiKeyMask: mask,
        startTime: Date.now(),
        requestMethod: req.method,
        requestPath: req.path,
        requestModel: model,
        requestBodySize: bodySize,
        clientIp: req.ip || undefined,
        userAgent: req.headers['user-agent'] as string,
        sessionHash: typeof sessionHash === 'string' ? sessionHash.substring(0, 32) : undefined
      };
    },
    
    // 响应结束时调用
    end: (ctx: ProxyLogContext, res: Response, error?: any) => {
      const latency = Date.now() - ctx.startTime;
      const statusCode = res.statusCode;
      
      // 判断是否为成功请求
      const isSuccess = statusCode >= 200 && statusCode < 300;
      
      // 解析错误信息
      let errorType: string | undefined;
      let errorCode: string | undefined;
      let errorMessage: string | undefined;
      let upstreamError: string | undefined;
      
      if (!isSuccess) {
        if (statusCode === 429) {
          errorType = 'rate_limited';
          errorMessage = 'Rate limited by upstream';
        } else if (statusCode === 400) {
          errorType = 'invalid_request';
          errorMessage = 'Invalid request';
        } else if (statusCode === 401 || statusCode === 403) {
          errorType = 'auth_error';
          errorMessage = 'Authentication error';
        } else if (statusCode >= 500) {
          errorType = 'upstream_error';
          errorMessage = 'Upstream server error';
        }
        
        if (error) {
          upstreamError = error.message || String(error);
          if (!errorMessage) {
            errorMessage = upstreamError.substring(0, 200);
          }
        }
      }
      
      // 提取 token 使用量（如果响应头中有）
      let promptTokens: number | undefined;
      let completionTokens: number | undefined;
      let totalTokens: number | undefined;
      
      try {
        const usage = res.locals.usage;
        if (usage) {
          promptTokens = usage.prompt_tokens;
          completionTokens = usage.completion_tokens;
          totalTokens = usage.total_tokens;
        }
      } catch (e) {
        // ignore
      }
      
      // 记录日志
      logRequest({
        apiKeyId: ctx.apiKeyId,
        apiKeyMask: ctx.apiKeyMask,
        clientIp: ctx.clientIp,
        userAgent: ctx.userAgent,
        requestMethod: ctx.requestMethod,
        requestPath: ctx.requestPath,
        requestModel: ctx.requestModel,
        requestBodySize: ctx.requestBodySize,
        responseStatus: statusCode,
        responseLatencyMs: latency,
        upstreamLatencyMs: res.locals.upstreamLatency,
        isSuccess,
        errorType,
        errorCode,
        errorMessage,
        upstreamError,
        promptTokens,
        completionTokens,
        totalTokens,
        sessionHash: ctx.sessionHash
      });
      
      // 更新 Key 最后使用时间
      try {
        db.prepare('UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?').run(ctx.apiKeyId);
      } catch (e) {
        // ignore
      }
    }
  };
}

/**
 * 自动清理旧日志的定时任务
 * 每24小时执行一次
 */
export function startLogCleanupScheduler(): void {
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24小时
  
  console.log('[Monitor] Log cleanup scheduler started (every 24h)');
  
  // 立即执行一次
  cleanupOldLogs();
  
  // 定时执行
  setInterval(() => {
    console.log('[Monitor] Running scheduled log cleanup...');
    cleanupOldLogs();
  }, CLEANUP_INTERVAL);
}

import { cleanupOldLogs } from './logger';
