#!/bin/bash

echo "🔧 修复Tailwind CSS v4配置..."

# 检查是否为Node.js项目
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到package.json文件"
    exit 1
fi

# 安装正确依赖
echo "📦 安装@tailwindcss/postcss..."
if command -v pnpm &> /dev/null; then
    pnpm add -D @tailwindcss/postcss
elif command -v npm &> /dev/null; then
    npm install -D @tailwindcss/postcss
else
    echo "❌ 错误: 未找到pnpm或npm"
    exit 1
fi

# 更新PostCSS配置
echo "⚙️ 更新PostCSS配置..."
cat > postcss.config.mjs << 'EOF'
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}

export default config
EOF

# 更新TypeScript配置
if [ -f "tsconfig.json" ]; then
    echo "🔧 更新TypeScript配置..."
    # 使用sed替换moduleResolution
    if grep -q '"moduleResolution": "node"' tsconfig.json; then
        sed -i.bak 's/"moduleResolution": "node"/"moduleResolution": "bundler"/' tsconfig.json
        rm tsconfig.json.bak 2>/dev/null || true
        echo "✅ 已更新moduleResolution为bundler"
    else
        echo "ℹ️ TypeScript配置已是正确的"
    fi
fi

# 验证修复
echo ""
echo "🧪 运行验证测试..."

# 类型检查
echo "🔍 类型检查..."
if npm run type-check; then
    echo "✅ 类型检查通过"
else
    echo "❌ 类型检查失败"
    exit 1
fi

# 构建测试
echo "🏗️ 构建测试..."
if npm run build; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败" 
    exit 1
fi

echo ""
echo "🎉 修复完成！现在可以运行 npm run dev 启动开发服务器"
echo ""
echo "📋 修复内容:"
echo "  • 安装了 @tailwindcss/postcss"
echo "  • 更新了 postcss.config.mjs"
echo "  • 设置了 moduleResolution: bundler"
echo "  • 验证了类型检查和构建"