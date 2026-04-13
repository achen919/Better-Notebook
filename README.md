# 艾宾浩斯遗忘曲线错题本

基于艾宾浩斯遗忘曲线算法的智能错题管理应用，帮助你科学高效地复习。

![截图](docs/screenshot.png)

## 功能特性

- 📝 **错题管理** - 支持添加错题、分类管理、标签系统
- 🧠 **智能复习** - 基于艾宾浩斯遗忘曲线算法，科学安排复习时间
- 📊 **统计分析** - 学习数据可视化，掌握复习进度
- 📅 **任务管理** - 带截止日期的任务倒计时，支持里程碑和子任务
- ✅ **每日待办** - 每日学习计划管理
- 💬 **AI助手** - 集成多种 AI 模型，智能答疑解惑
- 🔄 **自动更新** - 支持应用内检查更新

## 安装

### 下载安装包

前往 [Releases](https://github.com/achen919/Ebbinghaus-Forgetting-Curve-Notebook-/releases) 页面下载对应平台的安装包。

- **macOS**: 下载 `.dmg` 或 `.zip` 文件
- **Windows**: 下载 `.exe` 安装程序或便携版
- **Linux**: 下载 `.AppImage` 或 `.deb` 包

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/achen919/Ebbinghaus-Forgetting-Curve-Notebook-.git
cd Ebbinghaus-Forgetting-Curve-Notebook-

# 安装依赖
yarn install

# 开发模式运行
yarn dev

# 构建应用
yarn build        # 构建所有平台
yarn build:mac    # 仅构建 macOS
```

## 使用指南

### 艾宾浩斯复习算法

应用采用经典的艾宾浩斯遗忘曲线复习间隔：

| 阶段 | 复习时间 |
|------|----------|
| 1 | 20分钟后 |
| 2 | 1小时后 |
| 3 | 1天后 |
| 4 | 2天后 |
| 5 | 4天后 |
| 6 | 7天后 |
| 7 | 15天后 |
| 8 | 1个月后 |

复习时的反馈会影响下次复习时间：

- **生疏** - 不记得，重置到第1阶段
- **模糊** - 有些印象，退回一个阶段
- **熟悉** - 基本记住，保持当前计划
- **精通** - 完全掌握，跳过下一阶段

### AI 助手配置

在「设置」页面配置 AI 助手：

1. 选择 AI 提供商（支持 OpenAI、Anthropic、智谱、DeepSeek 等）
2. 填写 API Key
3. 选择模型
4. 保存设置

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI 框架**: Ant Design + Tailwind CSS
- **桌面框架**: Electron 28
- **数据库**: SQLite (sql.js)
- **状态管理**: Zustand
- **图表**: ECharts

## 项目结构

```
├── electron/           # Electron 主进程
│   ├── main.ts        # 主进程入口
│   ├── preload.ts     # 预加载脚本
│   └── database/      # 数据库相关
├── src/               # 渲染进程（React 应用）
│   ├── pages/         # 页面组件
│   ├── components/    # 通用组件
│   ├── stores/        # 状态管理
│   ├── types/         # 类型定义
│   └── utils/         # 工具函数
└── public/            # 静态资源
```

## 开发命令

```bash
yarn dev          # 启动开发服务器
yarn build        # 构建生产版本
yarn build:mac    # 构建 macOS 版本
yarn lint         # 代码检查
```

## 许可证

MIT License

## 作者

achen919
