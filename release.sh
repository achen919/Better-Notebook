#!/bin/bash

# 艾宾浩斯错题本发布脚本
# 使用方法: ./release.sh [patch|minor|major]

# ============================================
# 在这里填写你的 GitHub Token
# ============================================
GH_TOKEN="ghp_你的token写在这里"

# 检查是否已填写 token
if [[ "$GH_TOKEN" == "ghp_你的token写在这里" ]]; then
    echo "❌ 错误：请先在脚本中填写你的 GitHub Token"
    echo "   打开 release.sh 文件，修改 GH_TOKEN 变量"
    exit 1
fi

# 导出 token
export GH_TOKEN

# 获取版本更新类型，默认 patch
VERSION_TYPE=${1:-patch}

echo "================================"
echo "🚀 艾宾浩斯错题本发布脚本"
echo "================================"
echo ""

# 显示当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 当前版本: v$CURRENT_VERSION"
echo "📌 更新类型: $VERSION_TYPE"
echo ""

# 确认发布
read -p "确认发布新版本？(y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消发布"
    exit 0
fi

echo ""
echo "1️⃣  更新版本号..."
npm version $VERSION_TYPE -m "chore: bump version to %s"

if [ $? -ne 0 ]; then
    echo "❌ 版本更新失败"
    exit 1
fi

NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ 新版本: v$NEW_VERSION"
echo ""

echo "2️⃣  构建并发布..."
echo "⏳ 这可能需要几分钟..."
echo ""

npm run release

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 发布失败，请检查错误信息"
    echo "   如果是网络问题，可以重试"
    exit 1
fi

echo ""
echo "================================"
echo "✅ 发布成功！"
echo "================================"
echo "📦 版本: v$NEW_VERSION"
echo "🔗 下载地址: https://github.com/achen919/ebbinghaus-notebook/releases"
echo ""
echo "💡 提示："
echo "   - 记得 git push 提交代码"
echo "   - 用户可以在应用中检查更新"
