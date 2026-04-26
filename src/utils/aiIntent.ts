// src/utils/aiIntent.ts
import type { AIResponseWithIntent, ParsedQuestion, ParsedMilestone } from '../types/ai'

const INTENT_PROMPT = `你是学习助手，除了回答用户问题，还需要识别用户意图。

可能的意图：
1. normal - 普通对话，正常回答
2. import - 整理错题，用户想批量录入错题到错题本
3. plan - 学习规划，用户想制定学习计划

判断依据：
- 用户说"整理错题"、"录错题"、"帮我录入"、或直接粘贴多个题目内容 → import
- 用户说"想学xxx"、"帮我规划"、"制定计划"、"学习路径" → plan
- 其他情况 → normal

如果识别到 import，同时解析错题内容，提取每道题的：
- title: 题目标题（简短概括）
- content: 题目完整内容
- answer: 答案
- analysis: 解析（如有）
- subject: 建议科目名称
- chapter: 建议章节名称

如果识别到 plan，同时提取：
- topic: 学习主题
- duration: 总时长（天数），如用户未指定则根据难度估算合理天数

你必须严格返回以下 JSON 格式，不要有任何其他内容：
{
  "reply": "你的回复内容（简短友好）",
  "intent": {
    "type": "import 或 plan 或 normal",
    "confidence": 0.0到1.0之间的数字,
    "data": {
      "questions": [...],  // 仅 import 时
      "planParams": {...}, // 仅 plan 时
      "milestones": [...]  // 仅 plan 时，包含生成的里程碑
    }
  }
}

对于 plan 意图，data 中必须包含：
- planParams: { topic, duration }
- milestones: 里程碑数组，每个包含：
  - title: 里程碑标题
  - description: 详细描述
  - days: 预计天数
  - dailyTopics: 每日学习主题数组（长度等于 days）`

export function buildIntentPrompt(userMessage: string, subjects: string[]): string {
  const subjectList = subjects.length > 0
    ? `\n\n现有科目列表：${subjects.join('、')}`
    : ''

  return `${INTENT_PROMPT}${subjectList}

用户消息：
${userMessage}`
}

export function parseAIResponse(response: string): AIResponseWithIntent {
  try {
    // 尝试提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        reply: parsed.reply || response,
        intent: parsed.intent,
      }
    }
  } catch (error) {
    console.error('Failed to parse AI response:', error)
  }

  // 解析失败，返回普通回复
  return { reply: response }
}

export function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateMilestoneId(): string {
  return `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 计算里程碑目标日期
export function calculateMilestoneDates(
  milestones: ParsedMilestone[],
  startDate: Date = new Date()
): ParsedMilestone[] {
  let currentDate = new Date(startDate)

  return milestones.map(m => {
    const targetDate = new Date(currentDate)
    targetDate.setDate(targetDate.getDate() + m.days - 1)

    const result = {
      ...m,
      targetDate: targetDate.toISOString().split('T')[0],
    }

    // 下一个里程碑从当前里程碑结束后开始
    currentDate = new Date(targetDate)
    currentDate.setDate(currentDate.getDate() + 1)

    return result
  })
}
