import { dbHelpers } from './init'

const { run, get, all } = dbHelpers

// ==================== 错题相关操作 ====================

export const questionService = {
  // 获取所有错题
  getAll() {
    return all(`
      SELECT q.*, s.name as subject_name, c.name as chapter_name,
             GROUP_CONCAT(t.name) as tags
      FROM questions q
      LEFT JOIN subjects s ON q.subject_id = s.id
      LEFT JOIN chapters c ON q.chapter_id = c.id
      LEFT JOIN question_tags qt ON q.id = qt.question_id
      LEFT JOIN tags t ON qt.tag_id = t.id
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `)
  },

  // 根据 ID 获取错题
  getById(id: number) {
    const question = get(`
      SELECT q.*, s.name as subject_name, c.name as chapter_name
      FROM questions q
      LEFT JOIN subjects s ON q.subject_id = s.id
      LEFT JOIN chapters c ON q.chapter_id = c.id
      WHERE q.id = ?
    `, [id])

    if (!question) return null

    // 获取标签
    const tags = all(`
      SELECT t.* FROM tags t
      JOIN question_tags qt ON t.id = qt.tag_id
      WHERE qt.question_id = ?
    `, [id])

    return { ...question, tagList: tags }
  },

  // 创建错题
  create(data: {
    title: string
    content?: string
    answer?: string
    analysis?: string
    source?: string
    subject_id?: number
    chapter_id?: number
    difficulty?: number
    tags?: number[]
  }) {
    const result = run(`
      INSERT INTO questions (title, content, answer, analysis, source, subject_id, chapter_id, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.title,
      data.content || '',
      data.answer || '',
      data.analysis || '',
      data.source || '',
      data.subject_id || null,
      data.chapter_id || null,
      data.difficulty || 3
    ])

    const questionId = result.lastInsertRowid

    // 插入标签关联
    if (data.tags && data.tags.length > 0) {
      for (const tagId of data.tags) {
        run('INSERT OR IGNORE INTO question_tags (question_id, tag_id) VALUES (?, ?)', [questionId, tagId])
      }
    }

    return questionId
  },

  // 更新错题
  update(id: number, data: {
    title?: string
    content?: string
    answer?: string
    analysis?: string
    source?: string
    subject_id?: number
    chapter_id?: number
    difficulty?: number
    tags?: number[]
  }) {
    const fields: string[] = []
    const values: any[] = []

    if (data.title !== undefined) {
      fields.push('title = ?')
      values.push(data.title)
    }
    if (data.content !== undefined) {
      fields.push('content = ?')
      values.push(data.content)
    }
    if (data.answer !== undefined) {
      fields.push('answer = ?')
      values.push(data.answer)
    }
    if (data.analysis !== undefined) {
      fields.push('analysis = ?')
      values.push(data.analysis)
    }
    if (data.source !== undefined) {
      fields.push('source = ?')
      values.push(data.source)
    }
    if (data.subject_id !== undefined) {
      fields.push('subject_id = ?')
      values.push(data.subject_id)
    }
    if (data.chapter_id !== undefined) {
      fields.push('chapter_id = ?')
      values.push(data.chapter_id)
    }
    if (data.difficulty !== undefined) {
      fields.push('difficulty = ?')
      values.push(data.difficulty)
    }

    fields.push("updated_at = datetime('now', 'localtime')")

    if (fields.length > 0) {
      run(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }

    // 更新标签
    if (data.tags !== undefined) {
      // 删除旧标签
      run('DELETE FROM question_tags WHERE question_id = ?', [id])

      // 插入新标签
      if (data.tags.length > 0) {
        for (const tagId of data.tags) {
          run('INSERT INTO question_tags (question_id, tag_id) VALUES (?, ?)', [id, tagId])
        }
      }
    }
  },

  // 删除错题
  delete(id: number) {
    run('DELETE FROM questions WHERE id = ?', [id])
  },

  // 搜索错题
  search(query: string) {
    const searchPattern = `%${query}%`
    return all(`
      SELECT q.*, s.name as subject_name, c.name as chapter_name
      FROM questions q
      LEFT JOIN subjects s ON q.subject_id = s.id
      LEFT JOIN chapters c ON q.chapter_id = c.id
      WHERE q.title LIKE ? OR q.content LIKE ? OR q.source LIKE ?
      ORDER BY q.created_at DESC
    `, [searchPattern, searchPattern, searchPattern])
  },

  // 获取待复习的错题
  getForReview() {
    return all(`
      SELECT q.*, s.name as subject_name, c.name as chapter_name
      FROM questions q
      LEFT JOIN subjects s ON q.subject_id = s.id
      LEFT JOIN chapters c ON q.chapter_id = c.id
      WHERE q.next_review_date IS NULL OR q.next_review_date <= datetime('now', 'localtime')
      ORDER BY q.next_review_date ASC, q.created_at ASC
    `)
  },

  // 更新复习状态
  updateReviewStatus(id: number, data: {
    mastery_level: number
    review_count: number
    next_review_date: string
    last_review_date: string
  }) {
    run(`
      UPDATE questions
      SET mastery_level = ?, review_count = ?, next_review_date = ?, last_review_date = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [data.mastery_level, data.review_count, data.next_review_date, data.last_review_date, id])
  },
}

// ==================== 复习记录相关操作 ====================

export const reviewService = {
  // 获取某错题的复习记录
  getRecords(questionId: number) {
    return all(`
      SELECT * FROM review_records
      WHERE question_id = ?
      ORDER BY review_date DESC
    `, [questionId])
  },

  // 创建复习记录
  create(data: {
    question_id: number
    level: number
    feedback: string
    next_review_date: string
  }) {
    const result = run(`
      INSERT INTO review_records (question_id, level, feedback, next_review_date)
      VALUES (?, ?, ?, ?)
    `, [data.question_id, data.level, data.feedback, data.next_review_date])
    return result.lastInsertRowid
  },

  // 获取今日待复习列表
  getTodayReviews() {
    return all(`
      SELECT q.*, rr.review_date as last_review, rr.feedback as last_feedback
      FROM questions q
      LEFT JOIN review_records rr ON q.id = rr.question_id
      WHERE q.next_review_date IS NOT NULL
        AND date(q.next_review_date) <= date('now', 'localtime')
      GROUP BY q.id
      ORDER BY q.next_review_date ASC
    `)
  },

  // 获取复习统计
  getReviewStats(questionId: number) {
    return get(`
      SELECT
        COUNT(*) as total_reviews,
        SUM(CASE WHEN feedback = 'mastered' THEN 1 ELSE 0 END) as mastered_count,
        SUM(CASE WHEN feedback = 'familiar' THEN 1 ELSE 0 END) as familiar_count,
        SUM(CASE WHEN feedback = 'vague' THEN 1 ELSE 0 END) as vague_count,
        SUM(CASE WHEN feedback = 'forgotten' THEN 1 ELSE 0 END) as forgotten_count
      FROM review_records
      WHERE question_id = ?
    `, [questionId])
  },
}

// ==================== 科目相关操作 ====================

export const subjectService = {
  getAll() {
    return all(`
      SELECT s.*, COUNT(q.id) as question_count
      FROM subjects s
      LEFT JOIN questions q ON s.id = q.subject_id
      GROUP BY s.id
      ORDER BY s.created_at ASC
    `)
  },

  create(data: { name: string; color?: string; icon?: string }) {
    const result = run('INSERT INTO subjects (name, color, icon) VALUES (?, ?, ?)', [data.name, data.color || '#1890ff', data.icon || 'BookOutlined'])
    return result.lastInsertRowid
  },

  update(id: number, data: { name?: string; color?: string; icon?: string }) {
    const fields: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }
    if (data.color !== undefined) {
      fields.push('color = ?')
      values.push(data.color)
    }
    if (data.icon !== undefined) {
      fields.push('icon = ?')
      values.push(data.icon)
    }

    if (fields.length > 0) {
      run(`UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }
  },

  delete(id: number) {
    run('DELETE FROM subjects WHERE id = ?', [id])
  },
}

// ==================== 章节相关操作 ====================

export const chapterService = {
  getBySubject(subjectId: number) {
    return all(`
      SELECT c.*, COUNT(q.id) as question_count
      FROM chapters c
      LEFT JOIN questions q ON c.id = q.chapter_id
      WHERE c.subject_id = ?
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.created_at ASC
    `, [subjectId])
  },

  create(data: { subject_id: number; name: string; sort_order?: number }) {
    const result = run('INSERT INTO chapters (subject_id, name, sort_order) VALUES (?, ?, ?)', [data.subject_id, data.name, data.sort_order || 0])
    return result.lastInsertRowid
  },

  update(id: number, data: { name?: string; sort_order?: number }) {
    const fields: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }
    if (data.sort_order !== undefined) {
      fields.push('sort_order = ?')
      values.push(data.sort_order)
    }

    if (fields.length > 0) {
      run(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }
  },

  delete(id: number) {
    run('DELETE FROM chapters WHERE id = ?', [id])
  },
}

// ==================== 标签相关操作 ====================

export const tagService = {
  getAll() {
    return all(`
      SELECT t.*, COUNT(qt.question_id) as usage_count
      FROM tags t
      LEFT JOIN question_tags qt ON t.id = qt.tag_id
      GROUP BY t.id
      ORDER BY t.created_at ASC
    `)
  },

  create(data: { name: string; color?: string }) {
    const result = run('INSERT INTO tags (name, color) VALUES (?, ?)', [data.name, data.color || '#52c41a'])
    return result.lastInsertRowid
  },

  update(id: number, data: { name?: string; color?: string }) {
    const fields: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }
    if (data.color !== undefined) {
      fields.push('color = ?')
      values.push(data.color)
    }

    if (fields.length > 0) {
      run(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }
  },

  delete(id: number) {
    run('DELETE FROM tags WHERE id = ?', [id])
  },
}

// ==================== 统计相关操作 ====================

export const statisticsService = {
  // 获取概览统计
  getOverview() {
    return get(`
      SELECT
        (SELECT COUNT(*) FROM questions) as total_questions,
        (SELECT COUNT(*) FROM questions WHERE mastery_level >= 7) as mastered_questions,
        (SELECT COUNT(*) FROM questions WHERE next_review_date IS NOT NULL AND date(next_review_date) <= date('now', 'localtime')) as today_reviews,
        (SELECT COUNT(*) FROM review_records WHERE date(review_date) = date('now', 'localtime')) as completed_today,
        (SELECT COUNT(*) FROM subjects) as total_subjects,
        (SELECT COUNT(*) FROM tags) as total_tags
    `)
  },

  // 获取各科目统计
  getSubjectStats() {
    return all(`
      SELECT
        s.id, s.name, s.color,
        COUNT(q.id) as total,
        SUM(CASE WHEN q.mastery_level >= 7 THEN 1 ELSE 0 END) as mastered,
        AVG(q.difficulty) as avg_difficulty
      FROM subjects s
      LEFT JOIN questions q ON s.id = q.subject_id
      GROUP BY s.id
      HAVING total > 0
      ORDER BY total DESC
    `)
  },

  // 获取每日学习统计
  getDailyStats(days: number = 30) {
    return all(`
      SELECT
        date(review_date) as date,
        COUNT(*) as review_count,
        SUM(CASE WHEN feedback = 'mastered' THEN 1 ELSE 0 END) as mastered_count,
        SUM(CASE WHEN feedback = 'forgotten' THEN 1 ELSE 0 END) as forgotten_count
      FROM review_records
      WHERE review_date >= datetime('now', '-' || ? || ' days', 'localtime')
      GROUP BY date(review_date)
      ORDER BY date ASC
    `, [days])
  },

  // 获取复习完成率
  getCompletionRate() {
    return all(`
      SELECT
        date(next_review_date) as date,
        COUNT(*) as total
      FROM questions
      WHERE next_review_date IS NOT NULL
        AND date(next_review_date) <= date('now', 'localtime')
      GROUP BY date(next_review_date)
      ORDER BY date ASC
    `)
  },
}

// ==================== 录音相关操作 ====================

export const audioService = {
  // 获取某错题的所有录音
  getByQuestion(questionId: number) {
    return all(`
      SELECT id, question_id, type, title, duration, created_at
      FROM audio_recordings
      WHERE question_id = ?
      ORDER BY created_at DESC
    `, [questionId])
  },

  // 获取录音数据
  getAudioData(id: number) {
    return get(`
      SELECT audio_data FROM audio_recordings WHERE id = ?
    `, [id])
  },

  // 创建录音
  create(data: {
    question_id: number
    type: 'explanation' | 'answer'
    title?: string
    duration: number
    audio_data: Uint8Array
  }) {
    const database = dbHelpers.getDatabase()
    const stmt = database.prepare(`
      INSERT INTO audio_recordings (question_id, type, title, duration, audio_data)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.bind([
      data.question_id,
      data.type,
      data.title || '',
      data.duration,
      data.audio_data,
    ])
    stmt.step()
    stmt.free()
    dbHelpers.saveDatabase()

    // 返回最后插入的 ID
    const result = get('SELECT last_insert_rowid() as id')
    return result?.id
  },

  // 删除录音
  delete(id: number) {
    run('DELETE FROM audio_recordings WHERE id = ?', [id])
  },

  // 更新录音标题
  updateTitle(id: number, title: string) {
    run('UPDATE audio_recordings SET title = ? WHERE id = ?', [title, id])
  },
}

// ==================== 每日TODO相关操作 ====================

export const todoService = {
  // 获取某天的所有TODO
  getByDate(date: string) {
    return all(`
      SELECT * FROM daily_todos
      WHERE date = ?
      ORDER BY sort_order ASC, created_at ASC
    `, [date])
  },

  // 创建TODO
  create(data: { date: string; content: string; sort_order?: number }) {
    const result = run(`
      INSERT INTO daily_todos (date, content, sort_order)
      VALUES (?, ?, ?)
    `, [data.date, data.content, data.sort_order || 0])
    return result.lastInsertRowid
  },

  // 更新TODO
  update(id: number, data: { content?: string; completed?: number; sort_order?: number }) {
    const fields: string[] = []
    const values: any[] = []

    if (data.content !== undefined) {
      fields.push('content = ?')
      values.push(data.content)
    }
    if (data.completed !== undefined) {
      fields.push('completed = ?')
      values.push(data.completed)
    }
    if (data.sort_order !== undefined) {
      fields.push('sort_order = ?')
      values.push(data.sort_order)
    }

    if (fields.length > 0) {
      run(`UPDATE daily_todos SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }
  },

  // 删除TODO
  delete(id: number) {
    run('DELETE FROM daily_todos WHERE id = ?', [id])
  },

  // 批量更新排序
  updateOrder(items: { id: number; sort_order: number }[]) {
    for (const item of items) {
      run('UPDATE daily_todos SET sort_order = ? WHERE id = ?', [item.sort_order, item.id])
    }
  },

  // 获取某天的完成率
  getCompletionRate(date: string) {
    return get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
      FROM daily_todos
      WHERE date = ?
    `, [date])
  },

  // 获取最近N天的TODO统计
  getRecentStats(days: number) {
    return all(`
      SELECT
        date,
        COUNT(*) as total,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
      FROM daily_todos
      WHERE date >= date('now', '-' || ? || ' days', 'localtime')
      GROUP BY date
      ORDER BY date DESC
    `, [days])
  },
}

// ==================== 每日总结相关操作 ====================

export const summaryService = {
  // 获取某天的总结
  getByDate(date: string) {
    return get(`
      SELECT * FROM daily_summaries WHERE date = ?
    `, [date])
  },

  // 获取最近N天的总结
  getRecent(days: number) {
    return all(`
      SELECT * FROM daily_summaries
      WHERE date >= date('now', '-' || ? || ' days', 'localtime')
      ORDER BY date DESC
    `, [days])
  },

  // 创建或更新总结
  upsert(data: { date: string; summary: string; mood?: string }) {
    const existing = get('SELECT id FROM daily_summaries WHERE date = ?', [data.date])

    if (existing) {
      run(`
        UPDATE daily_summaries
        SET summary = ?, mood = ?, updated_at = datetime('now', 'localtime')
        WHERE date = ?
      `, [data.summary, data.mood || 'good', data.date])
      return existing.id
    } else {
      const result = run(`
        INSERT INTO daily_summaries (date, summary, mood)
        VALUES (?, ?, ?)
      `, [data.date, data.summary, data.mood || 'good'])
      return result.lastInsertRowid
    }
  },

  // 删除总结
  delete(date: string) {
    run('DELETE FROM daily_summaries WHERE date = ?', [date])
  },
}

// ==================== 学习时间相关操作 ====================

export const learningTimeService = {
  // 获取某天的学习时间记录
  getByDate(date: string) {
    return all(`
      SELECT l.*, s.name as subject_name, s.color as subject_color
      FROM learning_time l
      LEFT JOIN subjects s ON l.subject_id = s.id
      WHERE l.date = ?
      ORDER BY l.created_at DESC
    `, [date])
  },

  // 获取某天总学习时间
  getTotalByDate(date: string) {
    return get(`
      SELECT COALESCE(SUM(duration), 0) as total_duration
      FROM learning_time
      WHERE date = ?
    `, [date])
  },

  // 创建学习时间记录
  create(data: { date: string; duration: number; subject_id?: number; note?: string; source?: string; pomodoro_id?: number }) {
    const result = run(`
      INSERT INTO learning_time (date, duration, subject_id, note, source, pomodoro_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.date, data.duration, data.subject_id || null, data.note || '', data.source || 'manual', data.pomodoro_id || null])
    return result.lastInsertRowid
  },

  // 更新学习时间记录
  update(id: number, data: { duration?: number; subject_id?: number; note?: string }) {
    const fields: string[] = []
    const values: any[] = []

    if (data.duration !== undefined) {
      fields.push('duration = ?')
      values.push(data.duration)
    }
    if (data.subject_id !== undefined) {
      fields.push('subject_id = ?')
      values.push(data.subject_id)
    }
    if (data.note !== undefined) {
      fields.push('note = ?')
      values.push(data.note)
    }

    if (fields.length > 0) {
      run(`UPDATE learning_time SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }
  },

  // 删除学习时间记录
  delete(id: number) {
    run('DELETE FROM learning_time WHERE id = ?', [id])
  },

  // 获取周/月/年统计
  getStats(period: 'week' | 'month' | 'year') {
    let days = period === 'week' ? 7 : period === 'month' ? 30 : 365
    return all(`
      SELECT
        date,
        SUM(duration) as total_duration
      FROM learning_time
      WHERE date >= date('now', '-' || ? || ' days', 'localtime')
      GROUP BY date
      ORDER BY date ASC
    `, [days])
  },

  // 获取某时间段的科目分布
  getSubjectDistribution(days: number) {
    return all(`
      SELECT
        s.id, s.name, s.color,
        SUM(l.duration) as total_duration
      FROM learning_time l
      LEFT JOIN subjects s ON l.subject_id = s.id
      WHERE l.date >= date('now', '-' || ? || ' days', 'localtime')
      GROUP BY s.id
      ORDER BY total_duration DESC
    `, [days])
  },
}

// ==================== 任务相关操作 ====================

export const taskService = {
  // 获取所有任务
  getAll(status?: string) {
    let sql = `
      SELECT t.*,
        (SELECT COUNT(*) FROM task_subitems WHERE task_id = t.id) as subitem_count,
        (SELECT COUNT(*) FROM task_subitems WHERE task_id = t.id AND completed = 1) as completed_subitems
      FROM tasks t
    `
    const params: any[] = []

    if (status) {
      sql += ' WHERE t.status = ?'
      params.push(status)
    }

    sql += ' ORDER BY t.deadline ASC, t.priority DESC, t.created_at DESC'

    return all(sql, params)
  },

  // 获取活跃任务（未完成）
  getActive() {
    return all(`
      SELECT t.*,
        (SELECT COUNT(*) FROM task_subitems WHERE task_id = t.id) as subitem_count,
        (SELECT COUNT(*) FROM task_subitems WHERE task_id = t.id AND completed = 1) as completed_subitems
      FROM tasks t
      WHERE t.status != 'completed'
      ORDER BY t.deadline ASC, t.priority DESC
    `)
  },

  // 获取即将到期的任务
  getUpcoming(days: number) {
    return all(`
      SELECT t.*,
        (SELECT COUNT(*) FROM task_subitems WHERE task_id = t.id) as subitem_count,
        (SELECT COUNT(*) FROM task_subitems WHERE task_id = t.id AND completed = 1) as completed_subitems
      FROM tasks t
      WHERE t.status != 'completed'
        AND date(t.deadline) <= date('now', '+' || ? || ' days', 'localtime')
      ORDER BY t.deadline ASC, t.priority DESC
    `, [days])
  },

  // 获取单个任务
  getById(id: number) {
    return get(`
      SELECT t.*,
        (SELECT COUNT(*) FROM task_subitems WHERE task_id = t.id) as subitem_count,
        (SELECT COUNT(*) FROM task_subitems WHERE task_id = t.id AND completed = 1) as completed_subitems
      FROM tasks t
      WHERE t.id = ?
    `, [id])
  },

  // 创建任务
  create(data: {
    title: string
    description?: string
    deadline: string
    priority?: number
    progress_type?: 'percentage' | 'subitems'
    total_value?: number
  }) {
    const result = run(`
      INSERT INTO tasks (title, description, deadline, priority, progress_type, total_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.title,
      data.description || '',
      data.deadline,
      data.priority || 2,
      data.progress_type || 'percentage',
      data.total_value || 100
    ])
    return result.lastInsertRowid
  },

  // 更新任务
  update(id: number, data: {
    title?: string
    description?: string
    deadline?: string
    priority?: number
    status?: string
    current_value?: number
  }) {
    const fields: string[] = ['updated_at = datetime(\'now\', \'localtime\')']
    const values: any[] = []

    if (data.title !== undefined) {
      fields.push('title = ?')
      values.push(data.title)
    }
    if (data.description !== undefined) {
      fields.push('description = ?')
      values.push(data.description)
    }
    if (data.deadline !== undefined) {
      fields.push('deadline = ?')
      values.push(data.deadline)
    }
    if (data.priority !== undefined) {
      fields.push('priority = ?')
      values.push(data.priority)
    }
    if (data.status !== undefined) {
      fields.push('status = ?')
      values.push(data.status)
      if (data.status === 'completed') {
        fields.push('completed_at = datetime(\'now\', \'localtime\')')
      }
    }
    if (data.current_value !== undefined) {
      fields.push('current_value = ?')
      values.push(data.current_value)
    }

    run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
  },

  // 删除任务
  delete(id: number) {
    run('DELETE FROM tasks WHERE id = ?', [id])
  },
}

// ==================== 任务子项目相关操作 ====================

export const taskSubitemService = {
  // 获取任务的所有子项目
  getByTask(taskId: number) {
    return all(`
      SELECT * FROM task_subitems
      WHERE task_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `, [taskId])
  },

  // 创建子项目
  create(data: { task_id: number; title: string; sort_order?: number }) {
    const result = run(`
      INSERT INTO task_subitems (task_id, title, sort_order)
      VALUES (?, ?, ?)
    `, [data.task_id, data.title, data.sort_order || 0])
    return result.lastInsertRowid
  },

  // 更新子项目
  update(id: number, data: { title?: string; completed?: number; sort_order?: number }) {
    const fields: string[] = []
    const values: any[] = []

    if (data.title !== undefined) {
      fields.push('title = ?')
      values.push(data.title)
    }
    if (data.completed !== undefined) {
      fields.push('completed = ?')
      values.push(data.completed)
    }
    if (data.sort_order !== undefined) {
      fields.push('sort_order = ?')
      values.push(data.sort_order)
    }

    if (fields.length > 0) {
      run(`UPDATE task_subitems SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }
  },

  // 删除子项目
  delete(id: number) {
    run('DELETE FROM task_subitems WHERE id = ?', [id])
  },
}

// ==================== 任务进度相关操作 ====================

export const taskProgressService = {
  // 获取任务的进度记录
  getByTask(taskId: number) {
    return all(`
      SELECT * FROM task_progress
      WHERE task_id = ?
      ORDER BY date DESC, created_at DESC
    `, [taskId])
  },

  // 获取某天的所有进度记录
  getByDate(date: string) {
    return all(`
      SELECT tp.*, t.title as task_title, t.deadline
      FROM task_progress tp
      JOIN tasks t ON tp.task_id = t.id
      WHERE tp.date = ?
      ORDER BY tp.created_at DESC
    `, [date])
  },

  // 创建进度记录
  create(data: { task_id: number; date: string; progress_value?: number; note?: string }) {
    const result = run(`
      INSERT INTO task_progress (task_id, date, progress_value, note)
      VALUES (?, ?, ?, ?)
    `, [data.task_id, data.date, data.progress_value || 0, data.note || ''])
    return result.lastInsertRowid
  },

  // 删除进度记录
  delete(id: number) {
    run('DELETE FROM task_progress WHERE id = ?', [id])
  },
}

// ==================== 里程碑相关操作 ====================

export const milestoneService = {
  // 获取任务的所有里程碑
  getByTask(taskId: number) {
    return all(`
      SELECT * FROM milestones
      WHERE task_id = ?
      ORDER BY target_date ASC, created_at ASC
    `, [taskId])
  },

  // 创建里程碑
  create(data: { task_id: number; title: string; description?: string; target_date?: string }) {
    const result = run(`
      INSERT INTO milestones (task_id, title, description, target_date)
      VALUES (?, ?, ?, ?)
    `, [data.task_id, data.title, data.description || '', data.target_date || null])
    return result.lastInsertRowid
  },

  // 更新里程碑
  update(id: number, data: { title?: string; description?: string; target_date?: string; completed?: number }) {
    const fields: string[] = []
    const values: any[] = []

    if (data.title !== undefined) {
      fields.push('title = ?')
      values.push(data.title)
    }
    if (data.description !== undefined) {
      fields.push('description = ?')
      values.push(data.description)
    }
    if (data.target_date !== undefined) {
      fields.push('target_date = ?')
      values.push(data.target_date)
    }
    if (data.completed !== undefined) {
      fields.push('completed = ?')
      values.push(data.completed)
      if (data.completed === 1) {
        fields.push('completed_at = datetime(\'now\', \'localtime\')')
      }
    }

    if (fields.length > 0) {
      run(`UPDATE milestones SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }
  },

  // 删除里程碑
  delete(id: number) {
    run('DELETE FROM milestones WHERE id = ?', [id])
  },
}

// ==================== AI配置相关操作 ====================

export const aiSettingsService = {
  // 获取AI配置
  get() {
    return get(`SELECT * FROM ai_settings LIMIT 1`)
  },

  // 保存AI配置
  save(data: { provider: string; api_key: string; api_base_url?: string; model?: string; system_prompt?: string }) {
    const existing = get('SELECT id FROM ai_settings LIMIT 1')

    if (existing) {
      run(`
        UPDATE ai_settings
        SET provider = ?, api_key = ?, api_base_url = ?, model = ?, system_prompt = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `, [data.provider, data.api_key, data.api_base_url || '', data.model || 'gpt-3.5-turbo', data.system_prompt || '', existing.id])
      return existing.id
    } else {
      const result = run(`
        INSERT INTO ai_settings (provider, api_key, api_base_url, model, system_prompt)
        VALUES (?, ?, ?, ?, ?)
      `, [data.provider, data.api_key, data.api_base_url || '', data.model || 'gpt-3.5-turbo', data.system_prompt || ''])
      return result.lastInsertRowid
    }
  },

  // 删除配置
  delete() {
    run('DELETE FROM ai_settings')
  },
}

// ==================== 聊天历史相关操作 ====================

export const chatHistoryService = {
  // 获取聊天历史
  getAll(limit: number = 100) {
    return all(`
      SELECT ch.*, s.name as subject_name
      FROM chat_history ch
      LEFT JOIN subjects s ON ch.subject_id = s.id
      ORDER BY ch.created_at DESC
      LIMIT ?
    `, [limit])
  },

  // 添加聊天记录
  add(data: { role: string; content: string; subject_id?: number }) {
    const result = run(`
      INSERT INTO chat_history (role, content, subject_id)
      VALUES (?, ?, ?)
    `, [data.role, data.content, data.subject_id || null])
    return result.lastInsertRowid
  },

  // 标记为已保存为错题
  markAsSaved(id: number) {
    run('UPDATE chat_history SET saved_as_question = 1 WHERE id = ?', [id])
  },

  // 清空历史
  clear() {
    run('DELETE FROM chat_history')
  },

  // 删除单条记录
  delete(id: number) {
    run('DELETE FROM chat_history WHERE id = ?', [id])
  },
}

// ==================== 弱势点相关操作 ====================

export const weakPointService = {
  // 获取所有弱势点
  getAll() {
    return all(`
      SELECT wp.*, s.name as subject_name, s.color as subject_color
      FROM weak_points wp
      LEFT JOIN subjects s ON wp.subject_id = s.id
      ORDER BY wp.severity DESC, wp.created_at DESC
    `)
  },

  // 获取某科目的弱势点
  getBySubject(subjectId: number) {
    return all(`
      SELECT * FROM weak_points
      WHERE subject_id = ?
      ORDER BY severity DESC, created_at DESC
    `, [subjectId])
  },

  // 添加弱势点
  add(data: { subject_id?: number; topic: string; description?: string; severity?: number; source?: string }) {
    const result = run(`
      INSERT INTO weak_points (subject_id, topic, description, severity, source)
      VALUES (?, ?, ?, ?, ?)
    `, [data.subject_id || null, data.topic, data.description || '', data.severity || 2, data.source || ''])
    return result.lastInsertRowid
  },

  // 更新弱势点
  update(id: number, data: { topic?: string; description?: string; severity?: number }) {
    const fields: string[] = []
    const values: any[] = []

    if (data.topic !== undefined) {
      fields.push('topic = ?')
      values.push(data.topic)
    }
    if (data.description !== undefined) {
      fields.push('description = ?')
      values.push(data.description)
    }
    if (data.severity !== undefined) {
      fields.push('severity = ?')
      values.push(data.severity)
    }

    if (fields.length > 0) {
      run(`UPDATE weak_points SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }
  },

  // 删除弱势点
  delete(id: number) {
    run('DELETE FROM weak_points WHERE id = ?', [id])
  },
}

// ==================== 番茄钟相关操作 ====================

export const pomodoroService = {
  // 获取设置
  getSettings() {
    return get('SELECT * FROM pomodoro_settings WHERE id = 1')
  },

  // 保存设置
  saveSettings(data: {
    focus_duration?: number
    break_duration?: number
    auto_start_break?: number
    auto_start_focus?: number
    daily_goal?: number
    default_subject_id?: number
    notification_sound?: number
    max_pause_duration?: number
  }) {
    const existing = get('SELECT id FROM pomodoro_settings WHERE id = 1')

    if (existing) {
      // Update existing settings
      const fields: string[] = []
      const values: any[] = []

      if (data.focus_duration !== undefined) {
        fields.push('focus_duration = ?')
        values.push(data.focus_duration)
      }
      if (data.break_duration !== undefined) {
        fields.push('break_duration = ?')
        values.push(data.break_duration)
      }
      if (data.auto_start_break !== undefined) {
        fields.push('auto_start_break = ?')
        values.push(data.auto_start_break)
      }
      if (data.auto_start_focus !== undefined) {
        fields.push('auto_start_focus = ?')
        values.push(data.auto_start_focus)
      }
      if (data.daily_goal !== undefined) {
        fields.push('daily_goal = ?')
        values.push(data.daily_goal)
      }
      if (data.default_subject_id !== undefined) {
        fields.push('default_subject_id = ?')
        values.push(data.default_subject_id)
      }
      if (data.notification_sound !== undefined) {
        fields.push('notification_sound = ?')
        values.push(data.notification_sound)
      }
      if (data.max_pause_duration !== undefined) {
        fields.push('max_pause_duration = ?')
        values.push(data.max_pause_duration)
      }

      if (fields.length > 0) {
        run(`UPDATE pomodoro_settings SET ${fields.join(', ')} WHERE id = 1`, values)
      }
      return existing.id
    } else {
      // Insert new settings
      const result = run(`
        INSERT INTO pomodoro_settings (id, focus_duration, break_duration, auto_start_break, auto_start_focus, daily_goal, default_subject_id, notification_sound, max_pause_duration)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.focus_duration ?? 25,
        data.break_duration ?? 5,
        data.auto_start_break ?? 0,
        data.auto_start_focus ?? 0,
        data.daily_goal ?? 8,
        data.default_subject_id ?? null,
        data.notification_sound ?? 1,
        data.max_pause_duration ?? 300,
      ])
      return result.lastInsertRowid
    }
  },

  // 创建番茄钟会话
  createSession(data: {
    date: string
    start_time: string
    planned_duration: number
    subject_id?: number
    goal?: string
  }) {
    const result = run(`
      INSERT INTO pomodoro_sessions (date, start_time, planned_duration, subject_id, goal)
      VALUES (?, ?, ?, ?, ?)
    `, [data.date, data.start_time, data.planned_duration, data.subject_id || null, data.goal || ''])
    return result.lastInsertRowid
  },

  // 更新番茄钟会话
  updateSession(id: number, data: {
    end_time?: string
    duration?: number
    status?: string
    pause_count?: number
    total_pause_time?: number
    subject_id?: number
    goal?: string
  }) {
    const fields: string[] = []
    const values: any[] = []

    if (data.end_time !== undefined) {
      fields.push('end_time = ?')
      values.push(data.end_time)
    }
    if (data.duration !== undefined) {
      fields.push('duration = ?')
      values.push(data.duration)
    }
    if (data.status !== undefined) {
      fields.push('status = ?')
      values.push(data.status)
    }
    if (data.pause_count !== undefined) {
      fields.push('pause_count = ?')
      values.push(data.pause_count)
    }
    if (data.total_pause_time !== undefined) {
      fields.push('total_pause_time = ?')
      values.push(data.total_pause_time)
    }
    if (data.subject_id !== undefined) {
      fields.push('subject_id = ?')
      values.push(data.subject_id)
    }
    if (data.goal !== undefined) {
      fields.push('goal = ?')
      values.push(data.goal)
    }

    if (fields.length > 0) {
      run(`UPDATE pomodoro_sessions SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }
  },

  // 获取今日统计
  getTodayStats() {
    return get(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(duration), 0) as total_duration
      FROM pomodoro_sessions
      WHERE date = date('now', 'localtime') AND status = 'completed'
    `)
  },

  // 获取未完成的会话
  getIncompleteSession() {
    return get(`
      SELECT * FROM pomodoro_sessions
      WHERE end_time IS NULL
      ORDER BY start_time DESC
      LIMIT 1
    `)
  },
}
