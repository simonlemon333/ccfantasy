# Tailwind CSS v4 + Next.js 调试指南

## 遇到的问题

### 主要错误信息
```
Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. 
The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS 
with PostCSS you'll need to install `@tailwindcss/postcss` and update your PostCSS configuration.
```

```
error TS2307: Cannot find module 'tailwindcss' or its corresponding type declarations.
Consider updating to 'node16', 'nodenext', or 'bundler'.
```

## 根本原因

1. **Tailwind CSS v4 架构变更**: v4版本将PostCSS插件分离到独立包`@tailwindcss/postcss`
2. **TypeScript模块解析**: 旧的`moduleResolution: "node"`不支持v4的新模块结构

## 解决步骤

### 1. 安装正确的依赖
```bash
pnpm add -D @tailwindcss/postcss
```

### 2. 更新 postcss.config.mjs
```javascript
// 错误配置 ❌
const config = {
  plugins: {
    tailwindcss: {},  // 这个在v4中不再工作
    autoprefixer: {},
  },
}

// 正确配置 ✅
const config = {
  plugins: {
    '@tailwindcss/postcss': {},  // 使用新的插件
    autoprefixer: {},
  },
}
```

### 3. 更新 tsconfig.json
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"  // 从 "node" 改为 "bundler"
  }
}
```

## 快速检查清单

当遇到Tailwind相关错误时，按顺序检查：

1. ✅ **检查Tailwind版本**: `package.json`中的`tailwindcss`版本
2. ✅ **检查PostCSS配置**: v4需要`@tailwindcss/postcss`
3. ✅ **检查TypeScript配置**: `moduleResolution`设置
4. ✅ **运行构建测试**: `npm run build`和`npm run type-check`

## 验证修复

```bash
# 类型检查
npm run type-check

# 构建测试  
npm run build

# 启动开发服务器
npm run dev
```

所有命令都应该成功运行，无错误输出。

## 预防措施

1. **版本兼容性**: 升级主要版本时先查看官方迁移指南
2. **配置同步**: Tailwind、PostCSS、TypeScript配置需要保持兼容
3. **测试优先**: 修改配置后立即运行构建和类型检查

## 相关链接

- [Tailwind CSS v4 文档](https://tailwindcss.com/docs)
- [PostCSS插件迁移指南](https://tailwindcss.com/docs/upgrade-guide)