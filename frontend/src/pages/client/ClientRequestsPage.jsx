import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Loader2, FileText, ChevronRight, CheckCircle2, 
  Clock, Search, Layers, CheckCircle, ChevronLeft
} from 'lucide-react'
import ClientLayout from '../../components/layout/ClientLayout'
import NewRequestModal from '../../components/modals/NewRequestModal'
import requestsApi from '../../api/requests.api'
import { timeAgo } from '../../utils/clientHelpers'
import { useAuth } from '../../context/AuthContext'
import { useBadges } from '../../hooks/useBadges'
import { useTenantBranding } from '../../context/TenantBrandingContext'

const CARDS_PER_PAGE = 4

// ─── Status config (Updated to Tailwind Semantic Tokens) ──────
const STATUS_CONFIG = {
  received:    { label: 'Submitted',        step: 1, pill: 'bg-surface text-text-sub border-border/60', dot: 'bg-text-dim' },
  in_review:   { label: "In Review",        step: 2, pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  in_progress: { label: 'In Progress',      step: 3, pill: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  delivered:   { label: 'Ready for Review', step: 4, pill: 'bg-primary-light text-primary-dark border-grove-200', dot: 'bg-primary' },
  closed:      { label: 'Completed',        step: 5, pill: 'bg-surface/50 text-text-dim border-border/40', dot: 'bg-border' },
}

const STATUS_FILTER_TABS = [
  { key: 'all',         label: 'All Requests' },
  { key: 'received',    label: 'Submitted' },
  { key: 'in_review',   label: 'In Review' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'delivered',   label: 'Ready' },
  { key: 'closed',      label: 'Completed' },
]

// ── Scaled-Up Stat Card ──────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, iconColor, iconBgOverride, iconColorOverride }) {
  return (
    <div className="bg-white rounded-2xl border border-border/60 p-5 flex items-center justify-between shadow-sm transition-all hover:shadow-soft">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-semibold text-text-main tracking-tight leading-none pt-1">{value}</p>
        <p className="text-xs text-text-sub font-medium">{subtitle}</p>
      </div>
      <div 
        className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${iconBgOverride ? '' : iconColor}`}
        style={iconBgOverride ? { backgroundColor: iconBgOverride, color: iconColorOverride } : {}}
      >
        <Icon size={20} />
      </div>
    </div>
  )
}

// ── Clean Pagination ──────────────────────────────────────────
function Pagination({ page, total, perPage, onChange }) {
  const { colors } = useTenantBranding()
  const { accent } = colors
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  
  return (
    <div className="flex items-center justify-between pt-6 border-t border-border/40 w-full mt-6">
      <p className="text-xs font-medium text-text-dim">
        Showing <span className="font-semibold text-text-main">{(page - 1) * perPage + 1}</span>–<span className="font-semibold text-text-main">{Math.min(page * perPage, total)}</span> of <span className="font-semibold text-text-main">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 text-text-sub bg-white hover:bg-surface disabled:opacity-40 disabled:hover:bg-white transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all"
            style={p === page ? { backgroundColor: accent, color: '#ffffff' } : {}}
            {...(p !== page ? { className: "bg-white border border-border/60 text-text-sub hover:bg-surface" } : {})}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 text-text-sub bg-white hover:bg-surface disabled:opacity-40 disabled:hover:bg-white transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Roomier, More Impactful List Row ───────────────────────
function RequestRow({ req, onClick }) {
  const { colors } = useTenantBranding()
  const { accent, accentSoft, accentDark } = colors
  const [hovered, setHovered] = useState(false)
  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.received
  const hasDeliveries = req.deliveries?.length > 0
  const isDelivered = req.status === 'delivered'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex items-center justify-between gap-4 p-5 bg-white border border-border/60 rounded-xl hover:shadow-soft hover:-translate-y-[1px] transition-all duration-200 cursor-pointer"
      style={hovered ? { borderColor: accent } : {}}
    >
      {/* Left Context Group */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div 
          className="hidden sm:flex items-center justify-center h-10 w-10 rounded-xl transition-colors shrink-0"
          style={
            hovered 
              ? { backgroundColor: accentSoft, color: accent } 
              : { backgroundColor: '#F7F8F7', color: '#9EA89E' }
          }
        >
          <FileText size={18} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 
              className="text-sm font-semibold text-text-main transition-colors truncate max-w-[200px] sm:max-w-[350px] md:max-w-[550px]"
              style={hovered ? { color: accent } : {}}
            >
              {req.title}
            </h3>
            {req.category && (
              <span className="text-[10px] font-bold tracking-wide text-text-sub bg-surface px-2 py-0.5 rounded-md uppercase">
                {req.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-text-dim">
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              Updated {timeAgo(req.updated_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Right Metrics & Steppers */}
      <div className="flex items-center gap-5 shrink-0">
        {hasDeliveries && (
          <span 
            className="hidden md:flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md border"
            style={{ color: accentDark, backgroundColor: accentSoft, borderColor: `${accent}20` }}
          >
            <CheckCircle2 size={12} /> Files ready
          </span>
        )}
        
        <span 
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold tracking-wide"
          style={
            isDelivered
              ? { backgroundColor: accentSoft, color: accentDark, borderColor: `${accent}33` }
              : undefined
          }
          {...(!isDelivered ? { className: `inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold tracking-wide ${cfg.pill}` } : {})}
        >
          <span 
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: isDelivered ? accent : undefined }}
            {...(!isDelivered ? { className: `h-1.5 w-1.5 rounded-full ${cfg.dot}` } : {})}
          />
          {cfg.label}
        </span>

        {/* Scaled Step Indicators */}
        <div className="hidden lg:flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((stepNumber) => (
            <div 
              key={stepNumber}
              className="h-1.5 w-5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: stepNumber <= cfg.step ? accent : '#F7F8F7',
                border: stepNumber <= cfg.step ? 'none' : '1px solid rgba(0,0,0,0.06)'
              }}
            />
          ))}
        </div>

        <div className="text-text-dim group-hover:text-text-main transition-colors pl-1">
          <ChevronRight size={18} className="transform group-hover:translate-x-0.5 transition-transform" style={hovered ? { color: accent } : {}} />
        </div>
      </div>
    </div>
  )
}

// ── Redesigned Page Scaffold ──────────────────────────────────
export default function ClientRequestsPage() {
  const navigate = useNavigate()
  const { tenant } = useAuth()
  const { colors } = useTenantBranding()
  const { accent, accentSoft, accentDark } = colors
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const { registerPortalListener } = useBadges()

  const [hoveredNew, setHoveredNew] = useState(false)
  const [hoveredEmptyCreate, setHoveredEmptyCreate] = useState(false)
  const [focusedSearch, setFocusedSearch] = useState(false)

  const providerName = tenant?.name || 'your provider'

  const fetchRequests = useCallback(async () => {
    try {
      const res = await requestsApi.list()
      setRequests(res.data.data?.requests || [])
    } catch {
      // safe fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    return registerPortalListener((msg) => {
      if (msg.type === 'status_change' || msg.type === 'files_delivered'){
        setRequests((prev) => 
          prev.map((r) =>
            r.id === msg.request_id
              ? { ...r, status: msg.new_status || (msg.type === 'files_delivered' ? 'delivered' : r.status), updated_at: msg.updated_at || new Date().toISOString() }
              : r
          )
        )
      }
    })
  }, [registerPortalListener])

  useEffect(() => { fetchRequests() }, [fetchRequests])
  useEffect(() => { setPage(1) }, [statusFilter, searchQuery])

  const totalCount = requests.length
  const dynamicActiveCount = requests.filter(r => ['received', 'in_review', 'in_progress'].includes(r.status)).length
  const dynamicReadyCount = requests.filter(r => r.status === 'delivered').length
  const dynamicClosedCount = requests.filter(r => r.status === 'closed').length

  const filtered = requests.filter(r => {
    const matchesTab = statusFilter === 'all' || r.status === statusFilter
    return matchesTab && (searchQuery.trim() === '' || r.title.toLowerCase().includes(searchQuery.toLowerCase()))
  })

  const paginatedRequests = filtered.slice((page - 1) * CARDS_PER_PAGE, page * CARDS_PER_PAGE)

  return (
    <ClientLayout badges={{ requests: dynamicReadyCount }}>
      {/* Spacer for mobile fixed header */}
      
      {/* Max width set to 5xl/6xl to match higher display densities beautifully */}
      <div className="p-4 sm:p-0 max-w-6xl mx-auto space-y-8 antialiased">

        {/* Title Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-text-main tracking-tight">Request Hub</h1>
            <p className="text-sm font-medium text-text-sub">View updates and track work submitted to {providerName}.</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            onMouseEnter={() => setHoveredNew(true)}
            onMouseLeave={() => setHoveredNew(false)}
            className="flex items-center justify-center gap-2 rounded-xl px-5 h-10 text-sm font-semibold text-white active:scale-[0.98] transition-all w-full sm:w-auto shadow-sm"
            style={{ backgroundColor: hoveredNew ? accentDark : accent }}
          >
            <Plus size={16} />
            New Request
          </button>
        </div>

        {/* Status Metrics Deck */}
        <div className="hidden sm:grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Requests" value={totalCount} subtitle="All items created" icon={Layers} iconColor="bg-surface text-text-sub" />
          <StatCard title="In Progress" value={dynamicActiveCount} subtitle="Currently being built" icon={Clock} iconColor="bg-indigo-50 text-indigo-600" />
          <StatCard 
            title="Ready For Review" 
            value={dynamicReadyCount} 
            subtitle="Awaiting your approval" 
            icon={CheckCircle2} 
            iconBgOverride={accentSoft}
            iconColorOverride={accent}
          />
          <StatCard title="Completed" value={dynamicClosedCount} subtitle="Finished requests" icon={CheckCircle} iconColor="bg-surface/50 text-text-dim" />
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          
          {/* Modern Segmented Control Style Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none bg-surface/50 p-1 rounded-xl border border-border/40">
            {STATUS_FILTER_TABS.map(({ key, label }) => {
              const active = statusFilter === key
              const count = key === 'all' ? totalCount : requests.filter(r => r.status === key).length
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`shrink-0 flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs transition-all
                    ${active ? 'bg-white text-text-main font-semibold shadow-sm ring-1 ring-border/50' : 'text-text-dim font-medium hover:text-text-main hover:bg-white/50'}`}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${active ? 'bg-surface text-text-main' : 'bg-surface text-text-sub'}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title..."
              className="w-full h-9 rounded-lg border bg-surface/30 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-text-dim text-text-main shadow-sm"
              style={{
                borderColor: focusedSearch ? accent : 'rgba(0,0,0,0.06)',
                boxShadow: focusedSearch ? `0 0 0 2px ${accentSoft}` : '',
                backgroundColor: focusedSearch ? '#ffffff' : ''
              }}
              onFocus={() => setFocusedSearch(true)}
              onBlur={() => setFocusedSearch(false)}
            />
          </div>
        </div>

        {/* Central Display Layer */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin" style={{ color: accent }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-white py-20 text-center px-4">
            <div className="h-12 w-12 rounded-xl bg-surface flex items-center justify-center mb-4 border border-border/40">
              <FileText size={20} className="text-text-dim" />
            </div>
            <p className="text-base font-semibold text-text-main">No requests found</p>
            <p className="text-sm text-text-sub mt-1 mb-6 max-w-xs leading-normal">
              Try changing your filters or create a brand new request to get started.
            </p>
            {(statusFilter === 'all' && !searchQuery.trim()) && (
              <button
                onClick={() => setShowNew(true)}
                onMouseEnter={() => setHoveredEmptyCreate(true)}
                onMouseLeave={() => setHoveredEmptyCreate(false)}
                className="flex items-center gap-2 rounded-xl px-5 h-10 text-sm font-semibold text-white active:scale-[0.98] transition-all shadow-sm"
                style={{ backgroundColor: hoveredEmptyCreate ? accentDark : accent }}
              >
                <Plus size={16} />
                Create a Request
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <style>{`
              @keyframes slideUpFade {
                from { opacity: 0; transform: translateY(8px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              .animate-slide-up { animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>

            <div className="flex flex-col gap-3">
              {paginatedRequests.map((req, i) => (
                <div key={req.id} className="animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <RequestRow
                    req={req}
                    onClick={() => navigate(`/my-requests/${req.id}`)}
                  />
                </div>
              ))}
            </div>

            <Pagination
              page={page}
              total={filtered.length}
              perPage={CARDS_PER_PAGE}
              onChange={setPage}
            />
          </div>
        )}

      </div>

      {showNew && (
        <NewRequestModal
          providerName={providerName}
          onClose={() => setShowNew(false)}
          onSuccess={(newReq) => {
            setShowNew(false)
            fetchRequests()
            navigate(`/my-requests/${newReq.id}`)
          }}
        />
      )}
    </ClientLayout>
  )
}