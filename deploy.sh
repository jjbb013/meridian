#!/bin/bash
set -e

echo "🚀 Kimi API Proxy — Vercel 一键部署"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 需要 Node.js，请先安装 https://nodejs.org"
    exit 1
fi

# 检查 Git
if ! command -v git &> /dev/null; then
    echo "❌ 需要 Git"
    exit 1
fi

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 安装 Vercel CLI..."
    npm install -g vercel
fi

# 检查登录状态
echo "🔑 检查 Vercel 登录状态..."
if ! vercel whoami &> /dev/null; then
    echo "请先登录 Vercel："
    vercel login
fi

# 输入 API Key
echo ""
read -sp "请输入你的 Kimi API Key: " KIMI_KEY
echo ""
echo ""

# 创建 .env 文件（本地测试用）
echo "KIMI_API_KEY=$KIMI_KEY" > .env
echo "✅ 已创建 .env 文件"

# 初始化 Git（如果还没初始化）
if [ ! -d ".git" ]; then
    echo "📁 初始化 Git 仓库..."
    git init
    git add .
    git commit -m "init: kimi api proxy"
    git branch -M main
fi

# 检查是否有远程仓库
if ! git remote get-url origin &> /dev/null; then
    echo ""
    echo "⚠️  请先将代码推送到 GitHub："
    echo "   git remote add origin https://github.com/你的用户名/meridian.git"
    echo "   git push -u origin main"
    echo ""
    echo "完成后重新运行 ./deploy.sh"
    exit 1
fi

# 确保代码已推送
echo "☁️  推送代码到 GitHub..."
git add .
git commit -m "deploy: update proxy" || true
git push origin main

# 设置环境变量并部署
echo ""
echo "🚀 部署到 Vercel..."
vercel --prod --yes \
  --env KIMI_API_KEY="$KIMI_KEY"

echo ""
echo "✅ 部署完成！"
echo ""

# 获取部署域名
DEPLOY_URL=$(vercel ls --meta | grep -o 'https://[^ ]*' | head -1)
echo "你的代理地址：$DEPLOY_URL"
echo ""
echo "使用方式："
echo "  export KIMI_BASE_URL=$DEPLOY_URL"
echo "  export KIMI_API_KEY=$KIMI_KEY"
echo ""
echo "测试命令："
echo "  curl $DEPLOY_URL/health"
echo "  curl $DEPLOY_URL/v1/models -H \"Authorization: Bearer $KIMI_KEY\""
