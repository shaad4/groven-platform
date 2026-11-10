import { useSelector } from 'react-redux'
import { selectWsStatus } from '../../features/ws/wsSlice'

const PILL_META = {
  connected:    { dot: 'bg-[#1d9e75] animate-pulse', text: 'text-[#0f6e56]', bg: 'bg-[#e6f5f0]', label: 'Live' },
  reconnecting: { dot: 'bg-[#f59e0b] animate-pulse', text: 'text-[#92500a]', bg: 'bg-[#fef3e2]', label: 'Reconnecting' },
  disconnected: { dot: 'bg-[#9ea89e]',               text: 'text-[#4a544a]', bg: 'bg-[#f1f3f1]', label: 'Offline' },
}

export default function ConnectionPill({ connectionKey = 'default' }) {
  const status = useSelector(selectWsStatus(connectionKey))
  const meta   = PILL_META[status] ?? PILL_META.disconnected

  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${meta.bg}`}>
      <div className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
      <span className={`text-[12px] font-medium ${meta.text}`}>{meta.label}</span>
    </div>
  )
}