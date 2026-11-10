import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ChevronDown, Loader2, ArrowUpRight,
  CheckCircle2, FileText, MessageSquare, Bell,
  Lock, Download, Sparkles,
} from 'lucide-react'
import ProviderLayout from '../../components/layout/ProviderLayout'
import ProviderTopbar from '../../components/layout/ProviderTopbar'
import dashboardApi from '../../api/dashboard.api'
import { getAvatarColor, getInitials, timeAgo } from '../../utils/clientHelpers'
import clientsApi from '../../api/clients.api'


// ── Event type config ─────────────────────────────────────────
const EVENT_CONFIG = {
  request_created:  { icon: FileText,      color: 'text-[#0f6e56]',  dot: 'bg-[#0f6e56]',  label: 'Requests' },
  status_change:    { icon: ArrowUpRight,  color: 'text-[#6366f1]',  dot: 'bg-[#6366f1]',  label: 'Status changes' },
  message_sent:     { icon: MessageSquare, color: 'text-[#f59e0b]',  dot: 'bg-[#f59e0b]',  label: 'Messages' },
  delivery_created: { icon: CheckCircle2,  color: 'text-[#0f6e56]',  dot: 'bg-[#0f6e56]',  label: 'Deliveries' },
  note_added:       { icon: Lock,          color: 'text-[#9ea89e]',  dot: 'bg-[#9ea89e]',  label: 'Notes' },
  file_uploaded:    { icon: FileText,      color: 'text-[#9ea89e]',  dot: 'bg-[#9ea89e]',  label: 'Files' },
  ai_summary_generated: { icon: Bell,     color: 'text-[#0f6e56]',  dot: 'bg-[#0f6e56]',  label: 'AI events' },
}

const STATUS_PILL = {
  received:    'bg-[#e6f5f0] text-[#085041]',
  in_review:   'bg-[#fef3e2] text-[#92500a]',
  in_progress: 'bg-[#eef2ff] text-[#3730a3]',
  delivered:   'bg-[#e6f5f0] text-[#0f6e56]',
  closed:      'bg-[#f3f4f3] text-[#4a544a]',
}

const STATUS_LABEL = {
  received: 'Received', in_review: 'In Review', in_progress: 'In Progress',
  delivered: 'Delivered', closed: 'Closed',
}

function Avatar({ name = '', avatarUrl, size = 'sm', isAI = false }) {
  const [imgError, setImgError] = useState(false)
  const sizeClasses = size === 'sm' ? 'h-7 w-7 text-[9px]' : 'h-9 w-9 text-[11px]'

  if (isAI) return (
    <div className={`${sizeClasses} rounded-full bg-[#e6f5f0] flex items-center justify-center shrink-0 border border-[#d1fae5]`}>
      <span className="font-bold text-[#0f6e56]">AI</span>
    </div>
  )

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover shrink-0 border border-[#e8eae8]`}
      />
    )
  }

  const c = getAvatarColor(name)
  return (
    <div className={`${sizeClasses} rounded-full flex items-center justify-center font-semibold shrink-0 border border-white/10 ${c.bg} ${c.text}`}>
      {getInitials(name)}
    </div>
  )
}

function ClientAvatarMini({ name, avatarUrl }) {
  const [imgError, setImgError] = useState(false)
  const c = getAvatarColor(name)

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        title={`Client: ${name}`}
        onError={() => setImgError(true)}
        className="h-5 w-5 rounded-full object-cover shrink-0"
      />
    )
  }

  return (
    <div
      className={`h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold ${c.bg} ${c.text}`}
      title={`Client: ${name}`}
    >
      {getInitials(name)}
    </div>
  )
}

function StatusTransitionBadge({ from, to }) {
  return (
    <span className="inline-flex items-center gap-1.5 ml-1">
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_PILL[from] || 'bg-[#f3f4f3] text-[#4a544a]'}`}>
        {STATUS_LABEL[from] || from}
      </span>
      <ArrowUpRight size={11} className="text-[#9ea89e]" />
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_PILL[to] || 'bg-[#f3f4f3] text-[#4a544a]'}`}>
        {STATUS_LABEL[to] || to}
      </span>
    </span>
  )
}

function groupByDate(activities) {
  const groups = {}
  activities.forEach(a => {
    const d = new Date(a.created_at)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    let label
    if (d.toDateString() === today.toDateString()) label = 'Today'
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday'
    else label = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!groups[label]) groups[label] = []
    groups[label].push(a)
  })
  return groups
}

function ActivityRow({ activity, onNavigate }) {
  const [expanded, setExpanded] = useState(false)
  const isAI = activity.actor_source === 'ai'
  const isSystem = activity.actor_source === 'system'
  const actorName = activity.actor || (isAI ? 'Groven AI' : isSystem ? 'System' : 'Unknown')
  const isYou = activity.is_current_user === true

  const cfg = EVENT_CONFIG[activity.event_type] || EVENT_CONFIG.request_created
  const meta = activity.metadata || {}
  const target = activity.target_info || {}

  const hasTransition = activity.event_type === 'status_change' && meta.from && meta.to
  const hasSummary = activity.event_type === 'ai_summary_generated' && activity.description

  const IconComponent = cfg.icon || FileText

  return (
    <div className="flex items-start gap-3.5 py-4 border-b border-[#f1f3f1] last:border-0 group hover:bg-[#fafafa]/50 px-3 rounded-xl transition-all duration-200">
      
      {/* Left Column: Avatar with Badge */}
      <div className="relative shrink-0 pt-0.5">
        <Avatar name={actorName} avatarUrl={activity.actor_avatar_url} size="md" isAI={isAI} />
        <div className={`absolute -bottom-0.5 -right-0.5 h-4.5 w-4.5 rounded-full border-2 border-white flex items-center justify-center ${cfg.dot} text-white shadow-xs`}>
          <IconComponent size={8} className="text-white" />
        </div>
      </div>

      {/* Middle/Main Column */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-[#141a14] leading-relaxed">
          <span className={`font-semibold mr-1.5 ${isAI ? 'text-[#0f6e56]' : 'text-[#141a14]'}`}>
            {isYou ? 'You' : actorName}
          </span>
          <span className="text-[#4a544a]">{activity.description}</span>
          
          {target.request_ref && (
            <button
              onClick={() => onNavigate && onNavigate(target.request_id)}
              className="ml-1.5 inline-flex items-center font-medium text-[#0f6e56] hover:underline align-baseline"
              title={target.request_title}
            >
              for <span className="font-semibold ml-0.5">{target.request_ref}</span>
            </button>
          )}

          {hasTransition && (
            <span className="inline-block align-middle ml-1">
              <StatusTransitionBadge from={meta.from} to={meta.to} />
            </span>
          )}
          
          {meta.file_count && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f5f0] px-2 py-0.5 text-[11px] font-medium text-[#0f6e56] ml-2">
              <CheckCircle2 size={10} /> {meta.file_count} files
            </span>
          )}
        </div>

        {target.request_title && (
          <p className="text-[11px] text-[#9ea89e] mt-0.5 truncate max-w-xl">
            {target.request_title}
          </p>
        )}

        {/* Mobile Info Row */}
        <div className="flex lg:hidden items-center gap-2 mt-2 text-[11px] text-[#9ea89e]">
          <span>{timeAgo(activity.created_at)}</span>
          {target.client_name && (
            <>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1 bg-[#f7f8f7] px-1.5 py-0.5 rounded-md border border-[#e8eae8]">
                <ClientAvatarMini name={target.client_name} avatarUrl={target.client_avatar_url} />
                <span className="truncate max-w-[120px] font-medium text-[#4a544a]">{target.client_name}</span>
              </div>
            </>
          )}
        </div>

        {hasSummary && (
          <div className="mt-2.5 rounded-xl bg-[#f0faf6] border border-[#d1fae5] px-3.5 py-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#0f6e56] flex items-center gap-1">
                Summary:
              </span>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[12px] font-medium text-[#0f6e56] hover:underline"
              >
                {expanded ? 'Less ↑' : 'More ↓'}
              </button>
            </div>
            {expanded && <p className="text-[12px] text-[#4a544a] mt-1.5 leading-relaxed whitespace-pre-wrap">{activity.description}</p>}
          </div>
        )}
      </div>

      {/* Desktop Right Anchor */}
      <div className="hidden lg:flex items-center gap-3 shrink-0 ml-auto self-center">
        {target.client_name && (
          <ClientAvatarMini name={target.client_name} avatarUrl={target.client_avatar_url} />
        )}
        <span className="text-[12px] text-[#9ea89e] w-16 text-right whitespace-nowrap">
          {timeAgo(activity.created_at)}
        </span>
      </div>
    </div>
  )
}

const FILTER_TABS = [
  { key: 'all', label: 'All events' },
  { key: 'request_created', label: 'Requests' },
  { key: 'message_sent', label: 'Messages' },
  { key: 'status_change', label: 'Status changes' },
  { key: 'delivery_created', label: 'Deliveries' },
  { key: 'note_added', label: 'Notes' },
]

const DATE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

export default function ActivityPage() {
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('all')
  const [dateRange, setDateRange] = useState('7')
  const [visibleCount, setVisibleCount] = useState(13)
  const [searchInput, setSearchInput] = useState('')
  const [clients, setClients] = useState([])
  const [clientFilter, setClientFilter] = useState(null)
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  )

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    clientsApi.list().then(res => {
      setClients(res.data.data?.clients || [])
    }).catch(() => {})
  }, [])


  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const from_date = new Date(Date.now() - parseInt(dateRange) * 86400000)
          .toISOString().split('T')[0]

        const params = { from_date }
        if (eventFilter !== 'all') params.event_type = eventFilter
        if (search) params.search = search
        if (clientFilter) params.client_id = clientFilter

        const res = await dashboardApi.getActivityFeed(params)
        setActivities(res.data.data?.results || [])
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [dateRange, eventFilter, search, clientFilter])

  const handleExport = async () => {
    try {
      const from_date = new Date(Date.now() - parseInt(dateRange) * 86400000)
        .toISOString().split('T')[0]

      const params = { from_date }
      if (eventFilter !== 'all') params.event_type = eventFilter
      if (search) params.search = search
      if (clientFilter) params.client_id = clientFilter

      const res = await dashboardApi.getActivityExport(params)

      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'activity.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
  }

  const grouped = groupByDate(activities.slice(0, visibleCount))

  return (
    <ProviderLayout
      badges={{}}
      topbar={
        <ProviderTopbar
          title="Activity"
          rightSlot={
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl border border-[#e8eae8] bg-white px-3 py-2 text-[12px] font-medium text-[#4a544a] hover:border-[#0f6e56]/30 transition-colors"
            >
              <Download size={13} className="text-[#9ea89e]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          }
        />
      }
    >
      {/* 
        Scrollbar hiding styles for horizontal tabs navigation.
        Using .no-scrollbar selector to hide browser scrollbars while keeping swipe behavior active.
      */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Sticky Filters Container for Mobile */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#e8eae8] p-3 space-y-2.5 shadow-sm">
        {/* Row 1: Search + Date filter select */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ea89e]" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search logs..."
              className="w-full h-9 rounded-xl border border-[#e8eae8] pl-9 pr-3 text-[12px] outline-none placeholder:text-[#9ea89e] focus:border-[#0f6e56] transition-all bg-[#fafafa]"
            />
          </div>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="h-9 px-2 rounded-xl border border-[#e8eae8] text-[12px] font-semibold text-[#4a544a] bg-white outline-none"
          >
            {DATE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Row 2: Event Filter Tabs (scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-3 px-3">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setEventFilter(key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors
                ${eventFilter === key ? 'bg-[#0f6e56] text-white' : 'bg-[#f7f8f7] text-[#4a544a] active:bg-[#e8eae8]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Row 3: Client Filter Select */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#9ea89e]">Client Filter:</span>
          <select
            value={clientFilter || ''}
            onChange={e => setClientFilter(e.target.value || null)}
            className="h-8 px-2.5 rounded-lg border border-[#e8eae8] text-[11px] font-medium text-[#4a544a] bg-white outline-none"
          >
            <option value="">All clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.display_name || c.client_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-0 lg:p-6">
        <div className="rounded-none lg:rounded-2xl border-0 lg:border border-[#e8eae8] bg-white overflow-hidden">

          {/* Search + Input layout (DESKTOP) */}
          <div className="hidden lg:flex items-center gap-3 p-4 border-b border-[#f1f3f1]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ea89e]" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search activity by client, request title, context..."
                className="w-full h-9 rounded-xl border border-[#e8eae8] pl-9 pr-4 text-[13px] outline-none placeholder:text-[#9ea89e] focus:border-[#0f6e56] focus:ring-4 focus:ring-[#0f6e56]/10 transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {DATE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setDateRange(o.value)}
                  className={`flex items-center gap-1.5 h-9 rounded-lg border px-3 text-[12px] font-medium transition-colors
                    ${dateRange === o.value ? 'border-[#0f6e56] bg-[#e6f5f0] text-[#0f6e56]' : 'border-[#e8eae8] text-[#4a544a] hover:border-[#0f6e56]/30'}
                  `}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-[#f1f3f1]">
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-semibold text-[#9ea89e] mr-2">Filter by:</span>
              {FILTER_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setEventFilter(key)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors
                    ${eventFilter === key ? 'bg-[#0f6e56] text-white' : 'text-[#4a544a] hover:bg-[#f7f8f7]'}`
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                onClick={() => setClientDropdownOpen(o => !o)}
                className="flex items-center gap-1.5 h-8 rounded-lg border border-[#e8eae8] px-3 text-[12px] font-medium text-[#4a544a] hover:border-[#0f6e56]/30 transition-colors"
              >
                {clientFilter ? clients.find(c => c.id === clientFilter)?.display_name || 'Client' : 'All clients'}
                <ChevronDown size={12} className="text-[#9ea89e]" />
              </button>
              {clientDropdownOpen && (
                <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-[#e8eae8] bg-white shadow-lg py-1">
                  <button
                    onClick={() => { setClientFilter(null); setClientDropdownOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-[13px] hover:bg-[#f7f8f7] ${!clientFilter ? 'font-semibold text-[#0f6e56]' : 'text-[#4a544a]'}`}
                  >
                    All clients
                  </button>
                  {clients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setClientFilter(c.id); setClientDropdownOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-[13px] hover:bg-[#f7f8f7] ${clientFilter === c.id ? 'font-semibold text-[#0f6e56]' : 'text-[#4a544a]'}`}
                    >
                      {c.display_name || c.client_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cleaned minimalist event metadata readout block */}
          {!loading && (
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f1f3f1] bg-[#fafafa]">
              <p className="text-[12px] text-[#4a544a]">
                Showing <span className="font-semibold text-[#141a14]">{activities.length} logs</span> matching your tracking timeframe filter selection criteria.
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={22} className="animate-spin text-[#0f6e56]" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell size={24} className="text-[#9ea89e] mb-3" />
              <p className="text-[15px] font-medium text-[#141a14]">No activity found</p>
              <p className="text-[13px] text-[#9ea89e] mt-1">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <div className="px-2 lg:px-5 divide-y divide-[#f1f3f1]">
              {Object.entries(grouped).map(([date, acts]) => (
                <div key={date} className="pt-2">
                  <div className="flex items-center justify-between py-2 px-3 sticky top-[138px] lg:top-0 bg-white z-10">
                    <p className="text-[12px] font-semibold text-[#141a14]">{date}</p>
                    <p className="text-[11px] text-[#9ea89e]">{acts.length} logs</p>
                  </div>
                  <div className="pb-3 space-y-1">
                    {acts.map(a => (
                      <ActivityRow
                        key={a.id}
                        activity={a}
                        onNavigate={id => navigate(`/requests/${id}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {activities.length > visibleCount && (
                <div className="py-5 text-center border-t border-[#f1f3f1]">
                  <button
                    onClick={() => setVisibleCount(v => v + 25)}
                    className="text-[13px] font-medium text-[#0f6e56] hover:underline"
                  >
                    Load more events
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProviderLayout>
  )
}