// ==================== 错题类型 ====================
export interface Question {
  id: number
  title: string
  content: string
  answer: string
  analysis: string
  source: string
  subject_id: number | null
  chapter_id: number | null
  difficulty: number
  mastery_level: number
  review_count: number
  next_review_date: string | null
  last_review_date: string | null
  created_at: string
  updated_at: string
  subject_name?: string
  chapter_name?: string
  tags?: string
  tagList?: Tag[]
}

export interface CreateQuestionInput {
  title: string
  content?: string
  answer?: string
  analysis?: string
  source?: string
  subject_id?: number
  chapter_id?: number
  difficulty?: number
  tags?: number[]
}

export interface UpdateQuestionInput extends Partial<CreateQuestionInput> {}

// ==================== 科目类型 ====================
export interface Subject {
  id: number
  name: string
  color: string
  icon: string
  created_at: string
  question_count?: number
}

export interface CreateSubjectInput {
  name: string
  color?: string
  icon?: string
}

// ==================== 章节类型 ====================
export interface Chapter {
  id: number
  subject_id: number
  name: string
  sort_order: number
  created_at: string
  question_count?: number
}

export interface CreateChapterInput {
  subject_id: number
  name: string
  sort_order?: number
}

// ==================== 标签类型 ====================
export interface Tag {
  id: number
  name: string
  color: string
  created_at: string
  usage_count?: number
}

export interface CreateTagInput {
  name: string
  color?: string
}

// ==================== 复习记录类型 ====================
export interface ReviewRecord {
  id: number
  question_id: number
  review_date: string
  level: number
  feedback: 'forgotten' | 'vague' | 'familiar' | 'mastered'
  next_review_date: string
  created_at: string
}

export interface CreateReviewInput {
  question_id: number
  level: number
  feedback: string
  next_review_date: string
}

// ==================== 统计类型 ====================
export interface OverviewStats {
  total_questions: number
  mastered_questions: number
  today_reviews: number
  completed_today: number
  total_subjects: number
  total_tags: number
}

export interface SubjectStats {
  id: number
  name: string
  color: string
  total: number
  mastered: number
  avg_difficulty: number
}

export interface DailyStats {
  date: string
  review_count: number
  mastered_count: number
  forgotten_count: number
}

// ==================== 艾宾浩斯算法类型 ====================
export interface EbbinghausStage {
  level: number
  interval: number
  unit: 'minutes' | 'hours' | 'days' | 'months'
  description: string
}

export type FeedbackLevel = 'forgotten' | 'vague' | 'familiar' | 'mastered'

export interface ReviewFeedback {
  level: FeedbackLevel
  label: string
  color: string
  icon: string
  description: string
}
