import { app, BrowserWindow, ipcMain, Notification, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, closeDatabase, dbHelpers } from './database/init'
import { questionService, reviewService, subjectService, chapterService, tagService, statisticsService, audioService, todoService, summaryService, learningTimeService, taskService, taskSubitemService, taskProgressService, milestoneService, aiSettingsService, chatHistoryService, weakPointService, pomodoroService, notificationService, chatSessionService, fixedTodoService } from './database/services'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import https from 'https'
import http from 'http'
import { menuBarManager } from './menubar'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let reviewReminderInterval: NodeJS.Timeout | null = null
let lastReminderDate: string = ''

// 检查并发送复习提醒
function checkAndSendReviewReminder() {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = now.toTimeString().substring(0, 5) // HH:MM

  // 避免同一天重复提醒
  if (lastReminderDate === today) return

  // 获取通知设置
  const settings = notificationService.getSettings()
  if (!settings || settings.review_reminder_enabled !== 1) return

  // 检查是否到达提醒时间
  if (currentTime === settings.review_reminder_time) {
    // 获取需要复习的题目数量
    const questions = questionService.getForReview()
    const reviewCount = questions?.length || 0

    if (reviewCount > 0) {
      // 发送通知
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: '复习提醒',
          body: `你有 ${reviewCount} 道题目需要复习，快来巩固一下吧！`,
          icon: path.join(__dirname, '../public/icon.png'),
        })
        notification.show()

        // 点击通知时打开主窗口
        notification.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore()
            }
            mainWindow.show()
            mainWindow.focus()
            mainWindow.webContents.send('navigate', '/review')
          }
        })
      }

      lastReminderDate = today
    }
  }
}

// 启动复习提醒定时器
function startReviewReminder() {
  // 每分钟检查一次
  reviewReminderInterval = setInterval(checkAndSendReviewReminder, 60 * 1000)
}

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
    // Initialize menu bar manager
    menuBarManager.init(mainWindow!)
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
  try {
    await initDatabase()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // Load pomodoro settings
  const pomodoroSettings = pomodoroService.getSettings()
  menuBarManager.setSettings(pomodoroSettings)

  // Load subjects for menu
  const subjects = subjectService.getAll()
  menuBarManager.setSubjects(subjects)

  createWindow()

  // 启动复习提醒定时器
  startReviewReminder()

  // 自动更新逻辑
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify()

    // 自动检查更新（每小时）
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify()
    }, 60 * 60 * 1000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// ==================== 自动更新相关 ====================

// 配置自动更新
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// 配置日志以便调试
autoUpdater.logger = log
log.transports.file.level = 'info'
log.transports.console.level = 'info'

// 检测到新版本
autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes,
  })
})

// 没有新版本
autoUpdater.on('update-not-available', () => {
  mainWindow?.webContents.send('update-not-available')
})

// 下载进度
autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('download-progress', {
    percent: progress.percent,
    transferred: progress.transferred,
    total: progress.total,
  })
})

// 下载完成
autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded')
})

// 更新错误
autoUpdater.on('error', (error) => {
  mainWindow?.webContents.send('update-error', error.message)
})

// IPC：手动检查更新
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { available: false, message: '开发环境不支持检查更新' }
  }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { available: result.updateInfo.version !== app.getVersion(), info: result.updateInfo }
  } catch (error: any) {
    return { available: false, error: error.message }
  }
})

// IPC：下载更新
ipcMain.handle('download-update', async () => {
  if (isDev) return false
  try {
    await autoUpdater.downloadUpdate()
    return true
  } catch (error) {
    return false
  }
})

// IPC：安装更新
ipcMain.handle('install-update', () => {
  if (isDev) return false
  log.info('User requested to install update, calling quitAndInstall...')
  // isSilent: false - 显示安装过程
  // isForceRunAfter: true - 强制安装后重启应用
  autoUpdater.quitAndInstall(false, true)
  return true
})

// IPC：获取当前版本
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 清理资源
app.on('before-quit', () => {
  menuBarManager.destroy()
  if (reviewReminderInterval) {
    clearInterval(reviewReminderInterval)
    reviewReminderInterval = null
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

// ==================== 问题标签关联相关 ====================
ipcMain.handle('db:questionTags:add', async (_event, questionId: number, tagId: number) => {
  dbHelpers.run(
    `INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)`,
    [questionId, tagId]
  )
  return true
})

// ==================== 统计相关 ====================
ipcMain.handle('db:statistics:getOverview', async () => statisticsService.getOverview())
ipcMain.handle('db:statistics:getSubjectStats', async () => statisticsService.getSubjectStats())
ipcMain.handle('db:statistics:getDailyStats', async (_event, days: number) => statisticsService.getDailyStats(days))

// ==================== 录音相关 ====================
ipcMain.handle('db:audio:getByQuestion', async (_event, questionId: number) => audioService.getByQuestion(questionId))
ipcMain.handle('db:audio:getAudioData', async (_event, id: number) => audioService.getAudioData(id))
ipcMain.handle('db:audio:create', async (_event, data: any) => audioService.create(data))
ipcMain.handle('db:audio:delete', async (_event, id: number) => audioService.delete(id))
ipcMain.handle('db:audio:updateTitle', async (_event, id: number, title: string) => audioService.updateTitle(id, title))

// ==================== 每日TODO相关 ====================
ipcMain.handle('db:todo:getByDate', async (_event, date: string) => todoService.getByDate(date))
ipcMain.handle('db:todo:create', async (_event, data: any) => todoService.create(data))
ipcMain.handle('db:todo:update', async (_event, id: number, data: any) => todoService.update(id, data))
ipcMain.handle('db:todo:delete', async (_event, id: number) => todoService.delete(id))
ipcMain.handle('db:todo:getCompletionRate', async (_event, date: string) => todoService.getCompletionRate(date))
ipcMain.handle('db:todo:getRecentStats', async (_event, days: number) => todoService.getRecentStats(days))

// ==================== 每日总结相关 ====================
ipcMain.handle('db:summary:getByDate', async (_event, date: string) => summaryService.getByDate(date))
ipcMain.handle('db:summary:getRecent', async (_event, days: number) => summaryService.getRecent(days))
ipcMain.handle('db:summary:upsert', async (_event, data: any) => summaryService.upsert(data))
ipcMain.handle('db:summary:delete', async (_event, date: string) => summaryService.delete(date))

// ==================== 学习时间相关 ====================
ipcMain.handle('db:learningTime:getByDate', async (_event, date: string) => learningTimeService.getByDate(date))
ipcMain.handle('db:learningTime:getTotalByDate', async (_event, date: string) => learningTimeService.getTotalByDate(date))
ipcMain.handle('db:learningTime:create', async (_event, data: any) => learningTimeService.create(data))
ipcMain.handle('db:learningTime:update', async (_event, id: number, data: any) => learningTimeService.update(id, data))
ipcMain.handle('db:learningTime:delete', async (_event, id: number) => learningTimeService.delete(id))
ipcMain.handle('db:learningTime:getStats', async (_event, period: string) => learningTimeService.getStats(period as 'week' | 'month' | 'year'))
ipcMain.handle('db:learningTime:getSubjectDistribution', async (_event, days: number) => learningTimeService.getSubjectDistribution(days))

// ==================== 任务相关 ====================
ipcMain.handle('db:tasks:getAll', async (_event, status?: string) => taskService.getAll(status))
ipcMain.handle('db:tasks:getActive', async () => taskService.getActive())
ipcMain.handle('db:tasks:getUpcoming', async (_event, days: number) => taskService.getUpcoming(days))
ipcMain.handle('db:tasks:getById', async (_event, id: number) => taskService.getById(id))
ipcMain.handle('db:tasks:create', async (_event, data: any) => taskService.create(data))
ipcMain.handle('db:tasks:update', async (_event, id: number, data: any) => taskService.update(id, data))
ipcMain.handle('db:tasks:delete', async (_event, id: number) => taskService.delete(id))

// ==================== 任务子项目相关 ====================
ipcMain.handle('db:taskSubitems:getByTask', async (_event, taskId: number) => taskSubitemService.getByTask(taskId))
ipcMain.handle('db:taskSubitems:create', async (_event, data: any) => taskSubitemService.create(data))
ipcMain.handle('db:taskSubitems:update', async (_event, id: number, data: any) => taskSubitemService.update(id, data))
ipcMain.handle('db:taskSubitems:delete', async (_event, id: number) => taskSubitemService.delete(id))

// ==================== 任务进度相关 ====================
ipcMain.handle('db:taskProgress:getByTask', async (_event, taskId: number) => taskProgressService.getByTask(taskId))
ipcMain.handle('db:taskProgress:getByDate', async (_event, date: string) => taskProgressService.getByDate(date))
ipcMain.handle('db:taskProgress:create', async (_event, data: any) => taskProgressService.create(data))
ipcMain.handle('db:taskProgress:delete', async (_event, id: number) => taskProgressService.delete(id))

// ==================== 里程碑相关 ====================
ipcMain.handle('db:milestones:getByTask', async (_event, taskId: number) => milestoneService.getByTask(taskId))
ipcMain.handle('db:milestones:create', async (_event, data: any) => milestoneService.create(data))
ipcMain.handle('db:milestones:update', async (_event, id: number, data: any) => milestoneService.update(id, data))
ipcMain.handle('db:milestones:delete', async (_event, id: number) => milestoneService.delete(id))

// ==================== AI配置相关 ====================
ipcMain.handle('db:aiSettings:get', async () => aiSettingsService.get())
ipcMain.handle('db:aiSettings:save', async (_event, data: any) => aiSettingsService.save(data))
ipcMain.handle('db:aiSettings:delete', async () => aiSettingsService.delete())

// ==================== 聊天历史相关 ====================
ipcMain.handle('db:chatHistory:getAll', async (_event, limit?: number, sessionId?: number) => chatHistoryService.getAll(limit, sessionId))
ipcMain.handle('db:chatHistory:add', async (_event, data: any) => chatHistoryService.add(data))
ipcMain.handle('db:chatHistory:markAsSaved', async (_event, id: number) => chatHistoryService.markAsSaved(id))
ipcMain.handle('db:chatHistory:clear', async (_event, sessionId?: number) => chatHistoryService.clear(sessionId))
ipcMain.handle('db:chatHistory:delete', async (_event, id: number) => chatHistoryService.delete(id))

// ==================== 聊天会话相关 ====================
ipcMain.handle('db:chatSessions:getAll', async () => chatSessionService.getAll())
ipcMain.handle('db:chatSessions:getById', async (_event, id: number) => chatSessionService.getById(id))
ipcMain.handle('db:chatSessions:create', async (_event, title?: string) => chatSessionService.create(title))
ipcMain.handle('db:chatSessions:updateTitle', async (_event, id: number, title: string) => chatSessionService.updateTitle(id, title))
ipcMain.handle('db:chatSessions:touch', async (_event, id: number) => chatSessionService.touch(id))
ipcMain.handle('db:chatSessions:delete', async (_event, id: number) => chatSessionService.delete(id))
ipcMain.handle('db:chatSessions:getHistory', async (_event, id: number) => chatSessionService.getHistory(id))

// ==================== 固定计划相关 ====================
ipcMain.handle('db:fixedTodos:getAll', async () => fixedTodoService.getAll())
ipcMain.handle('db:fixedTodos:create', async (_event, data: any) => fixedTodoService.create(data))
ipcMain.handle('db:fixedTodos:update', async (_event, id: number, data: any) => fixedTodoService.update(id, data))
ipcMain.handle('db:fixedTodos:delete', async (_event, id: number) => fixedTodoService.delete(id))
ipcMain.handle('db:fixedTodos:generateForDate', async (_event, date: string) => fixedTodoService.generateForDate(date))
ipcMain.handle('db:fixedTodos:getInstancesByDate', async (_event, date: string) => fixedTodoService.getInstancesByDate(date))
ipcMain.handle('db:fixedTodos:updateInstanceStatus', async (_event, id: number, completed: number) => fixedTodoService.updateInstanceStatus(id, completed))
ipcMain.handle('db:fixedTodos:getStats', async (_event, id: number) => fixedTodoService.getStats(id))

// ==================== 弱势点相关 ====================
ipcMain.handle('db:weakPoints:getAll', async () => weakPointService.getAll())
ipcMain.handle('db:weakPoints:getBySubject', async (_event, subjectId: number) => weakPointService.getBySubject(subjectId))
ipcMain.handle('db:weakPoints:add', async (_event, data: any) => weakPointService.add(data))
ipcMain.handle('db:weakPoints:update', async (_event, id: number, data: any) => weakPointService.update(id, data))
ipcMain.handle('db:weakPoints:delete', async (_event, id: number) => weakPointService.delete(id))

// ==================== 番茄钟相关 ====================
ipcMain.handle('pomodoro:getSettings', async () => pomodoroService.getSettings())
ipcMain.handle('pomodoro:saveSettings', async (_event, data: any) => pomodoroService.saveSettings(data))
ipcMain.handle('pomodoro:getTodayStats', async () => pomodoroService.getTodayStats())
ipcMain.handle('pomodoro:getIncompleteSession', async () => pomodoroService.getIncompleteSession())
ipcMain.handle('pomodoro:createSession', async (_event, data: any) => pomodoroService.createSession(data))
ipcMain.handle('pomodoro:updateSession', async (_event, id: number, data: any) => pomodoroService.updateSession(id, data))

// ==================== 番茄钟控制相关 (MenuBar) ====================
ipcMain.handle('pomodoro:start', async (_event, durationMinutes: number, subjectId?: number, goal?: string) => {
  await menuBarManager.start(durationMinutes, subjectId, goal)
})
ipcMain.handle('pomodoro:pause', async () => {
  menuBarManager.pause()
})
ipcMain.handle('pomodoro:resume', async () => {
  menuBarManager.resume()
})
ipcMain.handle('pomodoro:stop', async () => {
  return menuBarManager.stop()
})
ipcMain.handle('pomodoro:getState', async () => {
  return menuBarManager.getState()
})
ipcMain.handle('pomodoro:updateGoal', async (_event, goal: string) => {
  menuBarManager.updateGoal(goal)
})
ipcMain.handle('pomodoro:updateSubject', async (_event, subjectId: number) => {
  await menuBarManager.updateSubject(subjectId)
})

// ==================== 通知设置相关 ====================
ipcMain.handle('notification:getSettings', async () => notificationService.getSettings())
ipcMain.handle('notification:saveSettings', async (_event, data: any) => notificationService.saveSettings(data))

// ==================== AI API 调用 ====================
ipcMain.handle('ai:call', async (_event, options: { url: string; apiKey: string; body: any }) => {
  return new Promise((resolve, reject) => {
    const { url, apiKey, body } = options

    console.log('AI API Call:', { url, model: body?.model })

    try {
      const parsedUrl = new URL(url)
      const isHttps = parsedUrl.protocol === 'https:'
      const client = isHttps ? https : http

      // 检测是否是 Anthropic 格式
      const isAnthropic = url.includes('/anthropic') || url.includes('/messages')

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (isAnthropic) {
        // Anthropic 使用 x-api-key
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
      } else {
        // OpenAI 格式使用 Authorization Bearer
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers,
      }

      console.log('Request options:', { hostname: requestOptions.hostname, path: requestOptions.path })

      const req = client.request(requestOptions, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          console.log('Response status:', res.statusCode)
          console.log('Response body:', data.substring(0, 1000))
          try {
            const jsonData = JSON.parse(data)
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(jsonData)
            } else {
              console.error('API Error Response:', data.substring(0, 500))
              reject(new Error(jsonData.error?.message || jsonData.message || jsonData.msg || `请求失败: HTTP ${res.statusCode}`))
            }
          } catch (e) {
            console.error('Failed to parse response:', data.substring(0, 500))
            // 检查是否是 HTML 响应（通常是 404 页面）
            if (data.includes('<html') || data.includes('<!DOCTYPE')) {
              reject(new Error(`API 地址错误 (HTTP ${res.statusCode})，请检查 API Base URL 是否正确`))
            } else {
              reject(new Error(`解析响应失败: ${data.substring(0, 200)}`))
            }
          }
        })
      })

      req.on('error', (error) => {
        console.error('Network error:', error)
        reject(new Error(`网络请求失败: ${error.message}`))
      })

      req.setTimeout(60000, () => {
        req.destroy()
        reject(new Error('请求超时'))
      })

      req.write(JSON.stringify(body))
      req.end()
    } catch (error: any) {
      console.error('Request config error:', error)
      reject(new Error(`请求配置错误: ${error.message}`))
    }
  })
})

// ==================== AI API 流式调用 ====================
ipcMain.handle('ai:stream', async (event, options: { url: string; apiKey: string; body: any }) => {
  const { url, apiKey, body } = options

  console.log('AI Stream Call:', { url, model: body?.model })

  try {
    const parsedUrl = new URL(url)
    const isHttps = parsedUrl.protocol === 'https:'
    const client = isHttps ? https : http

    // 检测是否是 Anthropic 格式
    const isAnthropic = url.includes('/anthropic') || url.includes('/messages')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    }

    if (isAnthropic) {
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers,
    }

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let buffer = ''

        res.on('data', (chunk) => {
          buffer += chunk.toString()

          // 处理 SSE 格式的数据 - 立即处理完整的行
          let newlineIndex: number
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex)
            buffer = buffer.slice(newlineIndex + 1)

            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()

              if (data === '[DONE]') {
                event.sender.send('ai:stream:end')
                continue
              }

              if (!data) continue

              try {
                const parsed = JSON.parse(data)

                // OpenAI 格式
                if (parsed.choices?.[0]?.delta?.content) {
                  event.sender.send('ai:stream:chunk', {
                    type: 'content',
                    content: parsed.choices[0].delta.content,
                  })
                }
                // OpenAI 推理格式 (o1/o3 models)
                if (parsed.choices?.[0]?.delta?.reasoning_content) {
                  event.sender.send('ai:stream:chunk', {
                    type: 'reasoning',
                    content: parsed.choices[0].delta.reasoning_content,
                  })
                }
                // Anthropic 格式
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  event.sender.send('ai:stream:chunk', {
                    type: 'content',
                    content: parsed.delta.text,
                  })
                }
                // Anthropic thinking 格式
                if (parsed.type === 'content_block_delta' && parsed.delta?.thinking) {
                  event.sender.send('ai:stream:chunk', {
                    type: 'reasoning',
                    content: parsed.delta.thinking,
                  })
                }
              } catch (e) {
                // 忽略解析错误，但记录以便调试
                console.debug('SSE parse skip:', data.substring(0, 50))
              }
            }
          }
        })

        res.on('end', () => {
          event.sender.send('ai:stream:end')
          resolve({ success: true })
        })

        res.on('error', (error) => {
          event.sender.send('ai:stream:error', error.message)
          reject(error)
        })
      })

      req.on('error', (error) => {
        console.error('Network error:', error)
        event.sender.send('ai:stream:error', error.message)
        reject(new Error(`网络请求失败: ${error.message}`))
      })

      req.setTimeout(120000, () => {
        req.destroy()
        event.sender.send('ai:stream:error', '请求超时')
        reject(new Error('请求超时'))
      })

      req.write(JSON.stringify({ ...body, stream: true }))
      req.end()
    })
  } catch (error: any) {
    console.error('Request config error:', error)
    throw new Error(`请求配置错误: ${error.message}`)
  }
})
