import { create } from 'zustand'
import type { OverviewStats, SubjectStats, DailyStats } from '../types'

interface StatisticsState {
  overview: OverviewStats | null
  subjectStats: SubjectStats[]
  dailyStats: DailyStats[]
  loading: boolean

  // Actions
  setOverview: (overview: OverviewStats) => void
  setSubjectStats: (stats: SubjectStats[]) => void
  setDailyStats: (stats: DailyStats[]) => void
  setLoading: (loading: boolean) => void

  // 获取统计数据
  fetchOverview: () => Promise<void>
  fetchSubjectStats: () => Promise<void>
  fetchDailyStats: (days?: number) => Promise<void>
  refreshAll: () => Promise<void>
}

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
  overview: null,
  subjectStats: [],
  dailyStats: [],
  loading: false,

  setOverview: (overview) => set({ overview }),
  setSubjectStats: (stats) => set({ subjectStats: stats }),
  setDailyStats: (stats) => set({ dailyStats: stats }),
  setLoading: (loading) => set({ loading }),

  fetchOverview: async () => {
    try {
      const overview = await window.electronAPI.db.statistics.getOverview()
      set({ overview })
    } catch (error) {
      console.error('Failed to fetch overview:', error)
    }
  },

  fetchSubjectStats: async () => {
    try {
      const stats = await window.electronAPI.db.statistics.getSubjectStats()
      set({ subjectStats: stats })
    } catch (error) {
      console.error('Failed to fetch subject stats:', error)
    }
  },

  fetchDailyStats: async (days = 30) => {
    try {
      const stats = await window.electronAPI.db.statistics.getDailyStats(days)
      set({ dailyStats: stats })
    } catch (error) {
      console.error('Failed to fetch daily stats:', error)
    }
  },

  refreshAll: async () => {
    set({ loading: true })
    try {
      await Promise.all([
        get().fetchOverview(),
        get().fetchSubjectStats(),
        get().fetchDailyStats(),
      ])
      set({ loading: false })
    } catch (error) {
      console.error('Failed to refresh statistics:', error)
      set({ loading: false })
    }
  },
}))
