import { create } from 'zustand'
import type { Question, ReviewRecord, CreateReviewInput } from '../types'
import { calculateNextReview } from '../utils/ebbinghaus'

interface ReviewState {
  todayQuestions: Question[]
  currentReviewIndex: number
  reviewRecords: ReviewRecord[]
  loading: boolean

  // Actions
  setTodayQuestions: (questions: Question[]) => void
  setCurrentReviewIndex: (index: number) => void
  setReviewRecords: (records: ReviewRecord[]) => void
  setLoading: (loading: boolean) => void

  // 复习流程
  fetchTodayReviews: () => Promise<void>
  startReview: () => void
  nextQuestion: () => void
  previousQuestion: () => void
  submitReview: (questionId: number, feedback: 'forgotten' | 'vague' | 'familiar' | 'mastered') => Promise<void>
  fetchReviewRecords: (questionId: number) => Promise<void>
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  todayQuestions: [],
  currentReviewIndex: 0,
  reviewRecords: [],
  loading: false,

  setTodayQuestions: (questions) => set({ todayQuestions: questions }),
  setCurrentReviewIndex: (index) => set({ currentReviewIndex: index }),
  setReviewRecords: (records) => set({ reviewRecords: records }),
  setLoading: (loading) => set({ loading }),

  fetchTodayReviews: async () => {
    set({ loading: true })
    try {
      const questions = await window.electronAPI.db.questions.getForReview()
      set({ todayQuestions: questions, currentReviewIndex: 0, loading: false })
    } catch (error) {
      console.error('Failed to fetch today reviews:', error)
      set({ loading: false })
    }
  },

  startReview: () => {
    set({ currentReviewIndex: 0 })
  },

  nextQuestion: () => {
    const { currentReviewIndex, todayQuestions } = get()
    if (currentReviewIndex < todayQuestions.length - 1) {
      set({ currentReviewIndex: currentReviewIndex + 1 })
    }
  },

  previousQuestion: () => {
    const { currentReviewIndex } = get()
    if (currentReviewIndex > 0) {
      set({ currentReviewIndex: currentReviewIndex - 1 })
    }
  },

  submitReview: async (questionId, feedback) => {
    try {
      // 获取当前问题信息
      const question = await window.electronAPI.db.questions.getById(questionId)
      const currentLevel = question.mastery_level || 0

      // 计算下次复习时间
      const { nextReviewDate, newLevel } = calculateNextReview(currentLevel, feedback)

      // 创建复习记录
      const reviewData: CreateReviewInput = {
        question_id: questionId,
        level: newLevel,
        feedback,
        next_review_date: nextReviewDate,
      }
      await window.electronAPI.db.reviews.create(reviewData)

      // 更新问题的复习状态
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      await window.electronAPI.db.questions.updateReviewStatus(questionId, {
        mastery_level: newLevel,
        review_count: (question.review_count || 0) + 1,
        next_review_date: nextReviewDate,
        last_review_date: now,
      })

      // 刷新今日复习列表
      await get().fetchTodayReviews()
    } catch (error) {
      console.error('Failed to submit review:', error)
      throw error
    }
  },

  fetchReviewRecords: async (questionId) => {
    try {
      const records = await window.electronAPI.db.reviews.getRecords(questionId)
      set({ reviewRecords: records })
    } catch (error) {
      console.error('Failed to fetch review records:', error)
    }
  },
}))
