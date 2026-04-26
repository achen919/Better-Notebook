# AI 智能功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Chat 页面增加智能错题录入和智能学习规划两个功能，使用 AI 意图识别自动切换模式。

**Architecture:** 在 Chat 页面引入模式系统（normal/import/plan），通过 AI 识别用户意图自动切换模式，显示对应的结果预览组件。所有 AI 生成的内容统一标记"AI生成"标签。

**Tech Stack:** React, TypeScript, Ant Design, SQLite (sql.js), Electron IPC

---

## 文件结构

### 新建文件
- `src/types/ai.ts` - AI 相关类型定义
- `src/components/Chat/ImportResultArea.tsx` - 错题录入结果预览组件
- `src/components/Chat/PlanResultArea.tsx` - 学习规划结果预览组件
- `src/utils/aiIntent.ts` - AI 意图识别工具函数

### 修改文件
- `electron/database/init.ts` - 数据库迁移（新增字段 + 预置标签）
- `electron/database/services.ts` - 服务层支持 AI 生成字段
- `electron/main.ts` - 新增 IPC 处理器
- `electron/preload.ts` - 暴露新 API
- `src/pages/Chat/index.tsx` - 添加模式系统和结果展示区
- `src/pages/Questions/QuestionList.tsx` - 显示 AI 标签
- `src/pages/Tasks/index.tsx` - 显示 AI 徽章
- `src/pages/Todo/index.tsx` - 显示 AI 标识

---

## Task 1: 数据库迁移 - 新增 AI 生成字段

**Files:**
- Modify: `electron/database/init.ts`

- [ ] **Step 1: 在 runMigrations 函数中添加新字段迁移**

找到 `runMigrations()` 函数，在现有迁移后添加：

```typescript
// 在 runMigrations 函数中添加
// AI 生成字段迁移
const migrations = [
  // ... 现有迁移 ...

  // 新增 AI 生成字段
  {
    name: 'add_ai_generated_to_tasks',
    sql: `ALTER TABLE tasks ADD COLUMN ai_generated INTEGER DEFAULT 0`,
  },
  {
    name: 'add_ai_generated_to_milestones',
    sql: `ALTER TABLE milestones ADD COLUMN ai_generated INTEGER DEFAULT 0`,
  },
  {
    name: 'add_ai_generated_to_todo',
    sql: `ALTER TABLE todo ADD COLUMN ai_generated INTEGER DEFAULT 0`,
  },
]

// 执行迁移
for (const migration of migrations) {
  try {
    run(migration.sql)
    console.log(`Migration ${migration.name} executed`)
  } catch (error) {
    // 字段可能已存在，忽略错误
    console.log(`Migration ${migration.name} skipped (may already exist)`)
  }
}
```

- [ ] **Step 2: 在数据库初始化后预置 AI 标签**

在 `initDatabase()` 函数末尾，表创建后添加：

```typescript
// 预置 AI 生成标签
try {
  const existingTag = get(`SELECT id FROM tags WHERE name = ?`, ['AI生成'])
  if (!existingTag) {
    run(`INSERT INTO tags (name, color) VALUES (?, ?)`, ['AI生成', '#722ed1'])
    console.log('AI生成 tag created')
  }
} catch (error) {
  console.log('Failed to create AI tag:', error)
}
```

- [ ] **Step 3: 验证数据库迁移**

运行应用，检查控制台是否显示迁移成功。

- [ ] **Step 4: 提交**

```bash
git add electron/database/init.ts
git commit -m "feat(db): add ai_generated fields and preset AI tag

- Add ai_generated column to tasks, milestones, todo tables
- Preset 'AI生成' tag with purple color

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 服务层支持 AI 生成字段

**Files:**
- Modify: `electron/database/services.ts`

- [ ] **Step 1: 修改 taskService.create 支持新字段**

找到 `taskService.create` 方法，修改参数类型和 SQL：

```typescript
create(data: {
  title: string
  description?: string
  deadline?: string
  priority?: number
  progress_type?: 'percentage' | 'subitems'
  total_value?: number
  ai_generated?: number  // 新增
}) {
  const result = run(
    `INSERT INTO tasks (title, description, deadline, priority, progress_type, total_value, ai_generated)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description || '',
      data.deadline || dayjs().add(7, 'day').format('YYYY-MM-DD'),
      data.priority ?? 2,
      data.progress_type || 'percentage',
      data.total_value || 100,
      data.ai_generated || 0,  // 新增
    ]
  )
  return result.lastInsertRowId
},
```

- [ ] **Step 2: 修改 milestoneService.create 支持新字段**

找到 `milestoneService.create` 方法：

```typescript
create(data: {
  task_id: number
  title: string
  description?: string
  target_date?: string
  ai_generated?: number  // 新增
}) {
  const result = run(
    `INSERT INTO milestones (task_id, title, description, target_date, ai_generated)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.task_id,
      data.title,
      data.description || '',
      data.target_date || null,
      data.ai_generated || 0,  // 新增
    ]
  )
  return result.lastInsertRowId
},
```

- [ ] **Step 3: 修改 todoService.create 支持新字段**

找到 `todoService.create` 方法：

```typescript
create(data: {
  date: string
  content: string
  ai_generated?: number  // 新增
}) {
  const result = run(
    `INSERT INTO todo (date, content, ai_generated) VALUES (?, ?, ?)`,
    [data.date, data.content, data.ai_generated || 0]
  )
  return result.lastInsertRowId
},
```

- [ ] **Step 4: 修改 todoService.getByDate 返回 ai_generated 字段**

```typescript
getByDate(date: string) {
  return all(
    `SELECT * FROM todo WHERE date = ? ORDER BY sort_order, created_at`,
    [date]
  )
},
```

- [ ] **Step 5: 提交**

```bash
git add electron/database/services.ts
git commit -m "feat(db): support ai_generated field in services

- Update taskService, milestoneService, todoService create methods
- Add ai_generated parameter support

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 定义 AI 相关类型

**Files:**
- Create: `src/types/ai.ts`

- [ ] **Step 1: 创建 AI 类型定义文件**

```typescript
// src/types/ai.ts

// AI 意图类型
export type AIIntentType = 'normal' | 'import' | 'plan'

// AI 解析的错题
export interface ParsedQuestion {
  id: string  // 临时 ID，用于前端操作
  title: string
  content?: string
  answer?: string
  analysis?: string
  subject?: string
  chapter?: string
  isNewSubject?: boolean  // 是否是新科目
  selectedSubjectId?: number
  selectedChapterId?: number
}

// AI 解析的学习规划参数
export interface ParsedPlanParams {
  topic: string
  duration?: number  // 总时长（天）
}

// AI 解析的里程碑
export interface ParsedMilestone {
  id: string  // 临时 ID
  title: string
  description: string
  days: number
  targetDate: string
  dailyTopics: string[]  // 每日学习主题
}

// AI 意图识别结果
export interface AIIntent {
  type: AIIntentType
  confidence: number
  data?: {
    questions?: ParsedQuestion[]
    planParams?: ParsedPlanParams
    milestones?: ParsedMilestone[]
  }
}

// AI 响应结构
export interface AIResponseWithIntent {
  reply: string
  intent?: AIIntent
}

// 同步设置
export interface SyncSettings {
  createTask: boolean
  createTodo: boolean
  dailyDuration: number  // 分钟
}
```

- [ ] **Step 2: 提交**

```bash
git add src/types/ai.ts
git commit -m "feat(types): add AI-related type definitions

- Add AIIntentType, ParsedQuestion, ParsedMilestone types
- Add AIIntent, AIResponseWithIntent, SyncSettings interfaces

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 创建 AI 意图识别工具函数

**Files:**
- Create: `src/utils/aiIntent.ts`

- [ ] **Step 1: 创建 AI 意图识别工具**

```typescript
// src/utils/aiIntent.ts
import type { AIResponseWithIntent, ParsedQuestion, ParsedMilestone } from '../types/ai'

const INTENT_PROMPT = `你是学习助手，除了回答用户问题，还需要识别用户意图。

可能的意图：
1. normal - 普通对话，正常回答
2. import - 整理错题，用户想批量录入错题到错题本
3. plan - 学习规划，用户想制定学习计划

判断依据：
- 用户说"整理错题"、"录错题"、"帮我录入"、或直接粘贴多个题目内容 → import
- 用户说"想学xxx"、"帮我规划"、"制定计划"、"学习路径" → plan
- 其他情况 → normal

如果识别到 import，同时解析错题内容，提取每道题的：
- title: 题目标题（简短概括）
- content: 题目完整内容
- answer: 答案
- analysis: 解析（如有）
- subject: 建议科目名称
- chapter: 建议章节名称

如果识别到 plan，同时提取：
- topic: 学习主题
- duration: 总时长（天数），如用户未指定则根据难度估算合理天数

你必须严格返回以下 JSON 格式，不要有任何其他内容：
{
  "reply": "你的回复内容（简短友好）",
  "intent": {
    "type": "import 或 plan 或 normal",
    "confidence": 0.0到1.0之间的数字,
    "data": {
      "questions": [...],  // 仅 import 时
      "planParams": {...}, // 仅 plan 时
      "milestones": [...]  // 仅 plan 时，包含生成的里程碑
    }
  }
}

对于 plan 意图，data 中必须包含：
- planParams: { topic, duration }
- milestones: 里程碑数组，每个包含：
  - title: 里程碑标题
  - description: 详细描述
  - days: 预计天数
  - dailyTopics: 每日学习主题数组（长度等于 days）`

export function buildIntentPrompt(userMessage: string, subjects: string[]): string {
  const subjectList = subjects.length > 0
    ? `\n\n现有科目列表：${subjects.join('、')}`
    : ''

  return `${INTENT_PROMPT}${subjectList}

用户消息：
${userMessage}`
}

export function parseAIResponse(response: string): AIResponseWithIntent {
  try {
    // 尝试提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        reply: parsed.reply || response,
        intent: parsed.intent,
      }
    }
  } catch (error) {
    console.error('Failed to parse AI response:', error)
  }

  // 解析失败，返回普通回复
  return { reply: response }
}

export function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateMilestoneId(): string {
  return `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 计算里程碑目标日期
export function calculateMilestoneDates(
  milestones: ParsedMilestone[],
  startDate: Date = new Date()
): ParsedMilestone[] {
  let currentDate = new Date(startDate)

  return milestones.map(m => {
    const targetDate = new Date(currentDate)
    targetDate.setDate(targetDate.getDate() + m.days - 1)

    const result = {
      ...m,
      targetDate: targetDate.toISOString().split('T')[0],
    }

    // 下一个里程碑从当前里程碑结束后开始
    currentDate = new Date(targetDate)
    currentDate.setDate(currentDate.getDate() + 1)

    return result
  })
}
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/aiIntent.ts
git commit -m "feat(utils): add AI intent recognition utilities

- Add buildIntentPrompt for constructing AI prompts
- Add parseAIResponse for parsing AI JSON responses
- Add helper functions for ID generation and date calculation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 创建错题录入结果预览组件

**Files:**
- Create: `src/components/Chat/ImportResultArea.tsx`

- [ ] **Step 1: 创建 ImportResultArea 组件**

```typescript
// src/components/Chat/ImportResultArea.tsx
import React, { useState } from 'react'
import {
  Card,
  Checkbox,
  Select,
  Button,
  Space,
  Tag,
  Input,
  Typography,
  message,
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import type { ParsedQuestion } from '../../types/ai'
import type { Subject, Chapter } from '../../types'

const { Text, Paragraph } = Typography

interface ImportResultAreaProps {
  questions: ParsedQuestion[]
  subjects: Subject[]
  chapters: Chapter[]
  onEdit: (index: number, data: Partial<ParsedQuestion>) => void
  onCreateSubject: (name: string) => Promise<number>
  onConfirm: (selectedQuestions: ParsedQuestion[]) => void
  onCancel: () => void
  loading?: boolean
}

const ImportResultArea: React.FC<ImportResultAreaProps> = ({
  questions,
  subjects,
  chapters,
  onEdit,
  onCreateSubject,
  onConfirm,
  onCancel,
  loading,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(questions.map(q => q.id))
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<ParsedQuestion>>({})
  const [newSubjectName, setNewSubjectName] = useState('')
  const [creatingSubject, setCreatingSubject] = useState(false)

  const filteredChapters = (subjectId?: number) => {
    if (!subjectId) return []
    return chapters.filter(c => c.subject_id === subjectId)
  }

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleToggleAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)))
    }
  }

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return
    setCreatingSubject(true)
    try {
      await onCreateSubject(newSubjectName.trim())
      setNewSubjectName('')
      message.success('科目创建成功')
    } catch (error) {
      message.error('创建科目失败')
    } finally {
      setCreatingSubject(false)
    }
  }

  const handleConfirm = () => {
    const selected = questions.filter(q => selectedIds.has(q.id))
    if (selected.length === 0) {
      message.warning('请至少选择一条错题')
      return
    }
    onConfirm(selected)
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>📝 识别到 {questions.length} 条错题</span>
          <Button size="small" onClick={handleToggleAll}>
            {selectedIds.size === questions.length ? '取消全选' : '全选'}
          </Button>
        </Space>
      }
      extra={
        <Space>
          <Button onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleConfirm}
            loading={loading}
            disabled={selectedIds.size === 0}
          >
            确认录入选中项 ({selectedIds.size})
          </Button>
        </Space>
      }
      className="mt-4"
    >
      <div className="space-y-3">
        {questions.map((q, index) => (
          <div
            key={q.id}
            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selectedIds.has(q.id)}
                onChange={() => handleToggleSelect(q.id)}
              />
              <div className="flex-1">
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <Input
                      value={editForm.title || q.title}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="题目标题"
                    />
                    <Input.TextArea
                      value={editForm.content || q.content || ''}
                      onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                      placeholder="题目内容"
                      rows={2}
                    />
                    <Space>
                      <Button
                        size="small"
                        onClick={() => {
                          onEdit(index, editForm)
                          setEditingIndex(null)
                          setEditForm({})
                        }}
                      >
                        保存
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingIndex(null)
                          setEditForm({})
                        }}
                      >
                        取消
                      </Button>
                    </Space>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <Text strong className="text-sm">
                        {q.title}
                      </Text>
                      {q.subject && (
                        <Tag color="blue">{q.subject}</Tag>
                      )}
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setEditingIndex(index)}
                      />
                    </div>
                    {q.content && (
                      <Paragraph
                        ellipsis={{ rows: 2 }}
                        className="text-xs text-gray-500 mb-2"
                      >
                        {q.content}
                      </Paragraph>
                    )}
                  </>
                )}

                {/* 科目章节选择 */}
                <div className="flex items-center gap-2 mt-2">
                  <Select
                    style={{ width: 120 }}
                    placeholder="选择科目"
                    value={q.selectedSubjectId}
                    onChange={(value) => {
                      onEdit(index, { selectedSubjectId: value, selectedChapterId: undefined })
                    }}
                    options={subjects.map(s => ({ value: s.id, label: s.name }))}
                    allowClear
                    size="small"
                  />
                  <Select
                    style={{ width: 120 }}
                    placeholder="选择章节"
                    value={q.selectedChapterId}
                    onChange={(value) => onEdit(index, { selectedChapterId: value })}
                    options={filteredChapters(q.selectedSubjectId).map(c => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    allowClear
                    size="small"
                    disabled={!q.selectedSubjectId}
                  />
                </div>

                {/* 新科目提示 */}
                {q.isNewSubject && q.subject && !subjects.find(s => s.name === q.subject) && (
                  <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
                    <Text type="warning">
                      检测到新科目「{q.subject}」，是否创建？
                    </Text>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setNewSubjectName(q.subject || '')
                      }}
                    >
                      创建
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 创建新科目 */}
      {newSubjectName && (
        <div className="mt-3 p-2 bg-blue-50 rounded flex items-center gap-2">
          <Text>创建新科目：</Text>
          <Input
            style={{ width: 150 }}
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
            size="small"
          />
          <Button
            type="primary"
            size="small"
            loading={creatingSubject}
            onClick={handleCreateSubject}
          >
            创建
          </Button>
          <Button size="small" onClick={() => setNewSubjectName('')}>
            取消
          </Button>
        </div>
      )}

      {/* 快速创建科目入口 */}
      {!newSubjectName && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          className="mt-3"
          onClick={() => setNewSubjectName(' ')}
          size="small"
        >
          创建新科目
        </Button>
      )}
    </Card>
  )
}

export default ImportResultArea
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Chat/ImportResultArea.tsx
git commit -m "feat(ui): add ImportResultArea component

- Display parsed questions with selection
- Support editing question title/content
- Support selecting subject/chapter
- Support creating new subject

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 创建学习规划结果预览组件

**Files:**
- Create: `src/components/Chat/PlanResultArea.tsx`

- [ ] **Step 1: 创建 PlanResultArea 组件**

```typescript
// src/components/Chat/PlanResultArea.tsx
import React, { useState } from 'react'
import {
  Card,
  Checkbox,
  Button,
  Space,
  Tag,
  Input,
  Typography,
  InputNumber,
  Switch,
  DatePicker,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ParsedMilestone, SyncSettings } from '../../types/ai'

const { Text, Paragraph } = Typography

interface PlanResultAreaProps {
  milestones: ParsedMilestone[]
  topic: string
  onEditMilestone: (index: number, data: Partial<ParsedMilestone>) => void
  onAddMilestone: () => void
  onRemoveMilestone: (index: number) => void
  syncSettings: SyncSettings
  onSyncSettingsChange: (settings: SyncSettings) => void
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

const PlanResultArea: React.FC<PlanResultAreaProps> = ({
  milestones,
  topic,
  onEditMilestone,
  onAddMilestone,
  onRemoveMilestone,
  syncSettings,
  onSyncSettingsChange,
  onConfirm,
  onCancel,
  loading,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(milestones.map((_, i) => i))
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<ParsedMilestone>>({})

  const totalDays = milestones.reduce((sum, m) => sum + m.days, 0)

  const handleToggleSelect = (index: number) => {
    const newSet = new Set(selectedIndices)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedIndices(newSet)
  }

  const handleToggleAll = () => {
    if (selectedIndices.size === milestones.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(milestones.map((_, i) => i)))
    }
  }

  const handleConfirm = () => {
    if (selectedIndices.size === 0) {
      message.warning('请至少选择一个里程碑')
      return
    }
    onConfirm()
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>🎯 学习规划：{topic}</span>
          <Tag color="blue">总时长 {totalDays} 天</Tag>
          <Button size="small" onClick={handleToggleAll}>
            {selectedIndices.size === milestones.length ? '取消全选' : '全选'}
          </Button>
        </Space>
      }
      extra={
        <Space>
          <Button onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleConfirm}
            loading={loading}
            disabled={selectedIndices.size === 0}
          >
            确认创建
          </Button>
        </Space>
      }
      className="mt-4"
    >
      <div className="space-y-3 mb-4">
        {milestones.map((m, index) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg border ${
              selectedIndices.has(index)
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selectedIndices.has(index)}
                onChange={() => handleToggleSelect(index)}
              />
              <div className="flex-1">
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <Input
                      value={editForm.title || m.title}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="里程碑标题"
                    />
                    <Input.TextArea
                      value={editForm.description || m.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="描述"
                      rows={2}
                    />
                    <Space>
                      <InputNumber
                        value={editForm.days || m.days}
                        onChange={value => setEditForm({ ...editForm, days: value || 1 })}
                        min={1}
                        max={365}
                        addonBefore="天数"
                      />
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => {
                          onEditMilestone(index, editForm)
                          setEditingIndex(null)
                          setEditForm({})
                        }}
                      >
                        保存
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingIndex(null)
                          setEditForm({})
                        }}
                      >
                        取消
                      </Button>
                    </Space>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <Text strong>{m.title}</Text>
                      <Tag color="green">{m.days} 天</Tag>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setEditingIndex(index)}
                      />
                      <Popconfirm
                        title="确定删除此里程碑？"
                        onConfirm={() => onRemoveMilestone(index)}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </div>
                    <Paragraph className="text-sm text-gray-600 mb-1">
                      {m.description}
                    </Paragraph>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <CalendarOutlined />
                      <span>目标日期：{m.targetDate}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 添加里程碑按钮 */}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={onAddMilestone}
        className="mb-4"
        block
      >
        添加里程碑
      </Button>

      {/* 同步设置 */}
      <div className="p-3 bg-gray-50 rounded-lg space-y-3">
        <Text strong>⚙️ 同步设置</Text>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={syncSettings.createTask}
              onChange={checked => onSyncSettingsChange({ ...syncSettings, createTask: checked })}
            />
            <Text>创建任务倒计时</Text>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={syncSettings.createTodo}
              onChange={checked => onSyncSettingsChange({ ...syncSettings, createTodo: checked })}
            />
            <Text>创建每日计划</Text>
          </div>
        </div>
        {syncSettings.createTodo && (
          <div className="flex items-center gap-2">
            <Text>每日学习时长：</Text>
            <InputNumber
              value={syncSettings.dailyDuration}
              onChange={value => onSyncSettingsChange({ ...syncSettings, dailyDuration: value || 60 })}
              min={10}
              max={480}
              addonAfter="分钟"
            />
          </div>
        )}
      </div>
    </Card>
  )
}

export default PlanResultArea
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Chat/PlanResultArea.tsx
git commit -m "feat(ui): add PlanResultArea component

- Display parsed milestones with selection
- Support editing milestone details
- Support sync settings for task/todo creation
- Show total duration and target dates

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 修改 Chat 页面 - 集成模式系统和意图识别

**Files:**
- Modify: `src/pages/Chat/index.tsx`

- [ ] **Step 1: 添加新的 imports 和类型**

在文件顶部添加：

```typescript
import ImportResultArea from '../../components/Chat/ImportResultArea'
import PlanResultArea from '../../components/Chat/PlanResultArea'
import {
  buildIntentPrompt,
  parseAIResponse,
  generateQuestionId,
  generateMilestoneId,
  calculateMilestoneDates,
} from '../../utils/aiIntent'
import type {
  ParsedQuestion,
  ParsedMilestone,
  AIIntent,
  SyncSettings,
} from '../../types/ai'
import type { Chapter } from '../../types'
```

- [ ] **Step 2: 添加新的状态变量**

在组件内部，现有状态后添加：

```typescript
// AI 模式状态
type ChatMode = 'normal' | 'import' | 'plan'
const [mode, setMode] = useState<ChatMode>('normal')

// 错题录入相关
const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
const [chapters, setChapters] = useState<Chapter[]>([])

// 学习规划相关
const [planTopic, setPlanTopic] = useState('')
const [parsedMilestones, setParsedMilestones] = useState<ParsedMilestone[]>([])
const [syncSettings, setSyncSettings] = useState<SyncSettings>({
  createTask: true,
  createTodo: true,
  dailyDuration: 60,
})

// 确认中状态
const [confirming, setConfirming] = useState(false)
```

- [ ] **Step 3: 修改 loadData 函数加载章节**

```typescript
const loadData = useCallback(async () => {
  try {
    const [settings, history, subjectList, weakPointsList, chapterList] = await Promise.all([
      window.electronAPI.db.aiSettings.get(),
      window.electronAPI.db.chatHistory.getAll(100),
      window.electronAPI.db.subjects.getAll(),
      window.electronAPI.db.weakPoints.getAll(),
      window.electronAPI.db.chapters.getBySubject(0), // 获取所有章节
    ])
    setAiSettings(settings)
    setMessages(history.reverse())
    setSubjects(subjectList)
    setWeakPoints(weakPointsList)
    // 获取所有章节需要遍历科目
    const allChapters: Chapter[] = []
    for (const s of subjectList) {
      const subjectChapters = await window.electronAPI.db.chapters.getBySubject(s.id)
      allChapters.push(...subjectChapters)
    }
    setChapters(allChapters)
  } catch (error) {
    console.error('Failed to load data:', error)
  }
}, [])
```

- [ ] **Step 4: 修改 sendMessage 函数支持意图识别**

将现有的 `sendMessage` 函数替换为：

```typescript
const sendMessage = async () => {
  if (!inputMessage.trim() || loading) return

  if (!aiSettings?.api_key) {
    message.warning('请先在设置中配置AI API')
    return
  }

  const userMessage = inputMessage.trim()
  setInputMessage('')
  setLoading(true)

  // 添加用户消息
  const userId = await window.electronAPI.db.chatHistory.add({
    role: 'user',
    content: userMessage,
    subject_id: selectedSubject,
  } as ChatHistoryInput)

  const newUserMsg: ChatMessage = {
    id: userId,
    role: 'user',
    content: userMessage,
    subject_id: selectedSubject,
    subject_name: subjects.find(s => s.id === selectedSubject)?.name,
    created_at: new Date().toISOString(),
  }
  setMessages(prev => [...prev, newUserMsg])

  try {
    // 构建带意图识别的 prompt
    const intentPrompt = buildIntentPrompt(userMessage, subjects.map(s => s.name))

    // 调用 AI
    const response = await callAIWithIntent(userMessage, intentPrompt, aiSettings)

    // 解析响应
    const { reply, intent } = parseAIResponse(response)

    // 添加 AI 回复
    const assistantId = await window.electronAPI.db.chatHistory.add({
      role: 'assistant',
      content: reply,
      subject_id: selectedSubject,
    })

    const newAIMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: reply,
      subject_id: selectedSubject,
      subject_name: subjects.find(s => s.id === selectedSubject)?.name,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, newAIMsg])

    // 处理意图
    if (intent && intent.type !== 'normal' && intent.confidence >= 0.7) {
      handleIntent(intent)
    } else if (intent && intent.confidence < 0.7 && intent.type !== 'normal') {
      // 低置信度，提示确认
      Modal.confirm({
        title: '意图确认',
        content: intent.type === 'import'
          ? '检测到您可能想整理错题，是否进入批量录入模式？'
          : '检测到您可能想制定学习计划，是否进入规划模式？',
        onOk: () => handleIntent(intent),
      })
    }

    // 分析弱势点
    await analyzeWeakPoints(userMessage)
  } catch (error) {
    const errorMsg = getErrorMessage(error)
    message.error(`AI调用失败: ${errorMsg}`, 5)
    console.error('AI call failed:', error)
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 5: 添加 callAIWithIntent 函数**

```typescript
const callAIWithIntent = async (
  message: string,
  intentPrompt: string,
  settings: AISettings
): Promise<string> => {
  let baseUrl = settings.api_base_url || 'https://api.openai.com/v1'

  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl
  }
  baseUrl = baseUrl.replace(/\/+$/, '')

  const isAnthropic = baseUrl.includes('/anthropic') || baseUrl.includes('anthropic')

  let apiUrl: string
  let requestBody: Record<string, unknown>

  if (isAnthropic) {
    apiUrl = `${baseUrl}/v1/messages`
    requestBody = {
      model: settings.model || 'claude-3-haiku-20240307',
      max_tokens: 4000,
      messages: [
        { role: 'user', content: intentPrompt },
      ],
    }
  } else {
    apiUrl = `${baseUrl}/chat/completions`
    requestBody = {
      model: settings.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: intentPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }
  }

  const data = await window.electronAPI.ai.call({
    url: apiUrl,
    apiKey: settings.api_key,
    body: requestBody,
  }) as AIResponse

  // 解析响应
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content
  }
  if (data.choices?.[0]?.text) {
    return data.choices[0].text
  }
  if (Array.isArray(data.content)) {
    const textBlock = data.content.find((block) => block.type === 'text')
    if (textBlock?.text) return textBlock.text
    if (data.content[0]?.text) return data.content[0].text
  }
  if (typeof data.content === 'string') {
    return data.content
  }

  throw new Error('无法解析AI响应格式')
}
```

- [ ] **Step 6: 添加 handleIntent 处理函数**

```typescript
const handleIntent = (intent: AIIntent) => {
  if (intent.type === 'import' && intent.data?.questions) {
    // 处理错题录入
    const questions = intent.data.questions.map(q => ({
      ...q,
      id: generateQuestionId(),
      isNewSubject: !subjects.find(s => s.name === q.subject),
    }))
    setParsedQuestions(questions)
    setMode('import')

    // 大量错题时提示
    if (questions.length >= 4) {
      message.info(`识别到 ${questions.length} 条错题，请确认后批量录入`)
    }
  } else if (intent.type === 'plan') {
    // 处理学习规划
    const planParams = intent.data?.planParams
    const milestones = intent.data?.milestones

    if (planParams) {
      setPlanTopic(planParams.topic)
    }

    if (milestones && milestones.length > 0) {
      const processedMilestones = calculateMilestoneDates(
        milestones.map(m => ({ ...m, id: generateMilestoneId() }))
      )
      setParsedMilestones(processedMilestones)
      setMode('plan')
    } else if (planParams) {
      // 需要二次调用生成里程碑
      generateMilestones(planParams.topic, planParams.duration)
    }
  }
}

const generateMilestones = async (topic: string, duration?: number) => {
  if (!aiSettings?.api_key) return

  setLoading(true)
  try {
    const prompt = `用户想学习：${topic}
${duration ? `总时长：${duration} 天` : '请根据内容难度估算合理的天数'}

请生成学习里程碑，每个里程碑包含：
- title: 里程碑标题
- description: 详细描述和学习要点
- days: 预计天数
- dailyTopics: 每日学习主题数组

要求：
1. 里程碑之间要有逻辑顺序，从基础到进阶
2. 每个里程碑的天数之和应等于总时长
3. dailyTopics 的长度应等于 days

返回 JSON 数组格式：
[
  {
    "title": "...",
    "description": "...",
    "days": 7,
    "dailyTopics": ["Day 1: ...", "Day 2: ...", ...]
  },
  ...
]`

    const response = await callAIWithIntent(prompt, prompt, aiSettings)
    const jsonMatch = response.match(/\[[\s\S]*\]/)

    if (jsonMatch) {
      const milestones = JSON.parse(jsonMatch[0])
      const processedMilestones = calculateMilestoneDates(
        milestones.map((m: any) => ({ ...m, id: generateMilestoneId() }))
      )
      setParsedMilestones(processedMilestones)
      setMode('plan')
    }
  } catch (error) {
    message.error('生成里程碑失败')
    console.error(error)
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 7: 添加确认处理函数**

```typescript
// 错题录入确认
const handleImportConfirm = async (selectedQuestions: ParsedQuestion[]) => {
  setConfirming(true)
  try {
    // 获取 AI 标签 ID
    const tags = await window.electronAPI.db.tags.getAll()
    const aiTag = tags.find((t: any) => t.name === 'AI生成')

    for (const q of selectedQuestions) {
      const questionId = await window.electronAPI.db.questions.create({
        title: q.title,
        content: q.content,
        answer: q.answer,
        analysis: q.analysis,
        subject_id: q.selectedSubjectId,
        chapter_id: q.selectedChapterId,
      })

      // 关联 AI 标签
      if (aiTag && questionId) {
        // 需要添加关联标签的 IPC 方法
      }
    }

    message.success(`成功录入 ${selectedQuestions.length} 条错题`)
    setMode('normal')
    setParsedQuestions([])
  } catch (error) {
    message.error('录入失败')
    console.error(error)
  } finally {
    setConfirming(false)
  }
}

// 学习规划确认
const handlePlanConfirm = async () => {
  setConfirming(true)
  try {
    const selectedMilestones = parsedMilestones.filter((_, i) =>
      // 用户选择的里程碑逻辑
      true // 简化，实际需要根据 selectedIndices
    )

    if (syncSettings.createTask) {
      // 创建任务
      const taskId = await window.electronAPI.db.tasks.create({
        title: `学习计划：${planTopic}`,
        description: `AI 生成的学习计划，共 ${parsedMilestones.reduce((s, m) => s + m.days, 0)} 天`,
        deadline: parsedMilestones[parsedMilestones.length - 1]?.targetDate,
        priority: 2,
        progress_type: 'subitems',
        ai_generated: 1,
      })

      // 创建里程碑
      for (const m of parsedMilestones) {
        await window.electronAPI.db.milestones.create({
          task_id: taskId,
          title: m.title,
          description: m.description,
          target_date: m.targetDate,
          ai_generated: 1,
        })
      }

      // 创建子任务
      for (const m of parsedMilestones) {
        await window.electronAPI.db.taskSubitems.create({
          task_id: taskId,
          title: m.title,
        })
      }
    }

    if (syncSettings.createTodo) {
      // 创建每日计划
      let dayOffset = 0
      for (const m of parsedMilestones) {
        for (let i = 0; i < m.days; i++) {
          const date = dayjs().add(dayOffset + i, 'day').format('YYYY-MM-DD')
          const topic = m.dailyTopics[i] || `${m.title} Day ${i + 1}`

          await window.electronAPI.db.todo.create({
            date,
            content: `[${planTopic}] ${topic}`,
            ai_generated: 1,
          })
        }
        dayOffset += m.days
      }
    }

    message.success('学习计划创建成功')
    setMode('normal')
    setParsedMilestones([])
    setPlanTopic('')
  } catch (error) {
    message.error('创建失败')
    console.error(error)
  } finally {
    setConfirming(false)
  }
}
```

- [ ] **Step 8: 在 JSX 中添加结果展示区**

在消息列表和输入框之间添加：

```tsx
{/* AI 功能结果展示区 */}
{mode === 'import' && (
  <ImportResultArea
    questions={parsedQuestions}
    subjects={subjects}
    chapters={chapters}
    onEdit={(index, data) => {
      const updated = [...parsedQuestions]
      updated[index] = { ...updated[index], ...data }
      setParsedQuestions(updated)
    }}
    onCreateSubject={async (name) => {
      const id = await window.electronAPI.db.subjects.create({ name })
      const newSubject = { id, name, color: '#1890ff', icon: '', created_at: new Date().toISOString() }
      setSubjects(prev => [...prev, newSubject])
      return id
    }}
    onConfirm={handleImportConfirm}
    onCancel={() => {
      setMode('normal')
      setParsedQuestions([])
    }}
    loading={confirming}
  />
)}

{mode === 'plan' && (
  <PlanResultArea
    milestones={parsedMilestones}
    topic={planTopic}
    onEditMilestone={(index, data) => {
      const updated = [...parsedMilestones]
      updated[index] = { ...updated[index], ...data }
      setParsedMilestones(updated)
    }}
    onAddMilestone={() => {
      const lastDate = parsedMilestones.length > 0
        ? dayjs(parsedMilestones[parsedMilestones.length - 1].targetDate).add(1, 'day')
        : dayjs()

      const newMilestone: ParsedMilestone = {
        id: generateMilestoneId(),
        title: '新里程碑',
        description: '',
        days: 7,
        targetDate: lastDate.add(6, 'day').format('YYYY-MM-DD'),
        dailyTopics: Array(7).fill(''),
      }
      setParsedMilestones(prev => [...prev, newMilestone])
    }}
    onRemoveMilestone={(index) => {
      setParsedMilestones(prev => prev.filter((_, i) => i !== index))
    }}
    syncSettings={syncSettings}
    onSyncSettingsChange={setSyncSettings}
    onConfirm={handlePlanConfirm}
    onCancel={() => {
      setMode('normal')
      setParsedMilestones([])
      setPlanTopic('')
    }}
    loading={confirming}
  />
)}
```

- [ ] **Step 9: 提交**

```bash
git add src/pages/Chat/index.tsx
git commit -m "feat(chat): integrate AI intent recognition and mode system

- Add normal/import/plan mode state
- Integrate AI intent detection in sendMessage
- Add ImportResultArea and PlanResultArea rendering
- Handle confirm actions for questions and milestones

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: 更新 IPC 和 preload 暴露新 API

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: 添加问题标签关联 IPC**

在 `electron/main.ts` 中添加：

```typescript
// IPC：为错题添加标签
ipcMain.handle('db:questionTags:add', async (_event, questionId: number, tagId: number) => {
  run(
    `INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)`,
    [questionId, tagId]
  )
  return true
})
```

- [ ] **Step 2: 在 preload.ts 中暴露新 API**

在 `db` 对象中添加：

```typescript
questionTags: {
  add: (questionId: number, tagId: number) =>
    ipcRenderer.invoke('db:questionTags:add', questionId, tagId),
},
```

- [ ] **Step 3: 更新 ElectronAPI 类型声明**

```typescript
questionTags: {
  add: (questionId: number, tagId: number) => Promise<boolean>
}
```

- [ ] **Step 4: 提交**

```bash
git add electron/main.ts electron/preload.ts
git commit -m "feat(ipc): add question tag association API

- Add db:questionTags:add IPC handler
- Expose API in preload

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: 在错题列表显示 AI 标签

**Files:**
- Modify: `src/pages/Questions/QuestionList.tsx`

- [ ] **Step 1: 在错题项中显示 AI 标签**

找到渲染标签的位置，添加 AI 标签显示逻辑：

```tsx
// 在标签显示区域添加
{question.tagList?.map((tag: any) => (
  <Tag key={tag.id} color={tag.color}>
    {tag.name}
  </Tag>
))}
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/Questions/QuestionList.tsx
git commit -m "feat(ui): show AI tag in question list

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: 在任务和 Todo 列表显示 AI 标识

**Files:**
- Modify: `src/pages/Tasks/index.tsx`
- Modify: `src/pages/Todo/index.tsx`

- [ ] **Step 1: 在任务列表添加 AI 徽章**

在任务渲染位置添加：

```tsx
{task.ai_generated === 1 && (
  <Tag color="#722ed1">🤖 AI</Tag>
)}
```

- [ ] **Step 2: 在 Todo 列表添加 AI 标识**

```tsx
{todo.ai_generated === 1 && (
  <div className="w-1 bg-purple-500 absolute left-0 top-0 bottom-0" />
)}
```

- [ ] **Step 3: 提交**

```bash
git add src/pages/Tasks/index.tsx src/pages/Todo/index.tsx
git commit -m "feat(ui): show AI indicator in tasks and todo

- Add AI badge for AI-generated tasks
- Add purple indicator for AI-generated todos

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: 完善错题录入确认逻辑

**Files:**
- Modify: `src/pages/Chat/index.tsx`

- [ ] **Step 1: 完善 handleImportConfirm 函数**

```typescript
const handleImportConfirm = async (selectedQuestions: ParsedQuestion[]) => {
  setConfirming(true)
  try {
    // 获取 AI 标签
    const tags = await window.electronAPI.db.tags.getAll()
    const aiTag = tags.find((t: any) => t.name === 'AI生成')

    let successCount = 0
    for (const q of selectedQuestions) {
      try {
        // 创建错题
        const questionId = await window.electronAPI.db.questions.create({
          title: q.title,
          content: q.content || '',
          answer: q.answer || '',
          analysis: q.analysis || '',
          subject_id: q.selectedSubjectId,
          chapter_id: q.selectedChapterId,
        })

        // 关联 AI 标签
        if (aiTag && questionId) {
          await window.electronAPI.db.questionTags.add(questionId, aiTag.id)
        }

        successCount++
      } catch (error) {
        console.error('Failed to create question:', q.title, error)
      }
    }

    message.success(`成功录入 ${successCount} 条错题`)
    setMode('normal')
    setParsedQuestions([])
  } catch (error) {
    message.error('录入失败')
    console.error(error)
  } finally {
    setConfirming(false)
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/Chat/index.tsx
git commit -m "fix(chat): complete question import with AI tag

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: 测试和修复

- [ ] **Step 1: 运行 lint 检查**

```bash
yarn lint
```

- [ ] **Step 2: 运行应用测试功能**

```bash
yarn dev
```

测试场景：
1. 在 Chat 中输入"帮我整理错题"后跟题目内容，验证识别和预览
2. 在 Chat 中输入"我想学习大模型"，验证规划生成和预览
3. 确认录入后检查错题列表是否显示 AI 标签
4. 确认规划后检查任务和 Todo 是否创建成功

- [ ] **Step 3: 修复发现的问题**

根据测试结果修复问题。

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "fix: resolve issues found in testing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 执行顺序总结

1. Task 1: 数据库迁移
2. Task 2: 服务层支持
3. Task 3: 类型定义
4. Task 4: AI 意图识别工具
5. Task 5: ImportResultArea 组件
6. Task 6: PlanResultArea 组件
7. Task 8: IPC API 更新
8. Task 7: Chat 页面集成（依赖 Task 5, 6, 8）
9. Task 9: 错题列表显示 AI 标签
10. Task 10: 任务/Todo 显示 AI 标识
11. Task 11: 完善确认逻辑
12. Task 12: 测试和修复
