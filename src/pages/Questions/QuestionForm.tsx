import React, { useEffect, useState } from 'react'
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  message,
  Row,
  Col,
  Space,
  Alert,
} from 'antd'
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuestionStore, useSubjectStore } from '../../stores'
import AudioRecorder from '../../components/AudioRecorder'

const { TextArea } = Input
const { Option } = Select

interface QuestionFormProps {
  mode: 'add' | 'edit'
}

const QuestionForm: React.FC<QuestionFormProps> = ({ mode }) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { createQuestion, updateQuestion, fetchQuestionById, currentQuestion } = useQuestionStore()
  const { subjects, fetchSubjects, fetchChapters, chapters, tags, fetchTags } = useSubjectStore()
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [savedQuestionId, setSavedQuestionId] = useState<number | null>(null)

  const questionId = mode === 'edit' && id ? Number(id) : savedQuestionId

  useEffect(() => {
    fetchSubjects()
    fetchTags()
    if (mode === 'edit' && id) {
      fetchQuestionById(Number(id))
      setSavedQuestionId(Number(id))
    }
  }, [mode, id])

  useEffect(() => {
    if (currentQuestion && mode === 'edit') {
      form.setFieldsValue({
        title: currentQuestion.title,
        content: currentQuestion.content,
        answer: currentQuestion.answer,
        analysis: currentQuestion.analysis,
        source: currentQuestion.source,
        subject_id: currentQuestion.subject_id,
        chapter_id: currentQuestion.chapter_id,
        difficulty: currentQuestion.difficulty,
        tags: currentQuestion.tagList?.map((t: any) => t.id) || [],
      })
      if (currentQuestion.subject_id) {
        setSelectedSubjectId(currentQuestion.subject_id)
        fetchChapters(currentQuestion.subject_id)
      }
    }
  }, [currentQuestion, mode, form])

  useEffect(() => {
    if (selectedSubjectId) {
      fetchChapters(selectedSubjectId)
    }
  }, [selectedSubjectId])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      if (mode === 'add') {
        const newId = await createQuestion(values)
        setSavedQuestionId(newId)
        message.success('添加成功，您可以继续添加录音或返回列表')
      } else if (id) {
        await updateQuestion(Number(id), values)
        message.success('更新成功')
      }
    } catch {
      message.error(mode === 'add' ? '添加失败' : '更新失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/questions')}>
          返回
        </Button>
        <h1 className="text-lg font-bold m-0">
          {mode === 'add' ? '添加错题' : '编辑错题'}
        </h1>
      </div>

      {/* 添加模式提示 */}
      {mode === 'add' && !savedQuestionId && (
        <Alert
          message="提示"
          description="请先保存题目基本信息，之后可以添加录音"
          type="info"
          showIcon
        />
      )}

      <Card size="small">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            difficulty: 3,
            tags: [],
          }}
        >
          <Form.Item
            name="title"
            label="题目标题"
            rules={[{ required: true, message: '请输入题目标题' }]}
          >
            <Input placeholder="请输入题目标题" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="subject_id" label="科目">
                <Select
                  placeholder="选择科目"
                  allowClear
                  onChange={(value) => {
                    setSelectedSubjectId(value)
                    form.setFieldValue('chapter_id', undefined)
                  }}
                >
                  {subjects.map((s) => (
                    <Option key={s.id} value={s.id}>
                      {s.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="chapter_id" label="章节">
                <Select placeholder="选择章节" allowClear disabled={!selectedSubjectId}>
                  {chapters.map((c) => (
                    <Option key={c.id} value={c.id}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="difficulty" label="难度">
                <Select>
                  <Option value={1}>简单</Option>
                  <Option value={2}>较易</Option>
                  <Option value={3}>中等</Option>
                  <Option value={4}>较难</Option>
                  <Option value={5}>困难</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tags" label="标签">
                <Select mode="multiple" placeholder="选择标签" allowClear>
                  {tags.map((t) => (
                    <Option key={t.id} value={t.id}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: t.color,
                          marginRight: 8,
                        }}
                      />
                      {t.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source" label="来源">
                <Input placeholder="如：2024年高考数学第一题" />
              </Form.Item>
            </Col>
          </Row>

          {/* 题目内容 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-600 text-sm">题目</label>
              {questionId && <AudioRecorder questionId={questionId} type="explanation" />}
            </div>
            <Form.Item name="content" className="mb-0">
              <TextArea
                rows={4}
                placeholder="请输入题目内容..."
                showCount
                maxLength={2000}
              />
            </Form.Item>
          </div>

          {/* 答案 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-600 text-sm">答案</label>
              {questionId && <AudioRecorder questionId={questionId} type="answer" />}
            </div>
            <Form.Item name="answer" className="mb-0">
              <TextArea
                rows={3}
                placeholder="请输入答案..."
                showCount
                maxLength={2000}
              />
            </Form.Item>
          </div>

          {/* 解析 */}
          <div className="mb-4">
            <label className="text-gray-600 text-sm mb-2 block">解析</label>
            <Form.Item name="analysis" className="mb-0">
              <TextArea
                rows={4}
                placeholder="请输入题目解析..."
                showCount
                maxLength={2000}
              />
            </Form.Item>
          </div>

          <Form.Item className="mb-0 pt-4 border-t">
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                保存
              </Button>
              <Button onClick={() => navigate('/questions')}>返回列表</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default QuestionForm
