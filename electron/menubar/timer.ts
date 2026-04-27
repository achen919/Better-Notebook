export type TimerState = 'idle' | 'running' | 'paused' | 'overtime'

export interface TimerCallbacks {
  onTick: (remaining: number, overtime: number) => void
  onComplete: () => void
  onOvertimeLimit: () => void
  onPauseTimeout: () => void
}

export class PomodoroTimer {
  private duration: number = 25 * 60 // 默认25分钟，单位秒
  private remaining: number = 0
  private overtime: number = 0 // 超时时间（秒）
  private state: TimerState = 'idle'
  private intervalId: NodeJS.Timeout | null = null
  private pauseStartTime: number = 0
  private totalPauseTime: number = 0
  private startTime: number = 0
  private maxPauseDuration: number = 300 // 默认5分钟
  private maxOvertimeDuration: number = 600 // 默认10分钟超时上限
  private pauseCheckInterval: NodeJS.Timeout | null = null
  private callbacks: TimerCallbacks
  private completedTriggered: boolean = false // 是否已触发完成回调

  constructor(callbacks: TimerCallbacks) {
    this.callbacks = callbacks
  }

  setMaxPauseDuration(seconds: number) {
    this.maxPauseDuration = seconds
  }

  setMaxOvertimeDuration(seconds: number) {
    this.maxOvertimeDuration = seconds
  }

  start(durationMinutes: number) {
    // Clean up any existing intervals first
    this.stopTicking()
    if (this.pauseCheckInterval) {
      clearInterval(this.pauseCheckInterval)
      this.pauseCheckInterval = null
    }

    this.duration = durationMinutes * 60
    this.remaining = this.duration
    this.overtime = 0
    this.state = 'running'
    this.startTime = Date.now()
    this.totalPauseTime = 0
    this.completedTriggered = false

    this.startTicking()
  }

  pause() {
    if (this.state !== 'running' && this.state !== 'overtime') return

    this.state = 'paused'
    this.pauseStartTime = Date.now()
    this.stopTicking()

    // 开始检查暂停超时
    this.pauseCheckInterval = setInterval(() => {
      const pauseDuration = Math.floor((Date.now() - this.pauseStartTime) / 1000)
      if (pauseDuration >= this.maxPauseDuration) {
        this.callbacks.onPauseTimeout()
        this.stop()
      }
    }, 1000)
  }

  resume() {
    if (this.state !== 'paused') return

    const pauseDuration = Math.floor((Date.now() - this.pauseStartTime) / 1000)
    this.totalPauseTime += pauseDuration
    // 恢复之前的状态（可能是 running 或 overtime）
    this.state = this.overtime > 0 ? 'overtime' : 'running'

    if (this.pauseCheckInterval) {
      clearInterval(this.pauseCheckInterval)
      this.pauseCheckInterval = null
    }

    this.startTicking()
  }

  stop(): { duration: number; completed: boolean; totalPauseTime: number; overtime: number } {
    const elapsed = this.duration - this.remaining + this.overtime
    const completed = this.overtime > 0 || (this.state === 'running' && this.remaining === 0) || this.state === 'overtime'

    this.stopTicking()
    if (this.pauseCheckInterval) {
      clearInterval(this.pauseCheckInterval)
      this.pauseCheckInterval = null
    }

    this.state = 'idle'

    return {
      duration: Math.floor(elapsed / 60),
      completed,
      totalPauseTime: Math.floor(this.totalPauseTime / 60),
      overtime: Math.floor(this.overtime / 60)
    }
  }

  getState(): TimerState {
    return this.state
  }

  getRemaining(): number {
    return this.remaining
  }

  getOvertime(): number {
    return this.overtime
  }

  getPauseDuration(): number {
    if (this.state !== 'paused') return 0
    return Math.floor((Date.now() - this.pauseStartTime) / 1000)
  }

  private startTicking() {
    this.intervalId = setInterval(() => {
      if (this.remaining > 0) {
        this.remaining -= 1
        this.callbacks.onTick(this.remaining, 0)
      } else {
        // 进入超时状态
        this.overtime += 1
        this.state = 'overtime'
        this.callbacks.onTick(0, this.overtime)

        // 首次到达0时触发完成回调
        if (!this.completedTriggered) {
          this.completedTriggered = true
          this.callbacks.onComplete()
        }

        // 检查是否达到超时上限
        if (this.overtime >= this.maxOvertimeDuration) {
          this.callbacks.onOvertimeLimit()
          this.stop()
        }
      }
    }, 1000)
  }

  private stopTicking() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
