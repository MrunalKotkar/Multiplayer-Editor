import { useState } from 'react'
import { createRoom } from '../lib/api'

export default function Landing () {
  const [creating, setCreating] = useState(false)
  const [joinId, setJoinId] = useState('')
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const roomId = await createRoom()
      window.location.assign(`/room/${roomId}`)
    } catch (err) {
      setError(err.message || String(err))
      setCreating(false)
    }
  }

  const handleJoin = (e) => {
    e.preventDefault()
    const trimmed = joinId.trim()
    if (trimmed) window.location.assign(`/room/${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Mini Multiplayer Editor
        </h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          A shared code editor. Anyone with the link types in the same document, live.
        </p>

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="mb-4 w-full rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {creating ? 'Creating…' : 'New Room'}
        </button>

        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mb-4 flex items-center gap-2 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          or
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Room ID"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <button
            type="submit"
            disabled={!joinId.trim()}
            className="shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  )
}
