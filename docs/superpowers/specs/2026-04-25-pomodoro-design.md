# 番茄钟功能设计文档

## 概述

为 Better-Notebook 添加番茄钟功能，支持在 macOS 菜单栏展示倒计时，自动记录学习时间到每日计划。

## 功能需求

### 核心功能
- 菜单栏显示番茄钟状态（图标 + 倒计时）
- 支持启动、暂停、停止番茄钟
- 可自定义专注/休息时长
- 可设置默认科目，开始时快速选择科目
- 专注过程中可修改目标/备注和科目
- 完成时弹出确认窗口，用户确认后保存记录
- 暂停超时自动停止（默认5分钟）
- 系统通知 + 声音提醒

### 菜单栏交互
- 显示番茄图标和倒计时（如 `🍅 23:45`）
- 暂停时显示暂停状态（如 `🍅 ⏸ 23:45`）
- 下拉菜单提供快捷操作
- 显示今日统计（完成数/学习时长）

### 数据集成
- 番茄钟记录自动存入 `learning_time` 表
- 与手动记录合并显示在学习时间列表
- 在统计页面展示番茄钟数据

## 技术设计

### 数据模型

#### 新增表 `pomodoro_sessions`

```sql
CREATE TABLE pomodoro_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration INTEGER DEFAULT 0,
  planned_duration INTEGER DEFAULT 25,
  status TEXT DEFAULT 'completed',
  subject_id INTEGER,
  goal TEXT,
  pause_count INTEGER DEFAULT 0,
  total_pause_time INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);
```

#### 新增表 `pomodoro_settings`

```sql
CREATE TABLE pomodoro_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  focus_duration INTEGER DEFAULT 25,
  break_duration INTEGER DEFAULT 5,
  auto_start_break INTEGER DEFAULT 0,
  auto_start_focus INTEGER DEFAULT 0,
  daily_goal INTEGER DEFAULT 8,
  default_subject_id INTEGER,
  notification_sound INTEGER DEFAULT 1,
  max_pause_duration INTEGER DEFAULT 300
);
```

#### 修改表 `learning_time`

```sql
ALTER TABLE learning_time ADD COLUMN source TEXT DEFAULT 'manual';
ALTER TABLE learning_time ADD COLUMN pomodoro_id INTEGER;
```

### 文件结构

```
electron/
├── main.ts                 # 添加菜单栏初始化
├── preload.ts              # 添加番茄钟 IPC 暴露
├── database/
│   ├── init.ts             # 添加新表创建
│   └── services.ts         # 添加番茄钟服务
└── menubar/                # 新增目录
    ├── index.ts            # 菜单栏管理器
    └── timer.ts            # 计时器逻辑

src/
├── stores/
│   └── pomodoroStore.ts    # 番茄钟状态管理
├── pages/
│   ├── Settings/
│   │   └── index.tsx       # 添加番茄钟设置 Tab
│   └── Todo/
│       └── index.tsx       # 显示番茄钟记录
└── components/
    └── PomodoroCompleteModal/
        └── index.tsx       # 完成确认弹窗
```

### 主进程架构

#### MenuBarManager

职责：
- 创建和管理菜单栏图标
- 更新倒计时显示
- 处理用户点击事件
- 与渲染进程通信

```typescript
class MenuBarManager {
  private tray: Tray | null = null
  private timer: PomodoroTimer | null = null

  init()
  updateDisplay(text: string, status: 'idle' | 'running' | 'paused')
  updateMenuItems(state: PomodoroState)
  sendNotification(title: string, body: string, sound: boolean)
  destroy()
}
```

#### PomodoroTimer

职责：
- 管理番茄钟状态机
- 计时、暂停、停止
- 暂停超时检测

状态机：
```
idle ──开始──> running ──完成──> idle
                  │
                  ├──暂停──> paused ──继续──> running
                  │                  │
                  └──────────────────┘
                         超时/停止
                            │
                            ▼
                          idle
```

```typescript
class PomodoroTimer {
  private duration: number
  private remaining: number
  private state: 'idle' | 'running' | 'paused'

  start(duration: number)
  pause()
  resume()
  stop(): { duration: number, completed: boolean }

  onTick: (remaining: number) => void
  onComplete: () => void
  onPauseTimeout: () => void
}
```

### IPC 接口

#### 渲染进程 → 主进程

| 通道 | 说明 |
|------|------|
| `pomodoro:start` | 开始专注 |
| `pomodoro:pause` | 暂停 |
| `pomodoro:resume` | 继续 |
| `pomodoro:stop` | 停止 |
| `pomodoro:updateGoal` | 更新目标/备注 |
| `pomodoro:updateSubject` | 更新科目 |
| `pomodoro:getSettings` | 获取设置 |
| `pomodoro:saveSettings` | 保存设置 |
| `pomodoro:getTodayStats` | 今日统计 |
| `pomodoro:getState` | 获取当前状态 |

#### 主进程 → 渲染进程

| 通道 | 说明 |
|------|------|
| `pomodoro:stateChanged` | 状态变化通知 |
| `pomodoro:completed` | 完成通知 |

### 渲染进程设计

#### PomodoroStore (Zustand)

```typescript
interface PomodoroState {
  status: 'idle' | 'running' | 'paused'
  remaining: number
  totalDuration: number
  currentSubjectId: number | null
  currentGoal: string
  todayCount: number
  todayDuration: number
}

interface PomodoroActions {
  start: (subjectId?: number, goal?: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
  updateGoal: (goal: string) => void
  updateSubject: (subjectId: number) => void
  fetchState: () => void
  fetchTodayStats: () => void
}
```

#### 设置页面

新增"番茄钟"Tab，包含：
- 专注时长设置
- 休息时长设置
- 每日目标
- 默认科目选择
- 提醒设置（通知、声音）
- 暂停超时时间

#### 完成确认弹窗

番茄钟完成时显示，包含：
- 本次专注时长
- 科目选择（可修改）
- 目标/备注（可修改）
- 放弃/保存按钮

#### 每日计划页面

修改学习时间记录列表：
- 番茄钟记录显示 🍅 图标标识
- 手动记录显示 ✏️ 图标标识
- 数据合并显示

### 菜单栏 UI 设计

#### 闲置状态
```
菜单栏：🍅
菜单项：开始专注 | 番茄钟设置 | 今日统计 | 打开主窗口
```

#### 运行状态
```
菜单栏：🍅 23:45
菜单项：暂停 | 停止 | 更改目标 | 切换科目 | 当前信息 | 今日统计 | 打开主窗口
```

#### 暂停状态
```
菜单栏：🍅 ⏸ 23:45（灰色）
菜单项：继续专注 | 停止 | 暂停时长提示 | 更改目标 | 切换科目 | 今日统计 | 打开主窗口
```

### 通知设计

| 场景 | 标题 | 内容 |
|------|------|------|
| 专注完成 | 专注完成！ | 25分钟的专注时间结束了，休息一下吧~ |
| 休息结束 | 休息结束！ | 准备好开始下一个番茄钟了吗？ |
| 暂停超时 | 番茄钟已停止 | 暂停时间过长，本次专注已取消 |

### 边界情况处理

#### 应用关闭/重启
- 关闭时保存运行中番茄钟状态到数据库
- 启动时检查未完成番茄钟，超时则标记放弃

#### 系统休眠
- 使用时间戳计算真实流逝时间
- 时间跳跃超过剩余时间视为超时

#### 多窗口同步
- 主进程统一管理状态
- 渲染进程通过 IPC 同步
- Zustand 缓存避免频繁 IPC

#### 数据迁移
- `runMigrations()` 添加新表和字段
- 新字段设置默认值，兼容现有数据

## 实现步骤

### 阶段一：数据库层
1. 修改 `electron/database/init.ts`：添加新表和字段
2. 修改 `electron/database/services.ts`：添加 `pomodoroService`
3. 修改 `electron/main.ts`：添加 IPC 处理器
4. 修改 `electron/preload.ts`：暴露番茄钟 API

### 阶段二：主进程
1. 创建 `electron/menubar/timer.ts`：计时器逻辑
2. 创建 `electron/menubar/index.ts`：菜单栏管理器
3. 修改 `electron/main.ts`：初始化菜单栏

### 阶段三：渲染进程
1. 创建 `src/stores/pomodoroStore.ts`：状态管理
2. 创建 `src/components/PomodoroCompleteModal/index.tsx`：完成弹窗
3. 修改 `src/pages/Settings/index.tsx`：添加设置 Tab
4. 修改 `src/pages/Todo/index.tsx`：显示番茄钟记录
5. 修改 `src/pages/Home/index.tsx`：添加番茄钟快捷入口

### 阶段四：集成与测试
1. 状态持久化实现
2. 通知功能实现
3. 边界情况处理
4. 功能测试
