// Thin wrappers around the HTTP API. Relative URLs so this works unchanged
// in dev (proxied by Vite, see vite.config.js) and in production (server
// serves the built client from the same origin).

export async function createRoom () {
  const res = await fetch('/api/rooms', { method: 'POST' })
  if (!res.ok) throw new Error(`Failed to create room (${res.status})`)
  const data = await res.json()
  return data.roomId
}

export async function runCode (code, language) {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Run failed (${res.status})`)
  return data
}
