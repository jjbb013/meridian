export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const url = new URL(request.url);
  let targetPath = url.pathname;
  // Vercel rewrite: /v1/* -> /api/*; map back for upstream
  if (targetPath.startsWith('/api/')) {
    targetPath = '/v1' + targetPath.slice(4);
  }
  const targetUrl = `https://api.kimi.com/coding${targetPath}${url.search}`;

  // 复制请求头
  const headers = new Headers(request.headers);
  headers.set('Host', 'api.kimi.com');
  headers.set('User-Agent', 'claude-code/1.0');

  // 如果请求没带 Authorization，自动注入环境变量中的 Key
  if (!headers.has('Authorization')) {
    const apiKey = process.env.KIMI_API_KEY;
    if (apiKey) {
      headers.set('Authorization', `Bearer ${apiKey}`);
    }
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
  });

  // 添加 CORS
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
