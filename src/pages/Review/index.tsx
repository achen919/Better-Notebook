import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Progress,
  Result,
  Row,
  Col,
  Collapse,
} from 'antd'
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EyeOutlined,
  AudioOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useReviewStore } from '../../stores'
import { FEEDBACK_LEVELS, getReviewProgress } from '../../utils/ebbinghaus'
import type { FeedbackLevel } from '../../types'
import AudioRecorder from '../../components/AudioRecorder'

const { Title, Paragraph } = Typography

const ReviewPage: React.FC = () => {
  const navigate = useNavigate()
  const {
    todayQuestions,
    currentReviewIndex,
    loading,
    fetchTodayReviews,
    nextQuestion,
    previousQuestion,
    submitReview,
  } = useReviewStore()

  const [showAnswer, setShowAnswer] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTodayReviews()
  }, [])

  useEffect(() => {
    setShowAnswer(false)
  }, [currentReviewIndex])

  const handleSubmit = async (feedback: FeedbackLevel) => {
    const currentQuestion = todayQuestions[currentReviewIndex]
    if (!currentQuestion) return

    setSubmitting(true)
    try {
      await submitReview(currentQuestion.id, feedback)
    } catch (error) {
      console.error('Submit review failed:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const currentQuestion = todayQuestions[currentReviewIndex]
  const progress = todayQuestions.length > 0
    ? Math.round(((currentReviewIndex + 1) / todayQuestions.length) * 100)
    : 0

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  if (todayQuestions.length === 0) {
    return (
      <Result
        status="success"
        title="太棒了！"
        subTitle="目前没有需要复习的错题，继续保持！"
        extra={[
          <Button type="primary" key="home" onClick={() => navigate('/')}>
            返回首页
          </Button>,
          <Button key="questions" onClick={() => navigate('/questions')}>
            查看错题
          </Button>,
        ]}
      />
    )
  }

  if (!currentQuestion) {
    return (
      <Result
        status="success"
        title="复习完成！"
        subTitle={`已完成今日 ${todayQuestions.length} 道错题的复习`}
        extra={[
          <Button type="primary" key="home" onClick={() => navigate('/')}>
            返回首页
          </Button>,
        ]}
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 进度条 */}
      <Card size="small">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500 text-sm">复习进度</span>
          <span className="text-gray-600 font-medium">{currentReviewIndex + 1} / {todayQuestions.length}</span>
        </div>
        <Progress percent={progress} showInfo={false} strokeColor="#1677ff" />
      </Card>

      {/* 题目卡片 */}
      <Card size="small">
        <div className="mb-4">
          <Space>
            <Title level={4} className="m-0">{currentQuestion.title}</Title>
            {currentQuestion.subject_name && (
              <Tag color="blue">{currentQuestion.subject_name}</Tag>
            )}
            {currentQuestion.chapter_name && (
              <Tag color="cyan">{currentQuestion.chapter_name}</Tag>
            )}
          </Space>
        </div>

        {/* 题目内容 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">题目内容</span>
            <Collapse
              size="small"
              bordered={false}
              items={[
                {
                  key: '1',
                  label: <span className="flex items-center gap-1 text-xs"><AudioOutlined /> 题目解释录音</span>,
                  children: <AudioRecorder questionId={currentQuestion.id} type="explanation" />,
                  forceRender: true,
                },
              ]}
              className="bg-transparent"
            />
          </div>
          <Paragraph className="whitespace-pre-wrap bg-gray-50 p-3 rounded-lg mb-0">
            {currentQuestion.content || '暂无内容'}
          </Paragraph>
        </div>

        {/* 口述回答录音 - 在显示答案前 */}
        {!showAnswer && (
          <Card size="small" className="mb-4 bg-blue-50" bordered={false}>
            <div className="flex items-center gap-2 mb-2">
              <AudioOutlined className="text-blue-500" />
              <span className="text-gray-600 text-sm font-medium">口述回答（可选）</span>
            </div>
            <AudioRecorder questionId={currentQuestion.id} type="answer" />
          </Card>
        )}

        {/* 答案区域 */}
        {showAnswer ? (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm">答案</span>
                <Collapse
                  size="small"
                  bordered={false}
                  items={[
                    {
                      key: '1',
                      label: <span className="flex items-center gap-1 text-xs"><AudioOutlined /> 口述回答录音</span>,
                      children: <AudioRecorder questionId={currentQuestion.id} type="answer" />,
                      forceRender: true,
                    },
                  ]}
                  className="bg-transparent"
                />
              </div>
              <Paragraph className="whitespace-pre-wrap bg-green-50 p-3 rounded-lg mb-0">
                {currentQuestion.answer || '暂无答案'}
              </Paragraph>
            </div>

            {currentQuestion.analysis && (
              <div className="mb-4">
                <div className="text-gray-500 text-sm mb-2">解析</div>
                <Paragraph className="whitespace-pre-wrap bg-blue-50 p-3 rounded-lg mb-0">
                  {currentQuestion.analysis}
                </Paragraph>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <div className="text-gray-500 text-sm mb-3 text-center">请选择你的记忆程度</div>
              <Row gutter={12}>
                {Object.entries(FEEDBACK_LEVELS).map(([key, config]) => (
                  <Col span={6} key={key}>
                    <Button
                      block
                      size="large"
                      style={{
                        height: 72,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                      }}
                      onClick={() => handleSubmit(key as FeedbackLevel)}
                      loading={submitting}
                    >
                      <span style={{ fontSize: 18, marginBottom: 2 }}>
                        {key === 'forgotten' && '❌'}
                        {key === 'vague' && '❓'}
                        {key === 'familiar' && '✅'}
                        {key === 'mastered' && '⭐'}
                      </span>
                      <span style={{ color: config.color, fontWeight: 600, fontSize: 13 }}>
                        {config.label}
                      </span>
                    </Button>
                  </Col>
                ))}
              </Row>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <Button
              type="primary"
              size="large"
              icon={<EyeOutlined />}
              onClick={() => setShowAnswer(true)}
            >
              显示答案
            </Button>
          </div>
        )}
      </Card>

      {/* 导航按钮 */}
      <div className="flex justify-between">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={previousQuestion}
          disabled={currentReviewIndex === 0}
        >
          上一题
        </Button>
        <Button onClick={() => navigate('/questions')}>
          返回列表
        </Button>
        <Button
          icon={<ArrowRightOutlined />}
          onClick={nextQuestion}
          disabled={currentReviewIndex === todayQuestions.length - 1}
        >
          下一题
        </Button>
      </div>

      {/* 当前题目信息 */}
      <Card size="small">
        <Row gutter={16}>
          <Col span={8} className="text-center">
            <div className="text-gray-400 text-xs mb-1">当前阶段</div>
            <div className="font-medium">{currentQuestion.mastery_level}/7</div>
          </Col>
          <Col span={8} className="text-center">
            <div className="text-gray-400 text-xs mb-1">掌握进度</div>
            <Progress percent={getReviewProgress(currentQuestion.mastery_level)} size="small" showInfo={false} />
          </Col>
          <Col span={8} className="text-center">
            <div className="text-gray-400 text-xs mb-1">复习次数</div>
            <div className="font-medium">{currentQuestion.review_count} 次</div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default ReviewPage
