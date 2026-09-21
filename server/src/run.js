// "Run" button backend (stretch goal). Executes the current editor content
// out-of-process with a hard timeout and returns captured stdout/stderr.
//
// This is intentionally NOT a real sandbox: no container/microVM isolation,
// no filesystem or network restriction beyond what the OS process already
// has, no CPU/memory quota beyond the timeout below. It's fine for a demo
// where you trust who you hand the room link to; it is not what you'd run
// for arbitrary untrusted code at Replit's scale. See ARCHITECTURE.md.

const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const ts = require('typescript')

const TIMEOUT_MS = 5_000
const COMPILE_TIMEOUT_MS = 10_000
const MAX_OUTPUT_BYTES = 100_000

const binCache = new Map()

// Compiled languages (go/rust/cpp) try platform-appropriate binary names
// first; interpreted ones (python) already varied by platform before this
// generalization, so the same cache/lookup now covers all of them.
function resolveBin (key, candidates) {
  if (binCache.has(key)) return binCache.get(key)
  for (const bin of candidates) {
    const probe = spawnSync(bin, ['--version'])
    if (probe.error == null) {
      binCache.set(key, bin)
      return bin
    }
  }
  binCache.set(key, null)
  return null
}

function notFound (label, tried) {
  return { stdout: '', stderr: '', exitCode: null, timedOut: false, error: `No ${label} found on the server (tried ${tried.join('/')}).` }
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number|null, timedOut: boolean}>}
 */
function execCapture (command, args, options = {}) {
  return new Promise((resolve) => {
    let child
    try {
      child = spawn(command, args, { timeout: TIMEOUT_MS, killSignal: 'SIGKILL', cwd: options.cwd })
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

// Runs `fn` with a fresh temp directory (for languages that need real source
// files on disk — go/rustc/g++ all require that, unlike node -e / python -c).
// Always cleaned up, whether fn resolves or throws.
async function withTempDir (fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mme-run-'))
  try {
    return await fn(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function compileAndRun (compileBin, compileArgs, outBin) {
  const compile = spawnSync(compileBin, compileArgs, { timeout: COMPILE_TIMEOUT_MS })
  if (compile.error) {
    return Promise.resolve({ stdout: '', stderr: String(compile.error.message || compile.error), exitCode: null, timedOut: false })
  }
  if (compile.status !== 0) {
    const timedOut = compile.signal === 'SIGTERM' || compile.signal === 'SIGKILL'
    return Promise.resolve({
      stdout: '',
      stderr: (compile.stderr ? compile.stderr.toString('utf8') : '') || 'Compilation failed.',
      exitCode: compile.status,
      timedOut
    })
  }
  return execCapture(outBin, [])
}

/**
 * @param {string} code
 * @param {'javascript'|'typescript'|'python'|'go'|'rust'|'cpp'|'java'} language
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number|null, timedOut: boolean, error?: string}>}
 */
async function runCode (code, language) {
  if (language === 'javascript') {
    return execCapture(process.execPath, ['-e', code])
  }

  if (language === 'typescript') {
    let js
    try {
      js = ts.transpileModule(code, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
      }).outputText
    } catch (err) {
      return { stdout: '', stderr: String(err && err.message ? err.message : err), exitCode: null, timedOut: false }
    }
    return execCapture(process.execPath, ['-e', js])
  }

  if (language === 'python') {
    const bin = resolveBin('python', process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'])
    if (!bin) return notFound('Python interpreter', ['python3', 'python'])
    return execCapture(bin, ['-c', code])
  }

  if (language === 'go') {
    const bin = resolveBin('go', ['go'])
    if (!bin) return notFound('Go toolchain', ['go'])
    return withTempDir(async (dir) => {
      const file = path.join(dir, 'main.go')
      fs.writeFileSync(file, code, 'utf8')
      // `go run` compiles and executes in one step; give it the combined budget.
      return execCapture(bin, ['run', file], { cwd: dir })
    })
  }

  if (language === 'rust') {
    const bin = resolveBin('rustc', ['rustc'])
    if (!bin) return notFound('Rust compiler', ['rustc'])
    return withTempDir(async (dir) => {
      const src = path.join(dir, 'main.rs')
      const outBin = path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main')
      fs.writeFileSync(src, code, 'utf8')
      return compileAndRun(bin, [src, '-o', outBin], outBin)
    })
  }

  if (language === 'cpp') {
    const bin = resolveBin('g++', process.platform === 'win32' ? ['g++'] : ['g++', 'c++'])
    if (!bin) return notFound('C++ compiler', ['g++'])
    return withTempDir(async (dir) => {
      const src = path.join(dir, 'main.cpp')
      const outBin = path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main')
      fs.writeFileSync(src, code, 'utf8')
      return compileAndRun(bin, [src, '-o', outBin, '-std=c++17'], outBin)
    })
  }

  if (language === 'java') {
    const javac = resolveBin('javac', ['javac'])
    const java = resolveBin('java', ['java'])
    if (!javac || !java) return notFound('Java JDK (javac/java)', ['javac', 'java'])
    return withTempDir(async (dir) => {
      // javac requires the file name to match the public class name; fall
      // back to Main for code with no public class (won't compile anyway,
      // but this way javac's own error message is what the user sees).
      const match = code.match(/public\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)/)
      const className = match ? match[1] : 'Main'
      fs.writeFileSync(path.join(dir, `${className}.java`), code, 'utf8')
      const compile = spawnSync(javac, [`${className}.java`], { cwd: dir, timeout: COMPILE_TIMEOUT_MS })
      if (compile.error) {
        return { stdout: '', stderr: String(compile.error.message || compile.error), exitCode: null, timedOut: false }
      }
      if (compile.status !== 0) {
        return {
          stdout: '',
          stderr: (compile.stderr ? compile.stderr.toString('utf8') : '') || 'Compilation failed.',
          exitCode: compile.status,
          timedOut: compile.signal === 'SIGTERM' || compile.signal === 'SIGKILL'
        }
      }
      return execCapture(java, ['-cp', dir, className], { cwd: dir })
    })
  }

  return { stdout: '', stderr: '', exitCode: null, timedOut: false, error: `Unsupported language: ${language}` }
}

module.exports = { runCode }
