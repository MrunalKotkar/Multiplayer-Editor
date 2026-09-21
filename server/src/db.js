// SQLite persistence: one row per room, holding the latest full snapshot of
// its document content. No mock/default rows are ever inserted — a room only
// gets a row once a real client has actually written something to it.

const path = require('node:path')
const fs = require('node:fs')
const Database = require('better-sqlite3')

const DATA_DIR = path.join(__dirname, '..', 'data')
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const DB_PATH = path.join(DATA_DIR, 'documents.db')
const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    room_id TEXT PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'javascript',
    updated_at INTEGER NOT NULL
  )
`)

const getStmt = db.prepare('SELECT room_id, content, language, updated_at FROM documents WHERE room_id = ?')
const upsertStmt = db.prepare(`
  INSERT INTO documents (room_id, content, language, updated_at)
  VALUES (@roomId, @content, @language, @updatedAt)
  ON CONFLICT(room_id) DO UPDATE SET
    content = excluded.content,
    language = excluded.language,
    updated_at = excluded.updated_at
`)

/**
 * @param {string} roomId
 * @returns {{room_id: string, content: string, language: string, updated_at: number} | undefined}
 */
function getDocument (roomId) {
  return getStmt.get(roomId)
}

/**
 * @param {string} roomId
 * @param {string} content
 * @param {string} language
 */
function saveDocument (roomId, content, language) {
  upsertStmt.run({ roomId, content, language, updatedAt: Date.now() })
}

module.exports = { getDocument, saveDocument }
