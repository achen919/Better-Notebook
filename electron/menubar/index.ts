import { Tray, Menu, MenuItem, nativeImage, Notification, BrowserWindow, app } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { PomodoroTimer, TimerState } from './timer'
import { pomodoroService } from '../database/services'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface MenuBarState {
  status: TimerState
  remaining: number
  totalDuration: number
  subjectId: number | null
  subjectName: string
  goal: string
  sessionId: number | null
}

export interface PomodoroSettings {
  id: number
  focus_duration: number
  break_duration: number
  auto_start_break: number
  auto_start_focus: number
  daily_goal: number
  default_subject_id: number | null
  notification_sound: number
  max_pause_duration: number
}

export interface Subject {
  id: number
  name: string
  question_count?: number
}

export class MenuBarManager {
  private tray: Tray | null = null
  private timer: PomodoroTimer
  private state: MenuBarState = {
    status: 'idle',
    remaining: 0,
    totalDuration: 25,
    subjectId: null,
    subjectName: '',
    goal: '',
    sessionId: null,
  }
  private mainWindow: BrowserWindow | null = null
  private settings: PomodoroSettings | null = null
  private subjects: Subject[] = []

  constructor() {
    this.timer = new PomodoroTimer({
      onTick: this.handleTick.bind(this),
      onComplete: this.handleComplete.bind(this),
      onPauseTimeout: this.handlePauseTimeout.bind(this),
    })
  }

  /**
   * Initialize the menu bar manager
   */
  init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.createTray()
    this.updateMenu()
  }

  /**
   * Set pomodoro settings
   */
  setSettings(settings: PomodoroSettings | null): void {
    this.settings = settings
    if (settings?.max_pause_duration) {
      this.timer.setMaxPauseDuration(settings.max_pause_duration)
    }
  }

  /**
   * Set subjects list
   */
  setSubjects(subjects: Subject[]): void {
    this.subjects = subjects
  }

  /**
   * Create the tray icon and menu
   */
  private createTray() {
    // Destroy existing tray if it exists
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }

    // Create tray icon - use a simple tomato emoji as text for now
    // In production, you may want to use a proper icon file
    const iconPath = this.getTrayIconPath()
    let icon: nativeImage

    try {
      icon = nativeImage.createFromPath(iconPath)
      if (icon.isEmpty()) {
        // Fallback: create a simple icon from text
        icon = this.createTextIcon('\u{1F345}') // Tomato emoji
      }
    } catch {
      // Fallback to text-based icon
      icon = this.createTextIcon('\u{1F345}')
    }

    this.tray = new Tray(icon)
    this.tray.setToolTip('Better-Notebook')
    this.updateTrayTitle()
  }

  /**
   * Get the path to the tray icon
   */
  private getTrayIconPath(): string {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
    if (isDev) {
      return path.join(__dirname, '../../public/icon.png')
    }
    return path.join(__dirname, '../public/icon.png')
  }

  /**
   * Create a text-based icon (fallback)
   */
  private createTextIcon(text: string): nativeImage {
    // Create a canvas to render the text
    // Note: This is a simple approach; for production, use proper icon files
    const size = 22
    const canvas = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="50%" font-size="16" text-anchor="middle" dominant-baseline="central">${text}</text>
      </svg>
    `
    return nativeImage.createFromBuffer(Buffer.from(canvas))
  }

  /**
   * Start a pomodoro session
   */
  async start(durationMinutes: number, subjectId?: number, goal?: string): Promise<void> {
    // Get settings for max pause duration
    const settings = pomodoroService.getSettings()
    if (settings?.max_pause_duration) {
      this.timer.setMaxPauseDuration(settings.max_pause_duration)
    }

    // Create a new session in the database
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const startTime = now.toISOString()

    let subjectName = ''
    if (subjectId) {
      // Fetch subject name - using a simple query
      const subjects = await this.getSubjectById(subjectId)
      if (subjects) {
        subjectName = subjects.name
      }
    }

    const sessionId = pomodoroService.createSession({
      date: dateStr,
      start_time: startTime,
      planned_duration: durationMinutes,
      subject_id: subjectId,
      goal: goal || '',
    })

    // Update state
    this.state = {
      status: 'running',
      remaining: durationMinutes * 60,
      totalDuration: durationMinutes,
      subjectId: subjectId || null,
      subjectName,
      goal: goal || '',
      sessionId,
    }

    // Start the timer
    this.timer.start(durationMinutes)

    // Update UI
    this.updateTrayTitle()
    this.updateMenu()

    // Notify renderer
    this.notifyStateChange()
  }

  /**
   * Pause the current pomodoro
   */
  pause(): void {
    if (this.state.status !== 'running') return

    this.timer.pause()
    this.state.status = 'paused'

    this.updateTrayTitle()
    this.updateMenu()
    this.notifyStateChange()
  }

  /**
   * Resume a paused pomodoro
   */
  resume(): void {
    if (this.state.status !== 'paused') return

    this.timer.resume()
    this.state.status = 'running'

    this.updateTrayTitle()
    this.updateMenu()
    this.notifyStateChange()
  }

  /**
   * Stop the current pomodoro
   */
  stop(): { duration: number; completed: boolean; totalPauseTime: number } | null {
    if (this.state.status === 'idle') return null

    const result = this.timer.stop()

    // Update session in database
    if (this.state.sessionId) {
      const now = new Date()
      pomodoroService.updateSession(this.state.sessionId, {
        end_time: now.toISOString(),
        duration: result.duration,
        status: result.completed ? 'completed' : 'abandoned',
        total_pause_time: result.totalPauseTime,
      })
    }

    // Reset state
    this.state = {
      status: 'idle',
      remaining: 0,
      totalDuration: 25,
      subjectId: null,
      subjectName: '',
      goal: '',
      sessionId: null,
    }

    this.updateTrayTitle()
    this.updateMenu()
    this.notifyStateChange()

    return result
  }

  /**
   * Update the current goal
   */
  updateGoal(goal: string): void {
    this.state.goal = goal

    // Update in database if session exists
    if (this.state.sessionId) {
      pomodoroService.updateSession(this.state.sessionId, { goal })
    }

    this.updateMenu()
  }

  /**
   * Update the current subject
   */
  async updateSubject(subjectId: number): Promise<void> {
    const subject = await this.getSubjectById(subjectId)
    this.state.subjectId = subjectId
    this.state.subjectName = subject?.name || ''

    // Update in database if session exists
    if (this.state.sessionId) {
      pomodoroService.updateSession(this.state.sessionId, { subject_id: subjectId })
    }

    this.updateMenu()
  }

  /**
   * Get current state
   */
  getState(): MenuBarState {
    return { ...this.state }
  }

  /**
   * Handle timer tick
   */
  private handleTick(remaining: number): void {
    this.state.remaining = remaining
    this.updateTrayTitle()
    this.notifyStateChange()
  }

  /**
   * Handle timer complete
   */
  private handleComplete(): void {
    // Get actual duration from timer
    const result = this.timer.stop()

    this.state.status = 'idle'
    this.state.remaining = 0

    // Update session in database with actual duration and pause time
    if (this.state.sessionId) {
      const now = new Date()
      pomodoroService.updateSession(this.state.sessionId, {
        end_time: now.toISOString(),
        duration: result.duration,
        status: 'completed',
        total_pause_time: result.totalPauseTime,
      })
    }

    // Show notification
    this.showNotification(
      '\u{4E13}\u{6CE8}\u{5B8C}\u{6210}\u{FF01}',
      `${this.state.totalDuration}\u{5206}\u{949F}\u{7684}\u{4E13}\u{6CE8}\u{65F6}\u{95F4}\u{7ED3}\u{675F}\u{4E86}\u{FF0C}\u{4F11}\u{606F}\u{4E00}\u{4E0B}\u{5427}~`
    )

    // Notify renderer to show completion modal
    this.mainWindow?.webContents.send('pomodoro:completed', {
      sessionId: this.state.sessionId,
      duration: result.duration,
      subjectId: this.state.subjectId,
      subjectName: this.state.subjectName,
      goal: this.state.goal,
    })

    // Reset state
    this.state = {
      status: 'idle',
      remaining: 0,
      totalDuration: 25,
      subjectId: null,
      subjectName: '',
      goal: '',
      sessionId: null,
    }

    this.updateTrayTitle()
    this.updateMenu()
    this.notifyStateChange()
  }

  /**
   * Handle pause timeout
   */
  private handlePauseTimeout(): void {
    // Update session in database
    if (this.state.sessionId) {
      const now = new Date()
      pomodoroService.updateSession(this.state.sessionId, {
        end_time: now.toISOString(),
        status: 'abandoned',
      })
    }

    // Show notification
    this.showNotification(
      '\u{756A}\u{8304}\u{949F}\u{5DF2}\u{505C}\u{6B62}',
      '\u{6682}\u{505C}\u{65F6}\u{95F4}\u{8FC7}\u{957F}\u{FF0C}\u{672C}\u{6B21}\u{4E13}\u{6CE8}\u{5DF2}\u{53D6}\u{6D88}'
    )

    // Reset state
    this.state = {
      status: 'idle',
      remaining: 0,
      totalDuration: 25,
      subjectId: null,
      subjectName: '',
      goal: '',
      sessionId: null,
    }

    this.updateTrayTitle()
    this.updateMenu()
    this.notifyStateChange()
  }

  /**
   * Update the tray title display
   */
  private updateTrayTitle(): void {
    if (!this.tray) return

    let title = '\u{1F345}' // Tomato emoji

    if (this.state.status === 'running') {
      const minutes = Math.floor(this.state.remaining / 60)
      const seconds = this.state.remaining % 60
      title += ` ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else if (this.state.status === 'paused') {
      const minutes = Math.floor(this.state.remaining / 60)
      const seconds = this.state.remaining % 60
      title += ` \u{23F8} ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    this.tray.setTitle(title)
  }

  /**
   * Update the dropdown menu
   */
  private updateMenu(): void {
    if (!this.tray) return

    const menuItems: (MenuItem | { type: 'separator' })[] = []

    if (this.state.status === 'idle') {
      // Idle state menu
      menuItems.push(
        new MenuItem({
          label: '\u{5F00}\u{59CB}\u{4E13}\u{6CE8}',
          click: () => this.handleStartClick(),
        })
      )
      menuItems.push({ type: 'separator' })
      menuItems.push(
        new MenuItem({
          label: '\u{756A}\u{8304}\u{949F}\u{8BBE}\u{7F6E}',
          click: () => this.openWindow('/settings?tab=pomodoro'),
        })
      )
      this.addStatsAndWindowMenu(menuItems)
    } else if (this.state.status === 'running') {
      // Running state menu
      menuItems.push(
        new MenuItem({
          label: '\u{6682}\u{505C}',
          click: () => this.pause(),
        })
      )
      menuItems.push(
        new MenuItem({
          label: '\u{505C}\u{6B62}',
          click: () => this.stop(),
        })
      )
      menuItems.push({ type: 'separator' })
      this.addCurrentInfoMenu(menuItems)
      menuItems.push({ type: 'separator' })
      menuItems.push(
        new MenuItem({
          label: '\u{66F4}\u{6539}\u{76EE}\u{6807}',
          click: () => this.openWindow('/pomodoro?action=changeGoal'),
        })
      )
      menuItems.push(
        new MenuItem({
          label: '\u{5207}\u{6362}\u{79D1}\u{76EE}',
          click: () => this.openWindow('/pomodoro?action=changeSubject'),
        })
      )
      menuItems.push({ type: 'separator' })
      this.addStatsAndWindowMenu(menuItems)
    } else if (this.state.status === 'paused') {
      // Paused state menu
      menuItems.push(
        new MenuItem({
          label: '\u{7EE7}\u{7EED}\u{4E13}\u{6CE8}',
          click: () => this.resume(),
        })
      )
      menuItems.push(
        new MenuItem({
          label: '\u{505C}\u{6B62}',
          click: () => this.stop(),
        })
      )
      menuItems.push({ type: 'separator' })
      // Show pause duration
      const pauseDuration = this.timer.getPauseDuration()
      menuItems.push(
        new MenuItem({
          label: `\u{6682}\u{505C}\u{65F6}\u{957F}: ${this.formatDuration(pauseDuration)}`,
          enabled: false,
        })
      )
      menuItems.push({ type: 'separator' })
      this.addCurrentInfoMenu(menuItems)
      menuItems.push({ type: 'separator' })
      menuItems.push(
        new MenuItem({
          label: '\u{66F4}\u{6539}\u{76EE}\u{6807}',
          click: () => this.openWindow('/pomodoro?action=changeGoal'),
        })
      )
      menuItems.push(
        new MenuItem({
          label: '\u{5207}\u{6362}\u{79D1}\u{76EE}',
          click: () => this.openWindow('/pomodoro?action=changeSubject'),
        })
      )
      menuItems.push({ type: 'separator' })
      this.addStatsAndWindowMenu(menuItems)
    }

    // Convert to Menu and set
    const menu = Menu.buildFromTemplate(menuItems as Electron.MenuItemConstructorOptions[])
    this.tray.setContextMenu(menu)
  }

  /**
   * Add current info to menu
   */
  private addCurrentInfoMenu(menuItems: (MenuItem | { type: 'separator' })[]): void {
    const remaining = this.state.remaining
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60

    menuItems.push(
      new MenuItem({
        label: `\u{5269}\u{4F59}\u{65F6}\u{95F4}: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        enabled: false,
      })
    )

    if (this.state.subjectName) {
      menuItems.push(
        new MenuItem({
          label: `\u{79D1}\u{76EE}: ${this.state.subjectName}`,
          enabled: false,
        })
      )
    }

    if (this.state.goal) {
      const truncatedGoal = this.state.goal.length > 20
        ? this.state.goal.substring(0, 20) + '...'
        : this.state.goal
      menuItems.push(
        new MenuItem({
          label: `\u{76EE}\u{6807}: ${truncatedGoal}`,
          enabled: false,
        })
      )
    }
  }

  /**
   * Add stats and window menu items
   */
  private addStatsAndWindowMenu(menuItems: (MenuItem | { type: 'separator' })[]): void {
    // Get today's stats
    const stats = pomodoroService.getTodayStats()
    const count = stats?.count || 0
    const duration = stats?.total_duration || 0

    menuItems.push(
      new MenuItem({
        label: `\u{4ECA}\u{65E5}: ${count}\u{4E2A}\u{756A}\u{8304}\u{949F} / ${duration}\u{5206}\u{949F}`,
        enabled: false,
      })
    )
    menuItems.push({ type: 'separator' })
    menuItems.push(
      new MenuItem({
        label: '\u{6253}\u{5F00}\u{4E3B}\u{7A97}\u{53E3}',
        click: () => this.openWindow('/'),
      })
    )
  }

  /**
   * Handle start click - open window to configure
   */
  private handleStartClick(): void {
    this.openWindow('/pomodoro?action=start')
  }

  /**
   * Open the main window with a specific route
   */
  private openWindow(route: string = '/'): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.show()
      this.mainWindow.focus()

      // Navigate to the specified route
      if (route !== '/') {
        this.mainWindow.webContents.send('navigate', route)
      }
    }
  }

  /**
   * Show a system notification
   */
  private showNotification(title: string, body: string): void {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        icon: path.join(__dirname, '../../public/icon.png'),
      })
      notification.show()
    }
  }

  /**
   * Notify renderer of state change
   */
  private notifyStateChange(): void {
    this.mainWindow?.webContents.send('pomodoro:stateChanged', this.getState())
  }

  /**
   * Format duration as MM:SS
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Get subject by ID
   */
  private async getSubjectById(id: number): Promise<{ id: number; name: string } | null> {
    // Import the get function from database
    const { get } = await import('../database/init')
    return get('SELECT id, name FROM subjects WHERE id = ?', [id])
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Stop timer if running
    if (this.state.status !== 'idle') {
      this.timer.stop()
    }

    // Destroy tray
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }

    this.mainWindow = null
  }
}

// Export singleton instance
export const menuBarManager = new MenuBarManager()
