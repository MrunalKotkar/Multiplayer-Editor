import { useState } from 'react'
import CollabEditor from '../components/CollabEditor'
import CopyLinkButton from '../components/CopyLinkButton'
import LanguageSelect from '../components/LanguageSelect'
import NameGate from '../components/NameGate'
import PresenceBar from '../components/PresenceBar'
import RunPanel from '../components/RunPanel'
import StatusBadge from '../components/StatusBadge'
import { loadIdentity, saveIdentity } from '../lib/identity'
import { useAwarenessPeers } from '../lib/useAwarenessPeers'
import { usePresenceIdentity } from '../lib/usePresenceIdentity'
import { useSharedLanguage } from '../lib/useSharedLanguage'
import { useYjsRoom } from '../lib/useYjsRoom'

/**
 * @param {{ roomId: string }} props
 */
export default function Room ({ roomId }) {
  const [identity, setIdentity] = useState(loadIdentity)
  const [joined, setJoined] = useState(false)

  const { awareness, ytext, meta, status, ready } = useYjsRoom(roomId)
  const [language, setLanguage] = useSharedLanguage(meta)
  usePresenceIdentity(awareness, identity, joined)
  const peers = useAwarenessPeers(awareness)

  const handleJoin = (name) => {
    const next = { ...identity, name }
    setIdentity(next)
    saveIdentity(next)
    setJoined(true)
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-50 dark:bg-neutral-950">
      {!joined && (
        <NameGate initialName={identity.name} color={identity.color} onJoin={handleJoin} />
      )}

      <header className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 font-semibold text-neutral-900 dark:text-neutral-100">
            Mini Multiplayer Editor
          </span>
          <span className="truncate rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            room/{roomId}
          </span>
          <StatusBadge status={status} />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <PresenceBar peers={peers} />
          <LanguageSelect value={language} onChange={setLanguage} />
          <CopyLinkButton />
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 border-r border-neutral-200 dark:border-neutral-800">
          {ready
            ? <CollabEditor ytext={ytext} awareness={awareness} language={language} />
            : <div className="flex h-full items-center justify-center text-sm text-neutral-400">Connecting…</div>}
        </div>
        <div className="w-[340px] shrink-0 bg-white dark:bg-neutral-900">
          {ready && <RunPanel ytext={ytext} language={language} />}
        </div>
      </main>
    </div>
  )
}
