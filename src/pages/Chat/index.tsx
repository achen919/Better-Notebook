import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Input,
  Button,
  Typography,
  Empty,
  Space,
  Tag,
  Select,
  Modal,
  message,
  Spin,
  Avatar,
  Tooltip,
} from 'antd'
import {
  SendOutlined,
  SaveOutlined,
  BulbOutlined,
  RobotOutlined,
  UserOutlined,
  SettingOutlined,
  ClearOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text, Paragraph } = Typography

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  subject_id?: number
  subject_name?: string
  created_at: string
}

interface AISettings {
  provider: string
  api_key: string
  api_base_url: string
  model: string
  system_prompt?: string
}

interface WeakPoint {
  id: number
  topic: string
  description: string
  severity: number
  subject_name?: string
}

const ChatPage: React.FC = () => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>()
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([])
  const [saveModalVisible, setSaveModalVisible] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null)
  const [newQuestionTitle, setNewQuestionTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadData = async () => {
    try {
      const [settings, history, subjectList, weakPointsList] = await Promise.all([
        window.electronAPI.db.aiSettings.get(),
        window.electronAPI.db.chatHistory.getAll(100),
        window.electronAPI.db.subjects.getAll(),
        window.electronAPI.db.weakPoints.getAll(),
      ])
      setAiSettings(settings)
      setMessages(history.reverse())
      setSubjects(subjectList)
      setWeakPoints(weakPointsList)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return

    if (!aiSettings?.api_key) {
      message.warning('请先在设置中配置AI API')
      return
    }

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setLoading(true)

    // 添加用户消息
    const userId = await window.electronAPI.db.chatHistory.add({
      role: 'user',
      content: userMessage,
      subject_id: selectedSubject,
    })

    const newUserMsg: ChatMessage = {
      id: userId,
      role: 'user',
      content: userMessage,
      subject_id: selectedSubject,
      subject_name: subjects.find(s => s.id === selectedSubject)?.name,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, newUserMsg])

    try {
      // 调用AI API
      const response = await callAI(userMessage, aiSettings)

      // 添加AI回复
      const assistantId = await window.electronAPI.db.chatHistory.add({
        role: 'assistant',
        content: response,
        subject_id: selectedSubject,
      })

      const newAIMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: response,
        subject_id: selectedSubject,
        subject_name: subjects.find(s => s.id === selectedSubject)?.name,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, newAIMsg])

      // 分析弱势点
      await analyzeWeakPoints(userMessage, response)
    } catch (error: any) {
      const errorMsg = error.message || '未知错误'
      message.error(`AI调用失败: ${errorMsg}`, 5)
      console.error('AI call failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const callAI = async (message: string, settings: AISettings): Promise<string> => {
    let baseUrl = settings.api_base_url || 'https://api.openai.com/v1'

    // 确保URL格式正确
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl
    }
    // 移除末尾的斜杠
    baseUrl = baseUrl.replace(/\/+$/, '')

    // 构建系统提示（使用自定义或默认）
    const defaultSystemPrompt = `你是一个学习助手，帮助学生解答问题、理解概念、分析错误原因。
请用中文回答，回答要清晰、有条理。
如果学生问的是具体题目，请给出详细的解题思路和步骤。
如果学生问的是概念问题，请用通俗易懂的方式解释。`

    const baseSystemPrompt = settings.system_prompt?.trim() || defaultSystemPrompt

    // 获取相关错题作为上下文
    const questions = await window.electronAPI.db.questions.getAll()
    const recentQuestions = questions.slice(0, 10).map((q: any) => ({
      title: q.title,
      subject: q.subject_name,
    }))

    const contextInfo = recentQuestions.length > 0
      ? `\n\n学生最近整理的错题（可作为参考）：\n${recentQuestions.map((q: any) => `- [${q.subject || '未分类'}] ${q.title}`).join('\n')}`
      : ''

    const weakPointsInfo = weakPoints.length > 0
      ? `\n\n学生已识别的弱势点：\n${weakPoints.map(wp => `- ${wp.topic}: ${wp.description || '无描述'}`).join('\n')}`
      : ''

    const systemPrompt = baseSystemPrompt + contextInfo + weakPointsInfo

    // 检测 API 格式（OpenAI 兼容 vs Anthropic 兼容）
    const isAnthropic = baseUrl.includes('/anthropic') || baseUrl.includes('anthropic')

    let apiUrl: string
    let requestBody: any

    if (isAnthropic) {
      // Anthropic 格式
      apiUrl = `${baseUrl}/v1/messages`
      requestBody = {
        model: settings.model || 'claude-3-haiku-20240307',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          ...messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
          { role: 'user', content: message },
        ],
      }
    } else {
      // OpenAI 兼容格式
      apiUrl = `${baseUrl}/chat/completions`
      requestBody = {
        model: settings.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }
    }

    console.log('AI Request:', {
      url: apiUrl,
      model: requestBody.model,
      format: isAnthropic ? 'Anthropic' : 'OpenAI',
    })

    try {
      const data = await window.electronAPI.ai.call({
        url: apiUrl,
        apiKey: settings.api_key,
        body: requestBody,
      })

      console.log('AI Response:', JSON.stringify(data, null, 2))

      // 处理不同的响应格式
      // 1. OpenAI 格式: choices[0].message.content
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content
      }
      // 2. OpenAI 格式 (text): choices[0].text
      if (data.choices?.[0]?.text) {
        return data.choices[0].text
      }
      // 3. Anthropic/MiniMax 格式: content 数组
      if (Array.isArray(data.content)) {
        // 找到 type === 'text' 的元素
        const textBlock = data.content.find((block: any) => block.type === 'text')
        if (textBlock?.text) {
          return textBlock.text
        }
        // 或者直接取第一个元素的 text
        if (data.content[0]?.text) {
          return data.content[0].text
        }
      }
      // 4. 直接返回 content 字段（如果是字符串）
      if (typeof data.content === 'string') {
        return data.content
      }

      // 如果无法解析，打印完整响应并返回错误
      console.error('Unable to parse response:', data)
      throw new Error('无法解析AI响应格式')
    } catch (error: any) {
      console.error('AI call failed:', error)
      throw error
    }
  }

  const analyzeWeakPoints = async (question: string, _answer: string) => {
    // 简单的弱势点识别逻辑
    const keywords = ['不理解', '不会', '不懂', '混淆', '记不住', '总是错', '搞错', '错误']
    const foundKeyword = keywords.find(k => question.includes(k))

    if (foundKeyword && selectedSubject) {
      // 提取可能的弱势点
      const topicMatch = question.match(/(.{2,20})(?:不理解|不会|不懂|混淆|记不住|总是错|搞错|错误)/)
      if (topicMatch) {
        await window.electronAPI.db.weakPoints.add({
          subject_id: selectedSubject,
          topic: topicMatch[1].trim(),
          description: `从问题中发现: ${question.substring(0, 100)}`,
          severity: 2,
          source: 'chat',
        })
        // 重新加载弱势点
        const wpList = await window.electronAPI.db.weakPoints.getAll()
        setWeakPoints(wpList)
      }
    }
  }

  const saveAsQuestion = async () => {
    if (!selectedMessage || !newQuestionTitle.trim()) return

    try {
      // 找到用户的问题
      const msgIndex = messages.findIndex(m => m.id === selectedMessage.id)
      const userMsg = messages[msgIndex - 1]

      await window.electronAPI.db.questions.create({
        title: newQuestionTitle.trim(),
        content: userMsg?.content || '',
        answer: selectedMessage.content,
        analysis: '来自AI助手对话',
        subject_id: selectedMessage.subject_id,
      })

      await window.electronAPI.db.chatHistory.markAsSaved(selectedMessage.id)
      message.success('已保存为错题')
      setSaveModalVisible(false)
      setNewQuestionTitle('')
      setSelectedMessage(null)
    } catch (error) {
      message.error('保存失败')
    }
  }

  const clearHistory = async () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有聊天记录吗？',
      onOk: async () => {
        await window.electronAPI.db.chatHistory.clear()
        setMessages([])
        message.success('已清空')
      },
    })
  }

  const openSaveModal = (msg: ChatMessage) => {
    setSelectedMessage(msg)
    // 尝试从用户消息中提取标题
    const msgIndex = messages.findIndex(m => m.id === msg.id)
    const userMsg = messages[msgIndex - 1]
    setNewQuestionTitle(userMsg?.content?.substring(0, 50) || '')
    setSaveModalVisible(true)
  }

  const getRecommendations = async () => {
    if (weakPoints.length === 0) {
      message.info('暂无弱势点分析，请先进行对话')
      return
    }

    if (!aiSettings?.api_key) {
      message.warning('请先配置AI API')
      return
    }

    setLoading(true)
    try {
      const prompt = `基于我的弱势点，请推荐学习资料和练习方向：
${weakPoints.map(wp => `- [${wp.subject_name || '未分类'}] ${wp.topic}: ${wp.description || ''}`).join('\n')}

请给出具体的学习建议，包括：
1. 需要复习的知识点
2. 推荐的练习类型
3. 学习资源建议`

      const response = await callAI(prompt, aiSettings)

      const id = await window.electronAPI.db.chatHistory.add({
        role: 'assistant',
        content: `📚 **学习建议**\n\n${response}`,
      })

      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        content: `📚 **学习建议**\n\n${response}`,
        created_at: new Date().toISOString(),
      }])
    } catch (error: any) {
      message.error(`获取建议失败: ${error.message || '未知错误'}`, 5)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部工具栏 */}
      <Card size="small" className="mb-3">
        <div className="flex items-center justify-between">
          <Space>
            <Select
              style={{ width: 150 }}
              placeholder="选择科目（可选）"
              allowClear
              value={selectedSubject}
              onChange={setSelectedSubject}
              options={subjects.map(s => ({ value: s.id, label: s.name }))}
            />
            <Tooltip title="基于弱势点获取学习建议">
              <Button icon={<BulbOutlined />} onClick={getRecommendations}>
                学习建议
              </Button>
            </Tooltip>
          </Space>
          <Space>
            {weakPoints.length > 0 && (
              <Tag color="orange">{weakPoints.length} 个弱势点</Tag>
            )}
            <Button icon={<ClearOutlined />} onClick={clearHistory}>
              清空记录
            </Button>
            <Button icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
              API设置
            </Button>
          </Space>
        </div>
      </Card>

      {/* 消息列表 */}
      <Card className="flex-1 overflow-hidden mb-3" bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto' }}>
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <Avatar
                  icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  style={{ backgroundColor: msg.role === 'user' ? '#1677ff' : '#52c41a' }}
                />
                <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 mb-1 text-xs text-gray-400">
                    <span>{msg.role === 'user' ? '我' : 'AI助手'}</span>
                    {msg.subject_name && <Tag>{msg.subject_name}</Tag>}
                    <span>{dayjs(msg.created_at).format('HH:mm')}</span>
                  </div>
                  <div
                    className={`p-3 rounded-lg inline-block text-left ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <Paragraph className="mb-0 whitespace-pre-wrap" style={{ color: 'inherit' }}>
                      {msg.content}
                    </Paragraph>
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="mt-1">
                      <Button
                        type="text"
                        size="small"
                        icon={<SaveOutlined />}
                        onClick={() => openSaveModal(msg)}
                      >
                        保存为错题
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <Empty
            description="开始和AI助手对话吧"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Text type="secondary">
              你可以问我关于学习的问题，我会帮你解答
            </Text>
          </Empty>
        )}
        {loading && (
          <div className="flex justify-center py-4">
            <Spin tip="AI正在思考..." />
          </div>
        )}
      </Card>

      {/* 输入区域 */}
      <Card size="small">
        <div className="flex gap-2">
          <TextArea
            placeholder="输入你的问题..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            autoSize={{ minRows: 1, maxRows: 4 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            loading={loading}
            size="large"
          >
            发送
          </Button>
        </div>
        <div className="text-gray-400 text-xs mt-2">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </Card>

      {/* 保存为错题弹窗 */}
      <Modal
        title="保存为错题"
        open={saveModalVisible}
        onCancel={() => setSaveModalVisible(false)}
        onOk={saveAsQuestion}
      >
        <div className="space-y-4">
          <div>
            <div className="text-gray-500 text-sm mb-2">错题标题</div>
            <Input
              value={newQuestionTitle}
              onChange={(e) => setNewQuestionTitle(e.target.value)}
              placeholder="输入错题标题"
            />
          </div>
          <div>
            <div className="text-gray-500 text-sm mb-2">AI回答预览</div>
            <Paragraph ellipsis={{ rows: 3 }} className="bg-gray-50 p-2 rounded">
              {selectedMessage?.content}
            </Paragraph>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ChatPage
