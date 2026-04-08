import { create } from 'zustand'
import type { Question, CreateQuestionInput, UpdateQuestionInput } from '../types'

interface QuestionState {
  questions: Question[]
  currentQuestion: Question | null
  loading: boolean
  searchQuery: string
  selectedSubject: number | null
  selectedChapter: number | null

  // Actions
  setQuestions: (questions: Question[]) => void
  setCurrentQuestion: (question: Question | null) => void
  setLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  setSelectedSubject: (subjectId: number | null) => void
  setSelectedChapter: (chapterId: number | null) => void

  // Async Actions
  fetchQuestions: () => Promise<void>
  fetchQuestionById: (id: number) => Promise<void>
  createQuestion: (data: CreateQuestionInput) => Promise<number>
  updateQuestion: (id: number, data: UpdateQuestionInput) => Promise<void>
  deleteQuestion: (id: number) => Promise<void>
  searchQuestions: (query: string) => Promise<void>
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: [],
  currentQuestion: null,
  loading: false,
  searchQuery: '',
  selectedSubject: null,
  selectedChapter: null,

  setQuestions: (questions) => set({ questions }),
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setLoading: (loading) => set({ loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedSubject: (subjectId) => set({ selectedSubject: subjectId, selectedChapter: null }),
  setSelectedChapter: (chapterId) => set({ selectedChapter: chapterId }),

  fetchQuestions: async () => {
    set({ loading: true })
    try {
      const questions = await window.electronAPI.db.questions.getAll()
      set({ questions, loading: false })
    } catch (error) {
      console.error('Failed to fetch questions:', error)
      set({ loading: false })
    }
  },

  fetchQuestionById: async (id) => {
    set({ loading: true })
    try {
      const question = await window.electronAPI.db.questions.getById(id)
      set({ currentQuestion: question, loading: false })
    } catch (error) {
      console.error('Failed to fetch question:', error)
      set({ loading: false })
    }
  },

  createQuestion: async (data) => {
    try {
      const id = await window.electronAPI.db.questions.create(data)
      await get().fetchQuestions()
      return id
    } catch (error) {
      console.error('Failed to create question:', error)
      throw error
    }
  },

  updateQuestion: async (id, data) => {
    try {
      await window.electronAPI.db.questions.update(id, data)
      await get().fetchQuestions()
    } catch (error) {
      console.error('Failed to update question:', error)
      throw error
    }
  },

  deleteQuestion: async (id) => {
    try {
      await window.electronAPI.db.questions.delete(id)
      await get().fetchQuestions()
    } catch (error) {
      console.error('Failed to delete question:', error)
      throw error
    }
  },

  searchQuestions: async (query) => {
    set({ loading: true, searchQuery: query })
    try {
      const questions = await window.electronAPI.db.questions.search(query)
      set({ questions, loading: false })
    } catch (error) {
      console.error('Failed to search questions:', error)
      set({ loading: false })
    }
  },
}))
