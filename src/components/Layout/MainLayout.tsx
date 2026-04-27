import React, { useState, useEffect, useCallback } from 'react'
import { Layout, Menu, message, Tag, Dropdown, Popover } from 'antd'
import type { MenuProps } from 'antd'
import {
  HomeOutlined,
  BookOutlined,
  SyncOutlined,
  BarChartOutlined,
  SettingOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  FireOutlined,
  PlayCircleOutlined,
  BgColorsOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import PomodoroCompleteModal from '../PomodoroCompleteModal'
import { useSubjectStore, usePomodoroStore, useThemeStore, THEME_PRESETS, type ThemeKey } from '@/stores'
import type { Subject } from '@/types'

const { Sider, Content, Header } = Layout

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
  const {
    status,
    remaining,
    overtime,
    currentSubjectName,
    fetchTodayStats,
    fetchState,
    setupListeners,
    cleanupListeners,
    start,
  } = usePomodoroStore()

  const { currentTheme, setTheme } = useThemeStore()
  const themeConfig = THEME_PRESETS[currentTheme]

  // Fetch subjects on mount
  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  // Setup pomodoro state listeners
  useEffect(() => {
    fetchState()
    setupListeners()
    return () => {
      cleanupListeners()
    }
  }, [fetchState, setupListeners, cleanupListeners])

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
      key: '/pomodoro',
      icon: <FireOutlined />,
      label: '番茄钟',
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

  // Format time for display (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Quick start pomodoro with preset duration
  const handleQuickStart = async (duration: number, isBreak: boolean) => {
    try {
      await start(duration, undefined, undefined, isBreak ? '休息' : '学习')
      message.success(`已开始 ${duration} 分钟${isBreak ? '休息' : '专注'}`)
    } catch (error) {
      console.error('Failed to start pomodoro:', error)
      message.error('启动失败')
    }
  }

  // Quick action menu items
  const quickActionItems: MenuProps['items'] = [
    {
      key: 'break-5',
      label: '☕ 休息 5 分钟',
      onClick: () => handleQuickStart(5, true),
    },
    {
      key: 'break-15',
      label: '☕ 休息 15 分钟',
      onClick: () => handleQuickStart(15, true),
    },
    { type: 'divider' },
    {
      key: 'focus-45',
      label: '📚 学习 45 分钟',
      onClick: () => handleQuickStart(45, false),
    },
    {
      key: 'focus-25',
      label: '📚 学习 25 分钟',
      onClick: () => handleQuickStart(25, false),
    },
  ]

  return (
    <Layout className="min-h-screen">
      <Sider
        width={200}
        className="shadow-lg"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: themeConfig.siderBg,
        }}
      >
        {/* Logo - 避开 Mac 红绿灯，增加顶部间距 */}
        <div
          className="flex items-center justify-center border-b border-white/10"
          style={{
            height: 56,
            paddingTop: 28, // 避开 Mac 红绿灯
            paddingBottom: 8,
          }}
        >
          <div className="flex items-center gap-2">
            {/* 先锋派 Logo */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
              style={{
                background: `linear-gradient(135deg, ${themeConfig.colorPrimary}, ${themeConfig.colorPrimary}88)`,
                color: '#fff',
                boxShadow: `0 0 20px ${themeConfig.colorPrimary}66`,
              }}
            >
              M
            </div>
            <div className="flex flex-col">
              <span
                className="text-sm font-bold tracking-wider"
                style={{ color: themeConfig.siderText }}
              >
                MINDFLOW
              </span>
              <span
                className="text-[10px] opacity-60 -mt-0.5"
                style={{ color: themeConfig.siderText }}
              >
                记忆增强系统
              </span>
            </div>
          </div>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-none"
          style={{ background: 'transparent' }}
        />

        {/* 底部：主题切换 + 版本信息 */}
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <Popover
            content={
              <div className="grid grid-cols-4 gap-2 p-1">
                {(Object.keys(THEME_PRESETS) as ThemeKey[]).map((key) => (
                  <div
                    key={key}
                    className={`w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center transition-all hover:scale-110 ${
                      currentTheme === key ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                    }`}
                    style={{
                      background: THEME_PRESETS[key].siderBg,
                      border: `2px solid ${THEME_PRESETS[key].colorPrimary}`,
                    }}
                    onClick={() => setTheme(key)}
                    title={THEME_PRESETS[key].name}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ background: THEME_PRESETS[key].colorPrimary }}
                    />
                  </div>
                ))}
              </div>
            }
            title="选择主题"
            trigger="click"
            placement="topRight"
          >
            <div
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all hover:bg-white/10"
              style={{ color: themeConfig.siderText }}
            >
              <BgColorsOutlined />
              <span className="text-xs">{themeConfig.name}</span>
            </div>
          </Popover>
          <div
            className="text-xs text-center mt-2 opacity-40"
            style={{ color: themeConfig.siderText }}
          >
            Ebbinghaus v1.0
          </div>
        </div>
      </Sider>
      <Layout className="bg-gray-50" style={{ marginLeft: 200 }}>
        {/* Header with pomodoro countdown */}
        <Header className="bg-white shadow-sm flex items-center justify-between px-6" style={{ height: 48, lineHeight: '48px' }}>
          <div className="flex items-center gap-4">
            {/* Pomodoro countdown display */}
            {status !== 'idle' && (
              <div
                className={`flex items-center gap-2 cursor-pointer px-3 py-1 rounded-full transition-colors ${
                  status === 'overtime' ? 'bg-red-100 hover:bg-red-200' : 'bg-gray-100 hover:bg-gray-200'
                }`}
                onClick={() => navigate('/pomodoro')}
              >
                <FireOutlined className={`${status === 'running' ? 'text-orange-500 animate-pulse' : status === 'overtime' ? 'text-red-500 animate-pulse' : 'text-orange-500'}`} />
                <span className={`font-mono text-lg font-semibold ${status === 'overtime' ? 'text-red-600' : 'text-gray-800'}`}>
                  {status === 'overtime' ? `+${formatTime(overtime)}` : formatTime(remaining)}
                </span>
                {currentSubjectName && (
                  <Tag color="blue" className="ml-1">{currentSubjectName}</Tag>
                )}
                {status === 'paused' && (
                  <Tag color="orange">已暂停</Tag>
                )}
                {status === 'overtime' && (
                  <Tag color="red">超时</Tag>
                )}
              </div>
            )}
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2">
            <Dropdown.Button
              menu={{ items: quickActionItems }}
              placement="bottomRight"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleQuickStart(25, false)}
            >
              开始专注
            </Dropdown.Button>
          </div>
        </Header>
        <Content
          className="m-4 p-5 bg-white rounded-xl shadow-sm"
          style={{
            minHeight: 'calc(100vh - 80px)',
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
