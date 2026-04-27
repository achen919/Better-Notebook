import React, { useCallback, useEffect, useState } from 'react'
import {
  Card,
  Input,
  Button,
  List,
  Checkbox,
  Space,
  Progress,
  Typography,
  Empty,
  Modal,
  message,
  Row,
  Col,
  DatePicker,
  Select,
  Statistic,
  Tabs,
  Table,
  Tag,
  Switch,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Subject } from '../../types'

const { TextArea } = Input
const { Text, Paragraph } = Typography

interface TodoItem {
  id: number
  date: string
  content: string
  completed: number
  sort_order: number
  created_at: string
  ai_generated?: number
}

interface DailySummary {
  id: number
  date: string
  summary: string
  mood: string
  created_at: string
  updated_at?: string
}

interface LearningTimeRecord {
  id: number
  date: string
  duration: number
  subject_id: number | null
  subject_name: string | null
  subject_color: string | null
  note: string
  source: string | null
  created_at: string
}

interface TodoStats {
  date: string
  total: number
  completed: number
}

interface FixedTodo {
  id: number
  title: string
  start_date: string
  end_date: string
  weekdays: string
  active: number
  created_at: string
  total_instances?: number
  completed_instances?: number
}

const TodoPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [summaryText, setSummaryText] = useState('')
  const [mood, setMood] = useState<string>('good')
  const [summaryModalVisible, setSummaryModalVisible] = useState(false)

  // 学习时间相关
  const [learningTimeRecords, setLearningTimeRecords] = useState<LearningTimeRecord[]>([])
  const [learningTimeModalVisible, setLearningTimeModalVisible] = useState(false)
  const [newLearningTime, setNewLearningTime] = useState({ duration: 60, subject_id: undefined as number | undefined, note: '' })
  const [subjects, setSubjects] = useState<Subject[]>([])

  // 统计相关
  const [activeTab, setActiveTab] = useState('today')
  const [todoStats, setTodoStats] = useState<TodoStats[]>([])
  const [learningTimeStats, setLearningTimeStats] = useState<{ date: string; total_duration: number }[]>([])
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month' | 'year'>('week')

  // 固定计划相关
  const [fixedTodos, setFixedTodos] = useState<FixedTodo[]>([])
  const [fixedTodoModalVisible, setFixedTodoModalVisible] = useState(false)
  const [newFixedTodo, setNewFixedTodo] = useState({
    title: '',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    weekdays: [1, 2, 3, 4, 5] as number[],
  })

  const loadTodos = useCallback(async () => {
    try {
      // 先为当天生成固定计划
      await window.electronAPI.db.fixedTodos.generateForDate(selectedDate)
      // 然后加载当天的任务
      const result = await window.electronAPI.db.todo.getByDate(selectedDate)
      setTodos(result)
    } catch (error) {
      console.error('Failed to load todos:', error)
    }
  }, [selectedDate])

  const loadSummary = useCallback(async () => {
    try {
      const result = await window.electronAPI.db.summary.getByDate(selectedDate)
      setSummary(result)
      setSummaryText(result?.summary || '')
      setMood(result?.mood || 'good')
    } catch (error) {
      console.error('Failed to load summary:', error)
    }
  }, [selectedDate])

  const loadLearningTime = useCallback(async () => {
    try {
      const result = await window.electronAPI.db.learningTime.getByDate(selectedDate)
      setLearningTimeRecords(result)
    } catch (error) {
      console.error('Failed to load learning time:', error)
    }
  }, [selectedDate])

  const loadSubjects = useCallback(async () => {
    try {
      const result = await window.electronAPI.db.subjects.getAll()
      setSubjects(result)
    } catch (error) {
      console.error('Failed to load subjects:', error)
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const days = statsPeriod === 'week' ? 7 : statsPeriod === 'month' ? 30 : 365
      const [todoResult, timeResult] = await Promise.all([
        window.electronAPI.db.todo.getRecentStats(days),
        window.electronAPI.db.learningTime.getStats(statsPeriod),
      ])
      setTodoStats(todoResult)
      setLearningTimeStats(timeResult)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [statsPeriod])

  const loadFixedTodos = useCallback(async () => {
    try {
      const result = await window.electronAPI.db.fixedTodos.getAll()
      setFixedTodos(result)
    } catch (error) {
      console.error('Failed to load fixed todos:', error)
    }
  }, [])

  useEffect(() => {
    loadTodos()
    loadSummary()
    loadLearningTime()
    loadSubjects()
    loadFixedTodos()
  }, [loadFixedTodos, loadLearningTime, loadSubjects, loadSummary, loadTodos])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const addTodo = async () => {
    if (!newTodo.trim()) return

    try {
      await window.electronAPI.db.todo.create({
        date: selectedDate,
        content: newTodo.trim(),
        sort_order: todos.length,
      })
      setNewTodo('')
      loadTodos()
    } catch (error) {
      message.error('添加失败')
    }
  }

  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      await window.electronAPI.db.todo.update(id, { completed: completed ? 1 : 0 })
      loadTodos()
    } catch (error) {
      message.error('更新失败')
    }
  }

  const deleteTodo = async (id: number) => {
    try {
      await window.electronAPI.db.todo.delete(id)
      loadTodos()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const saveSummary = async () => {
    if (!summaryText.trim()) {
      message.warning('请输入今日总结')
      return
    }

    try {
      await window.electronAPI.db.summary.upsert({
        date: selectedDate,
        summary: summaryText,
        mood,
      })
      message.success('保存成功')
      setSummaryModalVisible(false)
      loadSummary()
    } catch (error) {
      message.error('保存失败')
    }
  }

  const addLearningTime = async () => {
    if (newLearningTime.duration <= 0) {
      message.warning('请输入有效的学习时间')
      return
    }

    try {
      await window.electronAPI.db.learningTime.create({
        date: selectedDate,
        duration: newLearningTime.duration,
        subject_id: newLearningTime.subject_id,
        note: newLearningTime.note,
      })
      message.success('记录成功')
      setLearningTimeModalVisible(false)
      setNewLearningTime({ duration: 60, subject_id: undefined, note: '' })
      loadLearningTime()
    } catch (error) {
      message.error('记录失败')
    }
  }

  const deleteLearningTime = async (id: number) => {
    try {
      await window.electronAPI.db.learningTime.delete(id)
      loadLearningTime()
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 固定计划相关函数
  const addFixedTodo = async () => {
    if (!newFixedTodo.title.trim()) {
      message.warning('请输入计划标题')
      return
    }
    if (newFixedTodo.weekdays.length === 0) {
      message.warning('请选择至少一个星期')
      return
    }

    try {
      await window.electronAPI.db.fixedTodos.create({
        title: newFixedTodo.title.trim(),
        start_date: newFixedTodo.start_date,
        end_date: newFixedTodo.end_date,
        weekdays: newFixedTodo.weekdays.join(','),
      })
      message.success('创建成功')
      setFixedTodoModalVisible(false)
      setNewFixedTodo({
        title: '',
        start_date: dayjs().format('YYYY-MM-DD'),
        end_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        weekdays: [1, 2, 3, 4, 5],
      })
      loadFixedTodos()
      loadTodos()
    } catch (error) {
      message.error('创建失败')
    }
  }

  const toggleFixedTodoActive = async (id: number, active: number) => {
    try {
      await window.electronAPI.db.fixedTodos.update(id, { active: active ? 0 : 1 })
      loadFixedTodos()
    } catch (error) {
      message.error('更新失败')
    }
  }

  const deleteFixedTodo = async (id: number) => {
    try {
      await window.electronAPI.db.fixedTodos.delete(id)
      loadFixedTodos()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const completedCount = todos.filter(t => t.completed === 1).length
  const totalCount = todos.length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const totalLearningTime = learningTimeRecords.reduce((sum, r) => sum + r.duration, 0)
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}小时${mins > 0 ? mins + '分钟' : ''}` : `${mins}分钟`
  }

  const moodOptions = [
    { value: 'great', label: '很棒', icon: <span style={{ fontSize: 24 }}>😄</span> },
    { value: 'good', label: '不错', icon: <span style={{ fontSize: 24 }}>😊</span> },
    { value: 'normal', label: '一般', icon: <span style={{ fontSize: 24 }}>😐</span> },
    { value: 'bad', label: '不太好', icon: <span style={{ fontSize: 24 }}>😔</span> },
  ]

  const isToday = selectedDate === dayjs().format('YYYY-MM-DD')
  const dateDisplay = isToday ? '今天' : dayjs(selectedDate).format('MM月DD日')

  // 统计数据计算
  const statsTotalTodos = todoStats.reduce((sum, s) => sum + s.total, 0)
  const statsCompletedTodos = todoStats.reduce((sum, s) => sum + s.completed, 0)
  const statsTotalTime = learningTimeStats.reduce((sum, s) => sum + s.total_duration, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* 日期选择 */}
      <Card size="small">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarOutlined className="text-blue-500" />
            <DatePicker
              value={dayjs(selectedDate)}
              onChange={(date) => setSelectedDate(date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'))}
              format="YYYY-MM-DD"
              allowClear={false}
            />
            <Text strong className="text-lg">{dateDisplay}</Text>
          </div>
          <Space>
            {isToday && (
              <>
                <Button icon={<ClockCircleOutlined />} onClick={() => setLearningTimeModalVisible(true)}>
                  记录学习时间
                </Button>
                <Button type="primary" onClick={() => setSummaryModalVisible(true)}>
                  写今日总结
                </Button>
              </>
            )}
          </Space>
        </div>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'today',
            label: '今日任务',
            children: (
              <div className="space-y-4">
                {/* 完成进度 & 学习时间 */}
                <Card size="small">
                  <Row gutter={16}>
                    <Col span={12}>
                      <div className="text-gray-500 text-sm mb-2">任务完成进度</div>
                      <Progress
                        percent={completionRate}
                        status={completionRate === 100 ? 'success' : 'active'}
                        format={() => `${completedCount}/${totalCount} 已完成`}
                      />
                    </Col>
                    <Col span={12}>
                      <div className="text-gray-500 text-sm mb-2">今日学习时间</div>
                      <div className="text-2xl font-bold text-blue-500">
                        {formatDuration(totalLearningTime)}
                      </div>
                      {summary && (
                        <div className="text-sm text-gray-400 mt-1">
                          心情: {moodOptions.find(m => m.value === summary.mood)?.icon}
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card>

                {/* 学习时间记录 */}
                {learningTimeRecords.length > 0 && (
                  <Card size="small" title={<span className="text-gray-600 font-medium">学习时间记录</span>}>
                    <List
                      size="small"
                      dataSource={learningTimeRecords}
                      renderItem={(item) => (
                        <List.Item
                          actions={[
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => deleteLearningTime(item.id)}
                            />,
                          ]}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {item.source === 'pomodoro' ? '⏱' : '✏️'}
                            </span>
                            <span className="font-medium">{formatDuration(item.duration)}</span>
                            {item.subject_name && (
                              <span
                                className="px-2 py-0.5 rounded text-xs text-white"
                                style={{ backgroundColor: item.subject_color || '#1890ff' }}
                              >
                                {item.subject_name}
                              </span>
                            )}
                            {item.note && <span className="text-gray-400 text-sm">{item.note}</span>}
                          </div>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}

                {/* 添加新TODO */}
                <Card size="small">
                  <div className="flex gap-2">
                    <Input
                      placeholder="添加新任务..."
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      onPressEnter={addTodo}
                      size="large"
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={addTodo} size="large">
                      添加
                    </Button>
                  </div>
                </Card>

                {/* TODO列表 */}
                <Card size="small" title={<span className="text-gray-600">任务列表</span>}>
                  {todos.length > 0 ? (
                    <List
                      dataSource={todos}
                      renderItem={(item) => (
                        <List.Item
                          actions={[
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => deleteTodo(item.id)}
                            />,
                          ]}
                          className={item.completed ? 'bg-gray-50' : ''}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={item.completed === 1}
                              onChange={(e) => toggleTodo(item.id, e.target.checked)}
                            />
                            <span
                              className={`flex-1 ${item.completed ? 'line-through text-gray-400' : ''}`}
                            >
                              {item.content}
                            </span>
                            {item.ai_generated === 1 && (
                              <Tag color="#722ed1" style={{ marginLeft: 4 }}>AI</Tag>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="暂无任务，添加一个吧" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Card>

                {/* 今日总结显示 */}
                {summary && (
                  <Card size="small" title={<span className="text-gray-600">今日总结</span>}>
                    <Paragraph className="mb-0 whitespace-pre-wrap">{summary.summary}</Paragraph>
                    <div className="mt-2 text-gray-400 text-xs">
                      更新于 {dayjs(summary.updated_at || summary.created_at).format('HH:mm')}
                    </div>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'stats',
            label: '统计分析',
            children: (
              <div className="space-y-4">
                <Card size="small">
                  <div className="flex items-center gap-4 mb-4">
                    <Text strong>统计周期:</Text>
                    <Select
                      value={statsPeriod}
                      onChange={setStatsPeriod}
                      style={{ width: 120 }}
                      options={[
                        { value: 'week', label: '本周' },
                        { value: 'month', label: '本月' },
                        { value: 'year', label: '本年' },
                      ]}
                    />
                  </div>

                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title="总任务数"
                        value={statsTotalTodos}
                        prefix={<BarChartOutlined className="text-blue-500" />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="完成任务数"
                        value={statsCompletedTodos}
                        prefix={<BarChartOutlined className="text-green-500" />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="完成率"
                        value={statsTotalTodos > 0 ? Math.round((statsCompletedTodos / statsTotalTodos) * 100) : 0}
                        suffix="%"
                        valueStyle={{ color: statsTotalTodos > 0 && statsCompletedTodos / statsTotalTodos >= 0.8 ? '#52c41a' : '#fa8c16' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="学习总时长"
                        value={formatDuration(statsTotalTime)}
                        prefix={<ClockCircleOutlined className="text-cyan-500" />}
                        valueStyle={{ color: '#13c2c2' }}
                      />
                    </Col>
                  </Row>
                </Card>

                {/* 每日统计表格 */}
                <Card size="small" title={<span className="text-gray-600">每日详情</span>}>
                  <Table
                    size="small"
                    dataSource={todoStats.map(s => ({
                      ...s,
                      key: s.date,
                      rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) + '%' : '0%',
                      time: formatDuration(learningTimeStats.find(t => t.date === s.date)?.total_duration || 0),
                    }))}
                    columns={[
                      { title: '日期', dataIndex: 'date', key: 'date', width: 120,
                        render: (date: string) => dayjs(date).format('MM月DD日') },
                      { title: '任务数', dataIndex: 'total', key: 'total', width: 80 },
                      { title: '完成数', dataIndex: 'completed', key: 'completed', width: 80 },
                      { title: '完成率', dataIndex: 'rate', key: 'rate', width: 80 },
                      { title: '学习时长', dataIndex: 'time', key: 'time' },
                    ]}
                    pagination={false}
                    locale={{ emptyText: '暂无数据' }}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'fixed',
            label: '固定计划',
            children: (
              <div className="space-y-4">
                <Card size="small">
                  <div className="flex items-center justify-between mb-4">
                    <Text strong>管理固定计划</Text>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setFixedTodoModalVisible(true)}>
                      新增固定计划
                    </Button>
                  </div>
                  <div className="text-gray-500 text-sm mb-2">
                    固定计划会在指定的日期范围和星期内自动添加到每日计划中
                  </div>
                </Card>

                {fixedTodos.length > 0 ? (
                  <List
                    dataSource={fixedTodos}
                    renderItem={(item) => {
                      const completionRate = item.total_instances && item.total_instances > 0
                        ? Math.round(((item.completed_instances || 0) / item.total_instances) * 100)
                        : 0
                      const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
                      const selectedWeekdays = item.weekdays.split(',').map(w => weekdayNames[parseInt(w)]).join('、')

                      return (
                        <Card size="small" className="mb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Text strong className={item.active ? '' : 'text-gray-400'}>
                                  {item.title}
                                </Text>
                                <Tag color={item.active ? 'green' : 'default'}>
                                  {item.active ? '进行中' : '已暂停'}
                                </Tag>
                              </div>
                              <div className="text-sm text-gray-500 mb-1">
                                <CalendarOutlined className="mr-1" />
                                {dayjs(item.start_date).format('MM-DD')} 至 {dayjs(item.end_date).format('MM-DD')}
                              </div>
                              <div className="text-sm text-gray-500 mb-2">
                                <ClockCircleOutlined className="mr-1" />
                                {selectedWeekdays}
                              </div>
                              {item.total_instances && item.total_instances > 0 && (
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">
                                    完成进度: {item.completed_instances || 0}/{item.total_instances} ({completionRate}%)
                                  </div>
                                  <Progress percent={completionRate} size="small" showInfo={false} />
                                </div>
                              )}
                            </div>
                            <Space>
                              <Switch
                                checked={item.active === 1}
                                onChange={() => toggleFixedTodoActive(item.id, item.active)}
                                checkedChildren="启用"
                                unCheckedChildren="暂停"
                              />
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  Modal.confirm({
                                    title: '确认删除',
                                    content: '确定要删除此固定计划吗？',
                                    onOk: () => deleteFixedTodo(item.id),
                                  })
                                }}
                              />
                            </Space>
                          </div>
                        </Card>
                      )
                    }}
                  />
                ) : (
                  <Empty description="暂无固定计划，创建一个吧" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
            ),
          },
        ]}
      />

      {/* 学习时间弹窗 */}
      <Modal
        title="记录学习时间"
        open={learningTimeModalVisible}
        onCancel={() => setLearningTimeModalVisible(false)}
        footer={null}
        width={400}
      >
        <div className="space-y-4">
          <div>
            <div className="text-gray-500 text-sm mb-2">学习时长（分钟）</div>
            <Input
              type="number"
              min={1}
              value={newLearningTime.duration}
              onChange={(e) => setNewLearningTime({ ...newLearningTime, duration: parseInt(e.target.value) || 0 })}
              suffix="分钟"
            />
            <div className="text-gray-400 text-xs mt-1">
              快速选择:
              <Space className="ml-2">
                {[30, 60, 90, 120].map(m => (
                  <Button key={m} size="small" onClick={() => setNewLearningTime({ ...newLearningTime, duration: m })}>
                    {m >= 60 ? `${m / 60}小时` : `${m}分钟`}
                  </Button>
                ))}
              </Space>
            </div>
          </div>

          <div>
            <div className="text-gray-500 text-sm mb-2">关联科目（可选）</div>
            <Select
              style={{ width: '100%' }}
              placeholder="选择科目"
              allowClear
              value={newLearningTime.subject_id}
              onChange={(v) => setNewLearningTime({ ...newLearningTime, subject_id: v })}
              options={subjects.map(s => ({ value: s.id, label: s.name }))}
            />
          </div>

          <div>
            <div className="text-gray-500 text-sm mb-2">备注（可选）</div>
            <Input
              placeholder="学了什么..."
              value={newLearningTime.note}
              onChange={(e) => setNewLearningTime({ ...newLearningTime, note: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setLearningTimeModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={addLearningTime}>保存</Button>
          </div>
        </div>
      </Modal>

      {/* 总结弹窗 */}
      <Modal
        title="写今日总结"
        open={summaryModalVisible}
        onCancel={() => setSummaryModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className="space-y-4">
          <div>
            <div className="text-gray-500 text-sm mb-2">今天心情如何？</div>
            <div className="flex gap-4">
              {moodOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all ${
                    mood === option.value ? 'bg-blue-50 ring-2 ring-blue-300' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setMood(option.value)}
                >
                  {option.icon}
                  <span className="text-xs mt-1">{option.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-gray-500 text-sm mb-2">今日总结</div>
            <TextArea
              rows={6}
              placeholder="记录今天的学习收获、遇到的问题、明天的计划..."
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              showCount
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setSummaryModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={saveSummary}>保存</Button>
          </div>
        </div>
      </Modal>

      {/* 固定计划弹窗 */}
      <Modal
        title="新增固定计划"
        open={fixedTodoModalVisible}
        onCancel={() => setFixedTodoModalVisible(false)}
        footer={null}
        width={450}
      >
        <div className="space-y-4">
          <div>
            <div className="text-gray-500 text-sm mb-2">计划标题</div>
            <Input
              placeholder="例如：每日背单词、晨间阅读..."
              value={newFixedTodo.title}
              onChange={(e) => setNewFixedTodo({ ...newFixedTodo, title: e.target.value })}
            />
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <div className="text-gray-500 text-sm mb-2">开始日期</div>
              <DatePicker
                value={dayjs(newFixedTodo.start_date)}
                onChange={(date) => setNewFixedTodo({ ...newFixedTodo, start_date: date?.format('YYYY-MM-DD') || '' })}
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={12}>
              <div className="text-gray-500 text-sm mb-2">结束日期</div>
              <DatePicker
                value={dayjs(newFixedTodo.end_date)}
                onChange={(date) => setNewFixedTodo({ ...newFixedTodo, end_date: date?.format('YYYY-MM-DD') || '' })}
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
              />
            </Col>
          </Row>

          <div>
            <div className="text-gray-500 text-sm mb-2">重复星期</div>
            <div className="flex gap-2">
              {[
                { value: 1, label: '一' },
                { value: 2, label: '二' },
                { value: 3, label: '三' },
                { value: 4, label: '四' },
                { value: 5, label: '五' },
                { value: 6, label: '六' },
                { value: 7, label: '日' },
              ].map((day) => (
                <Button
                  key={day.value}
                  type={newFixedTodo.weekdays.includes(day.value) ? 'primary' : 'default'}
                  size="small"
                  onClick={() => {
                    const newWeekdays = newFixedTodo.weekdays.includes(day.value)
                      ? newFixedTodo.weekdays.filter((w) => w !== day.value)
                      : [...newFixedTodo.weekdays, day.value].sort()
                    setNewFixedTodo({ ...newFixedTodo, weekdays: newWeekdays })
                  }}
                >
                  {day.label}
                </Button>
              ))}
            </div>
            <div className="text-gray-400 text-xs mt-1">
              已选择: {newFixedTodo.weekdays.length > 0
                ? newFixedTodo.weekdays.map(w => ['一', '二', '三', '四', '五', '六', '日'][w - 1]).join('、')
                : '未选择'}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setFixedTodoModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={addFixedTodo}>创建</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TodoPage
