import { useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const CONTENT_KEY = 'content'
const META_KEY = 'meta'

function wsBaseUrl () {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

/**
 * Owns the Y.Doc + WebsocketProvider for one room. Real WebSocket
 * connection, real CRDT doc — nothing here is mocked or pre-seeded; an
 * empty room starts genuinely empty until the server hands back whatever
 * was actually persisted for it (see server/src/persistence.js).
 *
 * The doc/provider are created and torn down inside an effect (not
 * `useMemo`) on purpose: they're a side-effecting external resource (an
 * open socket), and only an effect's mount/cleanup pairing survives React
 * StrictMode's double-invoke in dev correctly — a `useMemo`-created
 * provider gets destroyed by the first cleanup pass with no way to
 * recreate it, leaving the socket permanently dead on every room.
 *
 * @param {string} roomId
 */
export function useYjsRoom (roomId) {
  const [conn, setConn] = useState(null)
  const [status, setStatus] = useState('connecting')
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    const doc = new Y.Doc()
    const provider = new WebsocketProvider(wsBaseUrl(), roomId, doc, { connect: true })

    // Synchronizing React state with the external WebSocket connection this
    // effect just opened, not deriving it from props/state — the case the
    // linter's own set-state-in-effect rule carves out as legitimate.
    setStatus('connecting')
    setSynced(false)
    setConn({ doc, provider })

    const onStatus = ({ status }) => setStatus(status)
    const onSync = (isSynced) => setSynced(isSynced)
    provider.on('status', onStatus)
    provider.on('sync', onSync)

    return () => {
      provider.off('status', onStatus)
      provider.off('sync', onSync)
      provider.destroy()
      doc.destroy()
    }
  }, [roomId])

  const ytext = useMemo(() => conn?.doc.getText(CONTENT_KEY), [conn])
  const meta = useMemo(() => conn?.doc.getMap(META_KEY), [conn])

  return {
    doc: conn?.doc,
    provider: conn?.provider,
    awareness: conn?.provider.awareness,
    ytext,
    meta,
    status,
    synced,
    ready: conn != null
  }
}
