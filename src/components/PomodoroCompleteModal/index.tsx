import React, { useState, useEffect } from 'react'
import { Modal, Select, Input, Button, Space } from 'antd'
import type { Subject } from '@/types'

const { TextArea } = Input

interface PomodoroCompleteModalProps {
  visible: boolean
  duration: number // Duration in minutes
  defaultSubjectId: number | null
  defaultGoal: string
  subjects: Subject[]
  onSave: (subjectId: number | null, goal: string) => void
  onDiscard: () => void
}

/**
 * Format duration in minutes to human-readable string
 * @param minutes Duration in minutes
 * @returns Formatted string like "25分钟" or "1小时30分钟"
 */
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
  }
  return `${mins}分钟`
}

const PomodoroCompleteModal: React.FC<PomodoroCompleteModalProps> = ({
  visible,
  duration,
  defaultSubjectId,
  defaultGoal,
  subjects,
  onSave,
  onDiscard,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(defaultSubjectId)
  const [goal, setGoal] = useState(defaultGoal)

  // Reset form when modal opens with new props
  useEffect(() => {
    if (visible) {
      setSelectedSubjectId(defaultSubjectId)
      setGoal(defaultGoal)
    }
  }, [visible, defaultSubjectId, defaultGoal])

  const handleSave = () => {
    onSave(selectedSubjectId, goal)
  }

  const subjectOptions = [
    { value: null, label: '无关联科目' },
    ...subjects.map((subject) => ({
      value: subject.id,
      label: (
        <Space>
          {subject.color && (
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: subject.color,
              }}
            />
          )}
          {subject.name}
        </Space>
      ),
    })),
  ]

  return (
    <Modal
      title={
        <span style={{ fontSize: 18 }}>
          <span style={{ marginRight: 8 }}>⏱</span>
          专注完成！
        </span>
      }
      open={visible}
      onCancel={onDiscard}
      footer={null}
      width={420}
      centered
      maskClosable={false}
    >
      <div style={{ padding: '16px 0' }}>
        {/* Duration display */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: 24,
            color: '#1890ff',
          }}
        >
          本次专注：{formatDuration(duration)}
        </div>

        {/* Subject selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#666' }}>关联科目：</label>
          <Select
            style={{ width: '100%' }}
            value={selectedSubjectId}
            onChange={setSelectedSubjectId}
            options={subjectOptions}
            placeholder="选择关联科目"
            allowClear
          />
        </div>

        {/* Goal/Note input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#666' }}>专注目标/备注：</label>
          <TextArea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="记录本次专注的内容或目标..."
            rows={3}
            maxLength={200}
            showCount
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <Button onClick={onDiscard}>放弃</Button>
          <Button type="primary" onClick={handleSave}>
            保存记录
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default PomodoroCompleteModal
