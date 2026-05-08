# Meridian — Northflank 部署版

Kimi API 中转代理，带 Web UI 管理后台。支持多 Key 轮询、客户端 Token 认证、请求日志和统计监控。

## 特性

- 🖥️ **Web 管理后台** — 可视化查看日志和统计
- 🔑 **多 Key 轮询** — 支持权重配置，自动负载均衡
- 🔐 **客户端 Token 认证** — 可选的访问控制
- 📊 **实时监控** — 请求数、成功率、平均延迟、Key 状态
- 📝 **请求日志** — 记录每次请求的详情
- 🐳 **Docker 部署** — 零 Volume，纯环境变量配置
- 💾 **SQLite** — 无需外部数据库

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
| `SQLITE_DATABASE` | 否 | `default_db` | SQLite 数据库文件名，填 `:memory:` 则使用内存模式（重启丢失数据） |
| `USER_AGENT` | 否 | `claude-code/1.0` | 请求上游时使用的 User-Agent |
| `PORT` | 否 | `3000` | 服务端口 |

### 最小配置示例

```
API_KEYS=["sk-your-kimi-key-1","sk-your-kimi-key-2"]
ADMIN_PASSWORD=your-admin-password
```

### 带客户端认证的示例

```
API_KEYS=["sk-your-kimi-key-1"]
ADMIN_PASSWORD=your-admin-password
ALLOWED_TOKENS=["sk-willpan","sk-friend-1"]
```

## 客户端配置

### 使用 ALLOWED_TOKENS（推荐）

```bash
curl https://<your-domain>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-willpan" \
  -d '{"model":"kimi-for-coding","messages":[{"role":"user","content":"hello"}]}'
```

### 不使用 ALLOWED_TOKENS（开放访问）

```bash
curl https://<your-domain>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"kimi-for-coding","messages":[{"role":"user","content":"hello"}]}'
```

> 不设置 `ALLOWED_TOKENS` 时，任何人都可以直接调用 API。代理会自动使用环境变量中的 API Key 转发请求。

## 管理后台

部署完成后访问你的服务地址：
- 初始密码：`admin`（或你设置的 `ADMIN_PASSWORD`）

## API 端点

| 端点 | 说明 |
|------|------|
| `GET /health` | 健康检查 |
| `POST /v1/chat/completions` | OpenAI 兼容聊天接口 |
| `GET /v1/models` | 模型列表 |

## 项目结构

```
northflank/
├── src/
│   ├── server.ts         # Express 入口
│   ├── db.ts             # SQLite 数据库
│   ├── keyManager.ts     # API Key 轮询管理
│   ├── proxy.ts          # 上游代理逻辑
│   └── middleware.ts     # 认证和 CORS
├── public/
│   └── index.html        # 管理后台页面
├── Dockerfile
├── package.json
└── tsconfig.json
```
