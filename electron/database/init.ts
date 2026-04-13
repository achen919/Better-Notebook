import initSqlJs, { Database } from 'sql.js'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let db: Database | null = null
let SQL: any = null
let dbPath: string = ''

// 获取数据库路径
export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  const dbDir = path.join(userDataPath, 'data')

  // 确保目录存在
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  return path.join(dbDir, 'ebbinghaus.db')
}

// 获取 WASM 文件路径
function getWasmPath(): string {
  // 开发环境
  if (!app.isPackaged) {
    return path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm')
  }
  // 生产环境 - 从 app.asar 中读取
  return path.join(process.resourcesPath, 'sql-wasm.wasm')
}

// 初始化数据库
export async function initDatabase(): Promise<Database> {
  dbPath = getDatabasePath()

  // 初始化 SQL.js，在 Electron 中需要手动加载 wasm
  const wasmPath = getWasmPath()
  console.log('Loading WASM from:', wasmPath)

  const wasmBinary = fs.readFileSync(wasmPath)

  SQL = await initSqlJs({
    wasmBinary,
  })

  // 如果数据库文件存在，加载它
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // 创建表
  createTables()

  return db
}

// 保存数据库到文件
export function saveDatabase() {
  if (db && dbPath) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

// 获取数据库实例
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

// 关闭数据库
export function closeDatabase() {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}

// 执行 SQL 语句（带自动保存）
function run(sql: string, params: any[] = []): any {
  const database = getDatabase()
  try {
    const result = database.run(sql, params)
    saveDatabase()
    return result
  } catch (error) {
    console.error('SQL Error:', error)
    throw error
  }
}

// 查询单行
function get(sql: string, params: any[] = []): any {
  const database = getDatabase()
  const stmt = database.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return null
}

// 查询多行
function all(sql: string, params: any[] = []): any[] {
  const database = getDatabase()
  const results: any[] = []
  const stmt = database.prepare(sql)
  stmt.bind(params)
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

// 检查列是否存在
function columnExists(tableName: string, columnName: string): boolean {
  const database = getDatabase()
  const result = database.exec(`PRAGMA table_info(${tableName})`)
  if (result.length === 0) return false
  const columns = result[0].values.map(row => (row as any[])[1])
  return columns.includes(columnName)
}

// 添加缺失的列
function runMigrations() {
  const database = getDatabase()

  // ai_settings 表 - 添加 system_prompt 列
  if (!columnExists('ai_settings', 'system_prompt')) {
    console.log('Migrating: Adding system_prompt column to ai_settings table')
    database.run('ALTER TABLE ai_settings ADD COLUMN system_prompt TEXT')
  }

  saveDatabase()
}

// 创建所有表
function createTables() {
  const database = getDatabase()

  // 科目表
  database.run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#1890ff',
      icon TEXT DEFAULT 'BookOutlined',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 章节表
  database.run(`
    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )
  `)

  // 标签表
  database.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#52c41a',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 错题表
  database.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      answer TEXT,
      analysis TEXT,
      source TEXT,
      subject_id INTEGER,
      chapter_id INTEGER,
      difficulty INTEGER DEFAULT 3,
      mastery_level INTEGER DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      next_review_date DATETIME,
      last_review_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
    )
  `)

  // 错题标签关联表
  database.run(`
    CREATE TABLE IF NOT EXISTS question_tags (
      question_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (question_id, tag_id),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `)

  // 复习记录表
  database.run(`
    CREATE TABLE IF NOT EXISTS review_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      review_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      level INTEGER DEFAULT 0,
      feedback TEXT DEFAULT 'familiar',
      next_review_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `)

  // 录音记录表
  database.run(`
    CREATE TABLE IF NOT EXISTS audio_recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'explanation',
      title TEXT,
      duration INTEGER DEFAULT 0,
      audio_data BLOB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `)

  // 每日TODO表
  database.run(`
    CREATE TABLE IF NOT EXISTS daily_todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 每日总结表
  database.run(`
    CREATE TABLE IF NOT EXISTS daily_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      summary TEXT,
      mood TEXT DEFAULT 'good',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 学习时间记录表
  database.run(`
    CREATE TABLE IF NOT EXISTS learning_time (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      subject_id INTEGER,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    )
  `)

  // 任务表（带deadline）
  database.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT NOT NULL,
      priority INTEGER DEFAULT 2,
      status TEXT DEFAULT 'pending',
      progress_type TEXT DEFAULT 'percentage',
      total_value INTEGER DEFAULT 100,
      current_value INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `)

  // 任务子项目表
  database.run(`
    CREATE TABLE IF NOT EXISTS task_subitems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // 任务进度记录表
  database.run(`
    CREATE TABLE IF NOT EXISTS task_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      progress_value INTEGER DEFAULT 0,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // 里程碑表
  database.run(`
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // AI配置表
  database.run(`
    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT DEFAULT 'openai',
      api_key TEXT,
      api_base_url TEXT,
      model TEXT DEFAULT 'gpt-3.5-turbo',
      system_prompt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // AI聊天历史表
  database.run(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      subject_id INTEGER,
      saved_as_question INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    )
  `)

  // 弱势点记录表
  database.run(`
    CREATE TABLE IF NOT EXISTS weak_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      topic TEXT NOT NULL,
      description TEXT,
      severity INTEGER DEFAULT 2,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    )
  `)

  // 插入默认科目（如果表为空）
  const countResult = database.exec('SELECT COUNT(*) as count FROM subjects')
  const count = countResult.length > 0 ? (countResult[0].values[0] as any[])[0] : 0
  if (count === 0) {
    const defaultSubjects = [
      { name: '数学', color: '#1890ff', icon: 'CalculatorOutlined' },
      { name: '英语', color: '#52c41a', icon: 'GlobalOutlined' },
      { name: '物理', color: '#fa8c16', icon: 'ExperimentOutlined' },
      { name: '化学', color: '#eb2f96', icon: 'ThunderboltOutlined' },
      { name: '生物', color: '#13c2c2', icon: 'AimOutlined' },
    ]

    for (const subject of defaultSubjects) {
      database.run('INSERT INTO subjects (name, color, icon) VALUES (?, ?, ?)', [subject.name, subject.color, subject.icon])
    }

    // 插入默认章节
    const defaultChapters = [
      // 数学章节
      { subject_id: 1, name: '函数与导数', sort_order: 1 },
      { subject_id: 1, name: '三角函数', sort_order: 2 },
      { subject_id: 1, name: '数列', sort_order: 3 },
      { subject_id: 1, name: '立体几何', sort_order: 4 },
      { subject_id: 1, name: '解析几何', sort_order: 5 },
      { subject_id: 1, name: '概率统计', sort_order: 6 },
      // 英语章节
      { subject_id: 2, name: '阅读理解', sort_order: 1 },
      { subject_id: 2, name: '完形填空', sort_order: 2 },
      { subject_id: 2, name: '语法填空', sort_order: 3 },
      { subject_id: 2, name: '写作', sort_order: 4 },
      { subject_id: 2, name: '听力', sort_order: 5 },
      // 物理章节
      { subject_id: 3, name: '力学', sort_order: 1 },
      { subject_id: 3, name: '电磁学', sort_order: 2 },
      { subject_id: 3, name: '热学', sort_order: 3 },
      { subject_id: 3, name: '光学', sort_order: 4 },
      { subject_id: 3, name: '近代物理', sort_order: 5 },
      // 化学章节
      { subject_id: 4, name: '有机化学', sort_order: 1 },
      { subject_id: 4, name: '无机化学', sort_order: 2 },
      { subject_id: 4, name: '化学反应原理', sort_order: 3 },
      { subject_id: 4, name: '物质结构', sort_order: 4 },
      // 生物章节
      { subject_id: 5, name: '细胞生物学', sort_order: 1 },
      { subject_id: 5, name: '遗传与进化', sort_order: 2 },
      { subject_id: 5, name: '生态学', sort_order: 3 },
      { subject_id: 5, name: '生理学', sort_order: 4 },
    ]

    for (const chapter of defaultChapters) {
      database.run('INSERT INTO chapters (subject_id, name, sort_order) VALUES (?, ?, ?)', [chapter.subject_id, chapter.name, chapter.sort_order])
    }
  }

  // 插入默认标签（如果表为空）
  const tagCountResult = database.exec('SELECT COUNT(*) as count FROM tags')
  const tagCount = tagCountResult.length > 0 ? (tagCountResult[0].values[0] as any[])[0] : 0
  if (tagCount === 0) {
    const defaultTags = [
      { name: '重点', color: '#f5222d' },
      { name: '易错', color: '#fa8c16' },
      { name: '难点', color: '#722ed1' },
      { name: '已掌握', color: '#52c41a' },
      { name: '待复习', color: '#1890ff' },
      { name: '高频考点', color: '#eb2f96' },
      { name: '基础题', color: '#13c2c2' },
      { name: '拔高题', color: '#722ed1' },
    ]

    for (const tag of defaultTags) {
      database.run('INSERT INTO tags (name, color) VALUES (?, ?)', [tag.name, tag.color])
    }
  }

  // 插入示例任务（如果表为空）
  const taskCountResult = database.exec('SELECT COUNT(*) as count FROM tasks')
  const taskCount = taskCountResult.length > 0 ? (taskCountResult[0].values[0] as any[])[0] : 0
  if (taskCount === 0) {
    const today = new Date()
    const formatDate = (date: Date) => date.toISOString().split('T')[0]

    const defaultTasks = [
      {
        title: '数学期中考试复习',
        description: '复习函数与导数、三角函数章节',
        deadline: formatDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)), // 7天后
        priority: 3,
        progress_type: 'percentage',
        current_value: 30,
      },
      {
        title: '英语词汇背诵计划',
        description: '每天背诵50个单词',
        deadline: formatDate(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)), // 14天后
        priority: 2,
        progress_type: 'percentage',
        current_value: 45,
      },
      {
        title: '物理实验报告',
        description: '完成力学实验报告',
        deadline: formatDate(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)), // 3天后
        priority: 4,
        progress_type: 'percentage',
        current_value: 60,
      },
      {
        title: '化学方程式整理',
        description: '整理有机化学重点方程式',
        deadline: formatDate(new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)), // 5天后
        priority: 2,
        progress_type: 'subitems',
        current_value: 0,
      },
      {
        title: '生物知识点总结',
        description: '总结细胞生物学重点内容',
        deadline: formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)), // 已逾期2天
        priority: 3,
        progress_type: 'percentage',
        current_value: 80,
      },
    ]

    for (const task of defaultTasks) {
      database.run(
        'INSERT INTO tasks (title, description, deadline, priority, progress_type, current_value) VALUES (?, ?, ?, ?, ?, ?)',
        [task.title, task.description, task.deadline, task.priority, task.progress_type, task.current_value]
      )
    }
  }

  // 插入示例错题（如果表为空）
  const questionCountResult = database.exec('SELECT COUNT(*) as count FROM questions')
  const questionCount = questionCountResult.length > 0 ? (questionCountResult[0].values[0] as any[])[0] : 0
  if (questionCount === 0) {
    const defaultQuestions = [
      {
        title: '求函数f(x)=x³-3x的单调区间',
        content: '已知函数f(x)=x³-3x，求函数的单调区间和极值。',
        answer: '单调递增区间：(-∞,-1]和[1,+∞)；单调递减区间：[-1,1]；极大值f(-1)=2，极小值f(1)=-2',
        analysis: '先求导f\'(x)=3x²-3=3(x+1)(x-1)，令f\'(x)=0得x=±1。根据导数符号判断单调性。',
        source: '数学必修一 第三章',
        subject_id: 1,
        chapter_id: 1,
        difficulty: 3,
      },
      {
        title: '英语阅读理解：科技类文章',
        content: 'According to the passage, which of the following is TRUE about artificial intelligence?',
        answer: 'B. AI can help doctors diagnose diseases more accurately.',
        analysis: '注意定位关键词，在第三段第一句找到相关信息，AI辅助诊断准确率提高了15%。',
        source: '2023年高考英语真题',
        subject_id: 2,
        chapter_id: 1,
        difficulty: 3,
      },
      {
        title: '牛顿第二定律应用题',
        content: '一个质量为2kg的物体，在水平面上受到一个10N的水平拉力，物体与地面间的动摩擦因数为0.2，求物体的加速度。',
        answer: 'a = 3.1 m/s²',
        analysis: '受力分析：拉力F=10N，摩擦力f=μmg=0.2×2×10=4N，合力F合=10-4=6N，由F=ma得a=F/m=6/2=3m/s²。注意g取10m/s²。',
        source: '物理必修一 第四章',
        subject_id: 3,
        chapter_id: 1,
        difficulty: 2,
      },
      {
        title: '有机化学反应方程式',
        content: '写出乙醇与乙酸发生酯化反应的化学方程式。',
        answer: 'CH₃CH₂OH + CH₃COOH ⇌ CH₃COOCH₂CH₃ + H₂O（浓硫酸，加热）',
        analysis: '酯化反应是可逆反应，需要在浓硫酸催化和加热条件下进行。注意反应条件和可逆符号。',
        source: '化学选修五 第三章',
        subject_id: 4,
        chapter_id: 1,
        difficulty: 2,
      },
      {
        title: '细胞呼吸过程分析',
        content: '有氧呼吸的三个阶段分别在哪里进行？各产生多少ATP？',
        answer: '第一阶段：细胞质基质，产生2ATP；第二阶段：线粒体基质，产生2ATP；第三阶段：线粒体内膜，产生34ATP。',
        analysis: '记住有氧呼吸的总反应式：C₆H₁₂O₆ + 6H₂O + 6O₂ → 6CO₂ + 12H₂O + 能量(38ATP)。各阶段的场所和产物是高频考点。',
        source: '生物必修一 第五章',
        subject_id: 5,
        chapter_id: 1,
        difficulty: 3,
      },
    ]

    for (const question of defaultQuestions) {
      database.run(
        'INSERT INTO questions (title, content, answer, analysis, source, subject_id, chapter_id, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [question.title, question.content, question.answer, question.analysis, question.source, question.subject_id, question.chapter_id, question.difficulty]
      )
    }
  }

  // 运行数据库迁移（添加缺失的列）
  runMigrations()

  saveDatabase()
}

// 导出辅助函数供 services 使用
export const dbHelpers = {
  run,
  get,
  all,
  saveDatabase,
}

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  getDatabasePath,
  dbHelpers,
}
