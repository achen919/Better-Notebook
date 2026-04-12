import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Progress, Button, List, Tag, Empty, Typography, Checkbox, Badge } from 'antd'
import {
  BookOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  RightOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useStatisticsStore, useReviewStore, useQuestionStore } from '../../stores'
import dayjs from 'dayjs'

const { Text } = Typography

interface TodoItem {
  id: number
  date: string
  content: string
  completed: number
}

interface UpcomingTask {
  id: number
  title: string
  deadline: string
  priority: number
  progress_type: string
  current_value: number
  total_value: number
  subitem_count: number
  completed_subitems: number
}

const priorityColors = ['#52c41a', '#1890ff', '#fa8c16', '#f5222d']

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { overview, fetchOverview } = useStatisticsStore()
  const { todayQuestions, fetchTodayReviews } = useReviewStore()
  const { fetchQuestions } = useQuestionStore()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [todoStats, setTodoStats] = useState({ total: 0, completed: 0 })
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([])
  const [todayLearningTime, setTodayLearningTime] = useState(0)

  useEffect(() => {
    fetchOverview()
    fetchTodayReviews()
    fetchQuestions()
    loadTodayTodos()
    loadUpcomingTasks()
    loadTodayLearningTime()
  }, [])

  const loadTodayTodos = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const result = await window.electronAPI.db.todo.getByDate(today)
      setTodos(result.slice(0, 5))
      const stats = await window.electronAPI.db.todo.getCompletionRate(today)
      setTodoStats({ total: stats?.total || 0, completed: stats?.completed || 0 })
    } catch (error) {
      console.error('Failed to load todos:', error)
    }
  }

  const loadUpcomingTasks = async () => {
    try {
      const result = await window.electronAPI.db.tasks.getUpcoming(7)
      setUpcomingTasks(result.slice(0, 5))
    } catch (error) {
      console.error('Failed to load upcoming tasks:', error)
    }
  }

  const loadTodayLearningTime = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const result = await window.electronAPI.db.learningTime.getTotalByDate(today)
      setTodayLearningTime(result?.total_duration || 0)
    } catch (error) {
      console.error('Failed to load learning time:', error)
    }
  }

  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      await window.electronAPI.db.todo.update(id, { completed: completed ? 1 : 0 })
      loadTodayTodos()
    } catch (error) {
      console.error('Failed to toggle todo:', error)
    }
  }

  const getDaysRemaining = (deadline: string) => {
    const today = dayjs().startOf('day')
    const deadlineDate = dayjs(deadline).startOf('day')
    return deadlineDate.diff(today, 'day')
  }

  const getTaskProgress = (task: UpcomingTask) => {
    if (task.progress_type === 'percentage') {
      return Math.round((task.current_value / task.total_value) * 100)
    } else {
      if (task.subitem_count === 0) return 0
      return Math.round((task.completed_subitems / task.subitem_count) * 100)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h${mins > 0 ? mins + 'm' : ''}` : `${mins}m`
  }

  const masteryPercent = overview && overview.total_questions > 0
    ? Math.round((overview.mastered_questions / overview.total_questions) * 100)
    : 0

  const reviewPercent = overview && overview.today_reviews > 0
    ? Math.round((overview.completed_today / overview.today_reviews) * 100)
    : 0

  const todoPercent = todoStats.total > 0
    ? Math.round((todoStats.completed / todoStats.total) * 100)
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
              title={<span className="text-gray-500 text-sm">今日学习</span>}
              value={formatDuration(todayLearningTime)}
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
                icon={<CheckSquareOutlined />}
                size="large"
                block
                onClick={() => navigate('/todo')}
              >
                每日计划 {todoStats.total > 0 && `(${todoStats.completed}/${todoStats.total})`}
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
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">今日计划</span>
                  <span className="text-gray-600">
                    {todoStats.completed} / {todoStats.total}
                  </span>
                </div>
                <Progress
                  percent={todoPercent}
                  size="small"
                  strokeColor="#1677ff"
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
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">总掌握进度</span>
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
            </div>
          </Card>
        </Col>
      </Row>

      {/* 今日任务 & 即将到期任务 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card
            size="small"
            title={<span className="text-gray-600 font-medium">今日任务</span>}
            extra={<Button type="link" size="small" onClick={() => navigate('/todo')}>查看全部</Button>}
            className="h-full"
          >
            {todos.length > 0 ? (
              <List
                size="small"
                dataSource={todos}
                renderItem={(item) => (
                  <List.Item className="py-2 px-0">
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox
                        checked={item.completed === 1}
                        onChange={(e) => toggleTodo(item.id, e.target.checked)}
                      />
                      <Text
                        ellipsis
                        className={`flex-1 ${item.completed ? 'line-through text-gray-400' : ''}`}
                      >
                        {item.content}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card
            size="small"
            title={<span className="text-gray-600 font-medium">即将到期任务</span>}
            extra={<Button type="link" size="small" onClick={() => navigate('/tasks')}>查看全部</Button>}
            className="h-full"
          >
            {upcomingTasks.length > 0 ? (
              <List
                size="small"
                dataSource={upcomingTasks}
                renderItem={(item) => {
                  const daysRemaining = getDaysRemaining(item.deadline)
                  const isOverdue = daysRemaining < 0
                  const isUrgent = daysRemaining <= 3 && daysRemaining >= 0
                  const progress = getTaskProgress(item)

                  return (
                    <List.Item className="py-2 px-0">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge color={priorityColors[item.priority - 1]} />
                          <Text ellipsis className="flex-1">{item.title}</Text>
                          <Tag color={isOverdue ? 'red' : isUrgent ? 'orange' : 'default'} className="shrink-0">
                            {isOverdue ? `逾期${Math.abs(daysRemaining)}天` : `${daysRemaining}天`}
                          </Tag>
                        </div>
                        <div className="text-gray-400 text-xs ml-2 w-10 text-right">
                          {progress}%
                        </div>
                      </div>
                    </List.Item>
                  )
                }}
              />
            ) : (
              <Empty description="暂无即将到期任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      {/* 待复习错题 */}
      <Card
        size="small"
        title={<span className="text-gray-600 font-medium">待复习错题</span>}
        extra={<Button type="link" size="small" onClick={() => navigate('/review')}>开始复习</Button>}
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
    </div>
  )
}

export default HomePage
