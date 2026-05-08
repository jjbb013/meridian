# Meridian — Northflank 部署版

Kimi API 中转代理，带 Web UI 管理后台，支持多 Key 轮询、请求日志和统计监控。

## 特性

- 🖥️ **Web 管理后台** — 可视化配置 API Keys、查看日志和统计
- 🔑 **多 Key 轮询** — 支持权重配置，自动负载均衡
- 📊 **实时监控** — 请求数、成功率、平均延迟、Key 状态
- 📝 **请求日志** — 记录每次请求的详情，方便排查问题
- 🐳 **Docker 部署** — 一键部署到 Northflank 等容器平台
- 🔒 **管理后台认证** — 密码保护，安全可控

## 部署到 Northflank

### 方式一：使用 Git 仓库

1. 在 Northflank Dashboard 创建新项目
2. 选择 **Create Service** → **Combined service**
3. 选择 Git 提供商，连接本仓库
4. 构建方式选择 **Dockerfile**，路径填 `./northflank/Dockerfile`
5. 在 **Environment variables** 中添加：
   - `ADMIN_PASSWORD` = 你的管理后台密码（默认 `admin`）
6. 在 **Volumes** 中添加持久化卷：
   - 挂载路径：`/data`（用于保存 SQLite 数据库）
7. 点击 **Create Service**

### 方式二：使用 Docker 镜像

1. 本地构建镜像：
   ```bash
   cd northflank
   docker build -t meridian-northflank .
   ```
2. 推送到镜像仓库（Docker Hub / GitHub Container Registry）
3. 在 Northflank 选择镜像部署

## 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `PORT` | 否 | `3000` | 服务端口 |
| `ADMIN_PASSWORD` | 否 | `admin` | 管理后台密码 |
| `DB_PATH` | 否 | `./data/meridian.db` | SQLite 数据库路径 |
| `UPSTREAM_BASE` | 否 | `https://api.kimi.com/coding` | 上游 API 地址 |
| `USER_AGENT` | 否 | `claude-code/1.0` | 请求上游时使用的 User-Agent |

## 管理后台

部署完成后访问你的服务地址，默认进入管理后台登录页。

### 初始配置

1. 登录管理后台（默认密码 `admin`）
2. 进入 **API Keys** 页面，添加你的 Kimi API Keys
3. 进入 **设置** 页面，修改管理密码

### API 使用

```bash
curl https://<your-domain>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "model": "kimi-for-coding",
    "messages": [{"role": "user", "content": "hello"}]
  }'
```

如果没有携带 `Authorization`，系统会自动使用轮询的 API Key。

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
