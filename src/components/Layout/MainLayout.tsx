import React, { useState, useEffect, useCallback } from 'react'
import { Layout, Menu, message } from 'antd'
import {
  HomeOutlined,
  BookOutlined,
  SyncOutlined,
  BarChartOutlined,
  SettingOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import PomodoroCompleteModal from '../PomodoroCompleteModal'
import { useSubjectStore, usePomodoroStore } from '@/stores'
import type { Subject } from '@/types'

const { Sider, Content } = Layout

interface CompletedPomodoroData {
  sessionId: number | null
  duration: number // in seconds
  subjectId: number | null
  subjectName: string | null
  goal: string
}

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  // Pomodoro completion modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completedData, setCompletedData] = useState<CompletedPomodoroData | null>(null)

  // Get subjects from store
  const { subjects, fetchSubjects } = useSubjectStore()
  const { fetchTodayStats } = usePomodoroStore()

  // Fetch subjects on mount
  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  // Setup pomodoro event listeners
  useEffect(() => {
    // Listen for pomodoro completion events from main process
    // Note: preload already extracts data from IPC event, so callback receives only data
    const handleCompleted = (data: CompletedPomodoroData) => {
      setCompletedData(data)
      setShowCompleteModal(true)
    }

    window.electronAPI.pomodoroControl.onCompleted(handleCompleted)

    return () => {
      window.electronAPI.pomodoroControl.removeAllListeners('pomodoro:completed')
    }
  }, [])

  // Handle saving completed pomodoro session
  const handleSaveComplete = useCallback(async (subjectId: number | null, goal: string) => {
    if (!completedData) return

    try {
      // Update the session with the final subject and goal
      if (completedData.sessionId) {
        await window.electronAPI.db.pomodoro.updateSession(completedData.sessionId, {
          subject_id: subjectId,
          goal: goal,
          status: 'completed',
        })
      }

      // Refresh today's stats
      await fetchTodayStats()

      // Close modal and reset state
      setShowCompleteModal(false)
      setCompletedData(null)
    } catch (error) {
      console.error('Failed to save pomodoro session:', error)
      message.error('保存番茄钟记录失败')
    }
  }, [completedData, fetchTodayStats])

  // Handle discarding completed pomodoro session
  const handleDiscardComplete = useCallback(async () => {
    if (!completedData) return

    try {
      // Mark session as abandoned if it exists
      if (completedData.sessionId) {
        await window.electronAPI.db.pomodoro.updateSession(completedData.sessionId, {
          status: 'abandoned',
        })
      }

      // Close modal and reset state
      setShowCompleteModal(false)
      setCompletedData(null)
    } catch (error) {
      console.error('Failed to discard pomodoro session:', error)
      message.error('放弃番茄钟记录失败')
    }
  }, [completedData])

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/todo',
      icon: <CheckSquareOutlined />,
      label: '每日计划',
    },
    {
      key: '/tasks',
      icon: <ClockCircleOutlined />,
      label: '任务倒计时',
    },
    {
      key: '/chat',
      icon: <RobotOutlined />,
      label: 'AI助手',
    },
    {
      key: '/questions',
      icon: <BookOutlined />,
      label: '错题管理',
    },
    {
      key: '/review',
      icon: <SyncOutlined />,
      label: '开始复习',
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: '学习统计',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Layout className="min-h-screen">
      <Sider
        width={200}
        className="shadow-lg"
      >
        <div className="h-14 flex items-center justify-center border-b border-white/10">
          <span className="text-white text-lg font-bold tracking-wide">
            📚 错题本
          </span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-none"
        />
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div className="text-white/50 text-xs text-center">
            艾宾浩斯记忆法
          </div>
        </div>
      </Sider>
      <Layout className="bg-gray-50">
        <Content
          className="m-4 p-5 bg-white rounded-xl shadow-sm"
          style={{
            minHeight: 'calc(100vh - 32px)',
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>

      {/* Pomodoro completion modal */}
      <PomodoroCompleteModal
        visible={showCompleteModal}
        duration={completedData ? Math.round(completedData.duration / 60) : 0}
        defaultSubjectId={completedData?.subjectId ?? null}
        defaultGoal={completedData?.goal ?? ''}
        subjects={subjects as Subject[]}
        onSave={handleSaveComplete}
        onDiscard={handleDiscardComplete}
      />
    </Layout>
  )
}

export default MainLayout
