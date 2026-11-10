import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBadges } from '../../hooks/useBadges'
import dashboardApi from '../../api/dashboard.api'

const ACTIVITY_CONFIG = {
  request_created:      { dot: 'bg-[#0f6e56]' },
  status_change:        { dot: 'bg-[#6366f1]' },
  message_sent:         { dot: 'bg-[#f59e0b]' },
  delivery_created:     { dot: 'bg-[#0f6e56]' },
  note_added:           { dot: 'bg-[#9ea89e]' },
  file_uploaded:        { dot: 'bg-[#9ea89e]' },
  ai_summary_generated: { dot: 'bg-[#0f6e56]' },
}

function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

function Skeleton({ className }) {
  return <div className={`rounded-xl bg-[#f1f3f1] animate-pulse ${className}`} />
}

export default function LiveFeed() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const navigate                    = useNavigate()
  const { registerActivityListener } = useBadges()

  // Initial snapshot from REST
  useEffect(() => {
    dashboardApi.getActivityFeed()
      .then(res => setActivities(res.data.data?.results || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Listen for activity events forwarded from BadgeContext's shared WS
  const handleActivity = useCallback((msg) => {
    setActivities(prev => [msg, ...prev].slice(0, 20))
  }, [])

  useEffect(() => {
    const unregister = registerActivityListener(handleActivity)
    return unregister
  }, [registerActivityListener, handleActivity])

  return (
    <div className="rounded-2xl border border-[#e8eae8] bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8eae8]">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-[#141a14]">Live feed</span>
          <span className="h-2 w-2 rounded-full bg-[#1d9e75] animate-pulse" />
        </div>
        <button
          onClick={() => navigate('/activity')}
          className="text-[12px] text-[#0f6e56] hover:underline"
        >
          See all →
        </button>
      </div>

      {loading ? (
        <div className="px-4 py-6 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-[#9ea89e]">No activity yet.</p>
        </div>
      ) : (
        <div className="px-4 pb-2 divide-y divide-[#f1f3f1]">
          {activities.slice(0, 5).map((a, i) => {
            const cfg = ACTIVITY_CONFIG[a.event_type] || { dot: 'bg-[#9ea89e]' }
            return (
              <div key={a.id || i} className="flex gap-3 py-3">
                <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#141a14] leading-snug">
                    {a.description}
                  </p>
                  {a.request_title && (
                    <button
                      onClick={() => navigate(`/requests/${a.request_id}`)}
                      className="text-[11px] text-[#0f6e56] hover:underline truncate max-w-[200px] block mt-0.5"
                    >
                      {a.request_title}
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-[#9ea89e] shrink-0 mt-0.5">
                  {relativeTime(a.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="px-4 pb-4 pt-1 border-t border-[#f1f3f1]">
        <button
          onClick={() => navigate('/activity')}
          className="w-full text-center text-[12px] text-[#0f6e56] hover:underline py-1"
        >
          View full activity log →
        </button>
      </div>
    </div>
  )
}