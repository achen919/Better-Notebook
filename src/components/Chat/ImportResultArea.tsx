// src/components/Chat/ImportResultArea.tsx
import React, { useState } from 'react'
import {
  Card,
  Checkbox,
  Select,
  Button,
  Space,
  Tag,
  Input,
  Typography,
  message,
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import type { ParsedQuestion } from '../../types/ai'
import type { Subject, Chapter } from '../../types'

const { Text, Paragraph } = Typography

interface ImportResultAreaProps {
  questions: ParsedQuestion[]
  subjects: Subject[]
  chapters: Chapter[]
  onEdit: (index: number, data: Partial<ParsedQuestion>) => void
  onCreateSubject: (name: string) => Promise<number>
  onConfirm: (selectedQuestions: ParsedQuestion[]) => void
  onCancel: () => void
  loading?: boolean
}

const ImportResultArea: React.FC<ImportResultAreaProps> = ({
  questions,
  subjects,
  chapters,
  onEdit,
  onCreateSubject,
  onConfirm,
  onCancel,
  loading,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(questions.map(q => q.id))
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<ParsedQuestion>>({})
  const [newSubjectName, setNewSubjectName] = useState('')
  const [creatingSubject, setCreatingSubject] = useState(false)

  const filteredChapters = (subjectId?: number) => {
    if (!subjectId) return []
    return chapters.filter(c => c.subject_id === subjectId)
  }

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleToggleAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)))
    }
  }

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return
    setCreatingSubject(true)
    try {
      await onCreateSubject(newSubjectName.trim())
      setNewSubjectName('')
      message.success('科目创建成功')
    } catch (error) {
      message.error('创建科目失败')
    } finally {
      setCreatingSubject(false)
    }
  }

  const handleConfirm = () => {
    const selected = questions.filter(q => selectedIds.has(q.id))
    if (selected.length === 0) {
      message.warning('请至少选择一条错题')
      return
    }
    onConfirm(selected)
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>识别到 {questions.length} 条错题</span>
          <Button size="small" onClick={handleToggleAll}>
            {selectedIds.size === questions.length ? '取消全选' : '全选'}
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
            disabled={selectedIds.size === 0}
          >
            确认录入选中项 ({selectedIds.size})
          </Button>
        </Space>
      }
      className="mt-4"
    >
      <div className="space-y-3">
        {questions.map((q, index) => (
          <div
            key={q.id}
            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selectedIds.has(q.id)}
                onChange={() => handleToggleSelect(q.id)}
              />
              <div className="flex-1">
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <Input
                      value={editForm.title || q.title}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="题目标题"
                    />
                    <Input.TextArea
                      value={editForm.content || q.content || ''}
                      onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                      placeholder="题目内容"
                      rows={2}
                    />
                    <Space>
                      <Button
                        size="small"
                        onClick={() => {
                          onEdit(index, editForm)
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
                      <Text strong className="text-sm">
                        {q.title}
                      </Text>
                      {q.subject && (
                        <Tag color="blue">{q.subject}</Tag>
                      )}
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setEditingIndex(index)}
                      />
                    </div>
                    {q.content && (
                      <Paragraph
                        ellipsis={{ rows: 2 }}
                        className="text-xs text-gray-500 mb-2"
                      >
                        {q.content}
                      </Paragraph>
                    )}
                  </>
                )}

                {/* 科目章节选择 */}
                <div className="flex items-center gap-2 mt-2">
                  <Select
                    style={{ width: 120 }}
                    placeholder="选择科目"
                    value={q.selectedSubjectId}
                    onChange={(value) => {
                      onEdit(index, { selectedSubjectId: value, selectedChapterId: undefined })
                    }}
                    options={subjects.map(s => ({ value: s.id, label: s.name }))}
                    allowClear
                    size="small"
                  />
                  <Select
                    style={{ width: 120 }}
                    placeholder="选择章节"
                    value={q.selectedChapterId}
                    onChange={(value) => onEdit(index, { selectedChapterId: value })}
                    options={filteredChapters(q.selectedSubjectId).map(c => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    allowClear
                    size="small"
                    disabled={!q.selectedSubjectId}
                  />
                </div>

                {/* 新科目提示 */}
                {q.isNewSubject && q.subject && !subjects.find(s => s.name === q.subject) && (
                  <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
                    <Text type="warning">
                      检测到新科目「{q.subject}」，是否创建？
                    </Text>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setNewSubjectName(q.subject || '')
                      }}
                    >
                      创建
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 创建新科目 */}
      {newSubjectName && (
        <div className="mt-3 p-2 bg-blue-50 rounded flex items-center gap-2">
          <Text>创建新科目：</Text>
          <Input
            style={{ width: 150 }}
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
            size="small"
          />
          <Button
            type="primary"
            size="small"
            loading={creatingSubject}
            onClick={handleCreateSubject}
          >
            创建
          </Button>
          <Button size="small" onClick={() => setNewSubjectName('')}>
            取消
          </Button>
        </div>
      )}

      {/* 快速创建科目入口 */}
      {!newSubjectName && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          className="mt-3"
          onClick={() => setNewSubjectName(' ')}
          size="small"
        >
          创建新科目
        </Button>
      )}
    </Card>
  )
}

export default ImportResultArea
