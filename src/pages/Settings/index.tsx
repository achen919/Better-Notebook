import React, { useEffect, useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  List,
  Tag,
  Modal,
  ColorPicker,
  message,
  Switch,
  Select,
  Collapse,
  Empty,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BellOutlined,
  BookOutlined,
  FolderOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import { useSubjectStore } from '../../stores'
import type { Subject, Tag as TagType, Chapter } from '../../types'

const { Panel } = Collapse

const SettingsPage: React.FC = () => {
  const {
    subjects,
    tags,
    chapters,
    fetchSubjects,
    fetchTags,
    fetchChapters,
    createSubject,
    updateSubject,
    deleteSubject,
    createChapter,
    updateChapter,
    deleteChapter,
    createTag,
    updateTag,
    deleteTag,
  } = useSubjectStore()

  const [subjectModalVisible, setSubjectModalVisible] = useState(false)
  const [chapterModalVisible, setChapterModalVisible] = useState(false)
  const [tagModalVisible, setTagModalVisible] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [editingTag, setEditingTag] = useState<TagType | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [subjectForm] = Form.useForm()
  const [chapterForm] = Form.useForm()
  const [tagForm] = Form.useForm()

  useEffect(() => {
    fetchSubjects()
    fetchTags()
  }, [])

  useEffect(() => {
    if (selectedSubjectId) {
      fetchChapters(selectedSubjectId)
    }
  }, [selectedSubjectId])

  // ==================== 科目相关操作 ====================
  const handleAddSubject = () => {
    setEditingSubject(null)
    subjectForm.resetFields()
    setSubjectModalVisible(true)
  }

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject)
    subjectForm.setFieldsValue({
      name: subject.name,
      color: subject.color,
    })
    setSubjectModalVisible(true)
  }

  const handleDeleteSubject = async (id: number) => {
    try {
      await deleteSubject(id)
      message.success('删除成功')
    } catch {
      message.error('删除失败')
    }
  }

  const handleSubjectSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        color: typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#1890ff',
      }
      if (editingSubject) {
        await updateSubject(editingSubject.id, data)
        message.success('更新成功')
      } else {
        await createSubject(data)
        message.success('添加成功')
      }
      setSubjectModalVisible(false)
      subjectForm.resetFields()
    } catch {
      message.error('操作失败')
    }
  }

  // ==================== 章节相关操作 ====================
  const handleAddChapter = (subjectId: number) => {
    setSelectedSubjectId(subjectId)
    setEditingChapter(null)
    chapterForm.resetFields()
    chapterForm.setFieldsValue({ subject_id: subjectId })
    setChapterModalVisible(true)
  }

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter)
    chapterForm.setFieldsValue({
      subject_id: chapter.subject_id,
      name: chapter.name,
    })
    setChapterModalVisible(true)
  }

  const handleDeleteChapter = async (id: number) => {
    try {
      await deleteChapter(id)
      message.success('删除成功')
    } catch {
      message.error('删除失败')
    }
  }

  const handleChapterSubmit = async (values: any) => {
    try {
      if (editingChapter) {
        await updateChapter(editingChapter.id, values)
        message.success('更新成功')
      } else {
        await createChapter(values)
        message.success('添加成功')
      }
      setChapterModalVisible(false)
      chapterForm.resetFields()
      if (values.subject_id) {
        fetchChapters(values.subject_id)
      }
    } catch {
      message.error('操作失败')
    }
  }

  // ==================== 标签相关操作 ====================
  const handleAddTag = () => {
    setEditingTag(null)
    tagForm.resetFields()
    setTagModalVisible(true)
  }

  const handleEditTag = (tag: TagType) => {
    setEditingTag(tag)
    tagForm.setFieldsValue({
      name: tag.name,
      color: tag.color,
    })
    setTagModalVisible(true)
  }

  const handleDeleteTag = async (id: number) => {
    try {
      await deleteTag(id)
      message.success('删除成功')
    } catch {
      message.error('删除失败')
    }
  }

  const handleTagSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        color: typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#52c41a',
      }
      if (editingTag) {
        await updateTag(editingTag.id, data)
        message.success('更新成功')
      } else {
        await createTag(data)
        message.success('添加成功')
      }
      setTagModalVisible(false)
      tagForm.resetFields()
    } catch {
      message.error('操作失败')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold m-0">设置</h1>

      {/* 通知设置 */}
      <Card
        size="small"
        title={
          <span className="flex items-center gap-2">
            <BellOutlined /> 通知设置
          </span>
        }
      >
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <span className="text-gray-600">启用复习提醒</span>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-600">提醒时间</span>
            <Select defaultValue="09:00" style={{ width: 100 }} size="small">
              <Select.Option value="08:00">08:00</Select.Option>
              <Select.Option value="09:00">09:00</Select.Option>
              <Select.Option value="10:00">10:00</Select.Option>
              <Select.Option value="20:00">20:00</Select.Option>
              <Select.Option value="21:00">21:00</Select.Option>
            </Select>
          </div>
        </div>
      </Card>

      {/* 科目与章节管理 */}
      <Card
        size="small"
        title={
          <span className="flex items-center gap-2">
            <BookOutlined /> 科目与章节管理
          </span>
        }
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddSubject}>
            添加科目
          </Button>
        }
      >
        {subjects.length > 0 ? (
          <Collapse accordion bordered={false} onChange={(key) => {
            if (key) {
              setSelectedSubjectId(Number(key))
              fetchChapters(Number(key))
            }
          }}>
            {subjects.map((subject) => (
              <Panel
                key={subject.id}
                header={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag color={subject.color} className="mr-2">
                        {subject.name.substring(0, 2)}
                      </Tag>
                      <span>{subject.name}</span>
                      <span className="text-gray-400 text-xs ml-2">
                        {subject.question_count || 0} 道错题
                      </span>
                    </div>
                  </div>
                }
                extra={
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddChapter(subject.id)
                      }}
                      title="添加章节"
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditSubject(subject)
                      }}
                    />
                    <Popconfirm
                      title="确定删除此科目？"
                      onConfirm={() => handleDeleteSubject(subject.id)}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Space>
                }
              >
                <List
                  size="small"
                  dataSource={chapters.filter(c => c.subject_id === subject.id)}
                  locale={{ emptyText: <Empty description="暂无章节" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  renderItem={(chapter) => (
                    <List.Item
                      actions={[
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEditChapter(chapter)}
                        />,
                        <Popconfirm
                          title="确定删除此章节？"
                          onConfirm={() => handleDeleteChapter(chapter.id)}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>,
                      ]}
                    >
                      <div className="flex items-center gap-2">
                        <FolderOutlined className="text-gray-400" />
                        <span>{chapter.name}</span>
                        <span className="text-gray-400 text-xs">
                          ({chapter.question_count || 0} 道错题)
                        </span>
                      </div>
                    </List.Item>
                  )}
                />
              </Panel>
            ))}
          </Collapse>
        ) : (
          <Empty description="暂无科目，点击右上角添加" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {/* 标签管理 */}
      <Card
        size="small"
        title={
          <span className="flex items-center gap-2">
            <TagsOutlined /> 标签管理
          </span>
        }
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddTag}>
            添加标签
          </Button>
        }
      >
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Tag
                key={tag.id}
                color={tag.color}
                style={{ padding: '4px 8px', cursor: 'default' }}
              >
                {tag.name}
                <span className="text-xs opacity-70 ml-1">({tag.usage_count || 0})</span>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEditTag(tag)}
                  style={{ marginLeft: 4, padding: '0 2px', fontSize: 10 }}
                />
                <Popconfirm
                  title="确定删除此标签？"
                  onConfirm={() => handleDeleteTag(tag.id)}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ padding: '0 2px', fontSize: 10 }}
                  />
                </Popconfirm>
              </Tag>
            ))}
          </div>
        ) : (
          <Empty description="暂无标签" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {/* 科目编辑弹窗 */}
      <Modal
        title={editingSubject ? '编辑科目' : '添加科目'}
        open={subjectModalVisible}
        onCancel={() => setSubjectModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form form={subjectForm} layout="vertical" onFinish={handleSubjectSubmit}>
          <Form.Item
            name="name"
            label="科目名称"
            rules={[{ required: true, message: '请输入科目名称' }]}
          >
            <Input placeholder="请输入科目名称" />
          </Form.Item>
          <Form.Item name="color" label="颜色" initialValue="#1890ff">
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setSubjectModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 章节编辑弹窗 */}
      <Modal
        title={editingChapter ? '编辑章节' : '添加章节'}
        open={chapterModalVisible}
        onCancel={() => setChapterModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form form={chapterForm} layout="vertical" onFinish={handleChapterSubmit}>
          <Form.Item name="subject_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="章节名称"
            rules={[{ required: true, message: '请输入章节名称' }]}
          >
            <Input placeholder="请输入章节名称" />
          </Form.Item>
          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setChapterModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 标签编辑弹窗 */}
      <Modal
        title={editingTag ? '编辑标签' : '添加标签'}
        open={tagModalVisible}
        onCancel={() => setTagModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form form={tagForm} layout="vertical" onFinish={handleTagSubmit}>
          <Form.Item
            name="name"
            label="标签名称"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="请输入标签名称" />
          </Form.Item>
          <Form.Item name="color" label="颜色" initialValue="#52c41a">
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setTagModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SettingsPage
