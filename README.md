# Kimi API Proxy

Kimi API 中转代理，基于 Vercel Edge Function 构建。只需提供 Kimi API Key，一键部署，即可通过你自己的域名调用 Kimi API。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjjbb013%2Fmeridian&env=KIMI_API_KEY&env-description=Kimi%20API%20Key%20from%20https%3A%2F%2Fplatform.moonshot.cn&project-name=meridian&repository-name=meridian)

## 特性

- ⚡ **Vercel Edge Function** — 全球边缘节点加速
- 🔑 **自动注入 API Key** — 未携带 Authorization 时自动使用环境变量中的 Key
- 🌐 **完整 CORS 支持** — 开箱即用，支持浏览器端直接调用
- 🚀 **一键部署** — 点击上方按钮或运行脚本，无需手动配置 Vercel Dashboard
- 📡 **流式 SSE 支持** — 完整支持 Kimi 流式响应

## 前置条件

| 条件 | 获取方式 |
|------|---------|
| Vercel 账号 | https://vercel.com/signup（可用 GitHub 账号直接登录） |
| Kimi API Key | https://platform.moonshot.cn |

> 方式一（推荐）只需 Vercel 账号和 API Key；方式二额外需要 Node.js + Git。

---

## 部署方式一：点击 Deploy Button（推荐 ⭐）

无需本地安装任何工具，点击上方 **「Deploy with Vercel」** 按钮：

1. 跳转 Vercel 页面，选择你的 GitHub 账号
2. 填写 **Project Name**（项目名称）
3. 在 **Environment Variables** 区域填写：
   - `KIMI_API_KEY` = 你的 Kimi API Key
4. 点击 **Deploy**

等待约 30 秒，即可获得你的专属代理地址。

### 点击按钮后遇到 404？

如果点击 Deploy Button 后页面显示 `404: NOT_FOUND`，通常是 **Vercel 与 GitHub 的连接状态** 问题，按以下步骤解决：

1. **确保已登录 Vercel**：访问 https://vercel.com/login 用 GitHub 账号登录
2. **重新授权 GitHub**：访问 https://vercel.com/settings/git → 点击 GitHub 右侧的 **「Disconnect」** → 然后 **「Connect」** 重新授权
3. **刷新页面重试**：授权完成后，重新点击 Deploy Button
4. **如果仍有问题**：改用下方的「本地脚本部署」方式，同样是一键完成

> 这是 Vercel 的已知偶发问题，与项目代码无关。CLI 脚本部署不受此影响。

### 验证部署

```bash
# 健康检查
curl https://<你的域名>/health

# 获取模型列表
curl https://<你的域名>/v1/models \
  -H "Authorization: Bearer your_kimi_api_key"
```

---

## 部署方式二：本地脚本部署

适合需要二次开发或偏好命令行的用户。

### 额外前置条件

| 条件 | 获取方式 |
|------|---------|
| Node.js 18+ | https://nodejs.org |
| Git | https://git-scm.com |

### 1. 克隆仓库

```bash
git clone https://github.com/jjbb013/meridian.git
cd meridian
```

### 2. 运行部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

脚本会自动完成以下操作：
- 检查并安装 Vercel CLI
- 引导 Vercel 登录（如未登录）
- 交互式输入 Kimi API Key
- 推送代码到 GitHub
- 部署到 Vercel 并设置环境变量

### 3. 验证部署

同上。

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
    model="moonshot-v1-8k",
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
    "model": "moonshot-v1-8k",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

## 项目结构

```
meridian/
├── api/
│   ├── v1/
│   │   └── [[...path]].ts    # 主代理路由，透传所有 /v1/* 请求
│   └── health.ts             # 健康检查
├── vercel.json               # Vercel 路由与响应头配置
├── package.json              # 依赖与脚本
├── tsconfig.json             # TypeScript 配置
├── .env.example              # 环境变量模板
├── deploy.sh                 # 一键部署脚本
└── README.md                 # 本文档
```

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `KIMI_API_KEY` | 是 | Kimi API Key，用于自动注入 Authorization |

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

## 注意事项

- 免费版 Vercel 有 [使用限制](https://vercel.com/docs/concepts/limits/overview)，高并发场景请升级套餐
- API Key 通过 Vercel 环境变量安全存储，不会暴露在代码中
- 建议配合 GitHub Actions 实现 push 自动部署（见 `.github/workflows/deploy.yml`）

## License

MIT
