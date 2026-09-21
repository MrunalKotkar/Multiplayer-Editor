const STYLES = {
  connected: { dot: 'bg-emerald-500', text: 'Connected' },
  connecting: { dot: 'bg-amber-500 animate-pulse', text: 'Connecting…' },
  disconnected: { dot: 'bg-red-500', text: 'Disconnected' }
}

/**
 * @param {{ status: 'connected' | 'connecting' | 'disconnected' }} props
 */
export default function StatusBadge ({ status }) {
  const style = STYLES[status] || STYLES.disconnected
  return (
    <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {style.text}
    </div>
  )
}
