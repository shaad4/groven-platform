import MobileFilterSheet from '../../components/ui/MobileFilterSheet'
import { Skeleton, InlinePending } from '../../components/ui/Skeleton'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, MoreVertical, ChevronRight,
  Mail, Trash2, PowerOff, Power,
  Send, Users, LayoutGrid, List, Filter,
  Sparkles,
} from 'lucide-react'
import ProviderLayout from '../../components/layout/ProviderLayout'
import ProviderTopbar from '../../components/layout/ProviderTopbar'
import AddClientModal from '../../components/modals/AddClientModal'
import EditClientModal from '../../components/modals/EditClientModal'
import DeleteClientModal from '../../components/modals/DeleteClientModal'
import clientsApi from '../../api/clients.api'
import { useDispatch } from 'react-redux'
import { openUpgradeModal } from '../../features/billing/billingSlice'
import { getWorkspace } from '../../api/settings.api'
import { getTagColor, getAvatarColor, getInitials, timeAgo } from '../../utils/clientHelpers'

// STATUS CONFIG
const STATUS_CONFIG = {
  active: {
    label: 'Active',
    dot: 'bg-[#1d9e75]',
    pill: 'bg-primary-light text-primary-ink',
  },
  pending: {
    label: 'Awaiting invite',
    dot: 'bg-[#f59e0b]',
    pill: 'bg-status-review-bg text-status-review-text',
  },
  deactivated: {
    label: 'Deactivated',
    dot: 'bg-text-dim',
    pill: 'bg-surface text-text-sub',
  },
}

function getClientStatus(client) {
  if (client.is_deactivated) return 'deactivated'
  if (client.status === 'pending') return 'pending'
  return 'active'
}

// TAG CHIP
function TagChip({ name }) {
  const c = getTagColor(name)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
      {name}
    </span>
  )
}

// AI INSIGHT BADGE
const INSIGHT_META = {
  gone_quiet:  { label: 'Gone quiet',  classes: 'bg-status-review-bg text-status-review-text' },
  high_volume: { label: 'High volume', classes: 'bg-status-progress-bg text-status-progress-text' },
}

function InsightBadge({ insight }) {
  const meta = INSIGHT_META[insight]
  if (!meta) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.classes}`}>
      <Sparkles size={10} />
      {meta.label}
    </span>
  )
}

// ACTION MENU
function ActionMenu({ client, onEdit, onDeactivate, onReactivate, onDelete, onResend }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const ref = useRef(null)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)
  const status = getClientStatus(client)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!ref.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false)
    }
    const closeOnScroll = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false) }
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus() }
    }
    menuRef.current?.querySelector('button')?.focus()
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', closeOnScroll)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', closeOnScroll)
    }
  }, [open])

  const toggleMenu = (event) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    setPosition({
      left: Math.max(12, Math.min(rect.right - 192, window.innerWidth - 204)),
      top: rect.bottom + 196 > window.innerHeight ? Math.max(12, rect.top - 192) : rect.bottom + 6,
    })
    setOpen(value => !value)
  }

  const Item = ({ icon: Icon, label, onClick, danger = false, className = '' }) => (
    <button
      role="menuitem"
      onClick={(e) => { e.stopPropagation(); setOpen(false); onClick() }}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-surface ${
        danger ? 'text-status-danger-text hover:bg-status-danger-bg' : 'text-text-main'
      } ${className}`}
    >
      <Icon size={14} className="shrink-0 opacity-70" />
      {label}
    </button>
  )

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        aria-label={`Actions for ${client.display_name || client.client_name || 'client'}`}
        aria-haspopup="menu" aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-sub hover:bg-surface hover:text-text-main transition-colors"
      >
        <MoreVertical size={15} />
      </button>

      {open && createPortal(
        <div ref={menuRef} role="menu" aria-label="Client actions" style={position}
          onClick={event => event.stopPropagation()}
          onKeyDown={event => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const items = [...event.currentTarget.querySelectorAll('button')]
            const current = items.indexOf(document.activeElement)
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
            items[next]?.focus()
          }}
          className="fixed z-[120] w-48 rounded-xl border border-border bg-layout-card py-1 shadow-xl shadow-black/10 overflow-hidden">
          <Item icon={Mail} label="Edit details" onClick={onEdit} />

          {status === 'pending' && (
            <Item icon={Send} label="Resend invite" onClick={onResend} />
          )}

          {status === 'active' && (
            <Item icon={PowerOff} label="Deactivate" onClick={onDeactivate} />
          )}

          {status === 'deactivated' && (
            <Item icon={Power} label="Reactivate" onClick={onReactivate} />
          )}

          <div className="my-1 border-t border-border" />
          <Item icon={Trash2} label="Delete client" onClick={onDelete} danger />
        </div>, document.body
      )}
    </div>
  )
}

// ─── CLIENT CARD (GRID) ───────────────────────────────────────
function ClientCard({ client, onEdit, onDeactivate, onReactivate, onDelete, onResend, onClick }) {
  const status = getClientStatus(client)
  const cfg = STATUS_CONFIG[status]
  const avatar = getAvatarColor(client.display_name || client.client_name || '')
  const initials = getInitials(client.display_name || client.client_name || '')
  const tags = (client.tags || []).map(t => typeof t === 'string' ? t : t.name)
  const lastActive = client.last_login ? timeAgo(client.last_login) : null
  const isPending = status === 'pending'
  const isDeactivated = status === 'deactivated'

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border bg-layout-card transition-all duration-200 hover:border-primary/35 hover:shadow-soft cursor-pointer overflow-hidden
        ${isDeactivated ? 'border-border opacity-75' : 'border-border'}
      `}
      onClick={() => !isPending && onClick()}
      tabIndex={isPending ? undefined : 0} role={isPending ? undefined : 'link'}
      aria-label={isPending ? undefined : `Open client: ${client.display_name || client.client_name}`}
      onKeyDown={event => { if (!isPending && event.target === event.currentTarget && event.key === 'Enter') onClick() }}
    >
      {/* Top section */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-11 w-11 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-[13px] font-semibold ${avatar.bg} ${avatar.text}`}>
              {isPending ? (
                <Mail size={16} className="opacity-70" />
              ) : client.avatar_url ? (
                <img
                  src={client.avatar_url}
                  alt={client.display_name || client.client_name}
                  className="w-full h-full object-cover"
                />
              ) : initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-text-main">
                {client.display_name || client.client_name || 'Unknown'}
              </p>
              <p className="truncate text-[12px] text-text-dim">
                {client.business_type || client.email || client.client_email || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${cfg.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            <ActionMenu
              client={client}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
              onDelete={onDelete}
              onResend={onResend}
            />
          </div>
        </div>

       {/* Tags + AI insight */}
        {(tags.length > 0 || client.ai_insight) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map(tag => <TagChip key={tag} name={tag} />)}
            {tags.length > 3 && (
              <span className="text-[11px] text-text-dim">+{tags.length - 3}</span>
            )}
            <InsightBadge insight={client.ai_insight} />
          </div>
        )}
      </div>

      {/* Stats row */}
      {!isPending ? (
        <div className="border-t border-border grid grid-cols-2">
          <div className="px-5 py-3 border-r border-border">
            <p className="text-[22px] font-semibold text-text-main">{client.open_request_count ?? 0}</p>
            <p className="text-[11px] text-text-dim">Open Requests</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[22px] font-semibold text-text-main">{client.delivered_count ?? 0}</p>
            <p className="text-[11px] text-text-dim">Delivered</p>
          </div>
        </div>
      ) : (
        <div className="border-t border-border px-5 py-4">
          <p className="text-[12px] text-text-dim italic">No data available yet · Awaiting client login</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-between">
        {isPending ? (
          <>
            <span className="text-[12px] text-text-dim">Never logged in</span>
            <button
              onClick={(e) => { e.stopPropagation(); onResend() }}
              className="text-[12px] font-medium text-primary-ink hover:text-primary-ink transition-colors flex items-center gap-1"
            >
              Resend invite <ChevronRight size={13} />
            </button>
          </>
        ) : isDeactivated ? (
          <>
            <span className="text-[12px] text-text-dim">
              {lastActive ? `Active ${lastActive}` : 'Never active'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onReactivate() }}
              className="text-[12px] font-medium text-primary-ink hover:text-primary-ink transition-colors flex items-center gap-1"
            >
              Reactivate <ChevronRight size={13} />
            </button>
          </>
        ) : (
          <>
            <span className="text-[12px] text-text-dim">
              {lastActive ? `Active ${lastActive}` : 'Never logged in'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onClick() }}
              className="text-[12px] font-medium text-primary-ink hover:text-primary-ink transition-colors flex items-center gap-1"
            >
              View client <ChevronRight size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── CLIENT ROW (LIST VIEW) ───────────────────────────────────
function ClientRow({ client, onEdit, onDeactivate, onReactivate, onDelete, onResend, onClick }) {
  const status = getClientStatus(client)
  const cfg = STATUS_CONFIG[status]
  const avatar = getAvatarColor(client.display_name || client.client_name || '')
  const initials = getInitials(client.display_name || client.client_name || '')
  const tags = (client.tags || []).map(t => typeof t === 'string' ? t : t.name)
  const lastActive = client.last_login ? timeAgo(client.last_login) : null
  const isPending = status === 'pending'

  return (
    <div
      className="flex items-center gap-4 border-b border-border px-5 py-4 hover:bg-surface transition-colors cursor-pointer last:border-0"
      onClick={() => !isPending && onClick()}
      tabIndex={isPending ? undefined : 0} role={isPending ? undefined : 'link'}
      aria-label={isPending ? undefined : `Open client: ${client.display_name || client.client_name}`}
      onKeyDown={event => { if (!isPending && event.target === event.currentTarget && event.key === 'Enter') onClick() }}
    >
      <div className={`h-9 w-9 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-[12px] font-semibold ${avatar.bg} ${avatar.text}`}>
        {isPending ? (
          <Mail size={14} className="opacity-70" />
        ) : client.avatar_url ? (
          <img
            src={client.avatar_url}
            alt={client.display_name || client.client_name}
            className="w-full h-full object-cover"
          />
        ) : initials}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-text-main truncate">
          {client.display_name || client.client_name || 'Unknown'}
        </p>
        <p className="text-[12px] text-text-dim truncate">
          {client.email || client.client_email || '—'}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-1.5 w-32">
        {tags.slice(0, 2).map(tag => <TagChip key={tag} name={tag} />)}
        {tags.length > 2 && <span className="text-[11px] text-text-dim">+{tags.length - 2}</span>}
        <InsightBadge insight={client.ai_insight} />
      </div>

      <div className="hidden sm:block w-24 text-right">
        <p className="text-[13px] font-medium text-text-main">{client.open_request_count ?? 0} open</p>
      </div>

      <div className="hidden md:block w-28 text-right">
        <p className="text-[12px] text-text-dim">
          {lastActive ? `Active ${lastActive}` : isPending ? 'Pending' : '—'}
        </p>
      </div>

      <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${cfg.pill}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>

      <ActionMenu
        client={client}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onReactivate={onReactivate}
        onDelete={onDelete}
        onResend={onResend}
      />
    </div>
  )
}

// ─── FILTER TABS ──────────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Awaiting invite' },
  { key: 'deactivated', label: 'Deactivated' },
]

// ─── TOAST ────────────────────────────────────────────────────
function Toast({ message, type = 'success' }) {
  return (
    <div className={`fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-xl px-5 py-3 text-[13px] font-medium text-on-primary shadow-xl shadow-black/20 transition-all
      ${type === 'success' ? 'bg-primary' : 'bg-red-600'}
    `}>
      {message}
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────
export default function ClientsPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [toast, setToast] = useState(null)

  // Modals
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(null) // clientId
  const [isPro, setIsPro] = useState(false)
  const [clientLimit, setClientLimit] = useState(3)

  useEffect(() => {
    getWorkspace()
      .then(r => {
        const plan = r.data.data?.plan
        setIsPro(plan?.name === 'pro')
        setClientLimit(plan?.client_limit ?? 3)
      })
      .catch(() => {})
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUpgrade = () => {
    dispatch(openUpgradeModal({
      reason: 'limit_reached',
      message: "You've reached your client limit on the Free plan.",
    }))
  }

  const handleAddClientClick = () => {
    if (clientCount >= clientLimit && !isPro) {
      handleUpgrade()
    } else {
      setShowAdd(true)
    }
  }


  const fetchClients = async () => {
    try {
      const res = await clientsApi.list()
      setClients(res.data.data?.clients || res.data.data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients() }, [])

  // ── Filtering & searching ──────────────────────────────────
  const filtered = clients.filter(c => {
    const status = getClientStatus(c)
    if (filter !== 'all' && status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = (c.display_name || c.client_name || '').toLowerCase()
      const email = (c.email || c.client_email || '').toLowerCase()
      const biz = (c.business_type || '').toLowerCase()
      const tags = (c.tags || []).map(t => (typeof t === 'string' ? t : t.name).toLowerCase()).join(' ')
      if (!name.includes(q) && !email.includes(q) && !biz.includes(q) && !tags.includes(q)) return false
    }
    return true
  })

  const counts = {
    all: clients.length,
    active: clients.filter(c => getClientStatus(c) === 'active').length,
    pending: clients.filter(c => getClientStatus(c) === 'pending').length,
    deactivated: clients.filter(c => getClientStatus(c) === 'deactivated').length,
  }

  // ── Actions ───────────────────────────────────────────────
  const handleDeactivate = async (client) => {
    setActionLoading(client.id)
    try {
      await clientsApi.deactivate(client.id)
      await fetchClients()
      showToast(`${client.display_name || client.client_name} deactivated.`)
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to deactivate.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivate = async (client) => {
    setActionLoading(client.id)
    try {
      await clientsApi.reactivate(client.id)
      await fetchClients()
      showToast(`${client.display_name || client.client_name} reactivated.`)
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to reactivate.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResend = async (client) => {
    setActionLoading(client.id)
    try {
      await clientsApi.resendInvite(client.id)
      showToast('Invite resent successfully.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to resend invite.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const clientCount = clients.length

  return (
    <>
      <ProviderLayout
        topbar={
          <ProviderTopbar
            title="Clients"
            liveIndicator
            onAddClient={handleAddClientClick}
            showAddBtn
          />
        }
      >
        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {/* Scrollbar hiding styles for horizontal tabs navigation */}
          <style>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          {/* ── Sticky Filter + Search bar ── */}
          <div className="md:sticky top-0 z-20 -mx-4 -mt-4 mb-4 md:mb-6 flex min-w-0 flex-col gap-3 border-b border-border bg-layout-page px-4 py-3 md:py-4 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8 xl:flex-row xl:items-center xl:justify-between">

            {/* Filter tabs */}
            <div role="group" aria-label="Filter clients by status" className="hidden min-w-0 gap-1 rounded-xl border border-border bg-surface p-1 md:flex md:w-fit">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={`flex min-h-10 min-w-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 text-[12px] font-medium transition-colors sm:justify-center ${
                    filter === key
                      ? 'bg-layout-card text-text-main shadow-sm'
                      : 'text-text-sub hover:text-text-main'
                  }`}
                >
                  {label}
                    <span className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1.5 text-[11px] tabular-nums ${
                      filter === key ? 'bg-primary text-on-primary' : 'bg-layout-card text-text-sub'
                    }`}>
                      {counts[key]}
                    </span>
                </button>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex w-full min-w-0 items-center gap-2 xl:w-auto">
              {/* Search */}
              <div className="relative min-w-0 flex-1 xl:flex-initial">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search clients" placeholder="Search clients..."
                  className="h-11 w-full rounded-xl border border-border bg-layout-card pl-9 pr-4 text-[13px] outline-none transition-colors placeholder:text-text-dim focus:border-primary focus:ring-4 focus:ring-primary/10 xl:w-52"
                />
              </div>

              <button type="button" onClick={() => setShowMobileFilters(true)} aria-haspopup="dialog" aria-expanded={showMobileFilters}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium md:hidden ${filter !== 'all' ? 'border-primary bg-primary-light text-primary-ink' : 'border-border bg-layout-card text-text-sub'}`}>
                <Filter size={16} /><span>Filters</span>{filter !== 'all' && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-on-primary">1</span>}
              </button>
              {/* View toggle */}
              <div role="group" aria-label="Client view" className="hidden md:flex shrink-0 items-center overflow-hidden rounded-xl border border-border bg-layout-card">
                <button
                  onClick={() => setViewMode('grid')} aria-label="Grid view" aria-pressed={viewMode === 'grid'}
                  className={`flex h-[42px] w-10 items-center justify-center transition-colors ${
                    viewMode === 'grid' ? 'bg-primary-light text-primary-ink' : 'text-text-dim hover:text-text-sub'
                  }`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode('list')} aria-label="List view" aria-pressed={viewMode === 'list'}
                  className={`flex h-[42px] w-10 items-center justify-center transition-colors border-l border-border ${
                    viewMode === 'list' ? 'bg-primary-light text-primary-ink' : 'text-text-dim hover:text-text-sub'
                  }`}
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div role="status" aria-label="Loading clients" aria-busy="true" className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-2'}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="rounded-2xl border border-border bg-layout-card p-5">
                  <div className="flex items-center gap-3"><Skeleton className="h-11 w-11 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-2 w-1/2" /></div><Skeleton className="h-6 w-16 rounded-full" /></div>
                  {viewMode === 'grid' && <><div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-4">{[1, 2].map(n => <div key={n} className="space-y-2"><Skeleton className="h-6 w-8" /><Skeleton className="h-2 w-20" /></div>)}</div><div className="mt-4 border-t border-border pt-4"><Skeleton className="h-2 w-2/3" /></div></>}
                </div>
              ))}
            </div>

          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-layout-card py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                <Users size={22} className="text-text-dim" />
              </div>
              <p className="mt-4 text-[15px] font-medium text-text-main">
                {search ? 'No clients match your search' : filter !== 'all' ? `No ${filter} clients` : 'No clients yet'}
              </p>
              <p className="mt-1.5 text-[13px] text-text-dim">
                {search ? 'Try a different search term' : filter !== 'all' ? 'Try switching to "All" filter' : 'Add your first client to get started'}
              </p>
              {!search && filter === 'all' && (
                <button
                  onClick={handleAddClientClick}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-medium text-on-primary hover:bg-primary-dark transition-colors"
                >
                  <Plus size={15} />
                  Add your first client
                </button>
              )}
            </div>

          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(client => (
                <div key={client.id} className="relative">
                  {actionLoading === client.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-layout-card/70 backdrop-blur-sm">
                      <span className="flex items-center gap-2 text-sm text-text-sub"><InlinePending label="Updating client" /> Updating…</span>
                    </div>
                  )}
                  <ClientCard
                    client={client}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    onEdit={() => setEditTarget(client)}
                    onDeactivate={() => handleDeactivate(client)}
                    onReactivate={() => handleReactivate(client)}
                    onDelete={() => setDeleteTarget(client)}
                    onResend={() => handleResend(client)}
                  />
                </div>
              ))}

              {/* Upgrade card if at limit */}
              {clientCount >= clientLimit && !isPro && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary-light bg-primary-light p-8 text-center dark:bg-layout-card dark:border-border">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
                    <span className="text-xl">🔒</span>
                  </div>
                  <p className="mt-3 text-[14px] font-semibold text-text-main">Client limit reached</p>
                  <p className="mt-1.5 text-[12px] text-text-dim">
                    Upgrade to Pro to add unlimited clients and access advanced collaboration tools.
                  </p>
                  <button
                    onClick={handleUpgrade}
                    className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-medium text-on-primary hover:bg-primary-dark transition-colors"
                  >
                    Upgrade to Pro
                   <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

          ) : (
            <div className="rounded-2xl border border-border bg-layout-card overflow-hidden">
              {/* List header */}
              <div className="hidden md:grid grid-cols-[1fr_160px_80px_120px_100px_80px] items-center gap-4 border-b border-border px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">Client</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">Tags</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim text-right">Open</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim text-right">Last active</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">Status</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-dim" />
              </div>
              {filtered.map(client => (
                <div key={client.id} className="relative">
                  {actionLoading === client.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-layout-card/70 backdrop-blur-sm">
                      <span className="flex items-center gap-2 text-sm text-text-sub"><InlinePending label="Updating client" /> Updating…</span>
                    </div>
                  )}
                  <ClientRow
                    client={client}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    onEdit={() => setEditTarget(client)}
                    onDeactivate={() => handleDeactivate(client)}
                    onReactivate={() => handleReactivate(client)}
                    onDelete={() => setDeleteTarget(client)}
                    onResend={() => handleResend(client)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </ProviderLayout>

      <MobileFilterSheet open={showMobileFilters} onClose={() => setShowMobileFilters(false)} title="Client filters" onReset={() => { setFilter('all'); setViewMode('grid') }}>
        <p className="text-xs text-text-dim">{filter === 'all' ? 'No active filters' : '1 active filter'} · {filtered.length} clients</p>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium text-text-main">Status</legend>
          <div className="grid grid-cols-2 gap-2">{FILTERS.map(({ key, label }) => <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-sm ${filter === key ? 'border-primary bg-primary-light text-primary-ink' : 'border-border bg-surface text-text-sub'}`}><span>{label}</span><span className="text-xs tabular-nums">{counts[key]}</span></button>)}</div>
        </fieldset>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium text-text-main">View</legend><div className="grid grid-cols-2 gap-2">{[{ value: 'grid', label: 'Grid', icon: LayoutGrid }, { value: 'list', label: 'List', icon: List }].map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setViewMode(value)} aria-pressed={viewMode === value} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm ${viewMode === value ? 'border-primary bg-primary-light text-primary-ink' : 'border-border bg-surface text-text-sub'}`}><Icon size={16} />{label}</button>)}</div></fieldset>
      </MobileFilterSheet>

      {/* ── Modals ── */}
      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { fetchClients(); showToast('Client added successfully.') }}
        />
      )}

      {editTarget && (
        <EditClientModal
          client={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { fetchClients(); showToast('Client updated.') }}
        />
      )}

      {deleteTarget && (
        <DeleteClientModal
          client={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => { fetchClients(); showToast('Client deleted.') }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}
