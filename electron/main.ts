import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, closeDatabase } from './database/init'
import { questionService, reviewService, subjectService, chapterService, tagService, statisticsService } from './database/services'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 10 },
    show: false,
  })

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// 应用准备就绪
app.whenReady().then(async () => {
  // 初始化数据库
  await initDatabase()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理：显示系统通知
ipcMain.handle('show-notification', async (_event, { title, body }: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, '../public/icon.png'),
    })
    notification.show()
    return true
  }
  return false
})

// IPC 处理：获取应用路径
ipcMain.handle('get-app-path', async () => {
  return app.getPath('userData')
})

// ==================== 数据库 IPC 处理 ====================

// 初始化数据库
ipcMain.handle('db:init', async () => {
  await initDatabase()
})

// ==================== 错题相关 ====================
ipcMain.handle('db:questions:getAll', async () => questionService.getAll())
ipcMain.handle('db:questions:getById', async (_event, id: number) => questionService.getById(id))
ipcMain.handle('db:questions:create', async (_event, data: any) => questionService.create(data))
ipcMain.handle('db:questions:update', async (_event, id: number, data: any) => questionService.update(id, data))
ipcMain.handle('db:questions:delete', async (_event, id: number) => questionService.delete(id))
ipcMain.handle('db:questions:search', async (_event, query: string) => questionService.search(query))
ipcMain.handle('db:questions:getForReview', async () => questionService.getForReview())
ipcMain.handle('db:questions:updateReviewStatus', async (_event, id: number, data: any) => questionService.updateReviewStatus(id, data))

// ==================== 复习记录相关 ====================
ipcMain.handle('db:reviews:getRecords', async (_event, questionId: number) => reviewService.getRecords(questionId))
ipcMain.handle('db:reviews:create', async (_event, data: any) => reviewService.create(data))
ipcMain.handle('db:reviews:getTodayReviews', async () => reviewService.getTodayReviews())

// ==================== 科目相关 ====================
ipcMain.handle('db:subjects:getAll', async () => subjectService.getAll())
ipcMain.handle('db:subjects:create', async (_event, data: any) => subjectService.create(data))
ipcMain.handle('db:subjects:update', async (_event, id: number, data: any) => subjectService.update(id, data))
ipcMain.handle('db:subjects:delete', async (_event, id: number) => subjectService.delete(id))

// ==================== 章节相关 ====================
ipcMain.handle('db:chapters:getBySubject', async (_event, subjectId: number) => chapterService.getBySubject(subjectId))
ipcMain.handle('db:chapters:create', async (_event, data: any) => chapterService.create(data))
ipcMain.handle('db:chapters:update', async (_event, id: number, data: any) => chapterService.update(id, data))
ipcMain.handle('db:chapters:delete', async (_event, id: number) => chapterService.delete(id))

// ==================== 标签相关 ====================
ipcMain.handle('db:tags:getAll', async () => tagService.getAll())
ipcMain.handle('db:tags:create', async (_event, data: any) => tagService.create(data))
ipcMain.handle('db:tags:update', async (_event, id: number, data: any) => tagService.update(id, data))
ipcMain.handle('db:tags:delete', async (_event, id: number) => tagService.delete(id))

// ==================== 统计相关 ====================
ipcMain.handle('db:statistics:getOverview', async () => statisticsService.getOverview())
ipcMain.handle('db:statistics:getSubjectStats', async () => statisticsService.getSubjectStats())
ipcMain.handle('db:statistics:getDailyStats', async (_event, days: number) => statisticsService.getDailyStats(days))
