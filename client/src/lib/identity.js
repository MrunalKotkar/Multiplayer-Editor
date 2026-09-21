// Per-browser identity: a display name and a color, persisted in
// localStorage so refreshing the page doesn't hand you a new random name.

const STORAGE_KEY = 'mini-editor:identity'

// Distinct, readable-on-white-and-black colors for presence carets/avatars.
const COLORS = [
  '#e03131', '#f08c00', '#2f9e44', '#1971c2', '#9c36b5',
  '#e8590c', '#0c8599', '#5c940d', '#c2255c', '#5f3dc4'
]

function randomColor () {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function randomName () {
  const n = Math.floor(Math.random() * 9000) + 1000
  return `Guest${n}`
}

export function loadIdentity () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.name === 'string' && typeof parsed.color === 'string') {
        return parsed
      }
    }
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to a fresh identity
  }
  return { name: randomName(), color: randomColor() }
}

export function saveIdentity (identity) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // ignore — identity just won't persist across reloads in this browser
  }
}
