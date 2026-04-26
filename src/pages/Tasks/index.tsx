import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
  List,
  Progress,
  Typography,
  Empty,
  Modal,
  message,
  Row,
  Col,
  Input,
  DatePicker,
  Select,
  Tag,
  Checkbox,
  Table,
  Badge,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RightOutlined,
  CalendarOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Title, Text } = Typography

interface Task {
  id: number
  title: string
  description: string
  deadline: string
  priority: number
  status: string
  progress_type: 'percentage' | 'subitems'
  total_value: number
  current_value: number
  subitem_count: number
  completed_subitems: number
  created_at: string
  ai_generated?: number
}

interface TaskSubitem {
  id: number
  task_id: number
  title: string
  completed: number
  sort_order: number
}

interface Milestone {
  id: number
  task_id: number
  title: string
  description: string
  target_date: string | null
  completed: number
  completed_at: string | null
}

interface TaskProgress {
  id: number
  task_id: number
  date: string
  progress_value: number
  note: string
}

const priorityColors = ['#52c41a', '#1890ff', '#fa8c16', '#f5222d']
const priorityLabels = ['低', '中', '高', '紧急']

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskModalVisible, setTaskModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)

  // 新任务表单
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    deadline: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    priority: 2,
    progress_type: 'percentage' as 'percentage' | 'subitems',
  })

  // 子任务
  const [subitems, setSubitems] = useState<TaskSubitem[]>([])
  const [newSubitemTitle, setNewSubitemTitle] = useState('')

  // 里程碑
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false)
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    target_date: null as string | null,
  })

  // 进度记录
  const [progressRecords, setProgressRecords] = useState<TaskProgress[]>([])
  const [progressModalVisible, setProgressModalVisible] = useState(false)
  const [newProgress, setNewProgress] = useState({ value: 0, note: '' })

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const result = await window.electronAPI.db.tasks.getActive()
      setTasks(result)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const loadTaskDetails = async (taskId: number) => {
    try {
      const [subitemsResult, milestonesResult, progressResult] = await Promise.all([
        window.electronAPI.db.taskSubitems.getByTask(taskId),
        window.electronAPI.db.milestones.getByTask(taskId),
        window.electronAPI.db.taskProgress.getByTask(taskId),
      ])
      setSubitems(subitemsResult)
      setMilestones(milestonesResult)
      setProgressRecords(progressResult)
    } catch (error) {
      console.error('Failed to load task details:', error)
    }
  }

  const createTask = async () => {
    if (!newTask.title.trim()) {
      message.warning('请输入任务标题')
      return
    }

    try {
      const taskId = await window.electronAPI.db.tasks.create(newTask)
      message.success('创建成功')
      setTaskModalVisible(false)
      setNewTask({
        title: '',
        description: '',
        deadline: dayjs().add(7, 'day').format('YYYY-MM-DD'),
        priority: 2,
        progress_type: 'percentage',
      })
      loadTasks()

      // 如果是子任务模式，打开详情添加子任务
      if (newTask.progress_type === 'subitems') {
        const newTaskData = tasks.find(t => t.id === taskId) || await window.electronAPI.db.tasks.getById(taskId)
        if (newTaskData) {
          setSelectedTask(newTaskData)
          setDetailModalVisible(true)
          loadTaskDetails(taskId)
        }
      }
    } catch (error) {
      message.error('创建失败')
    }
  }

  const updateTaskProgress = async (value: number) => {
    if (!selectedTask) return

    try {
      await window.electronAPI.db.tasks.update(selectedTask.id, { current_value: value })
      setSelectedTask({ ...selectedTask, current_value: value })
      loadTasks()
    } catch (error) {
      message.error('更新失败')
    }
  }

  const completeTask = async (taskId: number) => {
    try {
      await window.electronAPI.db.tasks.update(taskId, { status: 'completed' })
      message.success('任务已完成')
      setDetailModalVisible(false)
      loadTasks()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const deleteTask = async (taskId: number) => {
    try {
      await window.electronAPI.db.tasks.delete(taskId)
      message.success('删除成功')
      setDetailModalVisible(false)
      loadTasks()
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 子任务操作
  const addSubitem = async () => {
    if (!newSubitemTitle.trim() || !selectedTask) return

    try {
      await window.electronAPI.db.taskSubitems.create({
        task_id: selectedTask.id,
        title: newSubitemTitle.trim(),
      })
      setNewSubitemTitle('')
      loadTaskDetails(selectedTask.id)

      // 更新任务进度
      await window.electronAPI.db.tasks.update(selectedTask.id, { current_value: 0 })
    } catch (error) {
      message.error('添加失败')
    }
  }

  const toggleSubitem = async (subitemId: number, completed: boolean) => {
    try {
      await window.electronAPI.db.taskSubitems.update(subitemId, { completed: completed ? 1 : 0 })
      if (selectedTask) {
        loadTaskDetails(selectedTask.id)
      }
    } catch (error) {
      message.error('更新失败')
    }
  }

  const deleteSubitem = async (subitemId: number) => {
    try {
      await window.electronAPI.db.taskSubitems.delete(subitemId)
      if (selectedTask) {
        loadTaskDetails(selectedTask.id)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 里程碑操作
  const addMilestone = async () => {
    if (!newMilestone.title.trim() || !selectedTask) return

    try {
      await window.electronAPI.db.milestones.create({
        task_id: selectedTask.id,
        ...newMilestone,
      })
      setMilestoneModalVisible(false)
      setNewMilestone({ title: '', description: '', target_date: null })
      loadTaskDetails(selectedTask.id)
      message.success('里程碑已添加')
    } catch (error) {
      message.error('添加失败')
    }
  }

  const toggleMilestone = async (milestoneId: number, completed: boolean) => {
    try {
      await window.electronAPI.db.milestones.update(milestoneId, { completed: completed ? 1 : 0 })
      if (selectedTask) {
        loadTaskDetails(selectedTask.id)
      }
    } catch (error) {
      message.error('更新失败')
    }
  }

  const deleteMilestone = async (milestoneId: number) => {
    try {
      await window.electronAPI.db.milestones.delete(milestoneId)
      if (selectedTask) {
        loadTaskDetails(selectedTask.id)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 进度记录操作
  const addProgressRecord = async () => {
    if (!selectedTask) return

    try {
      await window.electronAPI.db.taskProgress.create({
        task_id: selectedTask.id,
        date: dayjs().format('YYYY-MM-DD'),
        progress_value: newProgress.value,
        note: newProgress.note,
      })
      setProgressModalVisible(false)
      setNewProgress({ value: 0, note: '' })
      loadTaskDetails(selectedTask.id)
      message.success('进度已记录')
    } catch (error) {
      message.error('记录失败')
    }
  }

  // 计算剩余天数
  const getDaysRemaining = (deadline: string) => {
    const today = dayjs().startOf('day')
    const deadlineDate = dayjs(deadline).startOf('day')
    return deadlineDate.diff(today, 'day')
  }

  const getProgressPercent = (task: Task) => {
    if (task.progress_type === 'percentage') {
      return Math.round((task.current_value / task.total_value) * 100)
    } else {
      if (task.subitem_count === 0) return 0
      return Math.round((task.completed_subitems / task.subitem_count) * 100)
    }
  }

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task)
    setDetailModalVisible(true)
    await loadTaskDetails(task.id)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* 头部 */}
      <Card size="small">
        <div className="flex items-center justify-between">
          <Title level={4} className="m-0">任务倒计时</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setTaskModalVisible(true)}>
            新建任务
          </Button>
        </div>
      </Card>

      {/* 任务列表 */}
      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map(task => {
            const daysRemaining = getDaysRemaining(task.deadline)
            const progressPercent = getProgressPercent(task)
            const isOverdue = daysRemaining < 0
            const isUrgent = daysRemaining <= 3 && daysRemaining >= 0

            return (
              <Card
                key={task.id}
                className={`cursor-pointer transition-all hover:shadow-md ${isOverdue ? 'border-red-300' : isUrgent ? 'border-orange-300' : ''}`}
                onClick={() => openTaskDetail(task)}
              >
                <div className="flex items-start gap-4">
                  {/* 优先级标识 */}
                  <div
                    className="w-1 h-16 rounded-full shrink-0"
                    style={{ backgroundColor: priorityColors[task.priority - 1] }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Text strong className="text-lg truncate">{task.title}</Text>
                      <Tag color={priorityColors[task.priority - 1]}>
                        {priorityLabels[task.priority - 1]}
                      </Tag>
                      {task.ai_generated === 1 && (
                        <Tag color="#722ed1">AI</Tag>
                      )}
                      {isOverdue && <Tag color="red">已逾期</Tag>}
                      {isUrgent && <Tag color="orange">即将到期</Tag>}
                    </div>

                    {task.description && (
                      <Text type="secondary" className="block mb-2 truncate">{task.description}</Text>
                    )}

                    <Progress
                      percent={progressPercent}
                      size="small"
                      status={progressPercent === 100 ? 'success' : 'active'}
                    />

                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>
                        <CalendarOutlined className="mr-1" />
                        截止: {dayjs(task.deadline).format('MM月DD日')}
                      </span>
                      <span className={isOverdue ? 'text-red-500 font-bold' : isUrgent ? 'text-orange-500 font-bold' : ''}>
                        <ClockCircleOutlined className="mr-1" />
                        {isOverdue ? `逾期 ${Math.abs(daysRemaining)} 天` : `剩余 ${daysRemaining} 天`}
                      </span>
                      {task.progress_type === 'subitems' && (
                        <span>
                          {task.completed_subitems}/{task.subitem_count} 子任务
                        </span>
                      )}
                    </div>
                  </div>

                  <Button type="text" icon={<RightOutlined />} />
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <Empty description="暂无任务，创建一个吧" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setTaskModalVisible(true)}>
              新建任务
            </Button>
          </Empty>
        </Card>
      )}

      {/* 新建任务弹窗 */}
      <Modal
        title="新建任务"
        open={taskModalVisible}
        onCancel={() => setTaskModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className="space-y-4">
          <div>
            <div className="text-gray-500 text-sm mb-2">任务标题 *</div>
            <Input
              placeholder="输入任务标题"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
          </div>

          <div>
            <div className="text-gray-500 text-sm mb-2">任务描述</div>
            <TextArea
              rows={3}
              placeholder="任务详情..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <div className="text-gray-500 text-sm mb-2">截止日期</div>
              <DatePicker
                style={{ width: '100%' }}
                value={dayjs(newTask.deadline)}
                onChange={(date) => setNewTask({ ...newTask, deadline: date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD') })}
              />
            </Col>
            <Col span={12}>
              <div className="text-gray-500 text-sm mb-2">优先级</div>
              <Select
                style={{ width: '100%' }}
                value={newTask.priority}
                onChange={(v) => setNewTask({ ...newTask, priority: v })}
                options={priorityLabels.map((label, idx) => ({
                  value: idx + 1,
                  label: (
                    <span>
                      <Badge color={priorityColors[idx]} /> {label}
                    </span>
                  ),
                }))}
              />
            </Col>
          </Row>

          <div>
            <div className="text-gray-500 text-sm mb-2">进度类型</div>
            <Select
              style={{ width: '100%' }}
              value={newTask.progress_type}
              onChange={(v) => setNewTask({ ...newTask, progress_type: v })}
              options={[
                { value: 'percentage', label: '百分比进度' },
                { value: 'subitems', label: '子任务列表' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setTaskModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={createTask}>创建</Button>
          </div>
        </div>
      </Modal>

      {/* 任务详情弹窗 */}
      <Modal
        title={selectedTask?.title}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedTask && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <Card size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="剩余天数"
                    value={getDaysRemaining(selectedTask.deadline)}
                    suffix="天"
                    valueStyle={{
                      color: getDaysRemaining(selectedTask.deadline) < 0 ? '#f5222d' :
                             getDaysRemaining(selectedTask.deadline) <= 3 ? '#fa8c16' : '#52c41a'
                    }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="完成进度"
                    value={getProgressPercent(selectedTask)}
                    suffix="%"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="优先级"
                    value={priorityLabels[selectedTask.priority - 1]}
                  />
                </Col>
              </Row>
            </Card>

            {/* 进度更新 */}
            <Card size="small" title="进度更新">
              {selectedTask.progress_type === 'percentage' ? (
                <div>
                  <Progress percent={getProgressPercent(selectedTask)} />
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedTask.current_value}
                      onChange={(e) => updateTaskProgress(parseInt(e.target.value) || 0)}
                      suffix="%"
                      style={{ width: 150 }}
                    />
                    <Button type="primary" onClick={() => setProgressModalVisible(true)}>
                      记录今日进度
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="添加子任务..."
                      value={newSubitemTitle}
                      onChange={(e) => setNewSubitemTitle(e.target.value)}
                      onPressEnter={addSubitem}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={addSubitem}>添加</Button>
                  </div>
                  <List
                    size="small"
                    dataSource={subitems}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteSubitem(item.id)} />,
                        ]}
                      >
                        <Checkbox
                          checked={item.completed === 1}
                          onChange={(e) => toggleSubitem(item.id, e.target.checked)}
                        >
                          <span className={item.completed ? 'line-through text-gray-400' : ''}>{item.title}</span>
                        </Checkbox>
                      </List.Item>
                    )}
                    locale={{ emptyText: '暂无子任务' }}
                  />
                </div>
              )}
            </Card>

            {/* 里程碑 */}
            <Card
              size="small"
              title={
                <span>
                  <TrophyOutlined className="mr-1" /> 里程碑
                </span>
              }
              extra={<Button type="link" size="small" onClick={() => setMilestoneModalVisible(true)}>添加</Button>}
            >
              <List
                size="small"
                dataSource={milestones}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteMilestone(item.id)} />,
                    ]}
                  >
                    <Checkbox
                      checked={item.completed === 1}
                      onChange={(e) => toggleMilestone(item.id, e.target.checked)}
                    >
                      <div>
                        <span className={item.completed ? 'line-through text-gray-400' : 'font-medium'}>{item.title}</span>
                        {item.target_date && (
                          <span className="text-gray-400 text-sm ml-2">
                            {dayjs(item.target_date).format('MM月DD日')}
                          </span>
                        )}
                      </div>
                    </Checkbox>
                  </List.Item>
                )}
                locale={{ emptyText: '暂无里程碑' }}
              />
            </Card>

            {/* 进度历史 */}
            {progressRecords.length > 0 && (
              <Card size="small" title="进度历史">
                <Table
                  size="small"
                  dataSource={progressRecords}
                  columns={[
                    { title: '日期', dataIndex: 'date', width: 100, render: (d: string) => dayjs(d).format('MM月DD日') },
                    { title: '进度', dataIndex: 'progress_value', width: 80, render: (v: number) => `${v}%` },
                    { title: '备注', dataIndex: 'note' },
                  ]}
                  pagination={false}
                  rowKey="id"
                />
              </Card>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-between">
              <Button danger icon={<DeleteOutlined />} onClick={() => deleteTask(selectedTask.id)}>
                删除任务
              </Button>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => completeTask(selectedTask.id)}>
                完成任务
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 添加里程碑弹窗 */}
      <Modal
        title="添加里程碑"
        open={milestoneModalVisible}
        onCancel={() => setMilestoneModalVisible(false)}
        footer={null}
      >
        <div className="space-y-4">
          <div>
            <div className="text-gray-500 text-sm mb-2">里程碑名称</div>
            <Input
              placeholder="里程碑名称"
              value={newMilestone.title}
              onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
            />
          </div>
          <div>
            <div className="text-gray-500 text-sm mb-2">描述</div>
            <TextArea
              rows={2}
              placeholder="描述..."
              value={newMilestone.description}
              onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
            />
          </div>
          <div>
            <div className="text-gray-500 text-sm mb-2">目标日期</div>
            <DatePicker
              style={{ width: '100%' }}
              value={newMilestone.target_date ? dayjs(newMilestone.target_date) : null}
              onChange={(date) => setNewMilestone({ ...newMilestone, target_date: date?.format('YYYY-MM-DD') || null })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setMilestoneModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={addMilestone}>添加</Button>
          </div>
        </div>
      </Modal>

      {/* 记录进度弹窗 */}
      <Modal
        title="记录今日进度"
        open={progressModalVisible}
        onCancel={() => setProgressModalVisible(false)}
        footer={null}
      >
        <div className="space-y-4">
          <div>
            <div className="text-gray-500 text-sm mb-2">当前完成度 (%)</div>
            <Input
              type="number"
              min={0}
              max={100}
              value={newProgress.value}
              onChange={(e) => setNewProgress({ ...newProgress, value: parseInt(e.target.value) || 0 })}
              suffix="%"
            />
          </div>
          <div>
            <div className="text-gray-500 text-sm mb-2">备注</div>
            <TextArea
              rows={2}
              placeholder="今天做了什么..."
              value={newProgress.note}
              onChange={(e) => setNewProgress({ ...newProgress, note: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setProgressModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={addProgressRecord}>保存</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TasksPage
