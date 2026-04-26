import React, { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Badge,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuestionStore, useSubjectStore } from '../../stores'
import { getRemainingTime, getReviewProgress } from '../../utils/ebbinghaus'
import type { Question, Tag } from '../../types'

const { Search } = Input
const { Option } = Select

const QuestionListPage: React.FC = () => {
  const navigate = useNavigate()
  const {
    questions,
    loading,
    fetchQuestions,
    deleteQuestion,
    searchQuestions,
    selectedSubject,
    setSelectedSubject,
  } = useQuestionStore()
  const { subjects, fetchSubjects, fetchChapters, chapters } = useSubjectStore()

  const [searchText, setSearchText] = useState('')
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)

  useEffect(() => {
    fetchQuestions()
    fetchSubjects()
  }, [fetchQuestions, fetchSubjects])

  useEffect(() => {
    if (selectedSubject) {
      fetchChapters(selectedSubject)
    }
  }, [fetchChapters, selectedSubject])

  const filteredQuestions = questions.filter((q) => {
    if (selectedSubject && q.subject_id !== selectedSubject) return false
    if (selectedChapter && q.chapter_id !== selectedChapter) return false
    return true
  })

  const handleDelete = async (id: number) => {
    try {
      await deleteQuestion(id)
      message.success('删除成功')
    } catch {
      message.error('删除失败')
    }
  }

  const handleSearch = (value: string) => {
    setSearchText(value)
    if (value) {
      searchQuestions(value)
    } else {
      fetchQuestions()
    }
  }

  const getDifficultyTag = (difficulty: number) => {
    const colors = ['#52c41a', '#73d13d', '#faad14', '#fa8c16', '#f5222d']
    const labels = ['简单', '较易', '中等', '较难', '困难']
    return (
      <Tag color={colors[difficulty - 1]} style={{ borderRadius: 4 }}>
        {labels[difficulty - 1] || '中等'}
      </Tag>
    )
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: Question) => (
        <a
          onClick={() => navigate(`/questions/${record.id}`)}
          className="text-gray-800 hover:text-blue-500"
        >
          {text}
        </a>
      ),
    },
    {
      title: '科目',
      dataIndex: 'subject_name',
      key: 'subject_name',
      width: 100,
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : <Tag>未分类</Tag>,
    },
    {
      title: '章节',
      dataIndex: 'chapter_name',
      key: 'chapter_name',
      width: 120,
      ellipsis: true,
      render: (text: string) => <span className="text-gray-500">{text || '-'}</span>,
    },
    {
      title: '标签',
      dataIndex: 'tagList',
      key: 'tags',
      width: 120,
      render: (tagList: Tag[]) =>
        tagList && tagList.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tagList.map((tag) => (
              <Tag
                key={tag.id}
                color={tag.color}
                style={{ borderRadius: 4, margin: 0 }}
              >
                {tag.name}
              </Tag>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      align: 'center' as const,
      render: (difficulty: number) => getDifficultyTag(difficulty),
    },
    {
      title: '掌握程度',
      dataIndex: 'mastery_level',
      key: 'mastery_level',
      width: 120,
      render: (level: number) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${getReviewProgress(level)}%`,
                background: level >= 7 ? '#52c41a' : level >= 4 ? '#faad14' : '#ff4d4f',
              }}
            />
          </div>
          <span className="text-xs text-gray-400 w-8">{level}/7</span>
        </div>
      ),
    },
    {
      title: '下次复习',
      dataIndex: 'next_review_date',
      key: 'next_review_date',
      width: 100,
      render: (date: string) => {
        const remaining = getRemainingTime(date)
        const isOverdue = date && new Date(date) < new Date()
        return (
          <Badge
            status={isOverdue ? 'error' : 'success'}
            text={<span className="text-gray-500 text-sm">{remaining}</span>}
          />
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      align: 'center' as const,
      render: (_value: unknown, record: Question) => (
        <Space size={0}>
          <Tooltip title="查看">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/questions/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/questions/${record.id}/edit`)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这道错题吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold m-0">错题管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/questions/add')}
        >
          添加错题
        </Button>
      </div>

      <Card size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Search
              placeholder="搜索错题..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              onChange={(e) => setSearchText(e.target.value)}
              value={searchText}
            />
          </Col>
          <Col span={5}>
            <Select
              placeholder="选择科目"
              allowClear
              style={{ width: '100%' }}
              value={selectedSubject}
              onChange={(value) => {
                setSelectedSubject(value)
                setSelectedChapter(null)
              }}
            >
              {subjects.map((s) => (
                <Option key={s.id} value={s.id}>
                  <Tag color={s.color} style={{ marginRight: 0 }}>{s.name}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          {selectedSubject && chapters.length > 0 && (
            <Col span={5}>
              <Select
                placeholder="选择章节"
                allowClear
                style={{ width: '100%' }}
                value={selectedChapter}
                onChange={setSelectedChapter}
              >
                {chapters.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Col>
          )}
          <Col span={selectedSubject && chapters.length > 0 ? 6 : 11} className="text-right">
            <span className="text-gray-400 text-sm">
              共 {filteredQuestions.length} 道错题
            </span>
          </Col>
        </Row>
      </Card>

      <Card size="small" className="overflow-hidden">
        <Table
          columns={columns}
          dataSource={filteredQuestions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          size="small"
        />
      </Card>
    </div>
  )
}

export default QuestionListPage
