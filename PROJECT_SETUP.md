# Next.js + Tailwind CSS v4 项目从零搭建指南

## 正确的项目初始化流程

### 1. 创建Next.js项目
```bash
npx create-next-app@latest my-project --typescript --tailwind --eslint --app --src-dir
cd my-project
```

### 2. 升级到Tailwind v4（如果需要）
```bash
# 安装Tailwind v4
pnpm add -D tailwindcss@next @tailwindcss/postcss

# 或者直接使用稳定版本
pnpm add -D tailwindcss@^3.4.0
```

### 3. 配置文件设置

#### package.json
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build", 
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "esModuleInterop": true,
    "moduleResolution": "bundler",  // 重要：v4需要bundler
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{"name": "next"}]
  }
}
```

#### postcss.config.mjs（Tailwind v4）
```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},  // v4专用插件
    autoprefixer: {},
  },
}

export default config
```

#### tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}', 
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
```

#### src/styles/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. 验证设置
```bash
# 安装依赖
pnpm install

# 类型检查
pnpm type-check

# 构建测试
pnpm build

# 启动开发
pnpm dev
```

## 最佳实践

### 依赖版本组合（推荐）
```json
{
  "dependencies": {
    "next": "^15.4.6",
    "react": "^19.1.1", 
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.12",  // v4专用
    "tailwindcss": "^4.1.11",
    "typescript": "^5.9.2",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6"
  }
}
```

### 项目结构
```
my-project/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── styles/
│   │   └── globals.css
│   └── lib/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── postcss.config.mjs
```

## 常见问题解决

### 问题1: PostCSS插件错误
**错误**: `tailwindcss directly as a PostCSS plugin`
**解决**: 安装`@tailwindcss/postcss`并更新配置

### 问题2: TypeScript模块解析
**错误**: `Cannot find module 'tailwindcss'`
**解决**: 设置`"moduleResolution": "bundler"`

### 问题3: 样式不生效
**检查**: 
1. CSS文件是否正确导入到layout.tsx
2. Tailwind配置的content路径是否正确
3. 开发服务器是否重启

## 一键解决脚本

创建一个`fix-tailwind.sh`脚本：
```bash
#!/bin/bash
echo "修复Tailwind CSS v4配置..."

# 安装正确依赖
pnpm add -D @tailwindcss/postcss

# 更新PostCSS配置
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
sed -i 's/"moduleResolution": "node"/"moduleResolution": "bundler"/' tsconfig.json

# 验证修复
echo "运行验证..."
pnpm type-check && pnpm build && echo "✅ 修复成功！"
```

使用方法：
```bash
chmod +x fix-tailwind.sh
./fix-tailwind.sh
```