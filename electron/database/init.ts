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
    ]

    for (const tag of defaultTags) {
      database.run('INSERT INTO tags (name, color) VALUES (?, ?)', [tag.name, tag.color])
    }
  }

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
