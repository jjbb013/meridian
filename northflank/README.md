# Meridian — Northflank 部署版

Kimi API 中转代理，带 Web UI 管理后台。支持 **OpenAI** 和 **Anthropic** 双协议、多 Key 轮询、客户端 Token 认证、请求日志和统计监控。

## 特性

- 🤖 **双协议兼容** — OpenAI (`/v1/chat/completions`) + Anthropic (`/v1/messages`)
- 🖥️ **Web 管理后台** — 可视化查看日志和统计
- 🔑 **多 Key 轮询** — 支持权重配置，自动负载均衡
- 🔐 **客户端 Token 认证** — 可选的访问控制
- 📊 **实时监控** — 请求数、成功率、平均延迟、Key 状态
- 📝 **请求日志** — 记录每次请求的详情
- 🐳 **Docker 部署** — 零 Volume，纯环境变量配置
- 💾 **SQLite** — 无需外部数据库，支持内存模式或文件持久化

## 部署到 Northflank

1. 在 Northflank Dashboard 创建新项目
2. 选择 **Create Service** → **Combined service**
3. 选择 Git 提供商，连接本仓库
4. 构建方式选择 **Dockerfile**，路径填 `./Dockerfile.northflank`
5. 在 **Environment variables** 中添加（下方有说明）
6. 点击 **Create Service**

## 环境变量

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

## API 端点

### 双协议支持

| 协议 | 端点 | 认证方式 |
|------|------|---------|
| **OpenAI** | `POST /v1/chat/completions` | `Authorization: Bearer <token>` |
| **OpenAI** | `GET /v1/models` | `Authorization: Bearer <token>` |
| **Anthropic** | `POST /v1/messages` | `X-Api-Key: <token>` 或 `Authorization: Bearer <token>` |
| **Anthropic** | `GET /v1/models` | `X-Api-Key: <token>` 或 `Authorization: Bearer <token>` |

> `/v1/models` 会根据请求头智能判断协议：带 `X-Api-Key` 或 `Anthropic-Version` 时返回 Anthropic 格式，否则返回 OpenAI 格式。

### 管理端点

| 端点 | 说明 | 认证 |
|------|------|------|
| `GET /health` | 健康检查 | 无需认证 |
| `GET /admin/stats` | 统计数据（总请求数、成功率、平均延迟、Key 数量） | Bearer Token = ADMIN_PASSWORD |
| `GET /admin/keys` | API Key 列表（Key 已脱敏） | Bearer Token = ADMIN_PASSWORD |
| `POST /admin/keys` | 添加 Key（body: `{key, name?, weight?}`） | Bearer Token = ADMIN_PASSWORD |
| `DELETE /admin/keys/:id` | 删除 Key | Bearer Token = ADMIN_PASSWORD |
| `PATCH /admin/keys/:id` | 启用/禁用/更新 Key（body: `{enabled?, name?, weight?}`） | Bearer Token = ADMIN_PASSWORD |
| `GET /admin/logs` | 请求日志（query: `?limit=100`） | Bearer Token = ADMIN_PASSWORD |
| `GET /admin/settings` | 系统设置 | Bearer Token = ADMIN_PASSWORD |
| `POST /admin/settings` | 更新设置（body: `{user_agent?, admin_password?}`） | Bearer Token = ADMIN_PASSWORD |

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

### Cline / OpenCode 等 IDE 插件

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

## 管理后台

部署完成后访问你的服务地址：
- 初始密码：`admin`（或你设置的 `ADMIN_PASSWORD`）

管理后台功能：
- **概览** — 查看总请求数、成功率、平均延迟、API Key 数量
- **API Keys** — 添加/删除/启用/禁用 Key，设置权重
- **日志** — 查看每次请求的详情（时间、Key、状态、延迟）
- **设置** — 修改 User-Agent、管理密码

## 安全模型

- **客户端的 `Authorization` / `X-Api-Key` 仅用于认证谁有权访问代理**
- **请求 Kimi 上游时，代理永远使用 `API_KEYS` 环境变量中的 Key**
- 如果设置了 `ALLOWED_TOKENS`，客户端必须提供其中之一
- 如果没设置 `ALLOWED_TOKENS`，客户端必须提供 `ADMIN_PASSWORD`
- 无效 Key（如 `noop`、长度<8）会被拒绝

## 项目结构

```
northflank/
├── src/
│   ├── server.ts         # Express 入口
│   ├── db.ts             # SQLite 数据库
│   ├── keyManager.ts     # API Key 轮询管理
│   ├── proxy.ts          # OpenAI 协议代理
│   ├── anthropic.ts      # Anthropic 协议转换
│   └── middleware.ts     # 认证和 CORS
├── public/
│   └── index.html        # Web 管理后台
├── Dockerfile.northflank
├── package.json
└── tsconfig.json
```
