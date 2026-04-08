import dayjs from 'dayjs'
import type { EbbinghausStage, FeedbackLevel } from '../types'

// 艾宾浩斯遗忘曲线复习阶段
export const EBINGHAUS_STAGES: EbbinghausStage[] = [
  { level: 0, interval: 20, unit: 'minutes', description: '20分钟后' },
  { level: 1, interval: 1, unit: 'hours', description: '1小时后' },
  { level: 2, interval: 1, unit: 'days', description: '1天后' },
  { level: 3, interval: 2, unit: 'days', description: '2天后' },
  { level: 4, interval: 4, unit: 'days', description: '4天后' },
  { level: 5, interval: 7, unit: 'days', description: '7天后' },
  { level: 6, interval: 15, unit: 'days', description: '15天后' },
  { level: 7, interval: 1, unit: 'months', description: '1个月后' },
]

// 反馈等级配置
export const FEEDBACK_LEVELS: Record<FeedbackLevel, { label: string; color: string; icon: string; description: string }> = {
  forgotten: {
    label: '生疏',
    color: '#ff4d4f',
    icon: 'CloseCircleOutlined',
    description: '不记得，重置到第1阶段',
  },
  vague: {
    label: '模糊',
    color: '#faad14',
    icon: 'QuestionCircleOutlined',
    description: '有些印象，退回一个阶段',
  },
  familiar: {
    label: '熟悉',
    color: '#52c41a',
    icon: 'CheckCircleOutlined',
    description: '基本记住，保持当前计划',
  },
  mastered: {
    label: '精通',
    color: '#1890ff',
    icon: 'StarOutlined',
    description: '完全掌握，跳过下一阶段',
  },
}

/**
 * 计算下次复习时间
 * @param currentLevel 当前复习阶段 (0-7)
 * @param feedback 反馈等级
 * @returns 下次复习时间和新阶段
 */
export function calculateNextReview(currentLevel: number, feedback: FeedbackLevel): { nextReviewDate: string; newLevel: number } {
  let newLevel: number

  switch (feedback) {
    case 'forgotten':
      // 重置到第1阶段
      newLevel = 0
      break
    case 'vague':
      // 退回一个阶段，最低为0
      newLevel = Math.max(0, currentLevel - 1)
      break
    case 'familiar':
      // 保持当前阶段
      newLevel = currentLevel
      break
    case 'mastered':
      // 跳过下一阶段，最高为7
      newLevel = Math.min(7, currentLevel + 1)
      break
    default:
      newLevel = currentLevel
  }

  const stage = EBINGHAUS_STAGES[newLevel]
  const nextReviewDate = calculateDateFromInterval(stage.interval, stage.unit)

  return {
    nextReviewDate: nextReviewDate.format('YYYY-MM-DD HH:mm:ss'),
    newLevel,
  }
}

/**
 * 根据间隔计算日期
 */
function calculateDateFromInterval(interval: number, unit: string): dayjs.Dayjs {
  const now = dayjs()

  switch (unit) {
    case 'minutes':
      return now.add(interval, 'minute')
    case 'hours':
      return now.add(interval, 'hour')
    case 'days':
      return now.add(interval, 'day')
    case 'months':
      return now.add(interval, 'month')
    default:
      return now.add(interval, 'day')
  }
}

/**
 * 获取阶段的描述文本
 */
export function getStageDescription(level: number): string {
  if (level < 0 || level >= EBINGHAUS_STAGES.length) {
    return '未知阶段'
  }
  return EBINGHAUS_STAGES[level].description
}

/**
 * 获取复习进度百分比
 */
export function getReviewProgress(level: number): number {
  return Math.round((level / (EBINGHAUS_STAGES.length - 1)) * 100)
}

/**
 * 判断是否需要复习
 */
export function needsReview(nextReviewDate: string | null): boolean {
  if (!nextReviewDate) return true
  return dayjs(nextReviewDate).isBefore(dayjs()) || dayjs(nextReviewDate).isSame(dayjs(), 'day')
}

/**
 * 获取剩余复习时间描述
 */
export function getRemainingTime(nextReviewDate: string | null): string {
  if (!nextReviewDate) return '待安排'

  const target = dayjs(nextReviewDate)
  const now = dayjs()

  if (target.isBefore(now)) {
    return '已到期'
  }

  const diffMinutes = target.diff(now, 'minute')
  const diffHours = target.diff(now, 'hour')
  const diffDays = target.diff(now, 'day')

  if (diffMinutes < 60) {
    return `${diffMinutes}分钟后`
  } else if (diffHours < 24) {
    return `${diffHours}小时后`
  } else if (diffDays < 30) {
    return `${diffDays}天后`
  } else {
    return `${Math.floor(diffDays / 30)}个月后`
  }
}
