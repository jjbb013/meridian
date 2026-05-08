# Kimi API Proxy

Kimi API 中转代理，支持 **Vercel Edge Function** 和 **Cloudflare Workers** 双平台部署。只需提供 Kimi API Key，一键部署，即可通过你自己的域名调用 Kimi API。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjjbb013%2Fmeridian&env=KIMI_API_KEY&env-description=Kimi%20API%20Key%20from%20https%3A%2F%2Fplatform.moonshot.cn&project-name=meridian&repository-name=meridian)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jjbb013/meridian)

## 特性

- ⚡ **双平台支持** — Vercel Edge Function + Cloudflare Workers
- 🔑 **自动注入 API Key** — 未携带 Authorization 时自动使用环境变量中的 Key
- 🌐 **完整 CORS 支持** — 开箱即用，支持浏览器端直接调用
- 🚀 **一键部署** — 点击按钮或运行脚本，无需手动配置 Dashboard
- 📡 **流式 SSE 支持** — 完整支持 Kimi 流式响应

## 前置条件

| 条件 | 获取方式 |
|------|---------|
| Kimi API Key | https://platform.moonshot.cn |

> 任选下方一种部署方式即可。

---

## 部署方式一：Vercel（推荐 ⭐）

### 方式 1a：点击 Deploy Button

无需本地安装任何工具，点击上方 **「Deploy with Vercel」** 按钮：

1. 跳转 Vercel 页面，选择你的 GitHub 账号
2. 填写 **Project Name**（项目名称）
3. 在 **Environment Variables** 区域填写：
   - `KIMI_API_KEY` = 你的 Kimi API Key
4. 点击 **Deploy**

等待约 30 秒，即可获得你的专属代理地址。

> ⚠️ **注意仓库可见性**：Vercel 的 Deploy Button 默认可能将你的 GitHub 仓库创建为 **Private（私有）**。如果你希望仓库是公开的，部署完成后可以前往 GitHub → 该仓库 → Settings → Danger Zone → **Change repository visibility** → 改为 Public。

### 方式 1b：本地脚本部署

```bash
git clone https://github.com/jjbb013/meridian.git
cd meridian
chmod +x deploy.sh
./deploy.sh
```

脚本会自动完成以下操作：
- 检查并安装 Vercel CLI
- 引导 Vercel 登录（如未登录）
- 交互式输入 Kimi API Key
- 推送代码到 GitHub
- 部署到 Vercel 并设置环境变量

---

## 部署方式二：Cloudflare Workers

### 方式 2a：点击 Deploy Button

点击上方 **「Deploy to Cloudflare Workers」** 按钮：

1. 登录你的 Cloudflare 账号
2. Fork 本仓库到你自己的 GitHub 账号
3. 在 Cloudflare Dashboard 中绑定 Fork 后的仓库
4. 在 **Settings → Variables** 中添加：
   - `KIMI_API_KEY` = 你的 Kimi API Key
5. 点击 **Save and Deploy**

### 方式 2b：本地脚本部署

```bash
git clone https://github.com/jjbb013/meridian.git
cd meridian
chmod +x deploy-cf.sh
./deploy-cf.sh
```

脚本会自动完成以下操作：
- 检查并安装 Wrangler CLI
- 引导 Cloudflare 登录（如未登录）
- 交互式输入 Kimi API Key
- 设置 Workers Secret
- 部署到 Cloudflare Workers

### 方式 2c：手动部署

```bash
# 安装依赖
npm install

# 登录 Cloudflare
npx wrangler login

# 设置 API Key（Secret）
echo "your_kimi_api_key" | npx wrangler secret put KIMI_API_KEY

# 部署
npx wrangler deploy
```

---

## 验证部署

```bash
# 健康检查
curl https://<你的域名>/health

# 获取模型列表
curl https://<你的域名>/v1/models \
  -H "Authorization: Bearer your_kimi_api_key"
```

---

## 客户端配置

### Kimi Code / Kimi CLI

```bash
export KIMI_BASE_URL=https://<你的域名>
export KIMI_API_KEY=your_kimi_api_key
```

### OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="your_kimi_api_key",
    base_url="https://<你的域名>/v1"
)

response = client.chat.completions.create(
    model="kimi-for-coding",
    messages=[{"role": "user", "content": "你好"}]
)
print(response.choices[0].message.content)
```

### cURL

```bash
curl https://<你的域名>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_kimi_api_key" \
  -d '{
    "model": "kimi-for-coding",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

### Cline / OpenCode 等 IDE 插件

| 设置项 | 值 |
|--------|-----|
| API Provider | `OpenAI Compatible` |
| Base URL | `https://<你的域名>/v1` |
| API Key | 你的 Kimi API Key |
| Model ID | `kimi-for-coding` |

---

## 项目结构

```
meridian/
├── api/
│   ├── v1/
│   │   ├── chat/
│   │   │   └── completions.ts   # Vercel: /v1/chat/completions
│   │   └── models.ts            # Vercel: /v1/models
│   └── health.ts                # Vercel: /health
├── src/
│   ├── proxy.ts                 # 共享代理逻辑
│   └── index.ts                 # Cloudflare Workers 入口
├── vercel.json                  # Vercel 路由配置
├── wrangler.toml                # Cloudflare Workers 配置
├── package.json                 # 依赖与脚本
├── tsconfig.json                # TypeScript 配置
├── .env.example                 # 环境变量模板
├── deploy.sh                    # Vercel 一键部署脚本
├── deploy-cf.sh                 # Cloudflare 一键部署脚本
└── README.md                    # 本文档
```

---

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `KIMI_API_KEY` | 是 | Kimi API Key，用于自动注入 Authorization |

---

## 平台限制

| 平台 | 免费额度 | 限制说明 |
|------|---------|---------|
| Vercel | 100 GB·月 带宽 | Edge Function 执行时间最长 30s |
| Cloudflare Workers | 100,000 请求/天 | 单次请求 CPU 时间最长 50ms |

---

## 手动部署（Vercel）

如果你不想使用 `deploy.sh`，也可以手动操作：

```bash
# 安装依赖
npm install

# 登录 Vercel
npx vercel login

# 设置环境变量
npx vercel env add KIMI_API_KEY

# 部署
npx vercel --prod
```

---

## License

MIT
