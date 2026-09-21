// "Run" button backend (stretch goal). Executes the current editor content
// out-of-process with a hard timeout and returns captured stdout/stderr.
//
// This is intentionally NOT a real sandbox: no container/microVM isolation,
// no filesystem or network restriction beyond what the OS process already
// has, no CPU/memory quota beyond the timeout below. It's fine for a demo
// where you trust who you hand the room link to; it is not what you'd run
// for arbitrary untrusted code at Replit's scale. See ARCHITECTURE.md.

const { spawn, spawnSync } = require('node:child_process')

const TIMEOUT_MS = 5_000
const MAX_OUTPUT_BYTES = 100_000

let cachedPythonBin = null

function resolvePythonBin () {
  if (cachedPythonBin) return cachedPythonBin
  const candidates = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python']
  for (const bin of candidates) {
    const probe = spawnSync(bin, ['--version'])
    if (probe.error == null) {
      cachedPythonBin = bin
      return bin
    }
  }
  return null
}

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number|null, timedOut: boolean}>}
 */
function execCapture (command, args) {
  return new Promise((resolve) => {
    let child
    try {
      child = spawn(command, args, { timeout: TIMEOUT_MS, killSignal: 'SIGKILL' })
    } catch (err) {
      resolve({ stdout: '', stderr: String(err && err.message ? err.message : err), exitCode: null, timedOut: false })
      return
    }

    let stdout = ''
    let stderr = ''
    let timedOut = false
    let truncated = false

    child.stdout.on('data', (chunk) => {
      if (stdout.length < MAX_OUTPUT_BYTES) stdout += chunk.toString('utf8')
      else truncated = true
    })
    child.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_OUTPUT_BYTES) stderr += chunk.toString('utf8')
      else truncated = true
    })
    child.on('error', (err) => {
      resolve({ stdout, stderr: stderr + '\n' + String(err.message || err), exitCode: null, timedOut: false })
    })
    child.on('close', (code, signal) => {
      timedOut = signal === 'SIGKILL' || signal === 'SIGTERM'
      if (truncated) stderr += '\n[output truncated]'
      resolve({ stdout, stderr, exitCode: code, timedOut })
    })
  })
}

/**
 * @param {string} code
 * @param {'javascript'|'python'} language
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number|null, timedOut: boolean, error?: string}>}
 */
async function runCode (code, language) {
  if (language === 'javascript') {
    return execCapture(process.execPath, ['-e', code])
  }
  if (language === 'python') {
    const bin = resolvePythonBin()
    if (!bin) {
      return { stdout: '', stderr: '', exitCode: null, timedOut: false, error: 'No Python interpreter found on the server (tried python3/python).' }
    }
    return execCapture(bin, ['-c', code])
  }
  return { stdout: '', stderr: '', exitCode: null, timedOut: false, error: `Unsupported language: ${language}` }
}

module.exports = { runCode }
