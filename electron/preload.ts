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
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
