import { useState } from 'react'

/**
 * @param {{ initialName: string, color: string, onJoin: (name: string) => void }} props
 */
export default function NameGate ({ initialName, color, onJoin }) {
  const [name, setName] = useState(initialName)

  const submit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onJoin(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900"
      >
        <h2 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Join this room
        </h2>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Pick a name — others in the room will see it on your live cursor.
        </p>
        <div className="mb-4 flex items-center gap-2">
          <span
            className="h-8 w-8 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="Your name"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Join room
        </button>
      </form>
    </div>
  )
}
