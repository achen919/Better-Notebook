// src/components/Chat/PlanResultArea.tsx
import React, { useState } from 'react'
import {
  Card,
  Checkbox,
  Button,
  Space,
  Tag,
  Input,
  Typography,
  InputNumber,
  Switch,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import type { ParsedMilestone, SyncSettings } from '../../types/ai'

const { Text, Paragraph } = Typography

interface PlanResultAreaProps {
  milestones: ParsedMilestone[]
  topic: string
  onEditMilestone: (index: number, data: Partial<ParsedMilestone>) => void
  onAddMilestone: () => void
  onRemoveMilestone: (index: number) => void
  syncSettings: SyncSettings
  onSyncSettingsChange: (settings: SyncSettings) => void
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

const PlanResultArea: React.FC<PlanResultAreaProps> = ({
  milestones,
  topic,
  onEditMilestone,
  onAddMilestone,
  onRemoveMilestone,
  syncSettings,
  onSyncSettingsChange,
  onConfirm,
  onCancel,
  loading,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(milestones.map((_, i) => i))
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<ParsedMilestone>>({})

  const totalDays = milestones.reduce((sum, m) => sum + m.days, 0)

  const handleToggleSelect = (index: number) => {
    const newSet = new Set(selectedIndices)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedIndices(newSet)
  }

  const handleToggleAll = () => {
    if (selectedIndices.size === milestones.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(milestones.map((_, i) => i)))
    }
  }

  const handleConfirm = () => {
    if (selectedIndices.size === 0) {
      message.warning('请至少选择一个里程碑')
      return
    }
    onConfirm()
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>🎯 学习规划：{topic}</span>
          <Tag color="blue">总时长 {totalDays} 天</Tag>
          <Button size="small" onClick={handleToggleAll}>
            {selectedIndices.size === milestones.length ? '取消全选' : '全选'}
          </Button>
        </Space>
      }
      extra={
        <Space>
          <Button onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleConfirm}
            loading={loading}
            disabled={selectedIndices.size === 0}
          >
            确认创建
          </Button>
        </Space>
      }
      className="mt-4"
    >
      <div className="space-y-3 mb-4">
        {milestones.map((m, index) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg border ${
              selectedIndices.has(index)
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selectedIndices.has(index)}
                onChange={() => handleToggleSelect(index)}
              />
              <div className="flex-1">
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <Input
                      value={editForm.title || m.title}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="里程碑标题"
                    />
                    <Input.TextArea
                      value={editForm.description || m.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="描述"
                      rows={2}
                    />
                    <Space>
                      <InputNumber
                        value={editForm.days || m.days}
                        onChange={value => setEditForm({ ...editForm, days: value || 1 })}
                        min={1}
                        max={365}
                        addonBefore="天数"
                      />
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => {
                          onEditMilestone(index, editForm)
                          setEditingIndex(null)
                          setEditForm({})
                        }}
                      >
                        保存
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingIndex(null)
                          setEditForm({})
                        }}
                      >
                        取消
                      </Button>
                    </Space>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <Text strong>{m.title}</Text>
                      <Tag color="green">{m.days} 天</Tag>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setEditingIndex(index)}
                      />
                      <Popconfirm
                        title="确定删除此里程碑？"
                        onConfirm={() => onRemoveMilestone(index)}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </div>
                    <Paragraph className="text-sm text-gray-600 mb-1">
                      {m.description}
                    </Paragraph>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <CalendarOutlined />
                      <span>目标日期：{m.targetDate}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 添加里程碑按钮 */}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={onAddMilestone}
        className="mb-4"
        block
      >
        添加里程碑
      </Button>

      {/* 同步设置 */}
      <div className="p-3 bg-gray-50 rounded-lg space-y-3">
        <Text strong>⚙️ 同步设置</Text>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={syncSettings.createTask}
              onChange={checked => onSyncSettingsChange({ ...syncSettings, createTask: checked })}
            />
            <Text>创建任务倒计时</Text>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={syncSettings.createTodo}
              onChange={checked => onSyncSettingsChange({ ...syncSettings, createTodo: checked })}
            />
            <Text>创建每日计划</Text>
          </div>
        </div>
        {syncSettings.createTodo && (
          <div className="flex items-center gap-2">
            <Text>每日学习时长：</Text>
            <InputNumber
              value={syncSettings.dailyDuration}
              onChange={value => onSyncSettingsChange({ ...syncSettings, dailyDuration: value || 60 })}
              min={10}
              max={480}
              addonAfter="分钟"
            />
          </div>
        )}
      </div>
    </Card>
  )
}

export default PlanResultArea
