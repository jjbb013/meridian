# Kimi API Proxy — Agent 指南

## 项目概述

这是一个基于 Vercel Edge Function 的 API 中转代理，核心目标是将请求透传到 `https://api.moonshot.cn`，同时自动注入 API Key 并添加 CORS 响应头。

## 技术栈

- **Runtime**: Vercel Edge Function (`runtime: 'edge'`)
- **语言**: TypeScript
- **部署平台**: Vercel

## 关键文件说明

| 文件 | 职责 |
|------|------|
| `api/v1/[[...path]].ts` | 核心代理逻辑。捕获 `/v1/*` 所有路径，转发到 Kimi API，自动注入 `Authorization`，添加 CORS |
| `api/health.ts` | 健康检查端点，返回 `{ status: 'ok', service: 'meridian' }` |
| `vercel.json` | 路由重写（`/health` → `/api/health`）和自定义响应头 |
| `deploy.sh` | 一键部署脚本，处理 Vercel CLI 安装、登录、环境变量注入、Git 推送和部署 |

## 代理逻辑要点

1. **请求转发**: `https://api.moonshot.cn${targetPath}${url.search}`
2. **Host 头重写**: 必须将 `Host` 设置为 `api.moonshot.cn`
3. **自动鉴权**: 如果请求未携带 `Authorization`，自动使用 `process.env.KIMI_API_KEY`
4. **CORS**: 所有响应都添加 `Access-Control-Allow-Origin: *` 等头
5. **OPTIONS 预检**: 单独处理，直接返回 204
6. **流式支持**: 使用 `response.body` 直接透传 ReadableStream，天然支持 SSE

## 开发注意事项

- Edge Function 环境接近 Service Worker，**不支持 Node.js 原生模块**
- 只能使用 Web 标准 API（`fetch`, `Request`, `Response`, `Headers`）
- 不要引入 `fs`, `path`, `http` 等 Node.js 模块
- 环境变量通过 `process.env.*` 读取

## 测试方法

本地开发：
```bash
npm run dev    # 等价于 vercel dev
```

冒烟测试：
```bash
curl http://localhost:3000/health
curl http://localhost:3000/v1/models -H "Authorization: Bearer $KIMI_API_KEY"
```

## 修改规范

- 保持 `runtime: 'edge'` 配置
- 代理逻辑变更需同时更新 README 中的客户端示例
- `deploy.sh` 修改后确保在 macOS / Linux 下可执行
- 新增环境变量需在 `deploy.sh` 和 `.env.example` 中同步
