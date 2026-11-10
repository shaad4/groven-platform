import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, MoreVertical, ChevronRight,
  Mail, RotateCcw, Trash2, PowerOff, Power,
  Send, AlertTriangle, Users, Loader2,
  LayoutGrid, List, Clock, Activity,
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
    pill: 'bg-[#e6f5f0] text-[#085041]',
  },
  pending: {
    label: 'Awaiting invite',
    dot: 'bg-[#f59e0b]',
    pill: 'bg-[#fef3e2] text-[#92500a]',
  },
  deactivated: {
    label: 'Deactivated',
    dot: 'bg-[#9ea89e]',
    pill: 'bg-[#f3f4f3] text-[#4a544a]',
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
  gone_quiet:  { label: 'Gone quiet',  classes: 'bg-amber-50 text-amber-700' },
  high_volume: { label: 'High volume', classes: 'bg-violet-50 text-violet-700' },
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
  const ref = useRef(null)
  const status = getClientStatus(client)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const Item = ({ icon: Icon, label, onClick, danger = false, className = '' }) => (
    <button
      onClick={(e) => { e.stopPropagation(); setOpen(false); onClick() }}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-[#f7f8f7] ${
        danger ? 'text-red-500 hover:bg-red-50' : 'text-[#141a14]'
      } ${className}`}
    >
      <Icon size={14} className="shrink-0 opacity-70" />
      {label}
    </button>
  )

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9ea89e] hover:bg-[#f7f8f7] hover:text-[#4a544a] transition-colors"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-[#e8eae8] bg-white py-1 shadow-xl shadow-black/10 overflow-hidden">
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

          <div className="my-1 border-t border-[#f1f3f1]" />
          <Item icon={Trash2} label="Delete client" onClick={onDelete} danger />
        </div>
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
      className={`group relative flex flex-col rounded-2xl border bg-white transition-all duration-200 hover:shadow-md hover:shadow-black/[0.06] hover:-translate-y-[1px] cursor-pointer overflow-hidden
        ${isDeactivated ? 'border-[#e8eae8] opacity-75' : 'border-[#e8eae8]'}
      `}
      onClick={() => !isPending && onClick()}
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
              <p className="truncate text-[14px] font-semibold text-[#141a14]">
                {client.display_name || client.client_name || 'Unknown'}
              </p>
              <p className="truncate text-[12px] text-[#9ea89e]">
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
              <span className="text-[11px] text-[#9ea89e]">+{tags.length - 3}</span>
            )}
            <InsightBadge insight={client.ai_insight} />
          </div>
        )}
      </div>

      {/* Stats row */}
      {!isPending ? (
        <div className="border-t border-[#f1f3f1] grid grid-cols-2">
          <div className="px-5 py-3 border-r border-[#f1f3f1]">
            <p className="text-[22px] font-semibold text-[#141a14]">{client.open_request_count ?? 0}</p>
            <p className="text-[11px] text-[#9ea89e]">Open Requests</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[22px] font-semibold text-[#141a14]">{client.delivered_count ?? 0}</p>
            <p className="text-[11px] text-[#9ea89e]">Delivered</p>
          </div>
        </div>
      ) : (
        <div className="border-t border-[#f1f3f1] px-5 py-4">
          <p className="text-[12px] text-[#9ea89e] italic">No data available yet · Awaiting client login</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#f1f3f1] px-5 py-3 flex items-center justify-between">
        {isPending ? (
          <>
            <span className="text-[12px] text-[#9ea89e]">Never logged in</span>
            <button
              onClick={(e) => { e.stopPropagation(); onResend() }}
              className="text-[12px] font-medium text-[#0f6e56] hover:text-[#085041] transition-colors flex items-center gap-1"
            >
              Resend invite <ChevronRight size={13} />
            </button>
          </>
        ) : isDeactivated ? (
          <>
            <span className="text-[12px] text-[#9ea89e]">
              {lastActive ? `Active ${lastActive}` : 'Never active'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onReactivate() }}
              className="text-[12px] font-medium text-[#0f6e56] hover:text-[#085041] transition-colors flex items-center gap-1"
            >
              Reactivate <ChevronRight size={13} />
            </button>
          </>
        ) : (
          <>
            <span className="text-[12px] text-[#9ea89e]">
              {lastActive ? `Active ${lastActive}` : 'Never logged in'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onClick() }}
              className="text-[12px] font-medium text-[#0f6e56] hover:text-[#085041] transition-colors flex items-center gap-1"
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
      className="flex items-center gap-4 border-b border-[#f1f3f1] px-5 py-4 hover:bg-[#fafafa] transition-colors cursor-pointer last:border-0"
      onClick={() => !isPending && onClick()}
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
        <p className="text-[14px] font-medium text-[#141a14] truncate">
          {client.display_name || client.client_name || 'Unknown'}
        </p>
        <p className="text-[12px] text-[#9ea89e] truncate">
          {client.email || client.client_email || '—'}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-1.5 w-32">
        {tags.slice(0, 2).map(tag => <TagChip key={tag} name={tag} />)}
        {tags.length > 2 && <span className="text-[11px] text-[#9ea89e]">+{tags.length - 2}</span>}
        <InsightBadge insight={client.ai_insight} />
      </div>

      <div className="hidden sm:block w-24 text-right">
        <p className="text-[13px] font-medium text-[#141a14]">{client.open_request_count ?? 0} open</p>
      </div>

      <div className="hidden md:block w-28 text-right">
        <p className="text-[12px] text-[#9ea89e]">
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
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-xl px-5 py-3 text-[13px] font-medium text-white shadow-xl shadow-black/20 transition-all
      ${type === 'success' ? 'bg-[#0f6e56]' : 'bg-red-500'}
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
            onAddClient={() => setShowAdd(true)}
            onAddClient={handleAddClientClick}
            showAddBtn
          />
        }
      >
        <div className="p-6">
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
          <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 py-4 mb-6 bg-[#f7f8f7]/90 backdrop-blur-md border-b border-[#e8eae8] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-200">

            {/* Filter tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-[#f0f2f0] p-1 overflow-x-auto no-scrollbar py-1 shrink-0">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                    filter === key
                      ? 'bg-white text-[#141a14] shadow-sm'
                      : 'text-[#4a544a] hover:text-[#141a14]'
                  }`}
                >
                  {label}
                  {counts[key] > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      filter === key ? 'bg-[#e6f5f0] text-[#085041]' : 'bg-white/60 text-[#9ea89e]'
                    }`}>
                      {counts[key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ea89e]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="h-9 w-full sm:w-56 rounded-xl border border-[#e8eae8] bg-white pl-9 pr-4 text-[13px] outline-none transition-all placeholder:text-[#9ea89e] focus:border-[#0f6e56] focus:ring-4 focus:ring-[#0f6e56]/10"
                />
              </div>

              {/* View toggle */}
              <div className="flex items-center rounded-xl border border-[#e8eae8] bg-white overflow-hidden shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex h-9 w-9 items-center justify-center transition-colors ${
                    viewMode === 'grid' ? 'bg-[#e6f5f0] text-[#0f6e56]' : 'text-[#9ea89e] hover:text-[#4a544a]'
                  }`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex h-9 w-9 items-center justify-center transition-colors border-l border-[#e8eae8] ${
                    viewMode === 'list' ? 'bg-[#e6f5f0] text-[#0f6e56]' : 'text-[#9ea89e] hover:text-[#4a544a]'
                  }`}
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'rounded-2xl border border-[#e8eae8] bg-white overflow-hidden'}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={`animate-pulse bg-white border border-[#e8eae8] rounded-2xl ${viewMode === 'grid' ? 'h-[220px]' : 'h-[72px]'}`} />
              ))}
            </div>

          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e8eae8] bg-white py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f2f0]">
                <Users size={22} className="text-[#9ea89e]" />
              </div>
              <p className="mt-4 text-[15px] font-medium text-[#141a14]">
                {search ? 'No clients match your search' : filter !== 'all' ? `No ${filter} clients` : 'No clients yet'}
              </p>
              <p className="mt-1.5 text-[13px] text-[#9ea89e]">
                {search ? 'Try a different search term' : filter !== 'all' ? 'Try switching to "All" filter' : 'Add your first client to get started'}
              </p>
              {!search && filter === 'all' && (
                <button
                  onClick={handleAddClientClick}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-[#0f6e56] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#085041] transition-colors"
                >
                  <Plus size={15} />
                  Add your first client
                </button>
              )}
            </div>

          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(client => (
                <div key={client.id} className="relative">
                  {actionLoading === client.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm">
                      <Loader2 size={20} className="animate-spin text-[#0f6e56]" />
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
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d1e8df] bg-[#f7fbf9] p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f5f0]">
                    <span className="text-xl">🔒</span>
                  </div>
                  <p className="mt-3 text-[14px] font-semibold text-[#141a14]">Client limit reached</p>
                  <p className="mt-1.5 text-[12px] text-[#9ea89e]">
                    Upgrade to Pro to add unlimited clients and access advanced collaboration tools.
                  </p>
                  <button
                    onClick={handleUpgrade}
                    className="mt-5 flex items-center gap-2 rounded-xl bg-[#0f6e56] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#085041] transition-colors"
                  >
                    Upgrade to Pro
                   <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

          ) : (
            <div className="rounded-2xl border border-[#e8eae8] bg-white overflow-hidden">
              {/* List header */}
              <div className="hidden md:grid grid-cols-[1fr_160px_80px_120px_100px_80px] items-center gap-4 border-b border-[#f1f3f1] px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">Client</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">Tags</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e] text-right">Open</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e] text-right">Last active</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]">Status</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea89e]" />
              </div>
              {filtered.map(client => (
                <div key={client.id} className="relative">
                  {actionLoading === client.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                      <Loader2 size={18} className="animate-spin text-[#0f6e56]" />
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