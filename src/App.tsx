import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { MainLayout } from './components/Layout'
import HomePage from './pages/Home'
import TodoPage from './pages/Todo'
import TasksPage from './pages/Tasks'
import ChatPage from './pages/Chat'
import QuestionsPage from './pages/Questions'
import ReviewPage from './pages/Review'
import StatisticsPage from './pages/Statistics'
import SettingsPage from './pages/Settings'
import PomodoroPage from './pages/Pomodoro'
import { useThemeStore, THEME_PRESETS } from './stores'

const App: React.FC = () => {
  const { currentTheme } = useThemeStore()
  const themeConfig = THEME_PRESETS[currentTheme]
  const isDark = currentTheme === 'dark'

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: themeConfig.colorPrimary,
          borderRadius: 8,
          colorBgBase: themeConfig.colorBgBase,
        },
      }}
    >
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/questions/*" element={<QuestionsPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/pomodoro" element={<PomodoroPage />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
