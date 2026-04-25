import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 显示系统通知
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', { title, body }),

  // 获取应用数据路径
  getAppPath: () =>
    ipcRenderer.invoke('get-app-path'),

  // 数据库操作
  db: {
    // 初始化数据库
    init: () => ipcRenderer.invoke('db:init'),

    // 错题相关
    questions: {
      getAll: () => ipcRenderer.invoke('db:questions:getAll'),
      getById: (id: number) => ipcRenderer.invoke('db:questions:getById', id),
      create: (data: any) => ipcRenderer.invoke('db:questions:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:questions:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:questions:delete', id),
      search: (query: string) => ipcRenderer.invoke('db:questions:search', query),
      getForReview: () => ipcRenderer.invoke('db:questions:getForReview'),
      updateReviewStatus: (id: number, data: any) => ipcRenderer.invoke('db:questions:updateReviewStatus', id, data),
    },

    // 复习记录相关
    reviews: {
      getRecords: (questionId: number) => ipcRenderer.invoke('db:reviews:getRecords', questionId),
      create: (data: any) => ipcRenderer.invoke('db:reviews:create', data),
      getTodayReviews: () => ipcRenderer.invoke('db:reviews:getTodayReviews'),
    },

    // 科目相关
    subjects: {
      getAll: () => ipcRenderer.invoke('db:subjects:getAll'),
      create: (data: any) => ipcRenderer.invoke('db:subjects:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:subjects:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:subjects:delete', id),
    },

    // 章节相关
    chapters: {
      getBySubject: (subjectId: number) => ipcRenderer.invoke('db:chapters:getBySubject', subjectId),
      create: (data: any) => ipcRenderer.invoke('db:chapters:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:chapters:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:chapters:delete', id),
    },

    // 标签相关
    tags: {
      getAll: () => ipcRenderer.invoke('db:tags:getAll'),
      create: (data: any) => ipcRenderer.invoke('db:tags:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:tags:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:tags:delete', id),
    },

    // 统计相关
    statistics: {
      getOverview: () => ipcRenderer.invoke('db:statistics:getOverview'),
      getSubjectStats: () => ipcRenderer.invoke('db:statistics:getSubjectStats'),
      getDailyStats: (days: number) => ipcRenderer.invoke('db:statistics:getDailyStats', days),
    },

    // 录音相关
    audio: {
      getByQuestion: (questionId: number) => ipcRenderer.invoke('db:audio:getByQuestion', questionId),
      getAudioData: (id: number) => ipcRenderer.invoke('db:audio:getAudioData', id),
      create: (data: any) => ipcRenderer.invoke('db:audio:create', data),
      delete: (id: number) => ipcRenderer.invoke('db:audio:delete', id),
      updateTitle: (id: number, title: string) => ipcRenderer.invoke('db:audio:updateTitle', id, title),
    },

    // 每日TODO相关
    todo: {
      getByDate: (date: string) => ipcRenderer.invoke('db:todo:getByDate', date),
      create: (data: any) => ipcRenderer.invoke('db:todo:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:todo:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:todo:delete', id),
      getCompletionRate: (date: string) => ipcRenderer.invoke('db:todo:getCompletionRate', date),
      getRecentStats: (days: number) => ipcRenderer.invoke('db:todo:getRecentStats', days),
    },

    // 每日总结相关
    summary: {
      getByDate: (date: string) => ipcRenderer.invoke('db:summary:getByDate', date),
      getRecent: (days: number) => ipcRenderer.invoke('db:summary:getRecent', days),
      upsert: (data: any) => ipcRenderer.invoke('db:summary:upsert', data),
      delete: (date: string) => ipcRenderer.invoke('db:summary:delete', date),
    },

    // 学习时间相关
    learningTime: {
      getByDate: (date: string) => ipcRenderer.invoke('db:learningTime:getByDate', date),
      getTotalByDate: (date: string) => ipcRenderer.invoke('db:learningTime:getTotalByDate', date),
      create: (data: any) => ipcRenderer.invoke('db:learningTime:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:learningTime:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:learningTime:delete', id),
      getStats: (period: 'week' | 'month' | 'year') => ipcRenderer.invoke('db:learningTime:getStats', period),
      getSubjectDistribution: (days: number) => ipcRenderer.invoke('db:learningTime:getSubjectDistribution', days),
    },

    // 任务相关
    tasks: {
      getAll: (status?: string) => ipcRenderer.invoke('db:tasks:getAll', status),
      getActive: () => ipcRenderer.invoke('db:tasks:getActive'),
      getUpcoming: (days: number) => ipcRenderer.invoke('db:tasks:getUpcoming', days),
      getById: (id: number) => ipcRenderer.invoke('db:tasks:getById', id),
      create: (data: any) => ipcRenderer.invoke('db:tasks:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:tasks:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:tasks:delete', id),
    },

    // 任务子项目相关
    taskSubitems: {
      getByTask: (taskId: number) => ipcRenderer.invoke('db:taskSubitems:getByTask', taskId),
      create: (data: any) => ipcRenderer.invoke('db:taskSubitems:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:taskSubitems:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:taskSubitems:delete', id),
    },

    // 任务进度相关
    taskProgress: {
      getByTask: (taskId: number) => ipcRenderer.invoke('db:taskProgress:getByTask', taskId),
      getByDate: (date: string) => ipcRenderer.invoke('db:taskProgress:getByDate', date),
      create: (data: any) => ipcRenderer.invoke('db:taskProgress:create', data),
      delete: (id: number) => ipcRenderer.invoke('db:taskProgress:delete', id),
    },

    // 里程碑相关
    milestones: {
      getByTask: (taskId: number) => ipcRenderer.invoke('db:milestones:getByTask', taskId),
      create: (data: any) => ipcRenderer.invoke('db:milestones:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:milestones:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:milestones:delete', id),
    },

    // AI配置相关
    aiSettings: {
      get: () => ipcRenderer.invoke('db:aiSettings:get'),
      save: (data: any) => ipcRenderer.invoke('db:aiSettings:save', data),
      delete: () => ipcRenderer.invoke('db:aiSettings:delete'),
    },

    // 聊天历史相关
    chatHistory: {
      getAll: (limit?: number) => ipcRenderer.invoke('db:chatHistory:getAll', limit),
      add: (data: any) => ipcRenderer.invoke('db:chatHistory:add', data),
      markAsSaved: (id: number) => ipcRenderer.invoke('db:chatHistory:markAsSaved', id),
      clear: () => ipcRenderer.invoke('db:chatHistory:clear'),
      delete: (id: number) => ipcRenderer.invoke('db:chatHistory:delete', id),
    },

    // 弱势点相关
    weakPoints: {
      getAll: () => ipcRenderer.invoke('db:weakPoints:getAll'),
      getBySubject: (subjectId: number) => ipcRenderer.invoke('db:weakPoints:getBySubject', subjectId),
      add: (data: any) => ipcRenderer.invoke('db:weakPoints:add', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:weakPoints:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:weakPoints:delete', id),
    },

    // 番茄钟相关
    pomodoro: {
      getSettings: () => ipcRenderer.invoke('pomodoro:getSettings'),
      saveSettings: (data: any) => ipcRenderer.invoke('pomodoro:saveSettings', data),
      getTodayStats: () => ipcRenderer.invoke('pomodoro:getTodayStats'),
      getIncompleteSession: () => ipcRenderer.invoke('pomodoro:getIncompleteSession'),
      createSession: (data: any) => ipcRenderer.invoke('pomodoro:createSession', data),
      updateSession: (id: number, data: any) => ipcRenderer.invoke('pomodoro:updateSession', id, data),
    },
  },

  // AI API 调用
  ai: {
    call: (options: { url: string; apiKey: string; body: any }) =>
      ipcRenderer.invoke('ai:call', options),
  },

  // 番茄钟控制相关
  pomodoroControl: {
    start: (durationMinutes: number, subjectId?: number, goal?: string) =>
      ipcRenderer.invoke('pomodoro:start', durationMinutes, subjectId, goal),
    pause: () =>
      ipcRenderer.invoke('pomodoro:pause'),
    resume: () =>
      ipcRenderer.invoke('pomodoro:resume'),
    stop: () =>
      ipcRenderer.invoke('pomodoro:stop'),
    getState: () =>
      ipcRenderer.invoke('pomodoro:getState'),
    updateGoal: (goal: string) =>
      ipcRenderer.invoke('pomodoro:updateGoal', goal),
    updateSubject: (subjectId: number) =>
      ipcRenderer.invoke('pomodoro:updateSubject', subjectId),
    onStateChanged: (callback: (state: any) => void) => {
      ipcRenderer.on('pomodoro:stateChanged', (_event, state) => callback(state))
    },
    onCompleted: (callback: (data: any) => void) => {
      ipcRenderer.on('pomodoro:completed', (_event, data) => callback(data))
    },
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel)
    },
  },

  // 自动更新相关
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update-available', (_event, info) => callback(info))
    },
    onUpdateNotAvailable: (callback: () => void) => {
      ipcRenderer.on('update-not-available', () => callback())
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('download-progress', (_event, progress) => callback(progress))
    },
    onUpdateDownloaded: (callback: () => void) => {
      ipcRenderer.on('update-downloaded', () => callback())
    },
    onUpdateError: (callback: (error: string) => void) => {
      ipcRenderer.on('update-error', (_event, error) => callback(error))
    },
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel)
    },
  },
})

// TypeScript 类型声明
export interface ElectronAPI {
  showNotification: (title: string, body: string) => Promise<boolean>
  getAppPath: () => Promise<string>
  db: {
    init: () => Promise<void>
    questions: {
      getAll: () => Promise<any[]>
      getById: (id: number) => Promise<any>
      create: (data: any) => Promise<number>
      update: (id: number, data: any) => Promise<void>
      delete: (id: number) => Promise<void>
      search: (query: string) => Promise<any[]>
      getForReview: () => Promise<any[]>
      updateReviewStatus: (id: number, data: any) => Promise<void>
    }
    reviews: {
      getRecords: (questionId: number) => Promise<any[]>
      create: (data: any) => Promise<number>
      getTodayReviews: () => Promise<any[]>
    }
    subjects: {
      getAll: () => Promise<any[]>
      create: (data: any) => Promise<number>
      update: (id: number, data: any) => Promise<void>
      delete: (id: number) => Promise<void>
    }
    chapters: {
      getBySubject: (subjectId: number) => Promise<any[]>
      create: (data: any) => Promise<number>
      update: (id: number, data: any) => Promise<void>
      delete: (id: number) => Promise<void>
    }
    tags: {
      getAll: () => Promise<any[]>
      create: (data: any) => Promise<number>
      update: (id: number, data: any) => Promise<void>
      delete: (id: number) => Promise<void>
    }
    statistics: {
      getOverview: () => Promise<any>
      getSubjectStats: () => Promise<any[]>
      getDailyStats: (days: number) => Promise<any[]>
    }
    audio: {
      getByQuestion: (questionId: number) => Promise<any[]>
      getAudioData: (id: number) => Promise<any>
      create: (data: any) => Promise<number>
      delete: (id: number) => Promise<void>
      updateTitle: (id: number, title: string) => Promise<void>
    }
    todo: {
      getByDate: (date: string) => Promise<any[]>
      create: (data: any) => Promise<number>
      update: (id: number, data: any) => Promise<void>
      delete: (id: number) => Promise<void>
      getCompletionRate: (date: string) => Promise<any>
      getRecentStats: (days: number) => Promise<any[]>
    }
    summary: {
      getByDate: (date: string) => Promise<any>
      getRecent: (days: number) => Promise<any[]>
      upsert: (data: any) => Promise<number>
      delete: (date: string) => Promise<void>
    }
    learningTime: {
      getByDate: (date: string) => Promise<any[]>
      getTotalByDate: (date: string) => Promise<any>
      create: (data: any) => Promise<number>
      update: (id: number, data: any) => Promise<void>
      delete: (id: number) => Promise<void>
      getStats: (period: 'week' | 'month' | 'year') => Promise<any[]>
      getSubjectDistribution: (days: number) => Promise<any[]>
    }
    tasks: {
      getAll: (status?: string) => Promise<any[]>
      getActive: () => Promise<any[]>
      getUpcoming: (days: number) => Promise<any[]>
      getById: (id: number) => Promise<any>
      create: (data: any) => Promise<number>
      update: (id: number, data: any) => Promise<void>
      delete: (id: number) => Promise<void>
    }
    taskSubitems: {
      getByTask: (taskId: number) => Promise<any[]>
      create: (data: any) => Promise<number>
      update: (id: number, data: any) => Promise<void>
      delete: (id: number) => Promise<void>
    }
    taskProgress: {
      getByTask: (taskId: number) => Promise<any[]>
      getByDate: (date: string) => Promise<any[]>
      create: (data: any) => Promise<number>
      delete: (id: number) => Promise<void>
    }
    milestones: {
      getByTask: (taskId: number) => Promise<any[]>
      create: (data: any) => Promise<number>
      update: (id: number, data: any) => Promise<void>
      delete: (id: number) => Promise<void>
    }
    aiSettings: {
      get: () => Promise<any>
      save: (data: any) => Promise<number>
      delete: () => Promise<void>
    }
    chatHistory: {
      getAll: (limit?: number) => Promise<any[]>
      add: (data: any) => Promise<number>
      markAsSaved: (id: number) => Promise<void>
      clear: () => Promise<void>
      delete: (id: number) => Promise<void>
    }
    weakPoints: {
      getAll: () => Promise<any[]>
      getBySubject: (subjectId: number) => Promise<any[]>
      add: (data: any) => Promise<number>
      update: (id: number, data: any) => Promise<void>
      delete: (id: number) => Promise<void>
    }
    pomodoro: {
      getSettings: () => Promise<any>
      saveSettings: (data: any) => Promise<void>
      getTodayStats: () => Promise<any>
      getIncompleteSession: () => Promise<any>
      createSession: (data: any) => Promise<number>
      updateSession: (id: number, data: any) => Promise<void>
    }
  }
  updater: {
    checkForUpdates: () => Promise<any>
    downloadUpdate: () => Promise<boolean>
    installUpdate: () => Promise<boolean>
    getAppVersion: () => Promise<string>
    onUpdateAvailable: (callback: (info: any) => void) => void
    onUpdateNotAvailable: (callback: () => void) => void
    onDownloadProgress: (callback: (progress: any) => void) => void
    onUpdateDownloaded: (callback: () => void) => void
    onUpdateError: (callback: (error: string) => void) => void
    removeAllListeners: (channel: string) => void
  }
  ai: {
    call: (options: { url: string; apiKey: string; body: any }) => Promise<any>
  }
  pomodoroControl: {
    start: (durationMinutes: number, subjectId?: number, goal?: string) => Promise<void>
    pause: () => Promise<void>
    resume: () => Promise<void>
    stop: () => Promise<{ duration: number; completed: boolean; totalPauseTime: number } | null>
    getState: () => Promise<any>
    updateGoal: (goal: string) => Promise<void>
    updateSubject: (subjectId: number) => Promise<void>
    onStateChanged: (callback: (state: any) => void) => void
    onCompleted: (callback: (data: any) => void) => void
    removeAllListeners: (channel: string) => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
