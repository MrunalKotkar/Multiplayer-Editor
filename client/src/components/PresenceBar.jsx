function initials (name) {
  return name.trim().slice(0, 2).toUpperCase()
}

/**
 * @param {{ peers: Array<{clientId: number, name: string, color: string, isLocal: boolean}> }} props
 */
export default function PresenceBar ({ peers }) {
  return (
    <div className="flex items-center gap-2" title={`${peers.length} in this room`}>
      <div className="flex -space-x-2">
        {peers.map((peer) => (
          <div
            key={peer.clientId}
            title={peer.isLocal ? `${peer.name} (you)` : peer.name}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white dark:ring-neutral-900"
            style={{ backgroundColor: peer.color }}
          >
            {initials(peer.name)}
          </div>
        ))}
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        {peers.length} online
      </span>
    </div>
  )
}
