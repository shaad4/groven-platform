import MobileFilterSheet from '../../components/ui/MobileFilterSheet'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Flag, Calendar, ChevronDown, LayoutList,
  Columns, Clock, AlertCircle, CheckCircle2, Filter, Check, Sparkles
} from 'lucide-react'
import ProviderLayout from '../../components/layout/ProviderLayout'
import ProviderTopbar from '../../components/layout/ProviderTopbar'
import requestsApi from '../../api/requests.api'
import clientsApi from '../../api/clients.api'
import { getWorkspace } from '../../api/settings.api'
import { getAvatarColor, getInitials, timeAgo, formatDate } from '../../utils/clientHelpers'


const DEFAULT_STATUS_CONFIG = {
   received: { label: 'Received', clientLabel: 'Just submitted', dot: 'bg-[#1d9e75]', pill: 'bg-primary-light text-primary-ink', border: 'border-l-[#1d9e75]' },
   in_review: { label: 'In Review', clientLabel: "We're looking at it", dot: 'bg-[#f59e0b]', pill: 'bg-status-review-bg text-status-review-text', border: 'border-l-[#f59e0b]' },
   in_progress: { label: 'In Progress', clientLabel: 'Work has started', dot: 'bg-[#6366f1]', pill: 'bg-status-progress-bg text-status-progress-text', border: 'border-l-[#6366f1]' },
   delivered: { label: 'Delivered', clientLabel: 'Ready for you', dot: 'bg-primary', pill: 'bg-primary-light text-primary-ink', border: 'border-l-primary' },
   closed: { label: 'Closed', clientLabel: 'Done', dot: 'bg-text-dim', pill: 'bg-surface text-text-sub', border: 'border-l-[#9ea89e]' },
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
  design:   { label: 'Design',   dot: 'bg-status-progress-text', text: 'text-status-progress-text' },
  dev:      { label: 'Dev',      dot: 'bg-status-progress-text',   text: 'text-status-progress-text' },
  content:  { label: 'Content',  dot: 'bg-status-review-text', text: 'text-status-review-text' },
  feedback: { label: 'Feedback', dot: 'bg-red-600',   text: 'text-status-danger-text' },
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

function daysUntil(date) {
  const due = new Date(date.length === 10 ? `${date}T00:00:00` : date)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.round((due - today) / 86400000)
}

function DueDate({ date }) {
  if (!date) return <span className="text-text-dim">—</span>
  const diff = daysUntil(date)
  const isLate = diff < 0
  const isToday = diff === 0
  const isTomorrow = diff === 1
  const label = isLate ? `${formatDate(date)} · Overdue` : isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(date)
  return (
    <span className={`text-[13px] font-semibold ${isLate ? 'text-status-danger-text' : isToday ? 'text-status-review-text' : 'text-text-main'}`}>
      {label}
    </span>
  )
}

// ── LIST ROW ─────────────────────────────────────────────────
function RequestRow({  req, statusConfig, onClick, selected, onSelect }) {
  const clientName = req.client_name || 'Unknown'
  const hasFiles = req.file_count > 0
  const isClosed = req.status === 'closed'

  const diff = req.due_date ? daysUntil(req.due_date) : null
  const isOverdueOrToday = !isClosed && diff !== null && diff <= 0
  const isUrgent = !isClosed && (req.is_urgent || isOverdueOrToday)

  return (
    <div
      className={`group flex items-center gap-4 border-b border-border px-4 py-3.5 cursor-pointer transition-all last:border-0 relative
        ${isOverdueOrToday ? 'border-l-4 border-l-red-500 bg-status-danger-bg/60 hover:bg-status-danger-bg' : isUrgent ? 'border-l-2 border-l-red-400 hover:bg-surface' : 'hover:bg-surface'}
        ${selected && !isClosed && !isOverdueOrToday ? 'bg-primary-light' : ''}
      `}
      onClick={onClick}
      tabIndex={0} role="link" aria-label={`Open request: ${req.title}`}
      onKeyDown={event => { if (event.target === event.currentTarget && event.key === 'Enter') onClick() }}
    >
      <input
        type="checkbox"
        aria-label={`Select ${req.title}`}
        checked={selected}
        onChange={e => { e.stopPropagation(); onSelect() }}
        onClick={e => e.stopPropagation()}
        className="h-4 w-4 rounded border-border text-primary-ink accent-primary shrink-0"
      />

      <div className={`h-2 w-2 rounded-full shrink-0 ${isOverdueOrToday ? 'bg-red-600 ' : isUrgent ? 'bg-red-400' : 'bg-transparent'}`} />

      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-medium truncate ${isOverdueOrToday ? 'text-status-danger-text font-semibold' : 'text-text-main'}`}>{req.title}</p>
        <div className="flex items-center gap-2 mt-0.5 min-w-0">
          <p className="text-[12px] text-text-dim truncate">
            {req.description?.slice(0, 80)}
            {hasFiles && <span className="ml-2 inline-flex items-center gap-1 text-text-dim"><span>📎</span>{req.file_count} files</span>}
          </p>
          <CategoryDot category={req.ai_category} />
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 w-44 shrink-0">
        <Avatar name={clientName} avatarUrl={req.client_avatar_url} size="sm" />
        <span className="text-[13px] text-text-sub truncate">{clientName}</span>
      </div>

      <div className="w-28 shrink-0">
        <StatusPill status={req.status} statusConfig={statusConfig} small />
      </div>

      <div className="hidden xl:block w-28 shrink-0">
        <DueDate date={req.due_date} />
      </div>

      <div className="hidden xl:block w-24 shrink-0 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {req.status === 'delivered' && <CheckCircle2 size={13} className="text-primary-ink" />}
          <span className="text-[12px] text-text-dim">{timeAgo(req.updated_at)}</span>
        </div>
      </div>

      <div className="w-6 shrink-0">
        {isOverdueOrToday ? (
          <AlertCircle size={14} className="text-status-danger-text stroke-[2.5]" />
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

  const diff = req.due_date ? daysUntil(req.due_date) : null
  const isOverdueOrToday = !isClosed && diff !== null && diff <= 0
  const isUrgent = !isClosed && (req.is_urgent || isOverdueOrToday)

  return (
    <div
      onClick={onClick}
      tabIndex={0} role="link" aria-label={`Open request: ${req.title}`}
      onKeyDown={event => { if (event.target === event.currentTarget && event.key === 'Enter') onClick() }}
      className={`p-4 bg-layout-card rounded-2xl border border-border active:bg-surface transition-all relative flex flex-col gap-3 cursor-pointer
        ${isOverdueOrToday ? 'border-l-4 border-l-red-500 bg-status-danger-bg/20' : isUrgent ? 'border-l-2 border-l-red-400' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={`text-[14px] font-semibold text-text-main leading-snug break-words ${isOverdueOrToday ? 'text-status-danger-text font-bold' : ''}`}>
            {req.title}
          </h3>
          {req.description && (
            <p className="text-[12px] text-text-sub mt-1 line-clamp-2 leading-relaxed">
              {req.description}
            </p>
          )}
        </div>

        {/* Right slot icon */}
        <div className="shrink-0 mt-0.5">
          {isOverdueOrToday ? (
            <AlertCircle size={14} className="text-status-danger-text stroke-[2.5]" />
          ) : (
            isUrgent && <Flag size={13} className="text-red-400 fill-red-400" />
          )}
        </div>
      </div>

      {/* Meta Row */}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Avatar name={clientName} avatarUrl={req.client_avatar_url} size="sm" />
          <span className="text-[12px] text-text-sub font-medium truncate max-w-[120px]">
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
        <div className="flex items-center justify-between text-[11px] text-text-dim mt-0.5">
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

  const diff = req.due_date ? daysUntil(req.due_date) : null
  const isOverdue = !isClosed && diff !== null && diff < 0
  const isToday = !isClosed && diff === 0
  const isOverdueOrToday = isOverdue || isToday
  const isUrgent = !isClosed && req.is_urgent

  return (
    <div
      className={`bg-layout-card rounded-xl border cursor-pointer hover:shadow-md hover:shadow-black/[0.06] hover:-translate-y-[1px] transition-all duration-150 overflow-hidden
        ${isOverdueOrToday ? 'border-red-400 border-l-[4px] border-l-red-500 bg-status-danger-bg/20' : isUrgent ? 'border-red-200 border-l-[3px] border-l-red-400' : 'border-border'}
      `}
      onClick={onClick}
      tabIndex={0} role="link" aria-label={`Open request: ${req.title}`}
      onKeyDown={event => { if (event.key === 'Enter') onClick() }}
    >
      <div className="p-3.5">
        <p className={`text-[13px] font-medium leading-snug mb-2 ${isOverdueOrToday ? 'text-status-danger-text font-semibold' : 'text-text-main'}`}>{req.title}</p>
        <div className="flex items-center gap-2">
          <Avatar name={clientName} avatarUrl={req.client_avatar_url} size="sm" />
          <span className="text-[12px] text-text-dim truncate">{clientName}</span>
          <CategoryDot category={req.ai_category} />
        </div>
        {req.due_date && (
          <div className={`mt-2.5 flex items-center gap-1.5 text-[12px] font-medium
            ${isClosed ? 'text-text-dim' : isOverdueOrToday ? 'text-status-danger-text' : 'text-text-dim' }
          `}>
            {isOverdueOrToday ? <AlertCircle size={12} className="text-status-danger-text" /> : <Calendar size={11} />}
            {isClosed
              ? `Due ${formatDate(req.due_date)}`
              : isOverdue
                ? `Overdue · ${formatDate(req.due_date)}`
                : isToday
                  ? 'Due today'
                  : `Due ${formatDate(req.due_date)}`
            }
          </div>
        )}
        {req.status === 'delivered' && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-primary-ink">
            <CheckCircle2 size={11} />
            <span>Delivered {formatDate(req.updated_at)}</span>
          </div>
        )}
        {req.status === 'closed' && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-text-dim">
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
    dot: status === 'overdue' ? 'bg-red-600' : status === 'flagged' ? 'bg-amber-400' : 'bg-gray-400'
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
            <span className="text-[11px] font-semibold text-text-dim group-hover:text-text-main transition-colors [writing-mode:vertical-rl] rotate-180">
              {cfg.label}
            </span>
            <span className="text-[11px] text-text-dim font-medium">{requests.length}</span>
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              <span className="text-[13px] font-semibold text-text-main">{cfg.label}</span>
              <span className="text-[12px] text-text-dim font-medium">{requests.length}</span>
            </div>
            <div className="flex items-center gap-1">
              {isClosed && (
                <button
                  onClick={() => setCollapsed(true)}
                  className="h-6 w-6 rounded-full border border-border flex items-center justify-center text-text-dim hover:text-text-main transition-colors"
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
            <div className="rounded-xl border border-dashed border-border p-4 text-center">
              <p className="text-[12px] text-text-dim">No requests</p>
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
  const triggerRef = useRef(null)
  const optionsId = useId()
  useEffect(() => {
    if (!open) return
    const handleOutside = event => { if (ref.current && !ref.current.contains(event.target)) setOpen(false) }
    const handleKey = event => {
      if (event.key === 'Escape' && ref.current?.contains(document.activeElement)) {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])
  const selected = options.find(o => o.value === value)
  return (
    <div ref={ref} className="relative">
      <button
        type="button" ref={triggerRef} aria-expanded={open} aria-controls={optionsId}
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 h-8 rounded-lg border px-3 text-[12px] font-medium transition-colors
          ${value ? 'border-primary bg-primary-light text-primary-ink' : 'border-border bg-layout-card text-text-sub hover:border-primary/30'}
        `}
      >
        {Icon && <Icon size={13} className={value ? 'text-primary-ink' : 'text-text-dim'} />}
        {selected?.label || label}
        <ChevronDown size={12} className={value ? 'text-primary-ink' : 'text-text-dim'} />
      </button>
      {open && (
        <div id={optionsId} role="group" aria-label={`${label} options`} className="absolute left-0 top-9 z-50 w-44 rounded-xl border border-border bg-layout-card py-1 shadow-xl shadow-black/10 max-h-60 overflow-y-auto no-scrollbar">
          {options.map(o => (
            <button
              key={o.value}
              type="button" aria-pressed={value === o.value}
              onClick={() => { onChange(o.value); setOpen(false); triggerRef.current?.focus() }}
              className={`w-full text-left px-3 py-2 text-[13px] transition-colors hover:bg-surface flex items-center justify-between
                ${value === o.value ? 'text-primary-ink font-medium bg-primary-light' : 'text-text-main'}
              `}
            >
              <span>{o.label}</span>
              {value === o.value && <Check size={12} className="text-primary-ink" />}
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
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState('list')
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

  const activeFiltersCount = (activeTab !== 'all' ? 1 : 0) + (clientFilter ? 1 : 0) + (dateFilter ? 1 : 0) + (categoryFilter ? 1 : 0) + (sortFilter !== 'newest' ? 1 : 0)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
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
      setLoadError(true)
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

  // Filter core logic
  const filtered = requests.filter(r => {
    const isClosed = r.status === 'closed'
    if (activeTab === 'flagged') return r.is_urgent
    if (activeTab === 'overdue') return !isClosed && r.due_date && daysUntil(r.due_date) < 0
    if (activeTab !== 'all') return r.status === activeTab
    return true
  }).filter(r => {
    if (clientFilter && String(r.client_id) !== String(clientFilter)) return false
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
    overdue: requests.filter(r => r.status !== 'closed' && r.due_date && daysUntil(r.due_date) < 0).length,
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
              <div className="relative hidden xl:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search requests" placeholder="Search requests or clients"
                  className="h-9 w-52 rounded-xl border border-border bg-layout-card pl-8 pr-4 text-[13px] outline-none placeholder:text-text-dim focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="hidden md:flex items-center rounded-xl border border-border bg-layout-card overflow-hidden">
                <button
                  onClick={() => setView('list')}
                  title="List view" aria-label="List view" aria-pressed={view === 'list'}
                  className={`flex h-9 w-9 items-center justify-center transition-colors ${view === 'list' ? 'bg-primary-light text-primary-ink' : 'text-text-dim hover:text-text-sub'}`}
                >
                  <LayoutList size={15} />
                </button>
                <button
                  onClick={() => setView('pipeline')}
                  title="Pipeline view" aria-label="Pipeline view" aria-pressed={view === 'pipeline'}
                  className={`flex h-9 w-9 items-center justify-center border-l border-border transition-colors ${view === 'pipeline' ? 'bg-primary-light text-primary-ink' : 'text-text-dim hover:text-text-sub'}`}
                >
                  <Columns size={15} />
                </button>
              </div>
            </div>
          }
        />
      }
    >
      <div className="mx-auto max-w-[1800px] px-4 pb-6 sm:px-6 lg:px-8">
        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        {/* Sticky Header Container */}
        <div className="md:sticky top-0 z-30 bg-layout-page pt-3 pb-0 md:bg-surface md:pt-6 md:pb-2">

        {/* Mobile Search and Filter Row */}
        <div className="flex xl:hidden items-center gap-2 mb-4">
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search requests" placeholder="Search requests or clients"
              className="h-11 w-full rounded-xl border border-border bg-layout-card pl-8 pr-4 text-[13px] outline-none placeholder:text-text-dim focus:border-primary transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowMobileFilters(true)}
            aria-haspopup="dialog" aria-expanded={showMobileFilters}
            className={`relative flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border bg-layout-card px-3 text-sm font-medium transition-colors md:hidden ${
              activeFiltersCount > 0
                ? 'border-primary bg-primary-light text-primary-ink'
                : 'border-border text-text-sub hover:bg-surface'
            }`}
          >
            <Filter size={15} aria-hidden="true" /><span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-on-primary border border-layout-card">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {activeFiltersCount > 0 && <div className="mb-3 hidden md:flex flex-wrap items-center gap-2 text-xs text-text-sub" aria-live="polite">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-light px-2.5 py-1.5 font-medium text-primary-ink"><Filter size={12} />{activeFiltersCount} active {activeFiltersCount === 1 ? 'filter' : 'filters'}</span>
          <button type="button" onClick={() => { setActiveTab('all'); setClientFilter(''); setDateFilter(''); setCategoryFilter(''); setSortFilter('newest') }} className="min-h-9 px-2 font-medium text-text-sub underline-offset-4 hover:underline">Clear filters</button>
        </div>}

        {/* ── Filter bar ── */}
        <div className="mb-4 rounded-2xl border border-border bg-layout-card relative z-20 hidden md:block">

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
                      ? isOverdue ? 'border-red-400 text-status-danger-text' : isFlagged ? 'border-amber-400 text-status-review-text' : 'border-primary text-primary-ink'
                      : 'border-transparent text-text-sub hover:text-text-main'
                    }
                  `}
                >
                  {isFlagged && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                  {TAB_LABELS[tab]}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium
                      ${active
                        ? isOverdue ? 'bg-status-danger-bg text-status-danger-text' : 'bg-primary-light text-primary-ink'
                        : 'bg-surface text-text-dim'
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
          <div className="hidden md:flex items-center justify-between gap-3 px-4 py-3 border-t border-border relative z-30">
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
              <span className="text-[12px] text-text-dim hidden sm:block">{filtered.length} requests</span>
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
          <div className="mb-4 hidden md:block">
            <h2 className="text-[15px] font-semibold text-text-main">Pipeline View</h2>
            <p className="text-[12px] text-text-dim">Click the list icon in the topbar to switch</p>
          </div>
        )}


        </div>

        {/* ── Content ── */}
        {loading ? (
          <PageSkeleton label="Loading requests" variant="list" className="!p-0" />
        ) : loadError ? (
          <div role="alert" className="rounded-2xl border border-border bg-layout-card p-8 text-center">
            <AlertCircle size={24} className="mx-auto mb-3 text-status-danger-text" />
            <h2 className="text-base font-semibold text-text-main">Requests could not be loaded</h2>
            <p className="mt-2 text-sm text-text-sub">Please try again to see your latest requests.</p>
            <button type="button" onClick={fetchRequests} className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Try again</button>
          </div>
        ) : view === 'list' ? (
          isMobile ? (
            <div className="flex flex-col gap-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-layout-card rounded-2xl border border-border">
                  <AlertCircle size={24} className="text-text-dim mb-3" />
                  <p className="text-[15px] font-medium text-text-main">No requests found</p>
                  <p className="text-[13px] text-text-dim mt-1">
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
            <div className="rounded-2xl border border-border bg-layout-card overflow-hidden relative z-10">
              {/* List header */}
              <div className="hidden xl:grid items-center gap-4 border-b border-border px-4 py-3"
                style={{ gridTemplateColumns: '24px 12px 1fr 176px 112px 112px 96px 24px' }}>
                <input type="checkbox" aria-label="Select all visible requests" className="h-4 w-4 rounded border-border accent-primary"
                  onChange={e => setSelected(e.target.checked ? new Set(filtered.map(r => r.id)) : new Set())}
                />
                <div />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">Request</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">Client</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">Status</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">Due Date</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim text-right">Last Updated</p>
                <div />
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle size={24} className="text-text-dim mb-3" />
                  <p className="text-[15px] font-medium text-text-main">No requests found</p>
                  <p className="text-[13px] text-text-dim mt-1">
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

      <MobileFilterSheet open={showMobileFilters} onClose={() => setShowMobileFilters(false)} title="Request filters" onReset={() => { setActiveTab('all'); setClientFilter(''); setDateFilter(''); setCategoryFilter(''); setSortFilter('newest'); setView('list') }}>
        <p className="text-xs text-text-dim">{activeFiltersCount} active {activeFiltersCount === 1 ? 'filter' : 'filters'} · {filtered.length} requests</p>
        <fieldset><legend className="mb-2 text-sm font-medium text-text-main">Status</legend><div className="grid grid-cols-2 gap-2">{STATUS_TABS.map(status => <button key={status} type="button" onClick={() => setActiveTab(status)} aria-pressed={activeTab === status} className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-sm ${activeTab === status ? 'border-primary bg-primary-light text-primary-ink' : 'border-border bg-surface text-text-sub'}`}><span>{TAB_LABELS[status]}</span><span className="text-xs tabular-nums">{counts[status] || 0}</span></button>)}</div></fieldset>
        {[{ label: 'Client', value: clientFilter, options: clientOptions, onChange: setClientFilter }, { label: 'Date range', value: dateFilter, options: dateOptions, onChange: setDateFilter }, { label: 'Category', value: categoryFilter, options: categoryOptions, onChange: setCategoryFilter }, { label: 'Sort order', value: sortFilter, options: sortOptions, onChange: setSortFilter }].map(({ label, value, options, onChange }) => <label key={label} className="block space-y-2 text-sm font-medium text-text-main"><span>{label}</span><select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-layout-card px-3 text-sm font-normal text-text-main">{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}
        <fieldset><legend className="mb-2 text-sm font-medium text-text-main">View</legend><div className="grid grid-cols-2 gap-2">{[{ value: 'list', label: 'List', icon: LayoutList }, { value: 'pipeline', label: 'Pipeline', icon: Columns }].map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setView(value)} aria-pressed={view === value} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm ${view === value ? 'border-primary bg-primary-light text-primary-ink' : 'border-border bg-surface text-text-sub'}`}><Icon size={16} />{label}</button>)}</div></fieldset>
      </MobileFilterSheet>
    </ProviderLayout>
  )
}
