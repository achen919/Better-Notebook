import { create } from 'zustand'
import type { PomodoroSettings, PomodoroTodayStats, PomodoroState } from '../types'
import { POMODORO_DEFAULTS } from '../constants/pomodoro'

interface PomodoroStoreState {
  // Timer state
  status: 'idle' | 'running' | 'paused' | 'overtime'
  remaining: number
  overtime: number
  totalDuration: number
  currentSubjectId: number | null
  currentSubjectName: string | null
  currentGoal: string
  sessionId: number | null

  // Statistics
  todayStats: PomodoroTodayStats

  // Settings
  settings: PomodoroSettings | null

  // Loading states
  loading: boolean
  settingsLoading: boolean
}

interface PomodoroStoreActions {
  // State management
  setState: (partial: Partial<PomodoroStoreState>) => void

  // Fetch actions
  fetchState: () => Promise<void>
  fetchTodayStats: () => Promise<void>
  fetchSettings: () => Promise<void>

  // Settings actions
  saveSettings: (settings: Partial<PomodoroSettings>) => Promise<void>
  setSettingsSaving: (loading: boolean) => void

  // Timer control actions
  start: (durationMinutes?: number, subjectId?: number, subjectName?: string, goal?: string) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<{ duration: number; completed: boolean; totalPauseTime: number } | null>

  // Update actions during running
  updateGoal: (goal: string) => Promise<void>
  updateSubject: (subjectId: number, subjectName?: string) => Promise<void>

  // Event listeners
  setupListeners: () => void
  cleanupListeners: () => void
}

type PomodoroStore = PomodoroStoreState & PomodoroStoreActions

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  // Initial state
  status: 'idle',
  remaining: 0,
  overtime: 0,
  totalDuration: 0,
  currentSubjectId: null,
  currentSubjectName: null,
  currentGoal: '',
  sessionId: null,
  todayStats: { count: 0, total_duration: 0 },
  settings: null,
  loading: false,
  settingsLoading: false,

  // Internal state update
  setState: (partial) => set(partial),

  // Fetch current timer state from main process
  fetchState: async () => {
    try {
      const state = await window.electronAPI.pomodoroControl.getState()
      if (state) {
        set({
          status: state.status || 'idle',
          remaining: state.remaining || 0,
          overtime: state.overtime || 0,
          totalDuration: state.totalDuration || 0,
          currentSubjectId: state.subjectId || null,
          currentSubjectName: state.subjectName || null,
          currentGoal: state.goal || '',
          sessionId: state.sessionId || null,
        })
      }
    } catch (error) {
      console.error('Failed to fetch pomodoro state:', error)
    }
  },

  // Fetch today's statistics
  fetchTodayStats: async () => {
    try {
      const stats = await window.electronAPI.db.pomodoro.getTodayStats()
      set({
        todayStats: stats || { count: 0, total_duration: 0 },
      })
    } catch (error) {
      console.error('Failed to fetch today stats:', error)
    }
  },

  // Fetch settings
  fetchSettings: async () => {
    set({ settingsLoading: true })
    try {
      const settings = await window.electronAPI.db.pomodoro.getSettings()
      set({ settings, settingsLoading: false })
    } catch (error) {
      console.error('Failed to fetch pomodoro settings:', error)
      set({ settingsLoading: false })
    }
  },

  // Save settings
  saveSettings: async (newSettings) => {
    try {
      await window.electronAPI.db.pomodoro.saveSettings(newSettings)
      // Refresh settings after saving
      await get().fetchSettings()
    } catch (error) {
      console.error('Failed to save pomodoro settings:', error)
      throw error
    }
  },

  // Set settings loading state
  setSettingsSaving: (loading) => set({ settingsLoading: loading }),

  // Start pomodoro
  start: async (durationMinutes, subjectId, subjectName, goal) => {
    try {
      const settings = get().settings
      const duration = durationMinutes || settings?.focus_duration || POMODORO_DEFAULTS.FOCUS_DURATION

      await window.electronAPI.pomodoroControl.start(
        duration,
        subjectId ?? settings?.default_subject_id ?? undefined,
        goal || ''
      )

      // Update local state
      set({
        status: 'running',
        totalDuration: duration * 60, // Convert to seconds
        remaining: duration * 60,
        currentSubjectId: subjectId ?? settings?.default_subject_id ?? null,
        currentSubjectName: subjectName || null,
        currentGoal: goal || '',
      })
    } catch (error) {
      console.error('Failed to start pomodoro:', error)
      throw error
    }
  },

  // Pause timer
  pause: async () => {
    try {
      await window.electronAPI.pomodoroControl.pause()
      set({ status: 'paused' })
    } catch (error) {
      console.error('Failed to pause pomodoro:', error)
      throw error
    }
  },

  // Resume timer
  resume: async () => {
    try {
      await window.electronAPI.pomodoroControl.resume()
      set({ status: 'running' })
    } catch (error) {
      console.error('Failed to resume pomodoro:', error)
      throw error
    }
  },

  // Stop timer
  stop: async () => {
    try {
      const result = await window.electronAPI.pomodoroControl.stop()

      // Reset local state
      set({
        status: 'idle',
        remaining: 0,
        totalDuration: 0,
        currentSubjectId: null,
        currentSubjectName: null,
        currentGoal: '',
        sessionId: null,
      })

      // Refresh today stats
      await get().fetchTodayStats()

      return result
    } catch (error) {
      console.error('Failed to stop pomodoro:', error)
      throw error
    }
  },

  // Update goal during running
  updateGoal: async (goal) => {
    try {
      await window.electronAPI.pomodoroControl.updateGoal(goal)
      set({ currentGoal: goal })
    } catch (error) {
      console.error('Failed to update goal:', error)
      throw error
    }
  },

  // Update subject during running
  updateSubject: async (subjectId, subjectName) => {
    try {
      await window.electronAPI.pomodoroControl.updateSubject(subjectId)
      set({
        currentSubjectId: subjectId,
        currentSubjectName: subjectName || null,
      })
    } catch (error) {
      console.error('Failed to update subject:', error)
      throw error
    }
  },

  // Setup event listeners for state changes from main process
  setupListeners: () => {
    // Listen for state changes from main process
    window.electronAPI.pomodoroControl.onStateChanged((state: PomodoroState) => {
      set({
        status: state.status,
        remaining: state.remaining,
        overtime: state.overtime || 0,
        totalDuration: state.totalDuration,
        currentSubjectId: state.subjectId,
        currentSubjectName: state.subjectName,
        currentGoal: state.goal,
        sessionId: state.sessionId,
      })
    })

    // Listen for completion events
    window.electronAPI.pomodoroControl.onCompleted(() => {
      // Refresh today stats when a pomodoro completes
      get().fetchTodayStats()
    })
  },

  // Cleanup event listeners
  cleanupListeners: () => {
    window.electronAPI.pomodoroControl.removeAllListeners('pomodoro:stateChanged')
    window.electronAPI.pomodoroControl.removeAllListeners('pomodoro:completed')
  },
}))
