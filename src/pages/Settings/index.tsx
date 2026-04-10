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
  Divider,
  Typography,
  Progress,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BellOutlined,
  BookOutlined,
  FolderOutlined,
  TagsOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useSubjectStore } from '../../stores'
import type { Subject, Tag as TagType, Chapter } from '../../types'

const { Panel } = Collapse
const { Text } = Typography
const { TextArea } = Input

// AI提供商配置
const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1' },
  { value: 'zhipu', label: '智谱AI (GLM)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { value: 'minimax', label: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1' },
  { value: 'bytedance', label: '字节跳动 (豆包)', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
  { value: 'aliyun', label: '阿里云 (通义千问)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { value: 'tencent', label: '腾讯云 (混元)', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1' },
  { value: 'moonshot', label: 'Moonshot (Kimi)', baseUrl: 'https://api.moonshot.cn/v1' },
  { value: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { value: 'baidu', label: '百度 (文心一言)', baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat' },
  { value: 'xunfei', label: '讯飞 (星火)', baseUrl: 'https://spark-api-open.xf-yun.com/v1' },
  { value: 'custom', label: '自定义', baseUrl: '' },
]

// 所有支持的模型
const ALL_MODELS = [
  // OpenAI
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI' },
  { value: 'gpt-4', label: 'GPT-4', provider: 'OpenAI' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  // Anthropic
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', provider: 'Anthropic' },
  { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', provider: 'Anthropic' },
  // 智谱AI
  { value: 'glm-4-plus', label: 'GLM-4 Plus', provider: '智谱AI' },
  { value: 'glm-4-0520', label: 'GLM-4', provider: '智谱AI' },
  { value: 'glm-4-air', label: 'GLM-4 Air', provider: '智谱AI' },
  { value: 'glm-4-flash', label: 'GLM-4 Flash', provider: '智谱AI' },
  { value: 'glm-3-turbo', label: 'GLM-3 Turbo', provider: '智谱AI' },
  // MiniMax
  { value: 'abab6.5-chat', label: 'ABAB 6.5 Chat', provider: 'MiniMax' },
  { value: 'abab6.5s-chat', label: 'ABAB 6.5s Chat', provider: 'MiniMax' },
  { value: 'abab5.5-chat', label: 'ABAB 5.5 Chat', provider: 'MiniMax' },
  // 字节跳动
  { value: 'doubao-pro-32k', label: 'Doubao Pro 32K', provider: '字节跳动' },
  { value: 'doubao-pro-128k', label: 'Doubao Pro 128K', provider: '字节跳动' },
  { value: 'doubao-lite-32k', label: 'Doubao Lite 32K', provider: '字节跳动' },
  // 阿里云
  { value: 'qwen-max', label: 'Qwen Max', provider: '阿里云' },
  { value: 'qwen-plus', label: 'Qwen Plus', provider: '阿里云' },
  { value: 'qwen-turbo', label: 'Qwen Turbo', provider: '阿里云' },
  { value: 'qwen-long', label: 'Qwen Long', provider: '阿里云' },
  // 腾讯
  { value: 'hunyuan-lite', label: '混元 Lite', provider: '腾讯云' },
  { value: 'hunyuan-standard', label: '混元 Standard', provider: '腾讯云' },
  { value: 'hunyuan-pro', label: '混元 Pro', provider: '腾讯云' },
  // Moonshot
  { value: 'moonshot-v1-8k', label: 'Moonshot V1 8K', provider: 'Moonshot' },
  { value: 'moonshot-v1-32k', label: 'Moonshot V1 32K', provider: 'Moonshot' },
  { value: 'moonshot-v1-128k', label: 'Moonshot V1 128K', provider: 'Moonshot' },
  // DeepSeek
  { value: 'deepseek-chat', label: 'DeepSeek Chat', provider: 'DeepSeek' },
  { value: 'deepseek-coder', label: 'DeepSeek Coder', provider: 'DeepSeek' },
  // 百度
  { value: 'ernie-4.0-8k', label: 'ERNIE 4.0', provider: '百度' },
  { value: 'ernie-3.5-8k', label: 'ERNIE 3.5', provider: '百度' },
  // 讯飞
  { value: 'generalv3.5', label: 'Spark V3.5', provider: '讯飞' },
  { value: 'generalv3', label: 'Spark V3', provider: '讯飞' },
]

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
  const [aiForm] = Form.useForm()

  // AI设置
  const [aiSettings, setAiSettings] = useState<any>(null)
  const [aiSaving, setAiSaving] = useState(false)

  // 自动更新
  const [appVersion, setAppVersion] = useState('')
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)

  useEffect(() => {
    fetchSubjects()
    fetchTags()
    loadAISettings()
    loadAppVersion()
    setupUpdateListeners()
  }, [])

  useEffect(() => {
    if (selectedSubjectId) {
      fetchChapters(selectedSubjectId)
    }
  }, [selectedSubjectId])

  // ==================== 自动更新相关 ====================
  const loadAppVersion = async () => {
    try {
      const version = await window.electronAPI.updater.getAppVersion()
      setAppVersion(version)
    } catch (error) {
      console.error('Failed to get app version:', error)
    }
  }

  const setupUpdateListeners = () => {
    window.electronAPI.updater.onUpdateAvailable((info) => {
      setUpdateInfo(info)
      setCheckingUpdate(false)
    })

    window.electronAPI.updater.onUpdateNotAvailable(() => {
      setCheckingUpdate(false)
    })

    window.electronAPI.updater.onDownloadProgress((progress) => {
      setDownloadProgress(Math.round(progress.percent))
    })

    window.electronAPI.updater.onUpdateDownloaded(() => {
      setDownloading(false)
      setUpdateDownloaded(true)
    })

    window.electronAPI.updater.onUpdateError((error) => {
      console.error('Update error:', error)
      setCheckingUpdate(false)
      setDownloading(false)
    })
  }

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    setUpdateInfo(null)
    setUpdateDownloaded(false)
    try {
      const result = await window.electronAPI.updater.checkForUpdates()
      if (!result.available && !result.message) {
        message.info('当前已是最新版本')
      }
    } catch (error) {
      message.error('检查更新失败')
    } finally {
      setCheckingUpdate(false)
    }
  }

  const handleDownloadUpdate = async () => {
    setDownloading(true)
    setDownloadProgress(0)
    try {
      await window.electronAPI.updater.downloadUpdate()
    } catch (error) {
      message.error('下载更新失败')
      setDownloading(false)
    }
  }

  const handleInstallUpdate = () => {
    Modal.confirm({
      title: '安装更新',
      content: '应用将关闭并安装更新，确定继续吗？',
      onOk: () => {
        window.electronAPI.updater.installUpdate()
      },
    })
  }

  // ==================== AI设置相关 ====================
  const loadAISettings = async () => {
    try {
      const settings = await window.electronAPI.db.aiSettings.get()
      setAiSettings(settings)
      if (settings) {
        aiForm.setFieldsValue({
          provider: settings.provider || 'openai',
          api_key: settings.api_key || '',
          api_base_url: settings.api_base_url || '',
          model: settings.model || 'gpt-3.5-turbo',
        })
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error)
    }
  }

  const handleAISubmit = async (values: any) => {
    setAiSaving(true)
    try {
      await window.electronAPI.db.aiSettings.save(values)
      message.success('AI设置已保存')
      loadAISettings()
    } catch (error) {
      message.error('保存失败')
    } finally {
      setAiSaving(false)
    }
  }

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

      {/* 关于与更新 */}
      <Card
        size="small"
        title={
          <span className="flex items-center gap-2">
            <SyncOutlined /> 关于与更新
          </span>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Text strong>当前版本</Text>
              <Text type="secondary" className="ml-2">v{appVersion || '...'}</Text>
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleCheckUpdate}
              loading={checkingUpdate}
            >
              检查更新
            </Button>
          </div>

          {updateInfo && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Text strong className="text-blue-600">发现新版本 v{updateInfo.version}</Text>
              </div>
              {updateInfo.releaseNotes && (
                <Paragraph className="text-sm text-gray-600 mb-2">
                  {typeof updateInfo.releaseNotes === 'string'
                    ? updateInfo.releaseNotes
                    : updateInfo.releaseNotes.note}
                </Paragraph>
              )}
              {!updateDownloaded && !downloading && (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadUpdate}
                >
                  下载更新
                </Button>
              )}
            </div>
          )}

          {downloading && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <Text>正在下载更新...</Text>
              <Progress percent={downloadProgress} size="small" className="mt-2" />
            </div>
          )}

          {updateDownloaded && (
            <div className="bg-green-50 p-3 rounded-lg">
              <Text className="text-green-600">更新已下载完成</Text>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleInstallUpdate}
                className="ml-3"
              >
                立即安装
              </Button>
            </div>
          )}
        </div>
      </Card>

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

      {/* AI助手设置 */}
      <Card
        size="small"
        title={
          <span className="flex items-center gap-2">
            <RobotOutlined /> AI助手设置
          </span>
        }
      >
        <Form form={aiForm} layout="vertical" onFinish={handleAISubmit}>
          <Form.Item name="provider" label="AI提供商" initialValue="openai">
            <Select
              onChange={(value) => {
                const config = AI_PROVIDERS.find(p => p.value === value)
                if (config) {
                  aiForm.setFieldsValue({
                    api_base_url: config.baseUrl,
                  })
                }
              }}
            >
              {AI_PROVIDERS.map(p => (
                <Select.Option key={p.value} value={p.value}>{p.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="model" label="模型">
            <Select
              showSearch
              optionFilterProp="children"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div className="px-2 pb-1">
                    <Text type="secondary" className="text-xs">或直接输入自定义模型名称</Text>
                  </div>
                </>
              )}
            >
              {ALL_MODELS.map(m => (
                <Select.Option key={m.value} value={m.value}>
                  <span>
                    {m.label}
                    {m.provider && <Text type="secondary" className="text-xs ml-2">({m.provider})</Text>}
                  </span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="api_key"
            label="API Key"
            rules={[{ required: true, message: '请输入API Key' }]}
          >
            <Input.Password placeholder="输入你的API Key" />
          </Form.Item>
          <Form.Item
            name="api_base_url"
            label="API Base URL"
            extra={<Text type="secondary" className="text-xs">选择提供商后自动填充，也可自定义修改</Text>}
          >
            <Input placeholder="https://api.openai.com/v1" />
          </Form.Item>
          <Form.Item
            name="system_prompt"
            label="System Prompt（系统提示词）"
            extra={<Text type="secondary" className="text-xs">自定义AI的行为和角色，留空使用默认提示词</Text>}
          >
            <TextArea
              rows={4}
              placeholder="你是一个学习助手，帮助学生解答问题..."
              showCount
              maxLength={2000}
            />
          </Form.Item>
          <div className="flex items-center justify-between">
            <div className="text-gray-500 text-sm">
              {aiSettings?.api_key ? (
                <span className="text-green-500">
                  <CheckCircleOutlined className="mr-1" /> 已配置 ({aiSettings.provider || 'openai'})
                </span>
              ) : (
                <Text type="secondary">未配置API Key</Text>
              )}
            </div>
            <Button type="primary" htmlType="submit" loading={aiSaving}>
              保存设置
            </Button>
          </div>
        </Form>
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
