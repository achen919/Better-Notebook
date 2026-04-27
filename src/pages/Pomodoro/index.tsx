import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Card,
  Button,
  Input,
  Select,
  Typography,
  Progress,
  message,
  Modal,
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { usePomodoroStore } from '../../stores'
import type { Subject } from '../../types'

const { Text, Title } = Typography
const { TextArea } = Input

const PomodoroPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const action = searchParams.get('action')

  const {
    status,
    remaining,
    overtime,
    totalDuration,
    currentSubjectId,
    currentSubjectName,
    currentGoal,
    settings,
    todayStats,
    fetchState,
    fetchSettings,
    fetchTodayStats,
    start,
    pause,
    resume,
    stop,
    updateGoal,
    updateSubject,
    setupListeners,
    cleanupListeners,
  } = usePomodoroStore()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>()
  const [goal, setGoal] = useState('')
  const [duration, setDuration] = useState(25)

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const result = await window.electronAPI.db.subjects.getAll()
        setSubjects(result)
      } catch (error) {
        console.error('Failed to load subjects:', error)
      }
    }
    loadSubjects()
  }, [])

  // Initialize
  useEffect(() => {
    fetchState()
    fetchSettings()
    fetchTodayStats()
    setupListeners()

    return () => {
      cleanupListeners()
    }
  }, [fetchState, fetchSettings, fetchTodayStats, setupListeners, cleanupListeners])

  // Set default values from settings
  useEffect(() => {
    if (settings) {
      setDuration(settings.focus_duration)
      if (settings.default_subject_id) {
        setSelectedSubjectId(settings.default_subject_id)
      }
    }
  }, [settings])

  // Auto-start if action=start
  useEffect(() => {
    if (action === 'start' && status === 'idle' && subjects.length > 0) {
      // Just pre-fill the form, don't auto-start
    }
  }, [action, status, subjects])

  const handleStart = async () => {
    try {
      const subject = subjects.find(s => s.id === selectedSubjectId)
      await start(duration, selectedSubjectId, subject?.name, goal)
      message.success('番茄钟已开始')
    } catch (error) {
      console.error('Failed to start pomodoro:', error)
      message.error('启动失败')
    }
  }

  const handlePause = async () => {
    try {
      await pause()
    } catch (error) {
      console.error('Failed to pause:', error)
    }
  }

  const handleResume = async () => {
    try {
      await resume()
    } catch (error) {
      console.error('Failed to resume:', error)
    }
  }

  const handleStop = async () => {
    Modal.confirm({
      title: '结束番茄钟',
      content: '确定要结束当前的番茄钟吗？',
      onOk: async () => {
        try {
          const result = await stop()
          if (result?.completed) {
            message.success(`恭喜完成 ${result.duration} 分钟专注！`)
          } else {
            message.info(`本次专注 ${result?.duration || 0} 分钟`)
          }
        } catch (error) {
          console.error('Failed to stop:', error)
        }
      },
    })
  }

  const handleGoalChange = async (newGoal: string) => {
    setGoal(newGoal)
    if (status !== 'idle') {
      try {
        await updateGoal(newGoal)
      } catch (error) {
        console.error('Failed to update goal:', error)
      }
    }
  }

  const handleSubjectChange = async (subjectId: number) => {
    setSelectedSubjectId(subjectId)
    const subject = subjects.find(s => s.id === subjectId)
    if (status !== 'idle') {
      try {
        await updateSubject(subjectId, subject?.name)
      } catch (error) {
        console.error('Failed to update subject:', error)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = totalDuration > 0 ? ((totalDuration * 60 - remaining) / (totalDuration * 60)) * 100 : 0
  const overtimeProgress = overtime > 0 ? Math.min((overtime / (settings?.max_overtime_duration || 10) / 60) * 100, 100) : 0

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <div className="text-center mb-6">
          <Title level={3} className="mb-2">番茄钟</Title>
          <Text type="secondary">
            今日已完成 {todayStats.count} 个番茄钟，共 {todayStats.total_duration} 分钟
          </Text>
        </div>

        {/* Timer Display */}
        <div className="mb-8">
          <div className="text-center">
            <div className={`text-7xl font-mono font-bold mb-4 ${status === 'overtime' ? 'text-red-500' : 'text-gray-800'}`}>
              {status === 'idle' ? formatTime(duration * 60) : status === 'overtime' ? `+${formatTime(overtime)}` : formatTime(remaining)}
            </div>
            {status !== 'idle' && status !== 'overtime' && (
              <Progress
                percent={Math.round(progress)}
                showInfo={false}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                className="mb-4"
              />
            )}
            {status === 'overtime' && (
              <Progress
                percent={Math.round(overtimeProgress)}
                showInfo={false}
                strokeColor="#ff4d4f"
                className="mb-4"
              />
            )}
          </div>
        </div>

        {/* Status Indicator */}
        {status !== 'idle' && (
          <div className="text-center mb-4">
            <Text type={status === 'overtime' ? 'danger' : 'secondary'}>
              {status === 'running' ? '专注中...' : status === 'overtime' ? '超时中...' : '已暂停'}
            </Text>
            {currentSubjectName && (
              <Text type="secondary" className="ml-2">
                · {currentSubjectName}
              </Text>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-8">
          {status === 'idle' && (
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
            >
              开始专注
            </Button>
          )}
          {(status === 'running' || status === 'overtime') && (
            <>
              <Button
                size="large"
                icon={<PauseCircleOutlined />}
                onClick={handlePause}
              >
                暂停
              </Button>
              <Button
                size="large"
                danger
                icon={<StopOutlined />}
                onClick={handleStop}
              >
                结束
              </Button>
            </>
          )}
          {status === 'paused' && (
            <>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleResume}
              >
                继续
              </Button>
              <Button
                size="large"
                danger
                icon={<StopOutlined />}
                onClick={handleStop}
              >
                结束
              </Button>
            </>
          )}
        </div>

        {/* Settings */}
        {status === 'idle' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Text className="w-16">时长：</Text>
              <Select
                value={duration}
                onChange={setDuration}
                style={{ width: 120 }}
                options={[
                  { value: 15, label: '15 分钟' },
                  { value: 25, label: '25 分钟' },
                  { value: 30, label: '30 分钟' },
                  { value: 45, label: '45 分钟' },
                  { value: 60, label: '60 分钟' },
                ]}
              />
            </div>

            <div className="flex items-center gap-4">
              <Text className="w-16">科目：</Text>
              <Select
                value={selectedSubjectId}
                onChange={handleSubjectChange}
                style={{ width: 200 }}
                allowClear
                placeholder="选择科目（可选）"
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
              />
            </div>

            <div className="flex items-start gap-4">
              <Text className="w-16 mt-1">目标：</Text>
              <TextArea
                value={goal}
                onChange={(e) => handleGoalChange(e.target.value)}
                placeholder="本次专注的目标..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                className="flex-1"
              />
            </div>
          </div>
        )}

        {/* Running Info */}
        {status !== 'idle' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Text className="w-16">科目：</Text>
              <Select
                value={currentSubjectId || selectedSubjectId}
                onChange={handleSubjectChange}
                style={{ width: 200 }}
                allowClear
                placeholder="选择科目"
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
              />
            </div>

            <div className="flex items-start gap-4">
              <Text className="w-16 mt-1">目标：</Text>
              <TextArea
                value={currentGoal || goal}
                onChange={(e) => handleGoalChange(e.target.value)}
                placeholder="本次专注的目标..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                className="flex-1"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Tips */}
      <Card size="small">
        <div className="flex items-center gap-2 text-gray-500">
          <ClockCircleOutlined />
          <Text type="secondary">
            专注期间请保持专注，避免分心。可以通过菜单栏快捷控制番茄钟。
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default PomodoroPage
