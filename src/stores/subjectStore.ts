import { create } from 'zustand'
import type { Subject, Chapter, Tag, CreateSubjectInput, CreateChapterInput, CreateTagInput } from '../types'

interface SubjectState {
  subjects: Subject[]
  chapters: Chapter[]
  tags: Tag[]
  loading: boolean

  // Actions
  setSubjects: (subjects: Subject[]) => void
  setChapters: (chapters: Chapter[]) => void
  setTags: (tags: Tag[]) => void
  setLoading: (loading: boolean) => void

  // 科目操作
  fetchSubjects: () => Promise<void>
  createSubject: (data: CreateSubjectInput) => Promise<number>
  updateSubject: (id: number, data: Partial<CreateSubjectInput>) => Promise<void>
  deleteSubject: (id: number) => Promise<void>

  // 章节操作
  fetchChapters: (subjectId: number) => Promise<void>
  createChapter: (data: CreateChapterInput) => Promise<number>
  updateChapter: (id: number, data: Partial<CreateChapterInput>) => Promise<void>
  deleteChapter: (id: number) => Promise<void>

  // 标签操作
  fetchTags: () => Promise<void>
  createTag: (data: CreateTagInput) => Promise<number>
  updateTag: (id: number, data: Partial<CreateTagInput>) => Promise<void>
  deleteTag: (id: number) => Promise<void>
}

export const useSubjectStore = create<SubjectState>((set, get) => ({
  subjects: [],
  chapters: [],
  tags: [],
  loading: false,

  setSubjects: (subjects) => set({ subjects }),
  setChapters: (chapters) => set({ chapters }),
  setTags: (tags) => set({ tags }),
  setLoading: (loading) => set({ loading }),

  // 科目操作
  fetchSubjects: async () => {
    set({ loading: true })
    try {
      const subjects = await window.electronAPI.db.subjects.getAll()
      set({ subjects, loading: false })
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
      set({ loading: false })
    }
  },

  createSubject: async (data) => {
    try {
      const id = await window.electronAPI.db.subjects.create(data)
      await get().fetchSubjects()
      return id
    } catch (error) {
      console.error('Failed to create subject:', error)
      throw error
    }
  },

  updateSubject: async (id, data) => {
    try {
      await window.electronAPI.db.subjects.update(id, data)
      await get().fetchSubjects()
    } catch (error) {
      console.error('Failed to update subject:', error)
      throw error
    }
  },

  deleteSubject: async (id) => {
    try {
      await window.electronAPI.db.subjects.delete(id)
      await get().fetchSubjects()
    } catch (error) {
      console.error('Failed to delete subject:', error)
      throw error
    }
  },

  // 章节操作
  fetchChapters: async (subjectId) => {
    try {
      const chapters = await window.electronAPI.db.chapters.getBySubject(subjectId)
      set({ chapters })
    } catch (error) {
      console.error('Failed to fetch chapters:', error)
    }
  },

  createChapter: async (data) => {
    try {
      const id = await window.electronAPI.db.chapters.create(data)
      await get().fetchChapters(data.subject_id)
      return id
    } catch (error) {
      console.error('Failed to create chapter:', error)
      throw error
    }
  },

  updateChapter: async (id, data) => {
    try {
      await window.electronAPI.db.chapters.update(id, data)
      const { subjects } = get()
      const subject = subjects.find(s => s.id === data.subject_id)
      if (subject) {
        await get().fetchChapters(subject.id)
      }
    } catch (error) {
      console.error('Failed to update chapter:', error)
      throw error
    }
  },

  deleteChapter: async (id) => {
    try {
      await window.electronAPI.db.chapters.delete(id)
    } catch (error) {
      console.error('Failed to delete chapter:', error)
      throw error
    }
  },

  // 标签操作
  fetchTags: async () => {
    set({ loading: true })
    try {
      const tags = await window.electronAPI.db.tags.getAll()
      set({ tags, loading: false })
    } catch (error) {
      console.error('Failed to fetch tags:', error)
      set({ loading: false })
    }
  },

  createTag: async (data) => {
    try {
      const id = await window.electronAPI.db.tags.create(data)
      await get().fetchTags()
      return id
    } catch (error) {
      console.error('Failed to create tag:', error)
      throw error
    }
  },

  updateTag: async (id, data) => {
    try {
      await window.electronAPI.db.tags.update(id, data)
      await get().fetchTags()
    } catch (error) {
      console.error('Failed to update tag:', error)
      throw error
    }
  },

  deleteTag: async (id) => {
    try {
      await window.electronAPI.db.tags.delete(id)
      await get().fetchTags()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      throw error
    }
  },
}))
