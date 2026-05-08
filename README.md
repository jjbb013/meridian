# Meridian — Kimi API 中转代理

支持 **OpenAI** 和 **Anthropic** 双协议格式的 Kimi API 中转代理。提供 Web UI 管理后台、多 Key 轮询、客户端 Token 认证、请求日志和统计监控。

| 部署平台 | 推荐度 | 特性 |
|---------|-------|------|
| **Northflank** | ⭐ 推荐 | Docker + SQLite，完整管理后台，多 Key 轮询 |
| **Vercel** | 可用 | Edge Function，轻量，无状态 |

---

## 特性

- 🤖 **双协议兼容** — 同时支持 OpenAI (`/v1/chat/completions`) 和 Anthropic (`/v1/messages`) API 格式
- 🖥️ **Web 管理后台** — 可视化配置 API Keys、查看日志、统计监控（Northflank 版）
- 🔑 **多 Key 轮询** — 支持权重配置，自动负载均衡，失败自动降级
- 🔐 **客户端 Token 认证** — 可选的访问控制，支持 Bearer Token 和 X-Api-Key
- 📊 **实时监控** — 请求数、成功率、平均延迟、Key 状态
- 📝 **请求日志** — 记录每次请求的详情，方便排查问题
- 🌐 **完整 CORS 支持** — 开箱即用，支持浏览器端直接调用
- 📡 **流式 SSE 支持** — 完整支持流式响应（两种协议）
- 🐳 **Docker 部署** — 零 Volume，纯环境变量配置

---

## 部署方式一：Northflank（推荐 ⭐）

适合需要**多 Key 轮询、请求日志、统计监控、Web 管理**的用户。

### 部署步骤

1. 在 Northflank Dashboard 创建新项目
2. 选择 **Create Service** → **Combined service**
3. 选择 Git 提供商，连接本仓库
4. 构建方式选择 **Dockerfile**，Dockerfile 路径填 `./Dockerfile.northflank`
5. 在 **Environment variables** 中添加（见下方）
6. 点击 **Create Service**

### 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `API_KEYS` | **是** | `[]` | Kimi API Keys，JSON 数组格式，如 `["sk-xxx","sk-yyy"]` |
| `ADMIN_PASSWORD` | 否 | `admin` | 管理后台密码 |
| `ALLOWED_TOKENS` | 否 | — | 客户端访问令牌，JSON 数组格式。设置后客户端必须携带匹配的 Token |
| `DATABASE_TYPE` | 否 | `sqlite` | 数据库类型 |
| `SQLITE_DATABASE` | 否 | `:memory:` | SQLite 数据库。填 `:memory:` 使用内存模式（重启丢失数据），或填文件名持久化 |
| `USER_AGENT` | 否 | `claude-code/1.0` | 请求上游时使用的 User-Agent |
| `PORT` | 否 | `3000` | 服务端口 |

### 最小配置示例

```
API_KEYS=["sk-your-kimi-key-1"]
ADMIN_PASSWORD=your-admin-password
```

### 带客户端认证的示例

```
API_KEYS=["sk-your-kimi-key-1","sk-your-kimi-key-2"]
ADMIN_PASSWORD=your-admin-password
ALLOWED_TOKENS=["sk-willpan","sk-friend-1"]
```

详细说明见 [`northflank/README.md`](northflank/README.md)。

---

## 部署方式二：Vercel

适合轻量、无状态、快速部署的场景。

### 点击 Deploy Button

无需本地安装任何工具：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjjbb013%2Fmeridian&env=KIMI_API_KEY&env-description=Kimi%20API%20Key%20from%20https%3A%2F%2Fplatform.moonshot.cn&project-name=meridian&repository-name=meridian)

1. 跳转 Vercel 页面，选择你的 GitHub 账号
2. 填写 **Project Name**（项目名称）
3. 在 **Environment Variables** 区域填写：
   - `KIMI_API_KEY` = 你的 Kimi API Key
4. 点击 **Deploy**

等待约 30 秒，即可获得你的专属代理地址。

> ⚠️ **注意仓库可见性**：Vercel 的 Deploy Button 默认可能将你的 GitHub 仓库创建为 **Private（私有）**。如果你希望仓库是公开的，部署完成后可以前往 GitHub → 该仓库 → Settings → Danger Zone → **Change repository visibility** → 改为 Public。

### 本地脚本部署

```bash
git clone https://github.com/jjbb013/meridian.git
cd meridian
chmod +x deploy.sh
./deploy.sh
```

---

## API 端点

### 双协议支持

| 协议 | 端点 | 认证方式 |
|------|------|---------|
| **OpenAI** | `POST /v1/chat/completions` | `Authorization: Bearer <token>` |
| **OpenAI** | `GET /v1/models` | `Authorization: Bearer <token>` |
| **Anthropic** | `POST /v1/messages` | `X-Api-Key: <token>` 或 `Authorization: Bearer <token>` |
| **Anthropic** | `GET /v1/models` | `X-Api-Key: <token>` 或 `Authorization: Bearer <token>` |

> `/v1/models` 会根据请求头智能判断协议：带 `X-Api-Key` 或 `Anthropic-Version` 时返回 Anthropic 格式，否则返回 OpenAI 格式。

### 管理端点（Northflank 版）

| 端点 | 说明 |
|------|------|
| `GET /health` | 健康检查 |
| `GET /admin/stats` | 统计数据 |
| `GET /admin/keys` | API Key 列表 |
| `POST /admin/keys` | 添加 Key |
| `DELETE /admin/keys/:id` | 删除 Key |
| `PATCH /admin/keys/:id` | 启用/禁用/更新 Key |
| `GET /admin/logs` | 请求日志 |
| `GET /admin/settings` | 系统设置 |
| `POST /admin/settings` | 更新设置 |

---

## 客户端配置

### OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-client-token",
    base_url="https://<your-domain>/v1"
)

response = client.chat.completions.create(
    model="kimi-for-coding",
    messages=[{"role": "user", "content": "你好"}]
)
print(response.choices[0].message.content)
```

### Anthropic SDK

```python
from anthropic import Anthropic

client = Anthropic(
    api_key="your-client-token",
    base_url="https://<your-domain>"
)

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "你好"}]
)
print(response.content[0].text)
```

> 所有 Claude 模型名会自动映射到 `kimi-for-coding`。

### Cline / OpenCode / 其他 IDE 插件

**OpenAI 模式：**

| 设置项 | 值 |
|--------|-----|
| API Provider | `OpenAI Compatible` |
| Base URL | `https://<your-domain>/v1` |
| API Key | 你的客户端 Token |
| Model ID | `kimi-for-coding` |

**Anthropic 模式：**

| 设置项 | 值 |
|--------|-----|
| API Provider | `Anthropic` |
| Base URL | `https://<your-domain>` |
| API Key | 你的客户端 Token |
| Model ID | `claude-3-5-sonnet-20241022` |

### cURL

```bash
# OpenAI 协议
curl https://<your-domain>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-client-token" \
  -d '{"model":"kimi-for-coding","messages":[{"role":"user","content":"hello"}]}'

# Anthropic 协议
curl https://<your-domain>/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your-client-token" \
  -H "Anthropic-Version: 2023-06-01" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,"messages":[{"role":"user","content":"hello"}]}'
```

---

## 安全模型

- **客户端的 `Authorization` / `X-Api-Key` 仅用于认证谁有权访问代理**
- **请求 Kimi 上游时，代理永远使用 `API_KEYS` 环境变量中的 Key**
- 如果设置了 `ALLOWED_TOKENS`，客户端必须提供其中之一
- 如果没设置 `ALLOWED_TOKENS`，客户端必须提供 `ADMIN_PASSWORD`
- 无效 Key（如 `noop`、长度<8）会被拒绝

---

## 验证部署

```bash
# 健康检查
curl https://<your-domain>/health

# OpenAI 模型列表
curl https://<your-domain>/v1/models \
  -H "Authorization: Bearer your-client-token"

# Anthropic 模型列表
curl https://<your-domain>/v1/models \
  -H "X-Api-Key: your-client-token" \
  -H "Anthropic-Version: 2023-06-01"
```

---

## 项目结构

```
meridian/
├── api/                         # Vercel Edge Functions
│   ├── v1/
│   │   ├── chat/
│   │   │   └── completions.ts
│   │   └── models.ts
│   └── health.ts
├── northflank/                  # Northflank 部署版（Docker + Express + SQLite）
│   ├── src/
│   │   ├── server.ts            # Express 入口
│   │   ├── db.ts                # SQLite 数据库
│   │   ├── keyManager.ts        # API Key 轮询管理
│   │   ├── proxy.ts             # OpenAI 协议代理
│   │   ├── anthropic.ts         # Anthropic 协议转换
│   │   └── middleware.ts        # 认证和 CORS
│   ├── public/
│   │   └── index.html           # Web 管理后台
│   ├── Dockerfile.northflank
│   ├── package.json
│   └── tsconfig.json
├── src/                         # 共享代理逻辑（Vercel 用）
│   └── proxy.ts
├── vercel.json                  # Vercel 路由配置
├── package.json
├── tsconfig.json
├── .env.example
├── deploy.sh                    # Vercel 一键部署脚本
└── README.md                    # 本文档
```

---

## ⚠️ Cloudflare Workers

本项目包含 Cloudflare Workers 的代码，但由于 **Kimi API (`api.kimi.com`) 本身也使用 Cloudflare 保护**，其 Bot Management 策略会拦截来自 Cloudflare Workers 数据中心 IP 的请求，导致返回 403。

**因此，目前推荐仅使用 Northflank 或 Vercel 部署。**

---

## License

MIT
