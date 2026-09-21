const http = require('node:http')
const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const express = require('express')
const cors = require('cors')
const { WebSocketServer } = require('ws')
const { setupWSConnection, setPersistence, docs } = require('y-websocket/bin/utils')

const { persistence, snapshot } = require('./persistence')
const { runCode } = require('./run')

setPersistence(persistence)

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist')
const CLIENT_BUILT = fs.existsSync(path.join(CLIENT_DIST, 'index.html'))

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// Creates a fresh room id. No row is written to the DB here — a room only
// gets persisted once someone actually connects and types in it.
app.post('/api/rooms', (_req, res) => {
  res.json({ roomId: crypto.randomUUID() })
})

app.post('/api/run', async (req, res) => {
  const { code, language } = req.body || {}
  if (typeof code !== 'string' || typeof language !== 'string') {
    res.status(400).json({ error: 'Request body must include { code: string, language: string }' })
    return
  }
  try {
    const result = await runCode(code, language)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) })
  }
})

// In production this server also hosts the built client, so the whole app
// is one process on one origin (no CORS, no separate dev proxy to configure
// on the host). In dev, Vite serves the client and proxies /api and /ws
// here instead (see client/vite.config.js) — client/dist won't exist yet.
if (CLIENT_BUILT) {
  app.use(express.static(CLIENT_DIST))
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'))
  })
} else {
  app.get('/', (_req, res) => {
    res.type('text/plain').send(
      'Mini Multiplayer Editor API/WS server is running.\n' +
      'No built client found at client/dist — run `npm run build` in client/, ' +
      'or run the client dev server separately (npm run dev) during development.'
    )
  })
}

const server = http.createServer(app)
const wss = new WebSocketServer({ noServer: true })

// Yjs sync + awareness traffic lives at /ws/<roomId>.
server.on('upgrade', (req, socket, head) => {
  let pathname
  try {
    pathname = new URL(req.url, 'http://localhost').pathname
  } catch {
    socket.destroy()
    return
  }
  const match = /^\/ws\/([^/]+)$/.exec(pathname)
  if (!match) {
    socket.destroy()
    return
  }
  const roomId = decodeURIComponent(match[1])
  wss.handleUpgrade(req, socket, head, (ws) => {
    setupWSConnection(ws, req, { docName: roomId })
  })
})

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})

// Flush every in-memory room's snapshot to SQLite before the process exits,
// so a normal restart (SIGINT/SIGTERM) never loses more than what's already
// been typed since the last periodic snapshot.
function flushAndExit () {
  for (const [roomId, doc] of docs) {
    try {
      snapshot(roomId, doc)
    } catch (err) {
      console.error(`Failed to flush room ${roomId} on shutdown`, err)
    }
  }
  process.exit(0)
}

process.on('SIGINT', flushAndExit)
process.on('SIGTERM', flushAndExit)
