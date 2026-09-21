import { useEffect } from 'react'

/**
 * Publishes this client's name/color into Yjs Awareness so everyone else's
 * yCollab remote-selection layer can render our caret with a name tag.
 * Publishes nothing until `enabled` (i.e. until the user has confirmed a
 * name via the NameGate) so peers don't briefly see an unconfirmed guest name.
 *
 * @param {import('y-protocols/awareness').Awareness | undefined} awareness
 * @param {{name: string, color: string}} identity
 * @param {boolean} enabled
 */
export function usePresenceIdentity (awareness, identity, enabled) {
  useEffect(() => {
    if (!enabled || !awareness) return
    awareness.setLocalStateField('user', {
      name: identity.name,
      color: identity.color,
      colorLight: `${identity.color}33`
    })
  }, [awareness, identity.name, identity.color, enabled])
}
