import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, AlertCircle, Users, Inbox, CheckCircle2, Clock3, MoreHorizontal, UserX, TrendingUp, Sparkles, X} from 'lucide-react'
import { useWebSocket } from '../../hooks/useWebSocket'
import ConnectionPill from '../../components/ui/ConnectionPill'
import { useSelector, useDispatch } from 'react-redux'
import { selectAccessToken } from '../../features/auth/authSlice'
import { useNavigate } from 'react-router-dom'
import ProviderLayout from '../../components/layout/ProviderLayout'
import ProviderTopbar from '../../components/layout/ProviderTopbar'
import AddClientModal from '../../components/modals/AddClientModal'
import { useAuth } from '../../context/AuthContext'
import clientsApi from '../../api/clients.api'
import dashboardApi from '../../api/dashboard.api'
import { getWorkspace } from '../../api/settings.api'
import { openUpgradeModal } from '../../features/billing/billingSlice'
import LiveFeed from '../../components/chat/LiveFeed'
import { useWalkthrough } from '../../context/WalkthroughContext'

//  Constants 

const AVATAR_COLORS = [
  'bg-[#e6f5f0] text-[#085041]',
  'bg-[#fef3e2] text-[#92500a]',
  'bg-[#eef2ff] text-[#3730a3]',
  'bg-[#fdf2f8] text-[#9d174d]',
  'bg-[#f0f9ff] text-[#0369a1]',
]

const STATUS_META = {
  received:    { label: 'Received',    bg: 'bg-[#e6f5f0]', text: 'text-[#085041]' },
  in_review:   { label: 'In Review',   bg: 'bg-[#fef3e2]', text: 'text-[#92500a]' },
  in_progress: { label: 'In Progress', bg: 'bg-[#eef2ff]', text: 'text-[#3730a3]' },
  delivered:   { label: 'Delivered',   bg: 'bg-[#e6f5f0]', text: 'text-[#0f6e56]' },
  closed:      { label: 'Done',        bg: 'bg-[#f3f4f3]', text: 'text-[#4a544a]' },
}

const CATEGORY_META = {
  design:    { label: 'Design',   bg: 'bg-[#eef2ff]', text: 'text-[#3730a3]' },
  dev:       { label: 'Dev',      bg: 'bg-[#f0fdf4]', text: 'text-[#166534]' },
  content:   { label: 'Content',  bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]' },
  feedback:  { label: 'Feedback', bg: 'bg-[#fdf2f8]', text: 'text-[#9d174d]' },
  'bug fix': { label: 'Bug fix',  bg: 'bg-[#fff1f2]', text: 'text-[#9f1239]' },
}

// Heatmap rows (time buckets) and col order (Mon–Sun)
const HEATMAP_ROWS = [
  { label: 'Morning',   hours: [6, 7, 8, 9, 10, 11] },
  { label: 'Late Morn', hours: [10, 11, 12] },
  { label: 'Afternoon', hours: [12, 13, 14, 15] },
  { label: 'Late Aft',  hours: [15, 16, 17, 18] },
  { label: 'Evening',   hours: [18, 19, 20, 21] },
  { label: 'Night',     hours: [21, 22, 23, 0, 1, 2] },
]
// Django ExtractWeekDay: 1=Sun,2=Mon…7=Sat → reorder Mon–Sun
const COL_ORDER  = [2, 3, 4, 5, 6, 7, 1]
const COL_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']


//  Helpers 

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function getColor(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

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

// Stat Card 

function StatCard({ icon: Icon, title, value, sub, subVariant = 'neutral', loading }) {
  const subColor = {
    neutral: 'text-[#6b776c]',
    warning: 'text-[#a16207]',
    success: 'text-[#15803d]'
  }[subVariant]

  const bgStyle = {
    neutral: 'bg-white border-[#e8eae8] hover:border-[#c8cec8]/60',
    warning: 'bg-[#fffbeb] border-[#fde68a]/50',
    success: 'bg-[#f0fdf4] border-[#bbf7d0]/50'
  }[subVariant]

  const iconBg = {
    neutral: 'bg-[#f3f4f3] text-[#6b776c]',
    warning: 'bg-[#fef3c7] text-[#b45309]',
    success: 'bg-[#dcfce7] text-[#16a34a]'
  }[subVariant]

  return (
    <div className={`rounded-2xl border p-4 flex flex-col justify-between h-[116px] transition-all duration-200 ${bgStyle} w-full`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#6b776c] font-semibold truncate max-w-[80%]">
          {title}
        </span>
        {Icon && (
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon size={14} />
          </div>
        )}
      </div>

      <div className="mt-auto space-y-1">
        {loading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <p className="text-[26px] sm:text-[30px] font-bold text-[#141a14] leading-none tracking-tight">
            {value ?? '—'}
          </p>
        )}

        {loading ? (
          <Skeleton className="h-3.5 w-20" />
        ) : (
          <p className={`text-[11px] font-medium truncate ${subColor}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

//  AI Insight Center 
const INSIGHT_COPY = {
  gone_quiet:  { message: "hasn't submitted anything in 2+ weeks.", dot: 'bg-amber-400' },
  high_volume: { message: 'has submitted 5+ requests in the last week.', dot: 'bg-violet-400' },
}

const DISMISSED_KEY = 'grove_dismissed_insights'

function loadDismissed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function InsightCenter({ clients, onView }) {
  const [dismissed, setDismissed] = useState(loadDismissed)

  const dismiss = (key) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(key)
      try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])) } catch { /* silent */ }
      return next
    })
  }

  const flagged = clients.filter(c => c.ai_insight && !dismissed.has(`${c.id}:${c.ai_insight}`))
  if (flagged.length === 0) return null

  return (
    <div className="rounded-2xl border border-[#e8eae8] bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={13} className="text-violet-600" />
        <h3 className="text-[15px] font-semibold text-[#141a14]">Needs attention</h3>
        <span className="text-[11px] bg-[#f3f4f3] text-[#4a544a] px-2 py-0.5 rounded-full font-medium">{flagged.length}</span>
      </div>
      <div className="divide-y divide-[#f1f3f1]">
        {flagged.map(c => {
          const copy = INSIGHT_COPY[c.ai_insight]
          const name = c.display_name || c.client_name || 'A client'
          return (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${copy.dot}`} />
              <p className="flex-1 text-[13px] text-[#4a544a] truncate">
                <span className="font-medium text-[#141a14]">{name}</span> {copy.message}
              </p>
              <button onClick={() => onView(c.id)} className="text-[12px] font-medium text-[#0f6e56] hover:underline shrink-0">
                View
              </button>
              <button onClick={() => dismiss(`${c.id}:${c.ai_insight}`)} className="text-[#9ea89e] hover:text-[#4a544a] shrink-0">
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

//  Client Row 

function ClientRow({ client, index, onClick }) {
  const name     = client.display_name || client.client_name || 'Unknown'
  const isActive = !!client.last_login
  const isPending = !client.joined_at || client.status === 'pending'

  let subLabel, subColor
  if (isPending) {
    subLabel = 'Invite pending'; subColor = 'text-[#9ea89e]'
  } else if (client.last_login) {
    subLabel = `Active ${relativeTime(client.last_login)}`; subColor = 'text-[#4a544a]'
  } else {
    subLabel = 'No activity in 3 days'; subColor = 'text-[#92500a]'
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 border-b border-[#f1f3f1] last:border-none hover:bg-[#f7fdfb] -mx-1 px-1 rounded-xl transition-colors text-left group"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold ${getColor(index)}`}>
            {client.avatar_url ? (
              <img src={client.avatar_url} alt={name} className="w-full h-full object-cover" />
            ) : getInitials(name)}
          </div>
          {isActive && !isPending && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#1d9e75] border-2 border-white" />
          )}
        </div>
        <div>
          <p className="text-[14px] font-medium text-[#141a14]">{name}</p>
          <p className={`text-[11px] ${subColor}`}>{subLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#9ea89e]">0 open</span>
        <ChevronRight size={13} className="text-[#c8cec8] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  )
}

//  Recent Request Card 

function RecentRequestCard({ req, onClick }) {
  const meta    = STATUS_META[req.status] || STATUS_META.received
  const catKey  = req.ai_category?.toLowerCase()
  const catMeta = CATEGORY_META[catKey]

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-[#e8eae8] bg-white p-4 hover:border-[#b3e0d1] hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {catMeta && (
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${catMeta.bg} ${catMeta.text}`}>
              {catMeta.label}
            </span>
          )}
          {req.is_urgent && (
            <span className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-[#fff1f2] text-[#9f1239]">
              <AlertCircle size={9} /> Urgent
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${meta.bg} ${meta.text}`}>
            {meta.label}
          </span>
          <span className="text-[11px] text-[#9ea89e]">{relativeTime(req.updated_at)}</span>
        </div>
      </div>
      <p className="text-[14px] font-medium text-[#141a14] mb-0.5">{req.title}</p>
      <p className="text-[12px] text-[#9ea89e]">{req.client_name}</p>
      {req.ai_summary && (
        <p className="mt-2 text-[11px] text-[#4a544a] leading-relaxed line-clamp-2">{req.ai_summary}</p>
      )}
    </button>
  )
}


//  Busiest Times Heatmap 

function BusiestHeatmap({ heatmap }) {
  const grid = {}
  let maxCount = 0
  for (const row of (heatmap || [])) {
    if (!grid[row.dow]) grid[row.dow] = {}
    grid[row.dow][row.hour] = row.count
    if (row.count > maxCount) maxCount = row.count
  }

  const cellColor = (count) => {
    if (!count) return 'bg-[#f1f3f1]'
    const p = count / maxCount
    if (p < 0.2) return 'bg-[#fde68a]'
    if (p < 0.4) return 'bg-[#fbbf24]'
    if (p < 0.6) return 'bg-[#f97316]'
    if (p < 0.8) return 'bg-[#ef4444]'
    return 'bg-[#dc2626]'
  }

  const hasData = heatmap?.length > 0

  return (
    <div>
      <div className="flex mb-2 pl-[76px] gap-1">
        {COL_LABELS.map(l => (
          <div key={l} className="flex-1 text-center text-[10px] text-[#9ea89e] font-medium">{l}</div>
        ))}
      </div>
      {HEATMAP_ROWS.map(row => {
        const colCounts = COL_ORDER.map(dow =>
          row.hours.reduce((sum, h) => sum + (grid[dow]?.[h] || 0), 0)
        )
        return (
          <div key={row.label} className="flex items-center gap-1 mb-1.5">
            <span className="w-[72px] shrink-0 text-[10px] text-[#9ea89e] text-right pr-2 leading-none">
              {row.label}
            </span>
            {colCounts.map((count, ci) => (
              <div
                key={ci}
                title={count ? `${count} request${count !== 1 ? 's' : ''}` : undefined}
                className={`flex-1 h-7 rounded-md ${hasData ? cellColor(count) : 'bg-[#f1f3f1]'} transition-colors`}
              />
            ))}
          </div>
        )
      })}
      {!hasData && (
        <p className="text-[11px] text-[#9ea89e] text-center mt-2">
          Not enough data yet — submit more requests to see patterns.
        </p>
      )}
    </div>
  )
}


//  Plan Usage 

function PlanUsage({ clientCount, clientLimit, openRequests, isPro }) {
  const dispatch = useDispatch()
  const atLimit  = clientCount >= clientLimit
  const usagePct = Math.min(Math.round((clientCount / clientLimit) * 100), 100)

  const handleUpgrade = () => {
    dispatch(openUpgradeModal({
      reason: 'limit_reached',
      message: "You've reached your client limit on the Free plan.",
    }))
  }

  return (
    <div className={`rounded-2xl border p-5 ${atLimit && !isPro ? 'border-[#fca5a5] bg-[#fff8f8]' : 'border-[#b3e0d1] bg-[#f0faf6]'}`}>
     <p className={`text-[13px] font-semibold mb-4 ${atLimit && !isPro ? 'text-[#92500a]' : 'text-[#085041]'}`}>Plan usage</p>
      <div className="mb-4">
        <div className="flex justify-between text-[12px] text-[#4a544a] mb-1.5">
          <span>Clients · {clientCount} of {isPro ? '∞' : clientLimit} used</span>
          {!isPro && <span>{usagePct}%</span>}
        </div>
        {!isPro && (
          <div className="h-1.5 rounded-full bg-[#e8eae8] overflow-hidden">
            <div className={`h-full rounded-full ${atLimit ? 'bg-[#e24b4a]' : 'bg-[#0f6e56]'}`} style={{ width: `${usagePct}%` }} />
          </div>
        )}
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-[12px] text-[#4a544a] mb-1.5">
          <span>Requests · {openRequests ?? 0} active</span>
          <span className="flex items-center gap-1 text-[#085041]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1d9e75]" /> Unlimited
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[#e8eae8]" />
        <p className="text-[11px] text-[#9ea89e] mt-1">No limit{isPro ? '' : ' on free'}</p>
      </div>
      {!isPro && (
        atLimit ? (
          <div className="pt-4 border-t border-[#fca5a5]/40">
            <p className="text-[13px] font-medium text-[#92500a]">You've reached your client limit.</p>
            <p className="text-[12px] text-[#4a544a] mt-1 mb-3">Upgrade to Pro to add unlimited clients.</p>
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f6e56] py-3 text-[13px] font-medium text-white hover:bg-[#0c5b47] transition-colors disabled:opacity-60"
            >
              Upgrade to Pro <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <p className="text-[12px] text-[#4a544a]">
            {clientLimit - clientCount} slot{clientLimit - clientCount !== 1 ? 's' : ''} remaining on Free plan.
          </p>
        )
      )}
    </div>
  )
}

// Page 

export default function ProviderDashboard() {
  const { tenant } = useAuth()
  const navigate   = useNavigate()

  const [showAddClient,  setShowAddClient]  = useState(false)
  const [clients,        setClients]        = useState([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [stats,          setStats]          = useState(null)
  const [loadingStats,   setLoadingStats]   = useState(true)
  const [statsError,     setStatsError]     = useState(false)
  const [isPro,          setIsPro]          = useState(false)

  const fetchClients = useCallback(async () => {
    try {
      const res = await clientsApi.list()          // clients.api.js → GET /clients/
      setClients(res.data.data.clients || [])
    } catch { /* non-critical */ } finally { setLoadingClients(false) }
  }, [])

  const fetchStats = useCallback(async () => {
    setLoadingStats(true); setStatsError(false)
    try {
      const res = await dashboardApi.getStats()    // GET /dashboard/stats/      
      setStats(res.data.data)
    } catch { setStatsError(true) } finally { setLoadingStats(false) }   
  }, [])

  useEffect(() => { fetchClients(); fetchStats() }, [fetchClients, fetchStats])

  useEffect(() => {
    getWorkspace()
      .then(r => setIsPro(r.data.data?.plan?.name === 'pro'))
      .catch(() => {})
  }, [])

  const { startWalkthrough } = useWalkthrough()

  useEffect(() => {
    if (localStorage.getItem('grove_walkthrough_provider') !== 'completed') {
      startWalkthrough('provider')
    }
  }, [startWalkthrough])

  const s = stats?.stats ?? {}
  const clientCount = s.total_clients ?? clients.length
  const clientLimit = 3
  const atLimit     = clientCount >= clientLimit

  return (
    <>
      <ProviderLayout
        topbar={
          <ProviderTopbar
            title="Dashboard"
            rightSlot={<ConnectionPill connectionKey="feed" />}
            onAddClient={() => setShowAddClient(true)}
            showAddBtn={isPro || !atLimit}
          />
        }
      >
        <div className="grid gap-6 p-6 xl:grid-cols-[1fr_380px]">

          {/* LEFT */}
          <div className="space-y-6 min-w-0">

            {/* AI insight center */}
            <InsightCenter clients={clients} onView={(id) => navigate(`/clients/${id}`)} />


            {/* Stat strip */}
            <div className="grid gap-3.5 grid-cols-2 md:grid-cols-4" data-tour="provider-stats">
              <StatCard
                icon={Users}
                title="Total Clients"
                value={s.total_clients}
                sub={`${s.inactive_clients ?? 0} inactive this month`}
                loading={loadingStats}
              />
              <StatCard
                icon={Inbox}
                title="Open Requests"
                value={s.open_requests}
                sub={
                  stats?.status_breakdown?.find(b => b.status === 'in_review')?.count > 0
                    ? `${stats.status_breakdown.find(b => b.status === 'in_review').count} need review`
                    : 'active right now'
                }
                subVariant={stats?.status_breakdown?.find(b => b.status === 'in_review')?.count > 0 ? 'warning' : 'neutral'}
                loading={loadingStats}
              />
              <StatCard
                icon={CheckCircle2}
                title="Delivered"
                value={s.delivered_this_week}
                sub="this week"
                subVariant="success"
                loading={loadingStats}
              />
              <StatCard
               icon={UserX}
               title="Inactive Clients" 
               value={s.inactive_clients} 
               sub="no activity in 30 days" 
               loading={loadingStats} 
              />
            </div>


            {/* Clients */}
            <div className="rounded-2xl border border-[#e8eae8] bg-white p-5" data-tour="provider-clients">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[15px] font-semibold text-[#141a14]">Clients</h3>
                <button onClick={() => navigate('/clients')} className="text-[12px] font-medium text-[#0f6e56] hover:underline">
                  See all →
                </button>
              </div>
              {loadingClients ? (
                <div className="space-y-3 mt-3">{[1,2,3].map(i => <Skeleton key={i} className="h-[52px]" />)}</div>
              ) : clients.length === 0 ? (
                <div className="py-8 text-center border-t border-dashed border-[#e8eae8] mt-3">
                  <p className="text-[14px] text-[#9ea89e]">No clients yet.</p>
                  <button onClick={() => setShowAddClient(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0f6e56] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#0c5b47] transition-colors">
                    Add your first client
                  </button>
                </div>
              ) : (
                clients.slice(0, 4).map((c, i) => (
                  <ClientRow key={c.id} client={c} index={i} onClick={() => navigate(`/clients/${c.id}`)} />
                ))
              )}
            </div>

            {/* Recent Requests */}
            <div data-tour="provider-requests">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-semibold text-[#141a14]">Recent requests</h3>
                <button onClick={() => navigate('/requests')} className="text-[12px] font-medium text-[#0f6e56] hover:underline">
                  See all →
                </button>
              </div>
              {loadingStats ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-[100px]" />)}</div>
              ) : statsError ? (
                <div className="rounded-2xl border border-[#fca5a5] bg-[#fff8f8] p-5 text-center">
                  <p className="text-[13px] text-[#92500a]">Couldn't load stats. Try refreshing.</p>
                  <button onClick={fetchStats} className="mt-2 text-[12px] font-medium text-[#0f6e56] hover:underline">Retry</button>
                </div>
              ) : !stats?.recent_requests?.length ? (
                <div className="rounded-2xl border border-dashed border-[#e8eae8] bg-white p-8 text-center">
                  <p className="text-[14px] text-[#9ea89e]">No requests yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recent_requests.map(r => (
                    <RecentRequestCard key={r.id} req={r} onClick={() => navigate(`/requests/${r.id}`)} />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT */}
          <div className="space-y-5">
            <div data-tour="provider-feed">
              <LiveFeed />
            </div>
            <div className="rounded-2xl border border-[#e8eae8] bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock3 size={14} className="text-[#0f6e56]" />
                  <h3 className="text-[13px] font-semibold text-[#141a14]">Busiest Times</h3>
                </div>
                <MoreHorizontal size={15} className="text-[#9ea89e]" />
              </div>
              {loadingStats ? <Skeleton className="h-[180px]" /> : <BusiestHeatmap heatmap={stats?.heatmap} />}
            </div>
            <PlanUsage clientCount={clientCount} clientLimit={clientLimit} openRequests={s.open_requests} isPro={isPro} />
          </div>

        </div>
      </ProviderLayout>

      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onSuccess={() => { fetchClients(); fetchStats() }}
        />
      )}
    </>
  )
}