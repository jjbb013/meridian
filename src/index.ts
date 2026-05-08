/**
 * Cloudflare Workers 入口
 * 路由分发：/health、/v1/*
 */

import { handleHealth, handleProxy } from './proxy';

export interface Env {
  KIMI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 健康检查
    if (pathname === '/health') {
      return handleHealth();
    }

    // /v1/chat/completions
    if (pathname === '/v1/chat/completions') {
      return handleProxy(request, env.KIMI_API_KEY, '/v1/chat/completions');
    }

    // /v1/models
    if (pathname === '/v1/models') {
      return handleProxy(request, env.KIMI_API_KEY, '/v1/models');
    }

    // 其他 /v1/* 请求也尝试代理（兼容未来端点）
    if (pathname.startsWith('/v1/')) {
      return handleProxy(request, env.KIMI_API_KEY, pathname);
    }

    // 未匹配路由
    return new Response(
      JSON.stringify({
        error: {
          message: `The requested resource was not found: ${pathname}`,
          type: 'resource_not_found_error',
        },
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  },
};
