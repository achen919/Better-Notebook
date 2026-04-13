# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

这是一个基于艾宾浩斯遗忘曲线算法管理学习笔记和错题的 Electron 应用。使用 React、TypeScript 和 Vite 构建。

## 常用命令

```bash
# 开发
yarn dev          # 启动 Vite 开发服务器和 Electron

# 构建
yarn build        # TypeScript 检查 + Vite 构建 + electron-builder（全平台）
yarn build:mac    # 仅构建 macOS 版本
yarn build:web    # 仅构建 Web 版本（不打包 Electron）

# 代码检查
yarn lint         # 对 src 目录运行 ESLint

# 发布
yarn release      # 构建并发布到 GitHub releases
```

## 架构说明

### Electron IPC 模式

应用采用安全的 IPC（进程间通信）模式：

- **主进程** (`electron/main.ts`)：处理所有数据库操作和系统级任务，通过 `ipcMain.handle()` 暴露 IPC 处理器
- **预加载脚本** (`electron/preload.ts`)：使用 `contextBridge` 安全地向渲染进程暴露有限 API，通过 `window.electronAPI` 访问
- **渲染进程** (`src/`)：React 应用，调用暴露的 API 方法

添加新的数据库操作时：
1. 在 `electron/database/services.ts` 中添加服务方法
2. 在 `electron/main.ts` 中添加 IPC 处理器
3. 在 `electron/preload.ts` 中暴露该方法
4. 在 `ElectronAPI` 接口中添加类型声明

### 数据库

使用 sql.js（编译为 WebAssembly 的 SQLite）。数据库文件存储位置：
- macOS: `~/Library/Application Support/ebbinghaus-notebook/data/ebbinghaus.db`

数据库表结构定义在 `electron/database/init.ts`。添加新列的迁移应放在 `runMigrations()` 函数中。

### 艾宾浩斯算法

核心复习调度逻辑在 `src/utils/ebbinghaus.ts`。定义了 8 个复习阶段，间隔从 20 分钟到 1 个月。反馈等级（生疏、模糊、熟悉、精通）决定复习计划的调整方式。

### 路径别名

`@/` 映射到 `./src/`（在 `vite.config.ts` 中配置）。

## 主要技术栈

- **UI 组件库**: Ant Design、Tailwind CSS
- **状态管理**: Zustand（store 在 `src/stores/` 目录）
- **图表**: ECharts（通过 echarts-for-react）
- **路由**: React Router v6
- **自动更新**: electron-updater，发布到 GitHub releases

## 发布流程

应用发布到 GitHub releases。配置在 `electron-builder.json`。`release.sh` 脚本负责版本号更新和打标签。
