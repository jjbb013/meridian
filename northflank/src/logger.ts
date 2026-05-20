import db from './db-enhanced';
import { randomUUID } from 'crypto';

export interface RequestLogEntry {
  apiKeyId: number;
  apiKeyMask: string;
  clientIp?: string;
  userAgent?: string;
  requestMethod: string;
  requestPath: string;
  requestModel?: string;
  requestBodySize?: number;
  responseStatus: number;
  responseLatencyMs: number;
  upstreamLatencyMs?: number;
  isSuccess: boolean;
  errorType?: string;
  errorCode?: string;
  errorMessage?: string;
  upstreamError?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  sessionHash?: string;
}

/**
 * 生成请求ID
 */
export function generateRequestId(): string {
  return randomUUID().replace(/-/g, '').substring(0, 16);
}

/**
 * 记录请求日志
 */
export function logRequest(entry: RequestLogEntry): void {
  try {
    const requestId = generateRequestId();
    
    db.prepare(`
      INSERT INTO request_logs (
        request_id, api_key_id, api_key_mask, client_ip, user_agent,
        request_method, request_path, request_model, request_body_size,
        response_status, response_latency_ms, upstream_latency_ms,
        is_success, error_type, error_code, error_message, upstream_error,
        prompt_tokens, completion_tokens, total_tokens, session_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestId,
      entry.apiKeyId,
      entry.apiKeyMask,
      entry.clientIp || null,
      entry.userAgent || null,
      entry.requestMethod,
      entry.requestPath,
      entry.requestModel || null,
      entry.requestBodySize || null,
      entry.responseStatus,
      entry.responseLatencyMs,
      entry.upstreamLatencyMs || null,
      entry.isSuccess ? 1 : 0,
      entry.errorType || null,
      entry.errorCode || null,
      entry.errorMessage || null,
      entry.upstreamError || null,
      entry.promptTokens || null,
      entry.completionTokens || null,
      entry.totalTokens || null,
      entry.sessionHash || null
    );
  } catch (err) {
    console.error('Failed to log request:', err);
  }
}

/**
 * 获取日志列表（支持筛选）
 */
export interface LogFilter {
  startTime?: string;
  endTime?: string;
  apiKeyId?: number;
  statusCode?: number;
  errorType?: string;
  limit?: number;
  offset?: number;
}

export function getLogs(filter: LogFilter = {}): any[] {
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (filter.startTime) {
    conditions.push('timestamp >= ?');
    params.push(filter.startTime);
  }
  if (filter.endTime) {
    conditions.push('timestamp <= ?');
    params.push(filter.endTime);
  }
  if (filter.apiKeyId) {
    conditions.push('api_key_id = ?');
    params.push(filter.apiKeyId);
  }
  if (filter.statusCode) {
    conditions.push('response_status = ?');
    params.push(filter.statusCode);
  }
  if (filter.errorType) {
    conditions.push('error_type = ?');
    params.push(filter.errorType);
  }
  
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = filter.limit || 100;
  const offset = filter.offset || 0;
  
  const sql = `
    SELECT * FROM request_logs
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  
  return db.prepare(sql).all(...params);
}

/**
 * 获取错误统计
 */
export function getErrorStats(startTime?: string, endTime?: string): any {
  const conditions: string[] = ['is_success = 0'];
  const params: any[] = [];
  
  if (startTime) {
    conditions.push('timestamp >= ?');
    params.push(startTime);
  }
  if (endTime) {
    conditions.push('timestamp <= ?');
    params.push(endTime);
  }
  
  const whereClause = 'WHERE ' + conditions.join(' AND ');
  
  return db.prepare(`
    SELECT 
      response_status as status_code,
      COUNT(*) as count,
      error_type,
      error_message
    FROM request_logs
    ${whereClause}
    GROUP BY response_status, error_type
    ORDER BY count DESC
  `).all(...params);
}

/**
 * 清理过期日志（保留7天）
 */
export function cleanupOldLogs(): void {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();
  
  const result = db.prepare(`
    DELETE FROM request_logs WHERE timestamp < ?
  `).run(cutoff);
  
  console.log(`Cleaned up ${result.changes} old log entries`);
}

/**
 * 获取日志总数
 */
export function getLogCount(filter: LogFilter = {}): number {
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (filter.startTime) {
    conditions.push('timestamp >= ?');
    params.push(filter.startTime);
  }
  if (filter.endTime) {
    conditions.push('timestamp <= ?');
    params.push(filter.endTime);
  }
  if (filter.apiKeyId) {
    conditions.push('api_key_id = ?');
    params.push(filter.apiKeyId);
  }
  if (filter.statusCode) {
    conditions.push('response_status = ?');
    params.push(filter.statusCode);
  }
  
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  
  const result = db.prepare(`SELECT COUNT(*) as count FROM request_logs ${whereClause}`).get(...params);
  return result?.count || 0;
}
