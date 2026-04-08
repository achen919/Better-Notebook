/**
 * 显示系统通知
 */
export async function showNotification(title: string, body: string): Promise<boolean> {
  if (window.electronAPI) {
    return window.electronAPI.showNotification(title, body)
  }

  // 浏览器环境使用 Web Notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
    return true
  }

  return false
}

/**
 * 请求通知权限
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

/**
 * 检查通知权限状态
 */
export function checkNotificationPermission(): NotificationPermission | null {
  if ('Notification' in window) {
    return Notification.permission
  }
  return null
}
