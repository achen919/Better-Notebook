import React, { useCallback, useEffect, useRef, useState } from 'react'
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
  Collapse,
  Drawer,
  List,
  Popconfirm,
} from 'antd'
import {
  SendOutlined,
  SaveOutlined,
  BulbOutlined,
  RobotOutlined,
  UserOutlined,
  SettingOutlined,
  PlusOutlined,
  MessageOutlined,
  MenuOutlined,
  DeleteOutlined,
  EditOutlined,
  RedoOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Question, Subject, Chapter, Tag as TagType } from '../../types'
import ImportResultArea from '../../components/Chat/ImportResultArea'
import PlanResultArea from '../../components/Chat/PlanResultArea'
import {
  generateMilestoneId,
  calculateMilestoneDates,
} from '../../utils/aiIntent'
import type {
  ParsedQuestion,
  ParsedMilestone,
  SyncSettings,
} from '../../types/ai'

const { TextArea } = Input
const { Text, Paragraph } = Typography

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
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

interface ChatHistoryInput {
  role: 'user' | 'assistant'
  content: string
  subject_id?: number
}

interface AITextBlock {
  type: string
  text?: string
}

interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
    text?: string
  }>
  content?: string | AITextBlock[]
}

const ChatPage: React.FC = () => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>()
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([])
  const [saveModalVisible, setSaveModalVisible] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null)
  const [newQuestionTitle, setNewQuestionTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 会话相关状态
  const [sessions, setSessions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [sessionDrawerVisible, setSessionDrawerVisible] = useState(false)

  // 流式输出状态
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingReasoning, setStreamingReasoning] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showReasoning, setShowReasoning] = useState(true)

  // AI 模式状态
  type ChatMode = 'normal' | 'import' | 'plan'
  const [mode, setMode] = useState<ChatMode>('normal')

  // 错题录入相关
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])

  // 学习规划相关
  const [planTopic, setPlanTopic] = useState('')
  const [parsedMilestones, setParsedMilestones] = useState<ParsedMilestone[]>([])
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    createTask: true,
    createTodo: true,
    dailyDuration: 60,
  })

  // 确认中状态
  const [confirming, setConfirming] = useState(false)

  // 消息编辑状态
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const loadSessions = useCallback(async () => {
    try {
      const sessionList = await window.electronAPI.db.chatSessions.getAll()
      setSessions(sessionList)

      // 如果没有会话，创建一个新会话
      if (sessionList.length === 0) {
        const newSessionId = await window.electronAPI.db.chatSessions.create('新对话')
        setCurrentSessionId(newSessionId)
        setMessages([])
      } else {
        // 选择最近的会话
        const latestSession = sessionList[0]
        setCurrentSessionId(latestSession.id)
        const history = await window.electronAPI.db.chatSessions.getHistory(latestSession.id)
        setMessages(history)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [settings, subjectList, weakPointsList] = await Promise.all([
        window.electronAPI.db.aiSettings.get(),
        window.electronAPI.db.subjects.getAll(),
        window.electronAPI.db.weakPoints.getAll(),
      ])
      setAiSettings(settings)
      setSubjects(subjectList)
      setWeakPoints(weakPointsList)
      // 获取所有章节需要遍历科目
      const allChapters: Chapter[] = []
      for (const s of subjectList) {
        const subjectChapters = await window.electronAPI.db.chapters.getBySubject(s.id)
        allChapters.push(...subjectChapters)
      }
      setChapters(allChapters)

      // 加载会话
      await loadSessions()
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }, [loadSessions])

  // 创建新会话
  const createNewSession = useCallback(async () => {
    try {
      const newSessionId = await window.electronAPI.db.chatSessions.create('新对话')
      const sessionList = await window.electronAPI.db.chatSessions.getAll()
      setSessions(sessionList)
      setCurrentSessionId(newSessionId)
      setMessages([])
      setMode('normal')
      setParsedQuestions([])
      setParsedMilestones([])
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }, [])

  // 切换会话
  const switchSession = useCallback(async (sessionId: number) => {
    setCurrentSessionId(sessionId)
    const history = await window.electronAPI.db.chatSessions.getHistory(sessionId)
    setMessages(history)
    setMode('normal')
    setParsedQuestions([])
    setParsedMilestones([])
    setSessionDrawerVisible(false)
  }, [])

  // 删除会话
  const deleteSession = useCallback(async (sessionId: number) => {
    try {
      await window.electronAPI.db.chatSessions.delete(sessionId)
      const sessionList = await window.electronAPI.db.chatSessions.getAll()
      setSessions(sessionList)

      // 如果删除的是当前会话，切换到其他会话或创建新的
      if (sessionId === currentSessionId) {
        if (sessionList.length > 0) {
          await switchSession(sessionList[0].id)
        } else {
          await createNewSession()
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }, [currentSessionId, switchSession, createNewSession])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getErrorMessage = (error: unknown) => (
    error instanceof Error ? error.message : '未知错误'
  )

  // 检测用户意图关键词
  const detectIntent = (message: string): 'normal' | 'import' | 'plan' | 'task' | 'todo' => {
    const planKeywords = ['制定计划', '学习规划', '帮我规划', '学习计划', '规划学习', '制定学习', '学习路径', '学习路线']
    const importKeywords = ['录入错题', '整理错题', '添加错题', '批量录入', '帮我录入', '录错题']
    const taskKeywords = ['创建任务', '添加任务', '新任务', '任务倒计时', '设置任务', '帮我创建任务', '建个任务']
    const todoKeywords = ['今日计划', '每日计划', '今天计划', '添加计划', '创建计划', 'todo', 'TODO', '待办']

    for (const keyword of planKeywords) {
      if (message.includes(keyword)) return 'plan'
    }
    for (const keyword of importKeywords) {
      if (message.includes(keyword)) return 'import'
    }
    for (const keyword of taskKeywords) {
      if (message.includes(keyword)) return 'task'
    }
    for (const keyword of todoKeywords) {
      if (message.includes(keyword)) return 'todo'
    }
    return 'normal'
  }

  // 生成学习计划
  const generateStudyPlan = async (userMessage: string) => {
    if (!aiSettings?.api_key) return

    setLoading(true)
    try {
      // 构建生成计划的提示
      const planPrompt = `用户请求：${userMessage}

请生成一个详细的学习计划，以JSON格式返回，包含以下结构：
{
  "reply": "简短的回复说明",
  "topic": "学习主题",
  "milestones": [
    {
      "title": "里程碑标题",
      "description": "详细描述",
      "days": 预计天数,
      "dailyTopics": ["每日学习主题1", "每日学习主题2", ...]
    }
  ]
}

要求：
1. 根据用户需求生成合理的里程碑数量（通常3-7个）
2. 每个里程碑的天数要合理
3. dailyTopics数组长度必须等于days
4. 只返回JSON，不要其他内容`

      let baseUrl = aiSettings.api_base_url || 'https://api.openai.com/v1'
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl
      }
      baseUrl = baseUrl.replace(/\/+$/, '')

      const isAnthropic = baseUrl.includes('/anthropic') || baseUrl.includes('anthropic')

      let apiUrl: string
      let requestBody: Record<string, unknown>

      if (isAnthropic) {
        apiUrl = `${baseUrl}/v1/messages`
        requestBody = {
          model: aiSettings.model || 'claude-3-haiku-20240307',
          max_tokens: 2000,
          messages: [{ role: 'user', content: planPrompt }],
        }
      } else {
        apiUrl = `${baseUrl}/chat/completions`
        requestBody = {
          model: aiSettings.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: planPrompt }],
          temperature: 0.7,
          max_tokens: 2000,
        }
      }

      const response = await window.electronAPI.ai.call({
        url: apiUrl,
        apiKey: aiSettings.api_key,
        body: requestBody,
      })

      // 解析响应 - 支持 OpenAI 和 Anthropic 格式
      let content = ''
      if (response.choices?.[0]?.message?.content) {
        // OpenAI 格式
        content = response.choices[0].message.content
      } else if (response.content) {
        // Anthropic 格式 - content 可能是数组
        if (typeof response.content === 'string') {
          content = response.content
        } else if (Array.isArray(response.content)) {
          // 遍历 content 数组，优先获取 text 类型的内容
          for (const block of response.content) {
            if (block.type === 'text' && block.text) {
              content = block.text
              break
            }
            // 如果没有 text 类型，尝试获取其他内容
            if (block.text) {
              content = block.text
              break
            }
            // MiniMax 等模型可能把内容放在 thinking 字段
            if (block.thinking && !content) {
              content = block.thinking
            }
          }
        }
      }

      console.log('Parsed AI content:', content?.substring(0, 500))

      if (!content) {
        throw new Error('AI 返回内容为空')
      }

      // 提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        // 没有找到 JSON，可能 AI 返回了普通文本，直接显示
        console.warn('No JSON found in AI response, showing raw content')
        const assistantId = await window.electronAPI.db.chatHistory.add({
          role: 'assistant',
          content: content,
          subject_id: selectedSubject,
          session_id: currentSessionId,
        })
        setMessages(prev => [...prev, {
          id: assistantId,
          role: 'assistant',
          content: content,
          created_at: new Date().toISOString(),
        }])
        message.info('AI 未返回结构化计划，已显示原始回复')
        return
      }

      const parsed = JSON.parse(jsonMatch[0])

      // 设置计划主题
      setPlanTopic(parsed.topic || '学习计划')

      // 设置里程碑
      if (parsed.milestones && Array.isArray(parsed.milestones)) {
        const milestonesWithIds = parsed.milestones.map((m: any) => ({
          id: generateMilestoneId(),
          title: m.title || '未命名里程碑',
          description: m.description || '',
          days: m.days || 1,
          dailyTopics: m.dailyTopics || [],
        }))

        // 计算目标日期
        const milestonesWithDates = calculateMilestoneDates(milestonesWithIds)
        setParsedMilestones(milestonesWithDates)
      }

      // 保存AI回复
      const assistantId = await window.electronAPI.db.chatHistory.add({
        role: 'assistant',
        content: parsed.reply || '已为您生成学习计划，请查看并确认。',
        subject_id: selectedSubject,
        session_id: currentSessionId,
      })

      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: parsed.reply || '已为您生成学习计划，请查看并确认。',
        subject_id: selectedSubject,
        subject_name: subjects.find(s => s.id === selectedSubject)?.name,
        created_at: new Date().toISOString(),
      }])

      // 切换到计划模式
      setMode('plan')
    } catch (error) {
      console.error('Failed to generate study plan:', error)
      message.warning('计划生成失败，正在切换到普通对话模式...')

      // Fallback: 使用普通聊天回复
      try {
        await fallbackToNormalChat(userMessage)
      } catch (fallbackError) {
        console.error('Fallback chat also failed:', fallbackError)
        message.error(`AI 调用失败: ${getErrorMessage(fallbackError)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fallback 到普通聊天（当特殊意图处理失败时）
  const fallbackToNormalChat = async (userMessage: string) => {
    if (!aiSettings?.api_key) return

    setIsStreaming(true)
    setStreamingContent('')
    setStreamingReasoning('')

    // 清理旧监听器
    window.electronAPI.ai.removeAllStreamListeners()

    let fullContent = ''
    let fullReasoning = ''

    window.electronAPI.ai.onStreamChunk((data: { type: string; content: string }) => {
      if (data.type === 'content') {
        fullContent += data.content
        setStreamingContent(fullContent)
      } else if (data.type === 'reasoning') {
        fullReasoning += data.content
        setStreamingReasoning(fullReasoning)
      }
    })

    window.electronAPI.ai.onStreamEnd(async () => {
      setIsStreaming(false)

      const assistantId = await window.electronAPI.db.chatHistory.add({
        role: 'assistant',
        content: fullContent,
        subject_id: selectedSubject,
        session_id: currentSessionId,
      })

      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: fullContent,
        reasoning: fullReasoning || undefined,
        created_at: new Date().toISOString(),
      }])

      setStreamingContent('')
      setStreamingReasoning('')
      window.electronAPI.ai.removeAllStreamListeners()
    })

    window.electronAPI.ai.onStreamError((error: string) => {
      setIsStreaming(false)
      message.error(`AI调用失败: ${error}`, 5)
      window.electronAPI.ai.removeAllStreamListeners()
    })

    let baseUrl = aiSettings.api_base_url || 'https://api.openai.com/v1'
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl
    }
    baseUrl = baseUrl.replace(/\/+$/, '')

    const isAnthropic = baseUrl.includes('/anthropic') || baseUrl.includes('anthropic')
    const apiUrl = isAnthropic ? `${baseUrl}/v1/messages` : `${baseUrl}/chat/completions`

    const requestBody = isAnthropic ? {
      model: aiSettings.model || 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [
        ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ],
    } : {
      model: aiSettings.model || 'gpt-3.5-turbo',
      messages: [
        ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }

    await window.electronAPI.ai.stream({
      url: apiUrl,
      apiKey: aiSettings.api_key,
      body: requestBody,
    })
  }

  // 处理任务倒计时意图 - 使用 AI 解析并创建任务
  const handleTaskIntent = async (userMessage: string) => {
    if (!aiSettings?.api_key) return

    setLoading(true)
    try {
      // 保存用户消息
      const userId = await window.electronAPI.db.chatHistory.add({
        role: 'user',
        content: userMessage,
        subject_id: selectedSubject,
        session_id: currentSessionId,
      } as ChatHistoryInput)

      setMessages(prev => [...prev, {
        id: userId,
        role: 'user',
        content: userMessage,
        subject_id: selectedSubject,
        subject_name: subjects.find(s => s.id === selectedSubject)?.name,
        created_at: new Date().toISOString(),
      }])

      // 使用 AI 解析任务信息
      const taskPrompt = `用户想创建一个任务倒计时：${userMessage}

请解析并以JSON格式返回任务信息：
{
  "title": "任务标题",
  "description": "任务描述",
  "deadline": "截止日期，格式 YYYY-MM-DD",
  "reply": "友好的回复消息"
}

如果用户没有明确截止日期，根据上下文推断一个合理的日期（如"下周一"、"三天后"等）。
只返回JSON，不要其他内容。`

      let baseUrl = aiSettings.api_base_url || 'https://api.openai.com/v1'
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl
      }
      baseUrl = baseUrl.replace(/\/+$/, '')

      const isAnthropic = baseUrl.includes('/anthropic') || baseUrl.includes('anthropic')
      const apiUrl = isAnthropic ? `${baseUrl}/v1/messages` : `${baseUrl}/chat/completions`

      const response = await window.electronAPI.ai.call({
        url: apiUrl,
        apiKey: aiSettings.api_key,
        body: isAnthropic ? {
          model: aiSettings.model || 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: taskPrompt }],
        } : {
          model: aiSettings.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: taskPrompt }],
          temperature: 0.3,
        },
      })

      const content = isAnthropic
        ? response.content?.[0]?.text
        : response.choices?.[0]?.message?.content

      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const taskData = JSON.parse(jsonMatch[0])

          // 创建任务
          await window.electronAPI.db.tasks.create({
            title: taskData.title,
            description: taskData.description || '',
            deadline: taskData.deadline,
            status: 'pending',
          })

          // 保存 AI 回复
          const aiReply = taskData.reply || `已为您创建任务「${taskData.title}」，截止日期：${taskData.deadline}`
          const assistantId = await window.electronAPI.db.chatHistory.add({
            role: 'assistant',
            content: aiReply,
            subject_id: selectedSubject,
            session_id: currentSessionId,
          })

          setMessages(prev => [...prev, {
            id: assistantId,
            role: 'assistant',
            content: aiReply + '\n\n[点击查看任务倒计时](/tasks)',
            created_at: new Date().toISOString(),
          }])

          message.success('任务创建成功')
        }
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      message.error(`创建任务失败: ${getErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  // 处理每日计划意图 - 使用 AI 解析并创建待办
  const handleTodoIntent = async (userMessage: string) => {
    if (!aiSettings?.api_key) return

    setLoading(true)
    try {
      // 保存用户消息
      const userId = await window.electronAPI.db.chatHistory.add({
        role: 'user',
        content: userMessage,
        subject_id: selectedSubject,
        session_id: currentSessionId,
      } as ChatHistoryInput)

      setMessages(prev => [...prev, {
        id: userId,
        role: 'user',
        content: userMessage,
        subject_id: selectedSubject,
        subject_name: subjects.find(s => s.id === selectedSubject)?.name,
        created_at: new Date().toISOString(),
      }])

      // 使用 AI 解析待办信息
      const todoPrompt = `用户想添加每日计划/待办事项：${userMessage}

请解析并以JSON格式返回待办列表：
{
  "todos": [
    {
      "title": "待办标题",
      "priority": "high/medium/low"
    }
  ],
  "reply": "友好的回复消息"
}

如果用户提到多个事项，解析为多个待办。
只返回JSON，不要其他内容。`

      let baseUrl = aiSettings.api_base_url || 'https://api.openai.com/v1'
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl
      }
      baseUrl = baseUrl.replace(/\/+$/, '')

      const isAnthropic = baseUrl.includes('/anthropic') || baseUrl.includes('anthropic')
      const apiUrl = isAnthropic ? `${baseUrl}/v1/messages` : `${baseUrl}/chat/completions`

      const response = await window.electronAPI.ai.call({
        url: apiUrl,
        apiKey: aiSettings.api_key,
        body: isAnthropic ? {
          model: aiSettings.model || 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: todoPrompt }],
        } : {
          model: aiSettings.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: todoPrompt }],
          temperature: 0.3,
        },
      })

      const content = isAnthropic
        ? response.content?.[0]?.text
        : response.choices?.[0]?.message?.content

      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const todoData = JSON.parse(jsonMatch[0])
          const today = dayjs().format('YYYY-MM-DD')

          // 创建待办事项
          for (const todo of todoData.todos || []) {
            await window.electronAPI.db.todo.create({
              date: today,
              title: todo.title,
              priority: todo.priority || 'medium',
              completed: 0,
            })
          }

          // 保存 AI 回复
          const todoCount = todoData.todos?.length || 0
          const aiReply = todoData.reply || `已为您添加 ${todoCount} 项今日计划`
          const assistantId = await window.electronAPI.db.chatHistory.add({
            role: 'assistant',
            content: aiReply,
            subject_id: selectedSubject,
            session_id: currentSessionId,
          })

          setMessages(prev => [...prev, {
            id: assistantId,
            role: 'assistant',
            content: aiReply + '\n\n[点击查看每日计划](/todo)',
            created_at: new Date().toISOString(),
          }])

          message.success(`已添加 ${todoCount} 项计划`)
        }
      }
    } catch (error) {
      console.error('Failed to create todo:', error)
      message.error(`创建计划失败: ${getErrorMessage(error)}`)
    } finally {
      setLoading(false)
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

    // 检测用户意图
    const intent = detectIntent(userMessage)

    // 如果是计划意图，使用专门的计划生成流程
    if (intent === 'plan') {
      // 保存用户消息
      const userId = await window.electronAPI.db.chatHistory.add({
        role: 'user',
        content: userMessage,
        subject_id: selectedSubject,
        session_id: currentSessionId,
      } as ChatHistoryInput)

      // 如果是第一条消息，更新会话标题
      if (messages.length === 0 && currentSessionId) {
        const title = userMessage.slice(0, 20) + (userMessage.length > 20 ? '...' : '')
        await window.electronAPI.db.chatSessions.updateTitle(currentSessionId, title)
        const sessionList = await window.electronAPI.db.chatSessions.getAll()
        setSessions(sessionList)
      }

      setMessages(prev => [...prev, {
        id: userId,
        role: 'user',
        content: userMessage,
        subject_id: selectedSubject,
        subject_name: subjects.find(s => s.id === selectedSubject)?.name,
        created_at: new Date().toISOString(),
      }])

      await generateStudyPlan(userMessage)
      return
    }

    // 如果是任务倒计时意图，引导用户到任务页面并自动创建
    if (intent === 'task') {
      await handleTaskIntent(userMessage)
      return
    }

    // 如果是每日计划意图，引导用户到每日计划页面并自动创建
    if (intent === 'todo') {
      await handleTodoIntent(userMessage)
      return
    }

    setLoading(true)
    setIsStreaming(true)
    setStreamingContent('')
    setStreamingReasoning('')

    // 先清理旧的监听器，避免累积
    window.electronAPI.ai.removeAllStreamListeners()

    // 添加用户消息
    const userId = await window.electronAPI.db.chatHistory.add({
      role: 'user',
      content: userMessage,
      subject_id: selectedSubject,
      session_id: currentSessionId,
    } as ChatHistoryInput)

    // 如果是第一条消息，更新会话标题
    if (messages.length === 0 && currentSessionId) {
      const title = userMessage.slice(0, 20) + (userMessage.length > 20 ? '...' : '')
      await window.electronAPI.db.chatSessions.updateTitle(currentSessionId, title)
      const sessionList = await window.electronAPI.db.chatSessions.getAll()
      setSessions(sessionList)
    }

    const newUserMsg: ChatMessage = {
      id: userId,
      role: 'user',
      content: userMessage,
      subject_id: selectedSubject,
      subject_name: subjects.find(s => s.id === selectedSubject)?.name,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, newUserMsg])

    // 设置流式监听器
    let fullContent = ''
    let fullReasoning = ''

    window.electronAPI.ai.onStreamChunk((data: { type: string; content: string }) => {
      if (data.type === 'content') {
        fullContent += data.content
        setStreamingContent(fullContent)
      } else if (data.type === 'reasoning') {
        fullReasoning += data.content
        setStreamingReasoning(fullReasoning)
      }
    })

    window.electronAPI.ai.onStreamEnd(async () => {
      setIsStreaming(false)

      // 保存 AI 回复
      const assistantId = await window.electronAPI.db.chatHistory.add({
        role: 'assistant',
        content: fullContent,
        subject_id: selectedSubject,
        session_id: currentSessionId,
      })

      const newAIMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: fullContent,
        reasoning: fullReasoning || undefined,
        subject_id: selectedSubject,
        subject_name: subjects.find(s => s.id === selectedSubject)?.name,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, newAIMsg])

      // 清理流式状态
      setStreamingContent('')
      setStreamingReasoning('')
      setLoading(false)

      // 分析弱势点
      analyzeWeakPoints(userMessage)

      // 移除监听器
      window.electronAPI.ai.removeAllStreamListeners()
    })

    window.electronAPI.ai.onStreamError((error: string) => {
      setIsStreaming(false)
      setLoading(false)
      message.error(`AI调用失败: ${error}`, 5)
      window.electronAPI.ai.removeAllStreamListeners()
    })

    try {
      // 构建请求
      let baseUrl = aiSettings.api_base_url || 'https://api.openai.com/v1'
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl
      }
      baseUrl = baseUrl.replace(/\/+$/, '')

      const isAnthropic = baseUrl.includes('/anthropic') || baseUrl.includes('anthropic')

      // 构建系统提示
      const defaultSystemPrompt = `你是一个学习助手，帮助学生解答问题、理解概念、分析错误原因。
请用中文回答，回答要清晰、有条理。
如果学生问的是具体题目，请给出详细的解题思路和步骤。
如果学生问的是概念问题，请用通俗易懂的方式解释。`

      const systemPrompt = aiSettings.system_prompt?.trim() || defaultSystemPrompt

      // 获取上下文
      const questions = await window.electronAPI.db.questions.getAll() as Question[]
      const recentQuestions = questions.slice(0, 5).map((q) => ({
        title: q.title,
        subject: q.subject_name,
      }))

      const contextInfo = recentQuestions.length > 0
        ? `\n\n学生最近整理的错题：\n${recentQuestions.map((q) => `- [${q.subject || '未分类'}] ${q.title}`).join('\n')}`
        : ''

      const fullSystemPrompt = systemPrompt + contextInfo

      let apiUrl: string
      let requestBody: Record<string, unknown>

      if (isAnthropic) {
        apiUrl = `${baseUrl}/v1/messages`
        requestBody = {
          model: aiSettings.model || 'claude-3-haiku-20240307',
          max_tokens: 2000,
          system: fullSystemPrompt,
          messages: [
            ...messages.slice(-10).map(m => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: userMessage },
          ],
        }
      } else {
        apiUrl = `${baseUrl}/chat/completions`
        requestBody = {
          model: aiSettings.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: fullSystemPrompt },
            ...messages.slice(-10).map(m => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }
      }

      await window.electronAPI.ai.stream({
        url: apiUrl,
        apiKey: aiSettings.api_key,
        body: requestBody,
      })
    } catch (error) {
      const errorMsg = getErrorMessage(error)
      message.error(`AI调用失败: ${errorMsg}`, 5)
      console.error('AI call failed:', error)
      setIsStreaming(false)
      setLoading(false)
      window.electronAPI.ai.removeAllStreamListeners()
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
    const questions = await window.electronAPI.db.questions.getAll() as Question[]
    const recentQuestions = questions.slice(0, 10).map((q) => ({
      title: q.title,
      subject: q.subject_name,
    }))

    const contextInfo = recentQuestions.length > 0
      ? `\n\n学生最近整理的错题（可作为参考）：\n${recentQuestions.map((q) => `- [${q.subject || '未分类'}] ${q.title}`).join('\n')}`
      : ''

    const weakPointsInfo = weakPoints.length > 0
      ? `\n\n学生已识别的弱势点：\n${weakPoints.map(wp => `- ${wp.topic}: ${wp.description || '无描述'}`).join('\n')}`
      : ''

    const systemPrompt = baseSystemPrompt + contextInfo + weakPointsInfo

    // 检测 API 格式（OpenAI 兼容 vs Anthropic 兼容）
    const isAnthropic = baseUrl.includes('/anthropic') || baseUrl.includes('anthropic')

    let apiUrl: string
    let requestBody: Record<string, unknown>

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
      }) as AIResponse

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
        const textBlock = data.content.find((block) => block.type === 'text')
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
    } catch (error) {
      console.error('AI call failed:', error)
      throw error
    }
  }

  // 停止流式输出
  const stopStreaming = () => {
    window.electronAPI.ai.removeAllStreamListeners()
    setIsStreaming(false)
    setLoading(false)

    // 如果有部分内容，保存它
    if (streamingContent) {
      const savePartialContent = async () => {
        const assistantId = await window.electronAPI.db.chatHistory.add({
          role: 'assistant',
          content: streamingContent,
          subject_id: selectedSubject,
        })
        const newAIMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: streamingContent,
          reasoning: streamingReasoning || undefined,
          subject_id: selectedSubject,
          subject_name: subjects.find(s => s.id === selectedSubject)?.name,
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, newAIMsg])
      }
      savePartialContent()
    }

    setStreamingContent('')
    setStreamingReasoning('')
  }

  // 错题录入确认
  const handleImportConfirm = async (selectedQuestions: ParsedQuestion[]) => {
    setConfirming(true)
    try {
      // 获取 AI 标签
      const tags = await window.electronAPI.db.tags.getAll() as TagType[]
      const aiTag = tags.find((t) => t.name === 'AI生成')

      let successCount = 0
      for (const q of selectedQuestions) {
        try {
          // 创建错题
          const questionId = await window.electronAPI.db.questions.create({
            title: q.title,
            content: q.content || '',
            answer: q.answer || '',
            analysis: q.analysis || '',
            subject_id: q.selectedSubjectId,
            chapter_id: q.selectedChapterId,
          })

          // 关联 AI 标签
          if (aiTag && questionId) {
            await window.electronAPI.db.questionTags.add(questionId, aiTag.id)
          }

          successCount++
        } catch (error) {
          console.error('Failed to create question:', q.title, error)
        }
      }

      message.success(`成功录入 ${successCount} 条错题`)
      setMode('normal')
      setParsedQuestions([])
    } catch (error) {
      message.error('录入失败')
      console.error(error)
    } finally {
      setConfirming(false)
    }
  }

  // 学习规划确认
  const handlePlanConfirm = async () => {
    if (parsedMilestones.length === 0) {
      message.warning('请至少添加一个里程碑')
      return
    }

    setConfirming(true)
    try {
      if (syncSettings.createTask) {
        // 计算总天数（添加初始值避免空数组问题）
        const totalDays = parsedMilestones.reduce((s, m) => s + (m.days || 0), 0)
        // 获取最后一个里程碑的targetDate
        const lastMilestone = parsedMilestones[parsedMilestones.length - 1]
        const deadline = lastMilestone?.targetDate

        // 创建任务
        const taskId = await window.electronAPI.db.tasks.create({
          title: `学习计划：${planTopic || '未命名计划'}`,
          description: `AI 生成的学习计划，共 ${totalDays} 天`,
          deadline: deadline || new Date().toISOString().split('T')[0],
          priority: 2,
          progress_type: 'subitems',
          ai_generated: 1,
        })

        // 创建里程碑
        for (const m of parsedMilestones) {
          await window.electronAPI.db.milestones.create({
            task_id: taskId,
            title: m.title || '未命名里程碑',
            description: m.description || '',
            target_date: m.targetDate || null,
            ai_generated: 1,
          })
        }

        // 创建子任务
        for (const m of parsedMilestones) {
          await window.electronAPI.db.taskSubitems.create({
            task_id: taskId,
            title: m.title || '未命名里程碑',
          })
        }
      }

      if (syncSettings.createTodo) {
        // 创建每日计划
        let dayOffset = 0
        for (const m of parsedMilestones) {
          const days = m.days || 1
          const dailyTopics = m.dailyTopics || []

          for (let i = 0; i < days; i++) {
            const date = dayjs().add(dayOffset + i, 'day').format('YYYY-MM-DD')
            const topic = dailyTopics[i] || `${m.title || '学习'} Day ${i + 1}`

            await window.electronAPI.db.todo.create({
              date,
              content: `[${planTopic || '学习计划'}] ${topic}`,
              ai_generated: 1,
            })
          }
          dayOffset += days
        }
      }

      message.success('学习计划创建成功')
      setMode('normal')
      setParsedMilestones([])
      setPlanTopic('')
    } catch (error) {
      console.error('Plan creation error:', error)
      message.error(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setConfirming(false)
    }
  }

  const analyzeWeakPoints = async (question: string) => {
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
      } as ChatHistoryInput)

      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        content: `📚 **学习建议**\n\n${response}`,
        created_at: new Date().toISOString(),
      }])
    } catch (error) {
      message.error(`获取建议失败: ${getErrorMessage(error)}`, 5)
    } finally {
      setLoading(false)
    }
  }

  // 开始编辑消息
  const startEditMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id)
    setEditingContent(msg.content)
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingMessageId(null)
    setEditingContent('')
  }

  // 重试消息（重新发送获取新回复）
  const retryMessage = async (msg: ChatMessage) => {
    const messageIndex = messages.findIndex(m => m.id === msg.id)
    if (messageIndex === -1) return

    // 删除该消息及之后的所有消息（从数据库）
    const messagesToDelete = messages.slice(messageIndex)
    for (const m of messagesToDelete) {
      if (m.id !== undefined && m.id !== null) {
        await window.electronAPI.db.chatHistory.delete(m.id)
      }
    }

    // 更新本地消息列表
    const remainingMessages = messages.slice(0, messageIndex)
    setMessages(remainingMessages)

    // 重新发送
    setInputMessage(msg.content)
    setTimeout(() => {
      sendMessage()
    }, 50)
  }

  // 保存编辑并重新发送
  const saveEditAndResend = async () => {
    if (!editingContent.trim() || editingMessageId === null) return

    const messageIndex = messages.findIndex(m => m.id === editingMessageId)
    if (messageIndex === -1) return

    // 删除该消息及之后的所有消息（从数据库）
    const messagesToDelete = messages.slice(messageIndex)
    for (const msg of messagesToDelete) {
      if (msg.id !== undefined && msg.id !== null) {
        await window.electronAPI.db.chatHistory.delete(msg.id)
      }
    }

    // 更新本地消息列表（只保留编辑消息之前的）
    const remainingMessages = messages.slice(0, messageIndex)
    setMessages(remainingMessages)

    // 重置编辑状态
    setEditingMessageId(null)
    setEditingContent('')

    // 发送新消息
    setInputMessage(editingContent.trim())
    // 延迟执行发送，确保状态更新
    setTimeout(() => {
      sendMessage()
    }, 50)
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部工具栏 */}
      <Card size="small" className="mb-3">
        <div className="flex items-center justify-between">
          <Space>
            <Button icon={<MenuOutlined />} onClick={() => setSessionDrawerVisible(true)}>
              会话列表
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={createNewSession}>
              新对话
            </Button>
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
            <Button icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
              API设置
            </Button>
          </Space>
        </div>
      </Card>

      {/* 会话列表抽屉 */}
      <Drawer
        title="对话历史"
        placement="left"
        open={sessionDrawerVisible}
        onClose={() => setSessionDrawerVisible(false)}
        width={320}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={createNewSession}>
            新对话
          </Button>
        }
      >
        <List
          dataSource={sessions}
          renderItem={(session) => (
            <List.Item
              className={`cursor-pointer hover:bg-gray-50 rounded px-2 ${session.id === currentSessionId ? 'bg-blue-50' : ''}`}
              onClick={() => switchSession(session.id)}
              actions={[
                <Popconfirm
                  key="delete"
                  title="确定删除此对话？"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    deleteSession(session.id)
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<MessageOutlined className="text-lg text-gray-400" />}
                title={session.title || '新对话'}
                description={
                  <div className="text-xs text-gray-400">
                    {session.message_count || 0} 条消息 · {dayjs(session.updated_at).format('MM-DD HH:mm')}
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: '暂无对话记录' }}
        />
      </Drawer>

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
                  {/* 推理过程（如果有） */}
                  {msg.role === 'assistant' && msg.reasoning && (
                    <Collapse
                      size="small"
                      bordered={false}
                      className="mb-2"
                      items={[{
                        key: '1',
                        label: <span className="text-purple-600 text-xs">💭 思考过程</span>,
                        children: (
                          <Paragraph className="mb-0 text-xs text-gray-600 whitespace-pre-wrap bg-purple-50 p-2 rounded">
                            {msg.reasoning}
                          </Paragraph>
                        ),
                      }]}
                    />
                  )}
                  {/* 用户消息编辑模式 */}
                  {msg.role === 'user' && editingMessageId === msg.id ? (
                    <div className="text-left">
                      <TextArea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        className="mb-2"
                      />
                      <Space>
                        <Button size="small" onClick={cancelEdit}>取消</Button>
                        <Button
                          type="primary"
                          size="small"
                          icon={<RedoOutlined />}
                          onClick={saveEditAndResend}
                          loading={loading}
                        >
                          重新发送
                        </Button>
                      </Space>
                    </div>
                  ) : (
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
                  )}
                  {/* 用户消息操作按钮 */}
                  {msg.role === 'user' && editingMessageId !== msg.id && (
                    <div className="mt-1 flex gap-1">
                      <Tooltip title="编辑">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => startEditMessage(msg)}
                        />
                      </Tooltip>
                      <Tooltip title="重试">
                        <Button
                          type="text"
                          size="small"
                          icon={<RedoOutlined />}
                          onClick={() => retryMessage(msg)}
                        />
                      </Tooltip>
                    </div>
                  )}
                  {/* AI消息操作按钮 */}
                  {msg.role === 'assistant' && (
                    <div className="mt-1 flex gap-1">
                      <Tooltip title="重新生成">
                        <Button
                          type="text"
                          size="small"
                          icon={<RedoOutlined />}
                          onClick={() => {
                            // 找到该AI回复之前的用户消息
                            const msgIndex = messages.findIndex(m => m.id === msg.id)
                            if (msgIndex > 0) {
                              const userMsg = messages[msgIndex - 1]
                              if (userMsg.role === 'user') {
                                retryMessage(userMsg)
                              }
                            }
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="保存为错题">
                        <Button
                          type="text"
                          size="small"
                          icon={<SaveOutlined />}
                          onClick={() => openSaveModal(msg)}
                        />
                      </Tooltip>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* 流式输出显示 */}
            {isStreaming && (
              <div className="flex gap-3">
                <Avatar
                  icon={<RobotOutlined />}
                  style={{ backgroundColor: '#52c41a' }}
                />
                <div className="flex-1 max-w-[80%]">
                  <div className="flex items-center gap-2 mb-1 text-xs text-gray-400">
                    <span>AI助手</span>
                    <Tag color="processing">输出中...</Tag>
                    <Button
                      type="text"
                      size="small"
                      danger
                      onClick={stopStreaming}
                    >
                      停止
                    </Button>
                  </div>
                  {/* 流式推理过程 */}
                  {streamingReasoning && showReasoning && (
                    <div className="mb-2 p-2 bg-purple-50 rounded text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-purple-600">💭 思考过程</span>
                        <Button
                          type="text"
                          size="small"
                          className="text-xs"
                          onClick={() => setShowReasoning(false)}
                        >
                          隐藏
                        </Button>
                      </div>
                      <Paragraph className="mb-0 text-gray-600 whitespace-pre-wrap">
                        {streamingReasoning}
                      </Paragraph>
                    </div>
                  )}
                  {streamingReasoning && !showReasoning && (
                    <Button
                      type="text"
                      size="small"
                      className="mb-1 text-xs text-purple-600"
                      onClick={() => setShowReasoning(true)}
                    >
                      显示思考过程
                    </Button>
                  )}
                  {/* 流式内容 */}
                  {streamingContent && (
                    <div className="p-3 rounded-lg bg-gray-100 text-gray-800">
                      <Paragraph className="mb-0 whitespace-pre-wrap">
                        {streamingContent}
                      </Paragraph>
                    </div>
                  )}
                </div>
              </div>
            )}
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
        {loading && !isStreaming && (
          <div className="flex justify-center py-4">
            <Spin tip="AI正在思考..." />
          </div>
        )}
      </Card>

      {/* AI 功能结果展示区 */}
      {mode === 'import' && (
        <ImportResultArea
          questions={parsedQuestions}
          subjects={subjects}
          chapters={chapters}
          onEdit={(index, data) => {
            const updated = [...parsedQuestions]
            updated[index] = { ...updated[index], ...data }
            setParsedQuestions(updated)
          }}
          onCreateSubject={async (name) => {
            const id = await window.electronAPI.db.subjects.create({ name })
            const newSubject = { id, name, color: '#1890ff', icon: '', created_at: new Date().toISOString() }
            setSubjects(prev => [...prev, newSubject])
            return id
          }}
          onConfirm={handleImportConfirm}
          onCancel={() => {
            setMode('normal')
            setParsedQuestions([])
          }}
          loading={confirming}
        />
      )}

      {mode === 'plan' && (
        <PlanResultArea
          milestones={parsedMilestones}
          topic={planTopic}
          onEditMilestone={(index, data) => {
            const updated = [...parsedMilestones]
            updated[index] = { ...updated[index], ...data }
            setParsedMilestones(updated)
          }}
          onAddMilestone={() => {
            const lastDate = parsedMilestones.length > 0
              ? dayjs(parsedMilestones[parsedMilestones.length - 1].targetDate).add(1, 'day')
              : dayjs()

            const newMilestone: ParsedMilestone = {
              id: generateMilestoneId(),
              title: '新里程碑',
              description: '',
              days: 7,
              targetDate: lastDate.add(6, 'day').format('YYYY-MM-DD'),
              dailyTopics: Array(7).fill(''),
            }
            setParsedMilestones(prev => [...prev, newMilestone])
          }}
          onRemoveMilestone={(index) => {
            setParsedMilestones(prev => prev.filter((_, i) => i !== index))
          }}
          syncSettings={syncSettings}
          onSyncSettingsChange={setSyncSettings}
          onConfirm={handlePlanConfirm}
          onCancel={() => {
            setMode('normal')
            setParsedMilestones([])
            setPlanTopic('')
          }}
          loading={confirming}
        />
      )}

      {/* 输入区域 */}
      <Card size="small">
        <div className="flex gap-2">
          <TextArea
            placeholder="输入你的问题..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onPressEnter={(e) => {
              // 检查是否在输入法组合状态（如中文拼音输入中）
              if (e.nativeEvent.isComposing) return
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
