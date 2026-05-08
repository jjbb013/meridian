# Kimi API Proxy

Kimi API 中转代理，支持 **Vercel Edge Function** 和 **Cloudflare Workers** 双平台部署。只需提供 Kimi API Key，一键部署，即可通过你自己的域名调用 Kimi API。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjjbb013%2Fmeridian&env=KIMI_API_KEY&env-description=Kimi%20API%20Key%20from%20https%3A%2F%2Fplatform.moonshot.cn&project-name=meridian&repository-name=meridian)

## 特性

- ⚡ **Vercel Edge Function** — 全球边缘节点加速
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

## ⚠️ Cloudflare Workers 支持（实验性）

本项目包含 Cloudflare Workers 的代码和配置，但由于 **Kimi API (`api.kimi.com`) 本身也使用 Cloudflare 保护**，其 Bot Management 策略会拦截来自 Cloudflare Workers 数据中心 IP 的请求，导致 `/v1/*` 端点返回 403 验证页面。

**因此，目前推荐仅使用 Vercel 部署。** 如果你仍想尝试 Cloudflare Workers：

```bash
npm install
npx wrangler login
npx wrangler secret put KIMI_API_KEY
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
│   │   │   └── completions.ts   # /v1/chat/completions
│   │   └── models.ts            # /v1/models
│   └── health.ts                # /health
├── src/
│   └── proxy.ts                 # 共享代理逻辑
├── vercel.json                  # Vercel 路由配置
├── package.json                 # 依赖与脚本
├── tsconfig.json                # TypeScript 配置
├── .env.example                 # 环境变量模板
├── deploy.sh                    # 一键部署脚本
└── README.md                    # 本文档
```

---

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `KIMI_API_KEY` | 是 | Kimi API Key，用于自动注入 Authorization |

---

## 平台限制

Vercel 免费版有 [使用限制](https://vercel.com/docs/concepts/limits/overview)，高并发场景请升级套餐。

---

## 手动部署

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
