import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Search, Flag, Calendar, ChevronDown, LayoutList,
  Columns, Plus, Clock, AlertCircle, Loader2,
  CheckCircle2, Filter, Check, Sparkles, X
} from 'lucide-react'
import ProviderLayout from '../../components/layout/ProviderLayout'
import ProviderTopbar from '../../components/layout/ProviderTopbar'
import requestsApi from '../../api/requests.api'
import clientsApi from '../../api/clients.api'
import { getWorkspace } from '../../api/settings.api'
import { getAvatarColor, getInitials, timeAgo, formatDate } from '../../utils/clientHelpers'


const DEFAULT_STATUS_CONFIG = {
   received: { label: 'Received', clientLabel: 'Just submitted', dot: 'bg-[#1d9e75]', pill: 'bg-[#e6f5f0] text-[#085041]', border: 'border-l-[#1d9e75]' },
   in_review: { label: 'In Review', clientLabel: "We're looking at it", dot: 'bg-[#f59e0b]', pill: 'bg-[#fef3e2] text-[#92500a]', border: 'border-l-[#f59e0b]' },
   in_progress: { label: 'In Progress', clientLabel: 'Work has started', dot: 'bg-[#6366f1]', pill: 'bg-[#eef2ff] text-[#3730a3]', border: 'border-l-[#6366f1]' },
   delivered: { label: 'Delivered', clientLabel: 'Ready for you', dot: 'bg-[#0f6e56]', pill: 'bg-[#e6f5f0] text-[#0f6e56]', border: 'border-l-[#0f6e56]' },
   closed: { label: 'Closed', clientLabel: 'Done', dot: 'bg-[#9ea89e]', pill: 'bg-[#f3f4f3] text-[#4a544a]', border: 'border-l-[#9ea89e]' },
 }

function buildStatusConfig(customLabels) {
  if (!customLabels) return DEFAULT_STATUS_CONFIG
  const merged = {}
  for (const key of Object.keys(DEFAULT_STATUS_CONFIG)) {
    merged[key] = {
      ...DEFAULT_STATUS_CONFIG[key],
      label: customLabels[key]?.trim() || DEFAULT_STATUS_CONFIG[key].label,
    }
  }
  return merged
}

const STATUS_TABS = ['all', 'received', 'in_review', 'in_progress', 'delivered', 'closed', 'flagged', 'overdue']

// AI category 
const CATEGORY_STYLES = {
  design:   { label: 'Design',   dot: 'bg-violet-500', text: 'text-violet-600' },
  dev:      { label: 'Dev',      dot: 'bg-cyan-500',   text: 'text-cyan-600' },
  content:  { label: 'Content',  dot: 'bg-orange-500', text: 'text-orange-600' },
  feedback: { label: 'Feedback', dot: 'bg-rose-500',   text: 'text-rose-600' },
}

function CategoryDot({ category }) {
  const style = CATEGORY_STYLES[category]
  if (!style) return null
  return (
    <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-medium ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}

function StatusPill({ status, statusConfig, small = false }) {
  const cfg = statusConfig[status] || statusConfig.received
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'} ${cfg.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function Avatar({ name = '', avatarUrl = null, size = 'sm' }) {
  const c = getAvatarColor(name)
  const initials = getInitials(name)
  const sz = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-8 w-8 text-[12px]'
  return (
    <div className={`rounded-full overflow-hidden flex items-center justify-center font-semibold shrink-0 ${sz} ${c.bg} ${c.text}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : initials}
    </div>
  )
}

function DueDate({ date }) {
  if (!date) return <span className="text-[#9ea89e]">—</span>
  const d = new Date(date)
  const now = new Date()
  const diff = Math.ceil((d - now) / 86400000)
  const isLate = diff < 0
  const isToday = diff === 0
  const isTomorrow = diff === 1
  const label = isLate ? `Apr ${d.getDate()} Late` : isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(date)
  return (
    <span className={`text-[13px] font-semibold ${isLate ? 'text-red-600 animate-pulse' : isToday ? 'text-amber-600' : 'text-[#141a14]'}`}>
      {label}
    </span>
  )
}

// ── LIST ROW ─────────────────────────────────────────────────
function RequestRow({  req, statusConfig, onClick, selected, onSelect }) {
  const clientName = req.client_name || 'Unknown'
  const hasFiles = req.file_count > 0
  const isClosed = req.status === 'closed'
  
  const diff = req.due_date ? Math.ceil((new Date(req.due_date) - new Date()) / 86400000) : null
  const isOverdueOrToday = !isClosed && diff !== null && diff <= 0
  const isUrgent = !isClosed && (req.is_urgent || isOverdueOrToday)

  return (
    <div
      className={`group flex items-center gap-4 border-b border-[#f1f3f1] px-4 py-3.5 cursor-pointer transition-all last:border-0 relative
        ${isOverdueOrToday ? 'border-l-4 border-l-red-500 bg-red-50/40 hover:bg-red-50/60' : isUrgent ? 'border-l-2 border-l-red-400 hover:bg-[#fafafa]' : 'hover:bg-[#fafafa]'}
        ${selected && !isClosed && !isOverdueOrToday ? 'bg-[#f7fbf9]' : ''}
      `}
      onClick={onClick}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={e => { e.stopPropagation(); onSelect() }}
        onClick={e => e.stopPropagation()}
        className="h-4 w-4 rounded border-[#e8eae8] text-[#0f6e56] accent-[#0f6e56] shrink-0"
      />

      <div className={`h-2 w-2 rounded-full shrink-0 ${isOverdueOrToday ? 'bg-red-500 animate-ping' : isUrgent ? 'bg-red-400' : 'bg-transparent'}`} />

      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-medium truncate ${isOverdueOrToday ? 'text-red-950 font-semibold' : 'text-[#141a14]'}`}>{req.title}</p>
        <div className="flex items-center gap-2 mt-0.5 min-w-0">
          <p className="text-[12px] text-[#9ea89e] truncate">
            {req.description?.slice(0, 80)}
            {hasFiles && <span className="ml-2 inline-flex items-center gap-1 text-[#9ea89e]"><span>📎</span>{req.file_count} files</span>}
          </p>
          <CategoryDot category={req.ai_category} />
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 w-44 shrink-0">
        <Avatar name={clientName} avatarUrl={req.client_avatar_url} size="sm" />
        <span className="text-[13px] text-[#4a544a] truncate">{clientName}</span>
      </div>

      <div className="w-28 shrink-0">
        <StatusPill status={req.status} statusConfig={statusConfig} small />
      </div>

      <div className="hidden lg:block w-28 shrink-0">
        <DueDate date={req.due_date} />
      </div>

      <div className="hidden xl:block w-24 shrink-0 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {req.status === 'delivered' && <CheckCircle2 size={13} className="text-[#0f6e56]" />}
          <span className="text-[12px] text-[#9ea89e]">{timeAgo(req.updated_at)}</span>
        </div>
      </div>

      <div className="w-6 shrink-0">
        {isOverdueOrToday ? (
          <AlertCircle size={14} className="text-red-500 stroke-[2.5]" />
        ) : (
          isUrgent && <Flag size={13} className="text-red-400 fill-red-400" />
        )}
      </div>
    </div>
  )
}

// ── MOBILE REQUEST CARD ───────────────────────────────────────
function MobileRequestCard({ req, statusConfig, onClick }) {
  const clientName = req.client_name || 'Unknown'
  const isClosed = req.status === 'closed'
  
  const diff = req.due_date ? Math.ceil((new Date(req.due_date) - new Date()) / 86400000) : null
  const isOverdueOrToday = !isClosed && diff !== null && diff <= 0
  const isUrgent = !isClosed && (req.is_urgent || isOverdueOrToday)

  return (
    <div
      onClick={onClick}
      className={`p-4 bg-white rounded-2xl border border-[#e8eae8] active:bg-[#f7f8f7] transition-all relative flex flex-col gap-3 cursor-pointer
        ${isOverdueOrToday ? 'border-l-4 border-l-red-500 bg-red-50/20' : isUrgent ? 'border-l-2 border-l-red-400' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={`text-[14px] font-semibold text-[#141a14] leading-snug break-words ${isOverdueOrToday ? 'text-red-950 font-bold' : ''}`}>
            {req.title}
          </h3>
          {req.description && (
            <p className="text-[12px] text-[#6b776c] mt-1 line-clamp-2 leading-relaxed">
              {req.description}
            </p>
          )}
        </div>
        
        {/* Right slot icon */}
        <div className="shrink-0 mt-0.5">
          {isOverdueOrToday ? (
            <AlertCircle size={14} className="text-red-500 stroke-[2.5]" />
          ) : (
            isUrgent && <Flag size={13} className="text-red-400 fill-red-400" />
          )}
        </div>
      </div>

      {/* Meta Row */}
      <div className="flex items-center justify-between gap-2 border-t border-[#f1f3f1] pt-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Avatar name={clientName} avatarUrl={req.client_avatar_url} size="sm" />
          <span className="text-[12px] text-[#4a544a] font-medium truncate max-w-[120px]">
            {clientName}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 flex-wrap">
          <CategoryDot category={req.ai_category} />
          <StatusPill status={req.status} statusConfig={statusConfig} small />
        </div>
      </div>

      {/* Due date row */}
      {req.due_date && (
        <div className="flex items-center justify-between text-[11px] text-[#9ea89e] mt-0.5">
          <div className="flex items-center gap-1">
            <Calendar size={11} />
            <DueDate date={req.due_date} />
          </div>
          <span>Updated {timeAgo(req.updated_at)}</span>
        </div>
      )}
    </div>
  )
}

// ── PIPELINE CARD ─────────────────────────────────────────────
function PipelineCard({ req, onClick }) {
  const clientName = req.client_name || 'Unknown'
  const isClosed = req.status === 'closed'
  
  const diff = req.due_date ? Math.ceil((new Date(req.due_date) - new Date()) / 86400000) : null
  const isOverdue = !isClosed && diff !== null && diff < 0
  const isToday = !isClosed && diff === 0
  const isOverdueOrToday = isOverdue || isToday
  const isUrgent = !isClosed && req.is_urgent

  return (
    <div
      className={`bg-white rounded-xl border cursor-pointer hover:shadow-md hover:shadow-black/[0.06] hover:-translate-y-[1px] transition-all duration-150 overflow-hidden
        ${isOverdueOrToday ? 'border-red-400 border-l-[4px] border-l-red-500 bg-red-50/20' : isUrgent ? 'border-red-200 border-l-[3px] border-l-red-400' : 'border-[#e8eae8]'}
      `}
      onClick={onClick}
    >
      <div className="p-3.5">
        <p className={`text-[13px] font-medium leading-snug mb-2 ${isOverdueOrToday ? 'text-red-950 font-semibold' : 'text-[#141a14]'}`}>{req.title}</p>
        <div className="flex items-center gap-2">
          <Avatar name={clientName} avatarUrl={req.client_avatar_url} size="sm" />
          <span className="text-[12px] text-[#9ea89e] truncate">{clientName}</span>
          <CategoryDot category={req.ai_category} />
        </div>
        {req.due_date && (
          <div className={`mt-2.5 flex items-center gap-1.5 text-[12px] font-medium
            ${isClosed ? 'text-[#9ea89e]' : isOverdueOrToday ? 'text-red-600' : 'text-[#9ea89e]' }
          `}>
            {isOverdueOrToday ? <AlertCircle size={12} className="text-red-500" /> : <Calendar size={11} />}
            {isClosed 
              ? `Due ${formatDate(req.due_date)}` 
              : isOverdue 
                ? `CRITICAL — Overdue (${formatDate(req.due_date)})` 
                : isToday 
                  ? 'ACTION REQUIRED — Due Today' 
                  : `Due ${formatDate(req.due_date)}`
            }
          </div>
        )}
        {req.status === 'delivered' && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-[#0f6e56]">
            <CheckCircle2 size={11} />
            <span>Delivered {formatDate(req.updated_at)}</span>
          </div>
        )}
        {req.status === 'closed' && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-[#9ea89e]">
            <Clock size={11} />
            <span>Closed {formatDate(req.updated_at)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── PIPELINE COLUMN ───────────────────────────────────────────
function PipelineColumn({ status, requests, statusConfig, onCardClick, isMobile = false }) {
  const cfg = statusConfig[status] || {
    label: status === 'all' ? 'All' : status === 'flagged' ? 'Flagged' : status === 'overdue' ? 'Overdue' : status,
    dot: status === 'overdue' ? 'bg-red-500' : status === 'flagged' ? 'bg-amber-400' : 'bg-gray-400'
  }
  const isClosed = status === 'closed'
  const [collapsed, setCollapsed] = useState(isClosed && !isMobile)

  return (
    <div className={`flex flex-col transition-all duration-200 ${collapsed ? 'min-w-[48px] w-12 md:block hidden' : 'w-full md:min-w-[220px] md:flex-1'}`}>
      
      {/* Header */}
      {!isMobile && (
        <div className="flex items-center justify-between mb-3 px-1">
        {collapsed ? (
          // Vertical collapsed header
          <button
            onClick={() => setCollapsed(false)}
            className="flex flex-col items-center gap-2 w-full py-2 group"
          >
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            <span className="text-[11px] font-semibold text-[#9ea89e] group-hover:text-[#141a14] transition-colors [writing-mode:vertical-rl] rotate-180">
              {cfg.label}
            </span>
            <span className="text-[10px] text-[#9ea89e] font-medium">{requests.length}</span>
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              <span className="text-[13px] font-semibold text-[#141a14]">{cfg.label}</span>
              <span className="text-[12px] text-[#9ea89e] font-medium">{requests.length}</span>
            </div>
            <div className="flex items-center gap-1">
              {status === 'received' && (
                <button className="h-6 w-6 rounded-full border border-[#e8eae8] flex items-center justify-center text-[#9ea89e] hover:text-[#0f6e56] hover:border-[#0f6e56] transition-colors">
                  <Plus size={13} />
                </button>
              )}
              {isClosed && (
                <button
                  onClick={() => setCollapsed(true)}
                  className="h-6 w-6 rounded-full border border-[#e8eae8] flex items-center justify-center text-[#9ea89e] hover:text-[#141a14] transition-colors"
                  title="Collapse"
                >
                  <ChevronDown size={13} className="rotate-90" />
                </button>
              )}
            </div>
          </>
        )}
        </div>
      )}

      {/* Cards — hidden when collapsed */}
      {!collapsed && (
        <div className="flex flex-col gap-2">
          {requests.map(r => (
            <PipelineCard key={r.id} req={r} statusConfig={statusConfig} onClick={() => onCardClick(r.id)} />
          ))}
          {requests.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#e8eae8] p-4 text-center">
              <p className="text-[12px] text-[#9ea89e]">No requests</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── FILTER DROPDOWN ───────────────────────────────────────────
function FilterDropdown({ label, value, options, onChange, icon: Icon }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = options.find(o => o.value === value)
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 h-8 rounded-lg border px-3 text-[12px] font-medium transition-colors
          ${value ? 'border-[#0f6e56] bg-[#f0faf6] text-[#0f6e56]' : 'border-[#e8eae8] bg-white text-[#4a544a] hover:border-[#0f6e56]/30'}
        `}
      >
        {Icon && <Icon size={13} className={value ? 'text-[#0f6e56]' : 'text-[#9ea89e]'} />}
        {selected?.label || label}
        <ChevronDown size={12} className={value ? 'text-[#0f6e56]' : 'text-[#9ea89e]'} />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-50 w-44 rounded-xl border border-[#e8eae8] bg-white py-1 shadow-xl shadow-black/10 max-h-60 overflow-y-auto no-scrollbar">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-[13px] transition-colors hover:bg-[#f7f8f7] flex items-center justify-between
                ${value === o.value ? 'text-[#0f6e56] font-medium bg-[#f7fbf9]' : 'text-[#141a14]'}
              `}
            >
              <span>{o.label}</span>
              {value === o.value && <Check size={12} className="text-[#0f6e56]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// MAIN PAGE 
export default function RequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [clients, setClients] = useState([])
  const [statusConfig, setStatusConfig] = useState(DEFAULT_STATUS_CONFIG)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('pipeline') // Kanban view default updated
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  
  // Filtering Hooks
  const [clientFilter, setClientFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [sortFilter, setSortFilter] = useState('newest')
  const [selected, setSelected] = useState(new Set())

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const activeFiltersCount = (clientFilter ? 1 : 0) + (dateFilter ? 1 : 0) + (categoryFilter ? 1 : 0) + (sortFilter !== 'newest' ? 1 : 0)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (clientFilter) params.client_id = clientFilter
      if (categoryFilter) params.ai_category = categoryFilter
      if (sortFilter) params.sort = sortFilter

      if (dateFilter) {
        const d = new Date()
        d.setDate(d.getDate() - parseInt(dateFilter, 10))
        params.date_from = d.toISOString().split('T')[0]
      }

      const res = await requestsApi.list(params)
      setRequests(res.data.data?.requests || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [clientFilter, categoryFilter, dateFilter, sortFilter])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    clientsApi.list().then(r => setClients(r.data.data?.clients || [])).catch(() => {})
  }, [])

  useEffect(() => {
    getWorkspace()
      .then(r => setStatusConfig(buildStatusConfig(r.data.data?.custom_status_labels)))
      .catch(() => {}) 
  }, [])

  const dateOptions = [
    { value: '', label: 'Date range' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' }
  ]

  const categoryOptions = [
    { value: '', label: 'All categories' },
    { value: 'design', label: 'Design' },
    { value: 'dev', label: 'Dev' },
    { value: 'content', label: 'Content' },
    { value: 'feedback', label: 'Feedback' },
  ]

  const now = new Date()
  
  // Filter core logic
  const filtered = requests.filter(r => {
    const isClosed = r.status === 'closed'
    if (activeTab === 'flagged') return r.is_urgent
    if (activeTab === 'overdue') return !isClosed && r.due_date && new Date(r.due_date) < now
    if (activeTab !== 'all') return r.status === activeTab
    return true
  }).filter(r => {
    if (clientFilter && r.client_id !== clientFilter) return false
    if (categoryFilter && r.ai_category !== categoryFilter) return false
    
    if (dateFilter) {
      const boundaryDate = new Date()
      boundaryDate.setDate(boundaryDate.getDate() - parseInt(dateFilter, 10))
      if (new Date(r.created_at) < boundaryDate) return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      return r.title.toLowerCase().includes(q) || (r.client_name || '').toLowerCase().includes(q)
    }
    return true
  })

  // Frontend Sorting implementation fallback for Client sorting
  if (sortFilter === 'client_name') {
    filtered.sort((a, b) => (a.client_name || '').localeCompare(b.client_name || ''))
  }

  const counts = {
    all: requests.length,
    received: requests.filter(r => r.status === 'received').length,
    in_review: requests.filter(r => r.status === 'in_review').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    delivered: requests.filter(r => r.status === 'delivered').length,
    closed: requests.filter(r => r.status === 'closed').length,
    flagged: requests.filter(r => r.is_urgent).length,
    overdue: requests.filter(r => r.status !== 'closed' && r.due_date && new Date(r.due_date) < now).length,
  }

  const byStatus = Object.fromEntries(
    ['received', 'in_review', 'in_progress', 'delivered', 'closed'].map(s => [
      s,
      filtered.filter(r => r.status === s),
    ])
  )

  const clientOptions = [
    { value: '', label: 'All clients' },
    ...clients.filter(c => c.status === 'active').map(c => ({
      value: c.id,
      label: c.display_name || c.client_name,
    })),
  ]

  const sortOptions = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'client_name', label: 'Client Name' },
    { value: 'last_updated', label: 'Last updated' },
  ]

  const TAB_LABELS = {
    all: 'All',
    received: statusConfig.received.label,
    in_review: statusConfig.in_review.label,
    in_progress: statusConfig.in_progress.label,
    delivered: statusConfig.delivered.label,
    closed: statusConfig.closed.label,
    flagged: 'Flagged',
    overdue: 'Overdue',
  }

  return (
    <ProviderLayout
      badges={{ requests: counts.received }}
      topbar={
        <ProviderTopbar
          title="Requests"
          liveIndicator
          rightSlot={
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ea89e]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search requests..."
                  className="h-9 w-52 rounded-xl border border-[#e8eae8] bg-white pl-8 pr-4 text-[13px] outline-none placeholder:text-[#9ea89e] focus:border-[#0f6e56] focus:ring-4 focus:ring-[#0f6e56]/10 transition-all"
                />
              </div>
              <div className="flex items-center rounded-xl border border-[#e8eae8] bg-white overflow-hidden">
                <button
                  onClick={() => setView('list')}
                  title="List view"
                  className={`flex h-9 w-9 items-center justify-center transition-colors ${view === 'list' ? 'bg-[#e6f5f0] text-[#0f6e56]' : 'text-[#9ea89e] hover:text-[#4a544a]'}`}
                >
                  <LayoutList size={15} />
                </button>
                <button
                  onClick={() => setView('pipeline')}
                  title="Pipeline view"
                  className={`flex h-9 w-9 items-center justify-center border-l border-[#e8eae8] transition-colors ${view === 'pipeline' ? 'bg-[#e6f5f0] text-[#0f6e56]' : 'text-[#9ea89e] hover:text-[#4a544a]'}`}
                >
                  <Columns size={15} />
                </button>
              </div>
            </div>
          }
        />
      }
    >
      <div className="px-6 pb-6">
        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        {/* Sticky Header Container */}
        <div className="sticky top-0 z-30 bg-[#f7f8f7] pt-6 pb-2">

        {/* Mobile Search and Filter Row */}
        <div className="flex md:hidden items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ea89e]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="h-9 w-full rounded-xl border border-[#e8eae8] bg-white pl-8 pr-4 text-[13px] outline-none placeholder:text-[#9ea89e] focus:border-[#0f6e56] transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowMobileFilters(true)}
            className={`relative flex items-center justify-center h-9 w-9 rounded-xl border bg-white transition-all ${
              activeFiltersCount > 0 
                ? 'border-[#0f6e56] bg-[#f0faf6] text-[#0f6e56]' 
                : 'border-[#e8eae8] text-[#4a544a] hover:bg-[#fafafa]'
            }`}
          >
            <Filter size={15} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0f6e56] px-1 text-[9px] font-bold text-white border border-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div className="mb-4 rounded-2xl border border-[#e8eae8] bg-white relative z-20 hidden md:block">
          
          {/* Status tabs row */}
          <div className="flex items-center gap-1 overflow-x-auto px-4 pt-4 pb-0 no-scrollbar">
            {STATUS_TABS.map(tab => {
              const isOverdue = tab === 'overdue'
              const isFlagged = tab === 'flagged'
              const count = counts[tab]
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap
                    ${active
                      ? isOverdue ? 'border-red-400 text-red-500' : isFlagged ? 'border-amber-400 text-amber-600' : 'border-[#0f6e56] text-[#0f6e56]'
                      : 'border-transparent text-[#4a544a] hover:text-[#141a14]'
                    }
                  `}
                >
                  {isFlagged && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                  {TAB_LABELS[tab]}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium
                      ${active
                        ? isOverdue ? 'bg-red-50 text-red-500' : 'bg-[#e6f5f0] text-[#085041]'
                        : 'bg-[#f0f2f0] text-[#9ea89e]'
                      }
                    `}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Secondary filter row */}
          <div className="hidden md:flex items-center justify-between gap-3 px-4 py-3 border-t border-[#f1f3f1] relative z-30">
            <div className="flex items-center gap-2 flex-wrap">
              <FilterDropdown
                label="All clients"
                value={clientFilter}
                options={clientOptions}
                onChange={setClientFilter}
                icon={Filter}
              />
              <FilterDropdown
                label="Date range"
                value={dateFilter}
                options={dateOptions}
                onChange={setDateFilter}
                icon={Calendar}
              />
              <FilterDropdown
                label="Category"
                value={categoryFilter}
                options={categoryOptions}
                onChange={setCategoryFilter}
                icon={Sparkles}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] text-[#9ea89e] hidden sm:block">{filtered.length} requests</span>
              <FilterDropdown
                label="Sort"
                value={sortFilter}
                options={sortOptions}
                onChange={setSortFilter}
              />
            </div>
          </div>
        </div>

        {/* ── Pipeline label ── */}
        {view === 'pipeline' && (
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-[#141a14]">Pipeline View</h2>
            <p className="text-[12px] text-[#9ea89e]">Click the list icon in the topbar to switch</p>
          </div>
        )}

        {/* Mobile Switcher Tabs */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-3 mb-4 no-scrollbar border-b border-[#f1f3f1]">
          {['all', 'received', 'in_review', 'in_progress', 'delivered', 'closed', 'flagged', 'overdue'].map(s => {
            const active = activeTab === s
            const count = counts[s]
            
            let label
            let dotClass
            
            if (s === 'all') {
              label = 'All'
              dotClass = 'bg-gray-400'
            } else if (s === 'flagged') {
              label = 'Flagged'
              dotClass = 'bg-amber-500'
            } else if (s === 'overdue') {
              label = 'Overdue'
              dotClass = 'bg-red-500'
            } else {
              const cfg = statusConfig[s]
              label = cfg?.label || s
              dotClass = cfg?.dot || 'bg-gray-400'
            }

            return (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all
                  ${active 
                    ? 'bg-[#e6f5f0] border-[#0f6e56] text-[#0f6e56]' 
                    : 'bg-white border-[#e8eae8] text-[#6b776c]'
                  }
                `}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                <span>{label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? 'bg-[#0f6e56] text-white' : 'bg-[#f0f2f0] text-[#9ea89e]'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin text-[#0f6e56]" />
          </div>
        ) : view === 'list' ? (
          isMobile ? (
            <div className="flex flex-col gap-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-[#e8eae8]">
                  <AlertCircle size={24} className="text-[#9ea89e] mb-3" />
                  <p className="text-[15px] font-medium text-[#141a14]">No requests found</p>
                  <p className="text-[13px] text-[#9ea89e] mt-1">
                    {activeTab !== 'all' ? `No ${TAB_LABELS[activeTab].toLowerCase()} requests` : 'Requests from clients will appear here'}
                  </p>
                </div>
              ) : (
                filtered.map(req => (
                  <MobileRequestCard
                    key={req.id}
                    req={req}
                    statusConfig={statusConfig}
                    onClick={() => navigate(`/requests/${req.id}`)}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#e8eae8] bg-white overflow-hidden relative z-10">
              {/* List header */}
              <div className="hidden xl:grid items-center gap-4 border-b border-[#f1f3f1] px-4 py-3"
                style={{ gridTemplateColumns: '24px 12px 1fr 176px 112px 112px 96px 24px' }}>
                <input type="checkbox" className="h-4 w-4 rounded border-[#e8eae8] accent-[#0f6e56]"
                  onChange={e => setSelected(e.target.checked ? new Set(filtered.map(r => r.id)) : new Set())}
                />
                <div />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">Request</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">Client</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">Status</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">Due Date</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e] text-right">Last Updated</p>
                <div />
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle size={24} className="text-[#9ea89e] mb-3" />
                  <p className="text-[15px] font-medium text-[#141a14]">No requests found</p>
                  <p className="text-[13px] text-[#9ea89e] mt-1">
                    {activeTab !== 'all' ? `No ${TAB_LABELS[activeTab].toLowerCase()} requests` : 'Requests from clients will appear here'}
                  </p>
                </div>
              ) : (
                filtered.map(req => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    statusConfig={statusConfig}
                    onClick={() => navigate(`/requests/${req.id}`)}
                    selected={selected.has(req.id)}
                    onSelect={() => setSelected(s => {
                      const n = new Set(s)
                      n.has(req.id) ? n.delete(req.id) : n.add(req.id)
                      return n
                    })}
                  />
                ))
              )}
            </div>
          )
        ) : (
          /* Pipeline view */
          isMobile ? (
            <div className="flex flex-col gap-4">
              <PipelineColumn
                status={activeTab}
                statusConfig={statusConfig}
                requests={filtered}
                onCardClick={id => navigate(`/requests/${id}`)}
                isMobile={true}
              />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 relative z-10">
              {['received', 'in_review', 'in_progress', 'delivered', 'closed'].map(s => (
                <PipelineColumn
                  key={s}
                  status={s}
                  statusConfig={statusConfig}
                  requests={byStatus[s] || []}
                  onCardClick={id => navigate(`/requests/${id}`)}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Mobile Filters Drawer */}
      {showMobileFilters && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="relative w-full max-h-[85vh] bg-white rounded-t-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#eef0ee]">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#0f6e56]" />
                <span className="text-[16px] font-bold text-[#141a14]">Filters & Sorting</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="h-8 w-8 rounded-full bg-[#f7f8f7] flex items-center justify-center text-[#6b756d]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form contents */}
            <div className="overflow-y-auto p-4 space-y-5 flex-1">
              {/* Client Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#9ea89e] uppercase tracking-wider">Client</label>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={clientFilter}
                    onChange={e => setClientFilter(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#e8eae8] bg-white text-[14px] text-[#141a14] outline-none focus:border-[#0f6e56] appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ea89e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                  >
                    {clientOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date range */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#9ea89e] uppercase tracking-wider">Date range</label>
                <div className="flex flex-wrap gap-2">
                  {dateOptions.map(o => {
                    const isSelected = dateFilter === o.value
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setDateFilter(o.value)}
                        className={`h-9 px-4 rounded-full text-[13px] font-medium border transition-colors ${
                          isSelected 
                            ? 'bg-[#e6f5f0] border-[#0f6e56] text-[#0f6e56]' 
                            : 'bg-[#f7f8f7] border-[#e8eae8] text-[#4a544a]'
                        }`}
                      >
                        {o.label === 'Date range' ? 'All time' : o.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#9ea89e] uppercase tracking-wider">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map(o => {
                    const isSelected = categoryFilter === o.value
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setCategoryFilter(o.value)}
                        className={`h-9 px-4 rounded-full text-[13px] font-medium border transition-colors ${
                          isSelected 
                            ? 'bg-[#e6f5f0] border-[#0f6e56] text-[#0f6e56]' 
                            : 'bg-[#f7f8f7] border-[#e8eae8] text-[#4a544a]'
                        }`}
                      >
                        {o.label === 'All categories' ? 'All categories' : o.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#9ea89e] uppercase tracking-wider">Sort order</label>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={sortFilter}
                    onChange={e => setSortFilter(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#e8eae8] bg-white text-[14px] text-[#141a14] outline-none focus:border-[#0f6e56] appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ea89e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                  >
                    {sortOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[#eef0ee] flex gap-3 bg-[#fafcfa]">
              <button
                type="button"
                onClick={() => {
                  setClientFilter('')
                  setDateFilter('')
                  setCategoryFilter('')
                  setSortFilter('newest')
                }}
                className="flex-1 h-11 rounded-xl border border-[#e8eae8] text-[14px] font-semibold text-[#6b756d] bg-white active:bg-[#f7f8f7] transition-all"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="flex-1 h-11 rounded-xl bg-[#0f6e56] text-[14px] font-semibold text-white hover:bg-[#0c5b47] active:scale-[0.98] transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ProviderLayout>
  )
}