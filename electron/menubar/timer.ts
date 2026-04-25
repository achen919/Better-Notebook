export type TimerState = 'idle' | 'running' | 'paused'

export interface TimerCallbacks {
  onTick: (remaining: number) => void
  onComplete: () => void
  onPauseTimeout: () => void
}

export class PomodoroTimer {
  private duration: number = 25 * 60 // 默认25分钟，单位秒
  private remaining: number = 0
  private state: TimerState = 'idle'
  private intervalId: NodeJS.Timeout | null = null
  private pauseStartTime: number = 0
  private totalPauseTime: number = 0
  private startTime: number = 0
  private maxPauseDuration: number = 300 // 默认5分钟
  private pauseCheckInterval: NodeJS.Timeout | null = null
  private callbacks: TimerCallbacks

  constructor(callbacks: TimerCallbacks) {
    this.callbacks = callbacks
  }

  setMaxPauseDuration(seconds: number) {
    this.maxPauseDuration = seconds
  }

  start(durationMinutes: number) {
    this.duration = durationMinutes * 60
    this.remaining = this.duration
    this.state = 'running'
    this.startTime = Date.now()
    this.totalPauseTime = 0

    this.startTicking()
  }

  pause() {
    if (this.state !== 'running') return

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
    this.state = 'running'

    if (this.pauseCheckInterval) {
      clearInterval(this.pauseCheckInterval)
      this.pauseCheckInterval = null
    }

    this.startTicking()
  }

  stop(): { duration: number; completed: boolean; totalPauseTime: number } {
    const elapsed = this.duration - this.remaining
    const completed = this.state === 'running' && this.remaining === 0

    this.stopTicking()
    if (this.pauseCheckInterval) {
      clearInterval(this.pauseCheckInterval)
      this.pauseCheckInterval = null
    }

    this.state = 'idle'

    return {
      duration: Math.floor(elapsed / 60),
      completed,
      totalPauseTime: Math.floor(this.totalPauseTime / 60)
    }
  }

  getState(): TimerState {
    return this.state
  }

  getRemaining(): number {
    return this.remaining
  }

  getPauseDuration(): number {
    if (this.state !== 'paused') return 0
    return Math.floor((Date.now() - this.pauseStartTime) / 1000)
  }

  private startTicking() {
    this.intervalId = setInterval(() => {
      this.remaining -= 1
      this.callbacks.onTick(this.remaining)

      if (this.remaining <= 0) {
        this.remaining = 0
        this.stopTicking()
        this.callbacks.onComplete()
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
