/**
 * 共享代理逻辑 —— 同时支持 Vercel Edge Function 和 Cloudflare Workers
 */

const UPSTREAM_BASE = 'https://api.kimi.com/coding';

/** CORS 预检响应 */
export function handleCORS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/** 健康检查 */
export function handleHealth(): Response {
  return new Response(
    JSON.stringify({ status: 'ok', service: 'meridian' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

/**
 * 代理请求到 Kimi Coding API
 * @param request 原始请求
 * @param apiKey  环境变量中的 API Key（可选）
 * @param targetPath 目标路径，如 /v1/chat/completions
 */
export async function handleProxy(
  request: Request,
  apiKey: string | undefined,
  targetPath: string
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }

  const url = new URL(request.url);
  const targetUrl = `${UPSTREAM_BASE}${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('Host', 'api.kimi.com');
  headers.set('User-Agent', 'claude-code/1.0');
  headers.set('Accept', 'application/json, text/event-stream');
  headers.set('Accept-Language', 'en-US,en;q=0.9');
  headers.set('Accept-Encoding', 'gzip, deflate, br');

  if (!headers.has('Authorization') && apiKey) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-ignore - Cloudflare Workers specific
    cf: {
      cacheTtl: 0,
      cacheEverything: false,
    },
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
