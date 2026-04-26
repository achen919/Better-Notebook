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
