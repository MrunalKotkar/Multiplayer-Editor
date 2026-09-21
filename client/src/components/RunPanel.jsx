import { useState } from 'react'
import { runCode } from '../lib/api'

/**
 * Stretch goal: sends the room's current content to the server, which
 * actually executes it (Node for JS, python3/python for Python) with a hard
 * timeout, and shows back real stdout/stderr. Not a sandboxed execution
 * environment — see ARCHITECTURE.md for that tradeoff.
 *
 * @param {{ ytext: import('yjs').Text, language: string }} props
 */
export default function RunPanel ({ ytext, language }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const code = ytext.toString()
      const data = await runCode(code, language)
      setResult(data)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setRunning(false)
    }
  }

  const output = result
    ? [result.stdout, result.stderr].filter(Boolean).join('\n') || '(no output)'
    : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Output
        </span>
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run ▶'}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
        {result && result.error && <div className="text-red-600 dark:text-red-400">{result.error}</div>}
        {result && !result.error && (
          <>
            <pre className="whitespace-pre-wrap break-words text-neutral-800 dark:text-neutral-200">{output}</pre>
            <div className="mt-2 text-neutral-400">
              exit code: {result.exitCode ?? 'n/a'}
              {result.timedOut && ' · timed out'}
            </div>
          </>
        )}
        {!error && !result && !running && (
          <div className="text-neutral-400">Press Run to execute the current code.</div>
        )}
      </div>
    </div>
  )
}
