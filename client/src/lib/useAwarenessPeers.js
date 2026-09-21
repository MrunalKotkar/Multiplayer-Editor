import { useEffect, useState } from 'react'

/**
 * Live list of everyone currently present in the room (including yourself),
 * derived straight from Yjs Awareness — the same channel that carries live
 * cursor/selection state. Updates the instant someone joins, leaves, or
 * changes their name/color.
 *
 * @param {import('y-protocols/awareness').Awareness | undefined} awareness
 */
export function useAwarenessPeers (awareness) {
  const [peers, setPeers] = useState([])

  useEffect(() => {
    if (!awareness) return
    const compute = () => {
      const next = []
      awareness.getStates().forEach((state, clientId) => {
        if (state && state.user) {
          next.push({ clientId, ...state.user, isLocal: clientId === awareness.clientID })
        }
      })
      next.sort((a, b) => (a.isLocal === b.isLocal ? a.clientId - b.clientId : a.isLocal ? -1 : 1))
      setPeers(next)
    }
    awareness.on('change', compute)
    compute()
    return () => awareness.off('change', compute)
  }, [awareness])

  return peers
}
