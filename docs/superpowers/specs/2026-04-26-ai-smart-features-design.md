# AI 智能功能设计文档

## 概述

为 Chat 页面增加两个智能功能：
1. **智能错题录入** - 用户粘贴错题内容，AI 自动识别并分类入库
2. **智能学习规划** - 用户描述学习目标，AI 自动生成里程碑并同步到任务/每日计划

## 核心设计

### 意图识别机制

使用 AI（而非硬编码关键词）识别用户意图：

```typescript
interface AIResponse {
  reply: string           // 普通对话回复
  intent?: {
    type: 'import' | 'plan' | 'normal'
    confidence: number    // 0-1 置信度
    data?: {
      // import 模式
      questions?: ParsedQuestion[]
      // plan 模式
      planParams?: {
        topic: string
        duration?: number  // 用户指定的总时长（天）
      }
    }
  }
}
```

**处理策略**：
- `confidence >= 0.7`：自动触发对应模式
- `confidence < 0.7`：提示用户确认
- `type: 'normal'`：只展示对话消息

### Chat 页面模式系统

```
模式状态：normal | import | plan

结果展示区：
- 仅在 import/plan 模式时显示
- normal 模式时不显示，保持界面简洁
```

## 功能一：智能错题录入

### 流程

```
用户输入 → AI 意图识别 → 解析错题 → 结果展示区（预览编辑） → 确认入库
```

### 结果展示区设计

```
┌─────────────────────────────────────────────┐
│ 📝 识别到 N 条错题                    [编辑] │
├─────────────────────────────────────────────┤
│ □ 1. 题目标题                          [科目]│
│    科目: [选择▼] → 章节: [选择▼]            │
│    ⚠️ 新科目"xxx"，是否创建？ [创建]         │
├─────────────────────────────────────────────┤
│           [取消]  [确认录入选中项]           │
└─────────────────────────────────────────────┘
```

### 科目匹配逻辑

- 优先匹配现有科目和章节
- 识别到新科目时，提示用户是否创建
- 用户可在预览时修改科目/章节

### 混合确认策略

- 识别到 1-3 条错题 → 静默切换，直接展示预览
- 识别到 4 条以上错题 → 提示"检测到 N 条错题，是否进入批量录入？"

## 功能二：智能学习规划

### 流程

```
用户输入目标 → AI 意图识别 → 生成里程碑 → 结果展示区（预览编辑） → 确认创建
```

### 结果展示区设计

```
┌─────────────────────────────────────────────────────────┐
│ 🎯 学习规划：{主题}                         总时长: N天  │
├─────────────────────────────────────────────────────────┤
│ ☑ 里程碑 1: 标题                               [N天]    │
│   描述内容                                              │
│   目标日期: YYYY-MM-DD                                  │
│                                                         │
│ ☑ 里程碑 2: 标题                               [N天]    │
│   ...                                                   │
│                                                         │
│ [ + 添加里程碑 ]  [ - 删除选中 ]                        │
├─────────────────────────────────────────────────────────┤
│ ⚙️ 同步设置                                             │
│ ☑ 创建任务倒计时          ☑ 创建每日计划               │
│ 每日学习时长: [ 60 ] 分钟                               │
├─────────────────────────────────────────────────────────┤
│              [取消]  [确认创建]                         │
└─────────────────────────────────────────────────────────┘
```

### 时间分配方式

- 用户可指定总时长："我想在3个月内学会大模型"
- 用户可不指定时长：AI 根据内容难度自动估算
- 每个里程碑包含：标题、描述、预计天数、目标日期

### 每日计划生成逻辑

每个里程碑按天数拆分成每日任务：
- 里程碑「Prompt Engineering」，14天
- 生成 14 条 Todo，分布在连续的 14 天
- Todo 内容：`[里程碑名] Day N - 学习要点`

## AI 生成标签

所有 AI 生成的数据统一标记，方便用户区分：

| 模块 | 标记方式 |
|-----|---------|
| 错题 | 关联 `AI生成` 标签到 question_tags 表 |
| 任务 | `ai_generated: 1` 字段，列表显示紫色徽章 |
| 里程碑 | `ai_generated: 1` 字段 |
| 每日计划 | `ai_generated: 1` 字段，左侧紫色竖线 |

预置标签：
```sql
INSERT INTO tags (name, color) VALUES ('AI生成', '#722ed1')
```

## 数据库改动

### 新增字段

```sql
-- Tasks 表
ALTER TABLE tasks ADD COLUMN ai_generated INTEGER DEFAULT 0;

-- Milestones 表
ALTER TABLE milestones ADD COLUMN ai_generated INTEGER DEFAULT 0;

-- Todo 表
ALTER TABLE todo ADD COLUMN ai_generated INTEGER DEFAULT 0;
```

### 新增表（可选，用于缓存解析结果）

```sql
CREATE TABLE ai_parsed_data (
  id INTEGER PRIMARY KEY,
  type TEXT,           -- 'import' | 'plan'
  raw_content TEXT,    -- 用户原始输入
  parsed_data TEXT,    -- JSON 格式的解析结果
  status TEXT,         -- 'pending' | 'confirmed' | 'cancelled'
  created_at TEXT
);
```

## UI 组件结构

### Chat 页面布局

```
┌─────────────────────────────────────────────────────┐
│ [科目选择▼] [学习建议] [清空] [API设置]              │
├─────────────────────────────────────────────────────┤
│  消息列表区域（现有）                                │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 结果展示区（仅 import/plan 模式时显示）        │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ 输入框 + 发送按钮                                    │
└─────────────────────────────────────────────────────┘
```

### 新增组件

```tsx
// 错题录入结果区
<ImportResultArea
  questions={parsedQuestions}
  subjects={subjects}
  onEdit={(index, data) => void}
  onCreateSubject={(name) => void}
  onConfirm={(selectedIds) => void}
  onCancel={() => void}
/>

// 学习规划结果区
<PlanResultArea
  milestones={parsedMilestones}
  duration={totalDays}
  onEditMilestone={(index, data) => void}
  onAddMilestone={() => void}
  onRemoveMilestone={(index) => void}
  syncSettings={syncSettings}
  onSyncSettingsChange={setSyncSettings}
  onConfirm={() => void}
  onCancel={() => void}
/>
```

## AI Prompt 设计

### 意图识别 Prompt

```
你是学习助手，除了回答用户问题，还需要识别用户意图。

可能的意图：
1. normal - 普通对话，正常回答
2. import - 整理错题，用户想批量录入错题
3. plan - 学习规划，用户想制定学习计划

判断依据：
- 用户说"整理错题"、"录错题"、或直接粘贴题目内容 → import
- 用户说"想学xxx"、"帮我规划"、"制定计划" → plan
- 其他情况 → normal

如果识别到 import，同时解析错题内容，提取每道题的：
- title: 题目标题
- content: 题目内容
- answer: 答案
- analysis: 解析（如有）
- subject: 建议科目
- chapter: 建议章节

如果识别到 plan，同时提取：
- topic: 学习主题
- duration: 总时长（天），如用户未指定则为 null

返回 JSON 格式：
{
  "reply": "你的回复内容",
  "intent": {
    "type": "import | plan | normal",
    "confidence": 0.0-1.0,
    "data": { ... }
  }
}
```

### 学习规划生成 Prompt

```
用户想学习：{topic}
总时长：{duration} 天（如未指定，请根据内容难度估算）

请生成学习里程碑，每个里程碑包含：
- title: 里程碑标题
- description: 详细描述和学习要点
- days: 预计天数
- dailyTopics: 每日学习主题数组

要求：
1. 里程碑之间要有逻辑顺序
2. 每个里程碑的天数之和应等于总时长
3. dailyTopics 的长度应等于 days

返回 JSON 数组格式。
```

## 实现优先级

1. 数据库迁移（新增字段）
2. 预置 AI 生成标签
3. AI 意图识别逻辑
4. 错题录入结果展示区组件
5. 学习规划结果展示区组件
6. 确认入库/创建逻辑
7. AI 生成内容的视觉标识
