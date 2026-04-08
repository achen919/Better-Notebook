import React from 'react'
import { Routes, Route } from 'react-router-dom'
import QuestionListPage from './QuestionList'
import QuestionForm from './QuestionForm'
import QuestionDetailPage from './QuestionDetail'

const QuestionsPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<QuestionListPage />} />
      <Route path="/add" element={<QuestionForm mode="add" />} />
      <Route path="/:id" element={<QuestionDetailPage />} />
      <Route path="/:id/edit" element={<QuestionForm mode="edit" />} />
    </Routes>
  )
}

export default QuestionsPage
