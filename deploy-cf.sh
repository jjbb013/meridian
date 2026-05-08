#!/bin/bash
set -e

echo "☁️  Meridian — Cloudflare Workers 一键部署"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 需要 Node.js，请先安装 https://nodejs.org"
    exit 1
fi

# 检查 Wrangler CLI
if ! command -v wrangler &> /dev/null; then
    echo "📦 安装 Wrangler CLI..."
    npm install -g wrangler
fi

# 检查登录状态
echo "🔑 检查 Cloudflare 登录状态..."
if ! wrangler whoami &> /dev/null; then
    echo "请先登录 Cloudflare："
    wrangler login
fi

# 输入 API Key
echo ""
read -sp "请输入你的 Kimi API Key: " KIMI_KEY
echo ""
echo ""

# 设置 secret
echo "🔐 设置环境变量..."
echo "$KIMI_KEY" | wrangler secret put KIMI_API_KEY

# 部署并捕获输出
echo ""
echo "🚀 部署到 Cloudflare Workers..."
DEPLOY_OUTPUT=$(wrangler deploy 2>&1)
echo "$DEPLOY_OUTPUT"

# 解析部署 URL
WORKER_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://[^ ]+\.workers\.dev' | head -1)

echo ""
echo "✅ 部署完成！"
echo ""

if [ -n "$WORKER_URL" ]; then
    echo "你的代理地址：$WORKER_URL"
    echo ""
    echo "使用方式："
    echo "  export KIMI_BASE_URL=$WORKER_URL"
    echo "  export KIMI_API_KEY=$KIMI_KEY"
    echo ""
    echo "测试命令："
    echo "  curl $WORKER_URL/health"
    echo "  curl $WORKER_URL/v1/models -H \"Authorization: Bearer $KIMI_KEY\""
else
    echo "⚠️  无法自动获取 Workers URL，请查看上方输出中的部署地址"
fi
