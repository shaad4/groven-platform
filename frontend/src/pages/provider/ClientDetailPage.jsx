import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2,
  Clock, Package, Calendar, Mail, Building2,
  ChevronRight, Flag, FileText, ChevronLeft,
  Hash, Activity, HelpCircle, UserRound,
} from 'lucide-react'
import ProviderLayout from '../../components/layout/ProviderLayout'
import EditClientModal from '../../components/modals/EditClientModal'
import DeleteClientModal from '../../components/modals/DeleteClientModal'
import clientsApi from '../../api/clients.api'
import { getTagColor, getAvatarColor, getInitials, timeAgo, formatDate } from '../../utils/clientHelpers'

const REQUESTS_PER_PAGE = 3

// ─── TAG CHIP ────────────────────────────────────────────────
function TagChip({ name }) {
  const c = getTagColor(name)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
      {name}
    </span>
  )
}

// ─── STATUS BADGE ────────────────────────────────────────────
function StatusBadge({ client }) {
  if (client.is_deactivated) return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-text-sub">
      <span className="h-1.5 w-1.5 rounded-full bg-text-dim" /> Deactivated
    </span>
  )
  if (client.status === 'pending') return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-review-bg px-3 py-1 text-[11px] font-medium text-status-review-text">
      <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" /> Awaiting invite
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-[11px] font-medium text-primary-ink">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Active
    </span>
  )
}

// ─── REQUEST STATUS CONFIG ───────────────────────────────────
const REQUEST_STATUS = {
  received:    { label: 'Received',     bg: 'var(--primary-light)', text: 'var(--primary-text)', dot: '#1d9e75' },
  in_review:   { label: 'In Review',    bg: 'var(--review-bg)', text: 'var(--review-text)', dot: '#f59e0b' },
  in_progress: { label: 'In Progress',  bg: 'var(--progress-bg)', text: 'var(--progress-text)', dot: '#6366f1' },
  delivered:   { label: 'Delivered',    bg: 'var(--primary-light)', text: 'var(--primary-text)', dot: '#0f6e56' },
  closed:      { label: 'Closed',       bg: 'var(--closed-bg)', text: 'var(--closed-text)', dot: '#9ea89e' },
}

function RequestStatusBadge({ status }) {
  const cfg = REQUEST_STATUS[status] || { label: status, bg: 'var(--closed-bg)', text: 'var(--closed-text)', dot: '#9ea89e' }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: cfg.bg, color: cfg.text }}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

// ─── PRIVATE NOTE EDITOR ─────────────────────────────────────
function PrivateNoteEditor({ client, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(client.private_note || '')
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const handleSave = async () => {
    setLoading(true)
    try {
      await clientsApi.update(client.id, { private_note: value })
      onSaved?.(value)
      setEditing(false)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  if (!editing) return (
    <div
      onClick={() => setEditing(true)}
      className="group min-h-[56px] cursor-text rounded-xl border border-border px-4 py-3 hover:border-primary hover:bg-surface transition-all"
    >
      {value
        ? <p className="text-[13px] leading-6 text-text-main whitespace-pre-wrap">{value}</p>
        : <p className="text-[13px] text-text-dim">Add a private note about this client…</p>
      }
      <p className="mt-1 text-[11px] text-text-dim opacity-0 group-hover:opacity-100 transition-opacity">Click to edit</p>
    </div>
  )

  return (
    <div className="rounded-xl border border-primary ring-4 ring-primary/10 overflow-hidden">
      <textarea ref={ref} value={value} onChange={e => setValue(e.target.value)} rows={4}
        placeholder="Add a private note…"
        className="w-full resize-none px-4 py-3 text-[13px] text-text-main outline-none placeholder:text-text-dim bg-layout-card"
      />
      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2 bg-layout-card">
        <button onClick={() => { setValue(client.private_note || ''); setEditing(false) }}
          className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-text-sub hover:bg-surface transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors">
          {loading && <Loader2 size={12} className="animate-spin" />} Save
        </button>
      </div>
    </div>
  )
}

// ─── TOAST ───────────────────────────────────────────────────
function Toast({ message, type = 'success' }) {
  return (
    <div className={`fixed bottom-[calc(92px+env(safe-area-inset-bottom))] lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-xl px-5 py-3 text-[13px] font-medium text-on-primary shadow-xl shadow-black/20 ${type === 'success' ? 'bg-primary' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

// ─── STAT MINI CARD ──────────────────────────────────────────
function StatCard({ label, value, sub, color = 'var(--text-main)' }) {
  return (
    <div className="rounded-xl border border-border bg-layout-card px-4 py-3 flex flex-col gap-0.5">
      <p className="text-[11px] text-text-dim font-medium uppercase tracking-wide">{label}</p>
      <p className="text-[26px] font-semibold tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-text-dim">{sub}</p>}
    </div>
  )
}

// ─── PAGINATION ───────────────────────────────────────────────
function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-3 border-t border-border">
      <p className="text-[12px] text-text-dim">
        Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-text-dim hover:border-primary hover:text-primary-ink disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={13} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-7 w-7 flex items-center justify-center rounded-lg text-[12px] font-medium transition-all
              ${p === page ? 'bg-primary text-on-primary' : 'border border-border text-text-sub hover:border-primary hover:text-primary-ink'}`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-text-dim hover:border-primary hover:text-primary-ink disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── PAGE ────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { clientId } = useParams()
  const navigate = useNavigate()

  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [mobileTab, setMobileTab] = useState('overview')

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchClient = async () => {
    try {
      const res = await clientsApi.get(clientId)
      setClient(res.data.data)
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClient() }, [clientId])

  useEffect(() => { setPage(1) }, [activeTab])

  const handleDeactivate = async () => {
    setActionLoading(true)
    try {
      await clientsApi.deactivate(clientId)
      await fetchClient()
      setShowDeactivateConfirm(false)
      showToast('Client deactivated.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to deactivate.', 'error')
    } finally { setActionLoading(false) }
  }

  const handleReactivate = async () => {
    setActionLoading(true)
    try {
      await clientsApi.reactivate(clientId)
      await fetchClient()
      showToast('Client reactivated.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to reactivate.', 'error')
    } finally { setActionLoading(false) }
  }

  if (loading) return (
    <ProviderLayout>
      <div className="flex items-center justify-center p-16">
        <Loader2 size={24} className="animate-spin text-primary-ink" />
      </div>
    </ProviderLayout>
  )

  if (notFound || !client) return (
    <ProviderLayout >
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <p className="text-[16px] font-medium text-text-main">Client not found</p>
        <p className="mt-2 text-[13px] text-text-dim">This client may have been deleted.</p>
        <button onClick={() => navigate('/clients')}
          className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-medium text-on-primary hover:bg-primary-dark transition-colors">
          <ArrowLeft size={15} /> Back to clients
        </button>
      </div>
    </ProviderLayout>
  )

  const displayName = client.display_name || client.client_name || 'Unknown'
  const email = client.email || client.client_email || '—'
  const avatar = getAvatarColor(displayName)
  const tags = (client.tags || []).map(t => typeof t === 'string' ? t : t.name)
  const allRequests = client.requests || []
  const isDeactivated = client.is_deactivated
  const isPending = client.status === 'pending' && !isDeactivated

  const statusCounts = allRequests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  const openCount = allRequests.filter(r => !['delivered', 'closed'].includes(r.status)).length
  const urgentCount = allRequests.filter(r => r.is_urgent).length
  const overdueCount = allRequests.filter(r =>
    r.due_date && new Date(r.due_date) < new Date() && !['delivered', 'closed'].includes(r.status)
  ).length

  const filteredRequests = allRequests.filter(r => {
    if (activeTab === 'all') return true
    if (activeTab === 'open') return !['delivered', 'closed'].includes(r.status)
    return r.status === activeTab
  })

  const paginatedRequests = filteredRequests.slice((page - 1) * REQUESTS_PER_PAGE, page * REQUESTS_PER_PAGE)

  const TABS = ['all', 'open', 'received', 'in_review', 'in_progress', 'delivered', 'closed']

  return (
    <>
      <ProviderLayout fullBleed>
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-layout-page">

          {/* ── STICKY TOPBAR ── */}
          <div className="sticky top-0 z-30 flex min-h-[76px] flex-wrap items-center gap-3 border-b border-border bg-layout-card px-4 py-3 sm:px-6 shrink-0 ">
            <button
              onClick={() => navigate('/clients')} aria-label="Back to clients"
              className="flex items-center gap-1.5 text-[13px] text-text-dim hover:text-text-main transition-colors"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Clients</span>
            </button>
            <ChevronRight size={13} className="text-text-dim hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className={`h-5 w-5 rounded-md overflow-hidden flex items-center justify-center text-[9px] font-bold ${avatar.bg} ${avatar.text}`}>
                {client.avatar_url ? (
                  <img src={client.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : getInitials(displayName)}
              </div>
              <span className="text-[13px] font-medium text-text-main truncate max-w-[120px] sm:max-w-none">{displayName}</span>
            </div>
            <StatusBadge client={client} />

            {/* Quick edit action in the sticky topbar */}
            <button
              onClick={() => setShowEdit(true)}
              className="ml-auto text-[12px] font-medium text-primary-ink hover:underline"
            >
              Edit profile
            </button>
          </div>

          {/* Mobile navigation tabs (overview vs requests) */}
          <div className="md:hidden flex border-b border-border bg-layout-card shrink-0 z-20">
            <button
              onClick={() => setMobileTab('overview')} aria-pressed={mobileTab === 'overview'}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-center text-[13px] font-semibold border-b-2 border-t-0 border-x-0 border-t-transparent border-x-transparent bg-transparent outline-none focus:outline-none transition-all ${
                mobileTab === 'overview'
                  ? 'border-b-primary text-primary-ink'
                  : 'border-b-transparent text-text-dim'
              }`}
            >
              <UserRound size={16} aria-hidden="true" /> Overview
            </button>
            <button
              onClick={() => setMobileTab('requests')} aria-pressed={mobileTab === 'requests'}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-center text-[13px] font-semibold border-b-2 border-t-0 border-x-0 border-t-transparent border-x-transparent bg-transparent outline-none focus:outline-none transition-all ${
                mobileTab === 'requests'
                  ? 'border-b-primary text-primary-ink'
                  : 'border-b-transparent text-text-dim'
              }`}
            >
              <FileText size={16} aria-hidden="true" /> Requests ({allRequests.length})
            </button>
          </div>

          {/* Scrollable Container Block */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="mx-auto grid max-w-[1600px] gap-5 p-4 sm:p-6 lg:p-8 xl:grid-cols-[minmax(0,1fr)_296px]">

              {/* ── LEFT ── */}
              <div className="min-w-0 space-y-5">

                {/* Client hero card */}
                <div className={`rounded-2xl border border-border bg-layout-card overflow-hidden ${mobileTab === 'overview' ? 'block' : 'hidden md:block'}`}>
                  <div className="p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`h-14 w-14 shrink-0 rounded-2xl overflow-hidden flex items-center justify-center text-[18px] font-bold ${avatar.bg} ${avatar.text}`}>
                          {isPending ? (
                            <Mail size={20} className="opacity-70" />
                          ) : client.avatar_url ? (
                            <img src={client.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                          ) : getInitials(displayName)}
                        </div>
                        <div>
                          <h1 className="text-[26px] font-semibold tracking-tight text-text-main">{displayName}</h1>
                          <p className="text-[13px] text-text-dim mt-0.5">{email}</p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {client.business_type && (
                              <span className="flex items-center gap-1 text-[12px] text-text-sub bg-surface px-2 py-0.5 rounded-md">
                                <Building2 size={11} className="text-text-dim" /> {client.business_type}
                              </span>
                            )}
                            {client.joined_at && (
                              <span className="flex items-center gap-1 text-[12px] text-text-dim">
                                <Calendar size={11} /> Since {formatDate(client.joined_at || client.created_at)}
                              </span>
                            )}
                            {client.last_login && (
                              <span className="flex items-center gap-1 text-[12px] text-text-dim">
                                <Activity size={11} /> Active {timeAgo(client.last_login)}
                              </span>
                            )}
                          </div>
                          {tags.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {tags.map(tag => <TagChip key={tag} name={tag} />)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stat strip */}
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard label="Total requests" value={allRequests.length} />
                      <StatCard label="Open" value={openCount} color={openCount > 0 ? 'var(--primary-text)' : 'var(--text-main)'} />
                      <StatCard
                        label="Urgent"
                        value={urgentCount}
                        color={urgentCount > 0 ? 'var(--danger-text)' : 'var(--text-main)'}
                        sub={urgentCount > 0 ? 'needs attention' : 'all clear'}
                      />
                      <StatCard
                        label="Overdue"
                        value={overdueCount}
                        color={overdueCount > 0 ? 'var(--review-text)' : 'var(--text-main)'}
                        sub={overdueCount > 0 ? 'past due date' : 'on track'}
                      />
                    </div>

                    {/* Status breakdown bar */}
                    {allRequests.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[11px] font-medium text-text-dim uppercase tracking-wide">Request breakdown</p>
                          <p className="text-[11px] text-text-dim">{allRequests.length} total</p>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden gap-px">
                          {Object.entries(REQUEST_STATUS).map(([key, cfg]) => {
                            const count = statusCounts[key] || 0
                            if (!count) return null
                            const pct = (count / allRequests.length) * 100
                            return (
                              <div
                                key={key}
                                style={{ width: `${pct}%`, background: cfg.dot }}
                                title={`${cfg.label}: ${count}`}
                                className="transition-all"
                              />
                            )
                          })}
                        </div>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          {Object.entries(REQUEST_STATUS).map(([key, cfg]) => {
                            const count = statusCounts[key] || 0
                            if (!count) return null
                            return (
                              <span key={key} className="flex items-center gap-1 text-[11px] text-text-dim">
                                <span className="h-2 w-2 rounded-full" style={{ background: cfg.dot }} />
                                {cfg.label} · {count}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Request history ── */}
                <div className={`rounded-2xl border border-border bg-layout-card overflow-hidden ${mobileTab === 'requests' ? 'block' : 'hidden md:block'}`}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-[14px] font-semibold text-text-main">Request history</h2>
                    {allRequests.length > 0 && (
                      <span className="text-[12px] text-text-dim">{filteredRequests.length} {activeTab !== 'all' ? 'filtered' : 'total'}</span>
                    )}
                  </div>

                  {/* Tabs */}
                  {allRequests.length > 0 && (
                    <div className="flex items-center gap-1 px-5 py-3 border-b border-border overflow-x-auto no-scrollbar">
                      {TABS.map(tab => {
                        const count = tab === 'all'
                          ? allRequests.length
                          : tab === 'open'
                            ? openCount
                            : (statusCounts[tab] || 0)
                        if (tab !== 'all' && tab !== 'open' && !count) return null
                        return (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors
                              ${activeTab === tab ? 'bg-primary text-on-primary' : 'bg-surface text-text-sub hover:bg-border'}`}
                          >
                            {tab === 'all' ? 'All' : tab.replace(/_/g, ' ')}
                            <span className={`text-[11px] rounded-full px-1.5 py-0.5 font-semibold
                              ${activeTab === tab ? 'bg-layout-card/20 text-on-primary' : 'bg-border text-text-dim'}`}>
                              {count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="p-5">
                    {isPending ? (
                      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
                        <Mail size={24} className="mx-auto text-text-dim" />
                        <p className="mt-3 text-[14px] font-medium text-text-main">Waiting for client to join</p>
                        <p className="mt-1 text-[12px] text-text-dim">Request history will appear once they accept the invite.</p>
                      </div>
                    ) : filteredRequests.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
                        <Package size={24} className="mx-auto text-text-dim" />
                        <p className="mt-3 text-[14px] font-medium text-text-main">No requests here</p>
                        <p className="mt-1 text-[12px] text-text-dim">
                          {activeTab !== 'all' ? 'Try switching to "All"' : 'Requests will appear once submitted.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {paginatedRequests.map(req => {
                          const isOverdue = req.due_date &&
                            new Date(req.due_date) < new Date() &&
                            !['delivered', 'closed'].includes(req.status)
                          return (
                            <div
                              key={req.id}
                              onClick={() => navigate(`/requests/${req.id}`)}
                              className="group flex items-start gap-4 rounded-xl border border-border bg-layout-card p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3 mb-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {req.is_urgent && (
                                      <Flag size={12} className="text-status-danger-text fill-[#e11d48] shrink-0" />
                                    )}
                                    <p className="text-[13px] font-medium text-text-main truncate">{req.title}</p>
                                  </div>
                                  <RequestStatusBadge status={req.status} />
                                </div>
                                {req.description && (
                                  <p className="text-[12px] text-text-dim line-clamp-1 mb-2">{req.description}</p>
                                )}
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="flex items-center gap-1 text-[11px] text-text-dim">
                                    <Clock size={10} /> {timeAgo(req.created_at)}
                                  </span>
                                  {req.due_date && (
                                    <span className={`flex items-center gap-1 text-[11px] font-medium ${isOverdue ? 'text-status-danger-text' : 'text-text-dim'}`}>
                                      <Calendar size={10} />
                                      Due {formatDate(req.due_date)}
                                      {isOverdue && <span className="ml-0.5 rounded bg-status-danger-bg px-1 text-[11px] text-status-danger-text font-semibold">Overdue</span>}
                                    </span>
                                  )}
                                  {req.ai_category && (
                                    <span className="flex items-center gap-1 text-[11px] text-status-progress-text bg-status-progress-bg px-1.5 py-0.5 rounded-md font-medium">
                                      <Hash size={9} /> {req.ai_category}
                                    </span>
                                  )}
                                  {req.files_count > 0 && (
                                    <span className="flex items-center gap-1 text-[11px] text-text-dim">
                                      <FileText size={10} /> {req.files_count} file{req.files_count !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight size={15} className="mt-1 shrink-0 text-text-dim group-hover:text-primary-ink transition-colors" />
                            </div>
                          )
                        })}

                        <Pagination
                          page={page}
                          total={filteredRequests.length}
                          perPage={REQUESTS_PER_PAGE}
                          onChange={setPage}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── RIGHT SIDEBAR ── */}
              <div className={`space-y-4 ${mobileTab === 'overview' ? 'block' : 'hidden md:block'}`}>

                {/* Client info */}
                <div className="rounded-2xl border border-border bg-layout-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold text-text-main">Client info</h3>
                    <button onClick={() => setShowEdit(true)}
                      className="text-[12px] font-medium text-primary-ink hover:text-primary-ink transition-colors">
                      Edit
                    </button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: Mail, label: 'Email', value: email, highlight: true },
                      { icon: Building2, label: 'Business', value: client.business_type || '—' },
                      { icon: Calendar, label: 'Client since', value: formatDate(client.joined_at || client.created_at) },
                      { icon: Package, label: 'Requests', value: `${client.total_request_count ?? allRequests.length} total · ${client.delivered_count ?? (statusCounts['delivered'] || 0)} delivered` },
                      ...(client.last_login ? [{ icon: Activity, label: 'Last active', value: timeAgo(client.last_login) }] : []),
                    ].map(({ icon: Icon, label, value, highlight }) => (
                      <div key={label} className="flex items-start gap-3">
                        <Icon size={13} className="mt-0.5 shrink-0 text-text-dim" />
                        <div>
                          <p className="text-[11px] text-text-dim">{label}</p>
                          <p className={`text-[13px] ${highlight ? 'text-primary-ink font-medium' : 'text-text-main'}`}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="rounded-2xl border border-border bg-layout-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-semibold text-text-main">Tags</h3>
                    <button onClick={() => setShowEdit(true)}
                      className="text-[12px] font-medium text-primary-ink hover:text-primary-ink transition-colors">
                      + Add
                    </button>
                  </div>
                  {tags.length > 0
                    ? <div className="flex flex-wrap gap-1.5">{tags.map(tag => <TagChip key={tag} name={tag} />)}</div>
                    : <p className="text-[12px] text-text-dim">No tags yet.</p>
                  }
                </div>

                {/* Internal note */}
                <div className="rounded-2xl border border-border bg-layout-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-semibold text-text-main">Internal note</h3>
                    <span className="text-[11px] text-text-dim">Private</span>
                  </div>
                  <PrivateNoteEditor
                    client={client}
                    onSaved={val => setClient(c => ({ ...c, private_note: val }))}
                  />
                </div>

                {/* Danger zone */}
                <div className="rounded-2xl border border-status-danger-text/20 bg-layout-card p-5">
                  <h3 className="mb-3 text-[13px] font-semibold text-status-danger-text">Danger zone</h3>
                  <div className="space-y-3">
                    {!isDeactivated ? (
                      <button onClick={() => setShowDeactivateConfirm(true)} disabled={actionLoading || isPending}
                        className="w-full text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                        <p className="text-[13px] font-medium text-text-main group-hover:text-status-danger-text transition-colors">
                          Deactivate {displayName.split(' ')[0]}'s access
                        </p>
                        <p className="text-[11px] text-text-dim">Freezes their portal. Data is kept.</p>
                      </button>
                    ) : (
                      <button onClick={handleReactivate} disabled={actionLoading}
                        className="w-full text-left group disabled:opacity-50">
                        <p className="text-[13px] font-medium text-primary-ink group-hover:text-primary-ink transition-colors">
                          Reactivate {displayName.split(' ')[0]}'s access
                        </p>
                        <p className="text-[11px] text-text-dim">Restores portal access.</p>
                      </button>
                    )}
                    <div className="border-t border-status-danger-text/20 pt-3">
                      <button onClick={() => setShowDelete(true)} className="w-full text-left group">
                        <p className="text-[13px] font-medium text-text-main group-hover:text-status-danger-text transition-colors">
                          Delete this client
                        </p>
                        <p className="text-[11px] text-text-dim">Permanent. Cannot be undone.</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </ProviderLayout>

      {/* ── CUSTOM DEACTIVATE CONFIRMATION MODAL ── */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-layout-card shadow-2xl border border-border overflow-hidden transform transition-all scale-100">
            <div className="p-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-status-review-bg flex items-center justify-center shrink-0 border border-amber-100">
                  <HelpCircle size={20} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-semibold text-text-main">
                    Deactivate portal access?
                  </h3>
                  <p className="text-[13px] leading-6 text-text-dim mt-2">
                    Are you sure you want to deactivate <span className="font-semibold text-text-main">{displayName}</span>? This will immediately freeze their portal session and block login access. No workspace data will be deleted.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  disabled={actionLoading}
                  onClick={() => setShowDeactivateConfirm(false)}
                  className="rounded-xl border border-border bg-layout-card h-10 px-4 text-[13px] font-medium text-text-sub hover:bg-surface transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleDeactivate}
                  className="flex items-center gap-2 rounded-xl bg-red-600 h-10 px-4 text-[13px] font-semibold text-on-primary hover:bg-red-600 shadow-xs transition-colors disabled:opacity-50"
                >
                  {actionLoading && <Loader2 size={14} className="animate-spin" />}
                  Deactivate Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <EditClientModal client={client} onClose={() => setShowEdit(false)}
          onSuccess={() => { fetchClient(); showToast('Client updated.') }} />
      )}
      {showDelete && (
        <DeleteClientModal client={client} onClose={() => setShowDelete(false)}
          onSuccess={() => navigate('/clients')} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}
