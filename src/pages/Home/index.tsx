import React, { useEffect } from 'react'
import { Card, Row, Col, Statistic, Progress, Button, List, Tag, Empty, Typography } from 'antd'
import {
  BookOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useStatisticsStore, useReviewStore, useQuestionStore } from '../../stores'
import { getRemainingTime } from '../../utils/ebbinghaus'

const { Text } = Typography

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { overview, fetchOverview } = useStatisticsStore()
  const { todayQuestions, fetchTodayReviews } = useReviewStore()
  const { questions, fetchQuestions } = useQuestionStore()

  useEffect(() => {
    fetchOverview()
    fetchTodayReviews()
    fetchQuestions()
  }, [])

  const recentQuestions = questions.slice(0, 5)

  const masteryPercent = overview && overview.total_questions > 0
    ? Math.round((overview.mastered_questions / overview.total_questions) * 100)
    : 0

  const reviewPercent = overview && overview.today_reviews > 0
    ? Math.round((overview.completed_today / overview.today_reviews) * 100)
    : 0

  return (
    <div className="space-y-5">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
        <h1 className="text-xl font-bold mb-1">欢迎使用艾宾浩斯错题本</h1>
        <p className="text-blue-100 text-sm">基于科学记忆曲线，帮助你高效复习错题</p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card className="stat-card h-full">
            <Statistic
              title={<span className="text-gray-500 text-sm">总错题数</span>}
              value={overview?.total_questions || 0}
              prefix={<BookOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1677ff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card h-full">
            <Statistic
              title={<span className="text-gray-500 text-sm">已掌握</span>}
              value={overview?.mastered_questions || 0}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card h-full">
            <Statistic
              title={<span className="text-gray-500 text-sm">今日待复习</span>}
              value={overview?.today_reviews || 0}
              prefix={<SyncOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card h-full">
            <Statistic
              title={<span className="text-gray-500 text-sm">今日已完成</span>}
              value={overview?.completed_today || 0}
              prefix={<ClockCircleOutlined className="text-cyan-500" />}
              valueStyle={{ color: '#13c2c2', fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 快捷操作 & 进度 */}
      <Row gutter={16}>
        <Col span={8}>
          <Card className="h-full" size="small">
            <div className="text-gray-600 font-medium mb-3">快捷操作</div>
            <div className="flex flex-col gap-2">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                block
                onClick={() => navigate('/questions/add')}
              >
                添加错题
              </Button>
              <Button
                icon={<SyncOutlined />}
                size="large"
                block
                onClick={() => navigate('/review')}
                disabled={todayQuestions.length === 0}
              >
                开始复习 {todayQuestions.length > 0 && `(${todayQuestions.length})`}
              </Button>
            </div>
          </Card>
        </Col>
        <Col span={16}>
          <Card className="h-full" size="small">
            <div className="text-gray-600 font-medium mb-3">学习进度</div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">掌握进度</span>
                  <span className="text-gray-600">
                    {overview?.mastered_questions || 0} / {overview?.total_questions || 0}
                  </span>
                </div>
                <Progress
                  percent={masteryPercent}
                  size="small"
                  strokeColor={{ '0%': '#52c41a', '100%': '#73d13d' }}
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">今日复习进度</span>
                  <span className="text-gray-600">
                    {overview?.completed_today || 0} / {overview?.today_reviews || 0}
                  </span>
                </div>
                <Progress
                  percent={reviewPercent}
                  size="small"
                  strokeColor="#fa8c16"
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 待复习 & 最近添加 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card
            size="small"
            title={<span className="text-gray-600 font-medium">待复习错题</span>}
            extra={<Button type="link" size="small" onClick={() => navigate('/review')}>开始复习</Button>}
            className="h-full"
          >
            {todayQuestions.length > 0 ? (
              <List
                size="small"
                dataSource={todayQuestions.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item className="py-2 px-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Text ellipsis className="flex-1">{item.title}</Text>
                        <Tag color={item.subject_id ? 'blue' : 'default'} className="shrink-0">
                          {item.subject_name || '未分类'}
                        </Tag>
                      </div>
                      <Button
                        type="text"
                        size="small"
                        icon={<RightOutlined />}
                        onClick={() => navigate('/review')}
                      />
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无待复习错题" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card
            size="small"
            title={<span className="text-gray-600 font-medium">最近添加</span>}
            extra={<Button type="link" size="small" onClick={() => navigate('/questions')}>查看全部</Button>}
            className="h-full"
          >
            {recentQuestions.length > 0 ? (
              <List
                size="small"
                dataSource={recentQuestions}
                renderItem={(item) => (
                  <List.Item className="py-2 px-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Text ellipsis className="flex-1">{item.title}</Text>
                        <Tag color={item.subject_id ? 'blue' : 'default'} className="shrink-0">
                          {item.subject_name || '未分类'}
                        </Tag>
                      </div>
                      <Button
                        type="text"
                        size="small"
                        icon={<RightOutlined />}
                        onClick={() => navigate(`/questions/${item.id}`)}
                      />
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无错题" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default HomePage
