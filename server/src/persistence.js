// Wires SQLite persistence into y-websocket's WSSharedDoc lifecycle.
//
// - bindState runs once, synchronously (better-sqlite3 has no async I/O),
//   the moment a room's Y.Doc is first created in memory: if a snapshot
//   already exists for that room, its content/language are applied to the
//   fresh doc *before* the connecting client is ever sent sync-step-1. That
//   ordering matters — without it, the first client to open a room after a
//   restart would race the DB read and could get an empty document.
// - A snapshot is then taken every SNAPSHOT_INTERVAL_MS while the room has
//   at least one connection, and once more in writeState, which y-websocket
//   calls right before it tears the doc down after the last client leaves.

const { getDocument, saveDocument } = require('./db')

const SNAPSHOT_INTERVAL_MS = 10_000
const CONTENT_KEY = 'content'
const META_KEY = 'meta'
const DEFAULT_LANGUAGE = 'javascript'

/** @type {Map<string, NodeJS.Timeout>} */
const snapshotTimers = new Map()

/**
 * @param {import('yjs').Doc} ydoc
 */
function readLanguage (ydoc) {
  return ydoc.getMap(META_KEY).get('language') || DEFAULT_LANGUAGE
}

/**
 * @param {string} roomId
 * @param {import('yjs').Doc} ydoc
 */
function snapshot (roomId, ydoc) {
  const content = ydoc.getText(CONTENT_KEY).toString()
  const language = readLanguage(ydoc)
  saveDocument(roomId, content, language)
}

/**
 * @param {string} roomId
 * @param {import('yjs').Doc} ydoc
 */
function startSnapshotLoop (roomId, ydoc) {
  const timer = setInterval(() => snapshot(roomId, ydoc), SNAPSHOT_INTERVAL_MS)
  timer.unref?.()
  snapshotTimers.set(roomId, timer)
  ydoc.on('destroy', () => stopSnapshotLoop(roomId))
}

/**
 * @param {string} roomId
 */
function stopSnapshotLoop (roomId) {
  const timer = snapshotTimers.get(roomId)
  if (timer) {
    clearInterval(timer)
    snapshotTimers.delete(roomId)
  }
}

const persistence = {
  provider: 'sqlite',

  /**
   * @param {string} roomId
   * @param {import('yjs').Doc} ydoc
   */
  bindState: async (roomId, ydoc) => {
    const row = getDocument(roomId)
    if (row) {
      const text = ydoc.getText(CONTENT_KEY)
      if (row.content) text.insert(0, row.content)
      ydoc.getMap(META_KEY).set('language', row.language || DEFAULT_LANGUAGE)
    } else {
      ydoc.getMap(META_KEY).set('language', DEFAULT_LANGUAGE)
    }
    startSnapshotLoop(roomId, ydoc)
  },

  /**
   * @param {string} roomId
   * @param {import('yjs').Doc} ydoc
   */
  writeState: async (roomId, ydoc) => {
    snapshot(roomId, ydoc)
    stopSnapshotLoop(roomId)
  }
}

module.exports = { persistence, snapshot }
