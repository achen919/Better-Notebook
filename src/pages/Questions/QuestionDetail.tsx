import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Space,
  Tag,
  Descriptions,
  Typography,
  Empty,
  Spin,
  Row,
  Col,
  Progress,
  Timeline,
  Popconfirm,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuestionStore, useReviewStore } from '../../stores'
import { getStageDescription, getReviewProgress, FEEDBACK_LEVELS } from '../../utils/ebbinghaus'
import dayjs from 'dayjs'

const { Title, Paragraph } = Typography

const QuestionDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { currentQuestion, fetchQuestionById, deleteQuestion, loading } = useQuestionStore()
  const { reviewRecords, fetchReviewRecords } = useReviewStore()

  useEffect(() => {
    if (id) {
      fetchQuestionById(Number(id))
      fetchReviewRecords(Number(id))
    }
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteQuestion(Number(id))
      message.success('删除成功')
      navigate('/questions')
    } catch {
      message.error('删除失败')
    }
  }

  const getDifficultyLabel = (difficulty: number) => {
    const labels = ['简单', '较易', '中等', '较难', '困难']
    return labels[difficulty - 1] || '中等'
  }

  const getFeedbackLabel = (feedback: string) => {
    const config = FEEDBACK_LEVELS[feedback as keyof typeof FEEDBACK_LEVELS]
    return config ? (
      <Tag color={config.color} style={{ borderRadius: 4 }}>{config.label}</Tag>
    ) : feedback
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    )
  }

  if (!currentQuestion) {
    return <Empty description="错题不存在" />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/questions')}>
            返回
          </Button>
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={() => navigate('/review')}
          >
            开始复习
          </Button>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/questions/${id}/edit`)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这道错题吗？"
            onConfirm={handleDelete}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={16}>
          <Card size="small" title={<span className="text-gray-600">题目内容</span>}>
            <div className="mb-4">
              <Title level={5} className="mb-2">{currentQuestion.title}</Title>
              {currentQuestion.subject_name && (
                <Tag color="blue">{currentQuestion.subject_name}</Tag>
              )}
              {currentQuestion.chapter_name && (
                <Tag color="cyan">{currentQuestion.chapter_name}</Tag>
              )}
            </div>

            <div className="mb-4">
              <div className="text-gray-500 text-sm mb-2">题目</div>
              <Paragraph className="whitespace-pre-wrap bg-gray-50 p-3 rounded-lg mb-0">
                {currentQuestion.content || '暂无内容'}
              </Paragraph>
            </div>

            <div className="mb-4">
              <div className="text-gray-500 text-sm mb-2">答案</div>
              <Paragraph className="whitespace-pre-wrap bg-green-50 p-3 rounded-lg mb-0">
                {currentQuestion.answer || '暂无答案'}
              </Paragraph>
            </div>

            <div>
              <div className="text-gray-500 text-sm mb-2">解析</div>
              <Paragraph className="whitespace-pre-wrap bg-blue-50 p-3 rounded-lg mb-0">
                {currentQuestion.analysis || '暂无解析'}
              </Paragraph>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card size="small" title={<span className="text-gray-600">基本信息</span>} className="mb-4">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="难度">
                <Tag color="#faad14">{getDifficultyLabel(currentQuestion.difficulty)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="来源">
                <span className="text-gray-500">{currentQuestion.source || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="标签">
                {currentQuestion.tagList && currentQuestion.tagList.length > 0 ? (
                  <Space size={[0, 4]} wrap>
                    {currentQuestion.tagList.map((tag: any) => (
                      <Tag key={tag.id} color={tag.color}>{tag.name}</Tag>
                    ))}
                  </Space>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                <span className="text-gray-500 text-sm">
                  {dayjs(currentQuestion.created_at).format('YYYY-MM-DD HH:mm')}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" title={<span className="text-gray-600">学习进度</span>} className="mb-4">
            <div className="text-center mb-4">
              <Progress
                type="circle"
                percent={getReviewProgress(currentQuestion.mastery_level)}
                format={() => (
                  <span style={{ fontSize: 14 }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: currentQuestion.mastery_level >= 7 ? '#52c41a' : '#1677ff' }}>
                      {currentQuestion.mastery_level}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>/ 7</div>
                  </span>
                )}
                strokeColor={currentQuestion.mastery_level >= 7 ? '#52c41a' : '#1677ff'}
              />
            </div>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="当前阶段">
                <span className="text-gray-600">{getStageDescription(currentQuestion.mastery_level)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="复习次数">
                <span className="text-gray-600">{currentQuestion.review_count} 次</span>
              </Descriptions.Item>
              <Descriptions.Item label="上次复习">
                <span className="text-gray-500 text-sm">
                  {currentQuestion.last_review_date
                    ? dayjs(currentQuestion.last_review_date).format('YYYY-MM-DD HH:mm')
                    : '未复习'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="下次复习">
                <span className="text-gray-500 text-sm">
                  {currentQuestion.next_review_date
                    ? dayjs(currentQuestion.next_review_date).format('YYYY-MM-DD HH:mm')
                    : '待安排'}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" title={<span className="text-gray-600">复习记录</span>}>
            {reviewRecords.length > 0 ? (
              <Timeline
                items={reviewRecords.slice(0, 5).map((record) => ({
                  color: FEEDBACK_LEVELS[record.feedback as keyof typeof FEEDBACK_LEVELS]?.color,
                  children: (
                    <div>
                      <div className="flex items-center gap-2">
                        {getFeedbackLabel(record.feedback)}
                        <span className="text-xs text-gray-400">
                          {dayjs(record.review_date).format('MM-DD HH:mm')}
                        </span>
                      </div>
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description="暂无复习记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default QuestionDetailPage
