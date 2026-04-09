import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/Layout'
import HomePage from './pages/Home'
import TodoPage from './pages/Todo'
import TasksPage from './pages/Tasks'
import QuestionsPage from './pages/Questions'
import ReviewPage from './pages/Review'
import StatisticsPage from './pages/Statistics'
import SettingsPage from './pages/Settings'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/todo" element={<TodoPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/questions/*" element={<QuestionsPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App
