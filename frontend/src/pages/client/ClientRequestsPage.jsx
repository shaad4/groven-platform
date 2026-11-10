import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, SlidersHorizontal, FileText, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react'
import ClientLayout from '../../components/layout/ClientLayout'
import NewRequestModal from '../../components/modals/NewRequestModal'
import requestsApi from '../../api/requests.api'
import { useAuth } from '../../context/AuthContext'
import { useBadges } from '../../hooks/useBadges'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { RequestSummary, REQUEST_STATUS } from '../../components/client/RequestSummary'

const PER_PAGE = 8
const FILTERS = [{ key: 'all', label: 'All requests' }, ...Object.entries(REQUEST_STATUS).map(([key, { label }]) => ({ key, label }))]

export default function ClientRequestsPage() {
  const navigate = useNavigate()
  const { tenant } = useAuth()
  const { tenantInfo } = useTenantBranding()
  const { registerPortalListener } = useBadges()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const providerName = tenantInfo?.name || tenant?.name || 'your provider'

  const fetchRequests = useCallback(async () => {
    setError(''); setLoading(true)
    try { const { data } = await requestsApi.list(); setRequests(data.data?.requests || []) }
    catch { setError('We couldn’t load your requests. Please try again.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchRequests() }, [fetchRequests])
  useEffect(() => registerPortalListener(message => {
    if (message.type === 'status_change' || message.type === 'files_delivered') setRequests(previous => previous.map(request => request.id === message.request_id ? { ...request, status: message.new_status || (message.type === 'files_delivered' ? 'delivered' : request.status), updated_at: message.updated_at || new Date().toISOString() } : request))
  }), [registerPortalListener])
  useEffect(() => { setPage(1) }, [statusFilter, search])

  const reviews = requests.filter(request => request.status === 'delivered').length
  const filtered = requests.filter(request => (statusFilter === 'all' || request.status === statusFilter) && request.title.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  return <ClientLayout badges={{ requests: reviews }}>
    <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-text-sub">Workspace / Requests</p><h1 className="text-3xl font-semibold tracking-tight sm:text-[34px]">Requests</h1><p className="mt-2 text-sm leading-6 text-text-sub">Requests and deliveries from {providerName}.</p></div><button onClick={() => setShowNew(true)} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark"><Plus size={18} />New request</button></header>
    <section className="mb-6 rounded-2xl border border-border bg-layout-card p-4 sm:p-5" aria-label="Find requests">
      <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search requests by title</span><Search size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-text-dim" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your requests…" className="h-11 w-full rounded-xl border border-border bg-layout-page pl-10 pr-4 text-sm outline-none placeholder:text-text-dim focus:border-primary focus:ring-4 focus:ring-primary-light" /></label><label className="relative flex sm:w-52"><SlidersHorizontal size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-text-dim" /><span className="sr-only">Filter by request status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-layout-page pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary-light">{FILTERS.map(filter => <option value={filter.key} key={filter.key}>{filter.label}</option>)}</select></label></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-text-sub">{loading ? 'Loading your workspace…' : `${filtered.length} ${filtered.length === 1 ? 'request' : 'requests'}${statusFilter !== 'all' ? ` · ${REQUEST_STATUS[statusFilter].label}` : ''}`}</p>{reviews > 0 && <button onClick={() => setStatusFilter('delivered')} className="rounded-lg bg-primary-light px-3 py-1.5 text-xs font-medium text-primary-ink">{reviews} ready for review</button>}{(search || statusFilter !== 'all') && <button onClick={() => { setSearch(''); setStatusFilter('all') }} className="text-xs font-medium text-text-sub underline underline-offset-4">Clear filters</button>}</div>
    </section>
    {loading ? <div role="status" aria-label="Loading requests" className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map(index => <div key={index} className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />)}</div> : error ? <div role="alert" className="rounded-2xl border border-border bg-layout-card p-6"><AlertCircle size={24} className="text-text-dim" /><p className="mt-3 text-sm text-text-sub">{error}</p><button onClick={fetchRequests} className="mt-4 flex items-center gap-2 text-sm font-medium text-primary-ink"><RefreshCw size={16} />Try again</button></div> : !visible.length ? <div className="rounded-2xl border border-dashed border-border bg-layout-card px-5 py-16 text-center"><FileText size={30} className="mx-auto mb-4 text-text-dim" /><h2 className="text-lg font-semibold">{requests.length ? 'No matching requests.' : 'No requests yet.'}</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-text-sub">{requests.length ? 'Try a different search or status to find what you’re looking for.' : `Send your first request to ${providerName}.`}</p>{!requests.length && <button onClick={() => setShowNew(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary"><Plus size={16} />Create a request</button>}</div> : <><div className="grid gap-4 md:grid-cols-2">{visible.map(request => <RequestSummary key={request.id} request={request} />)}</div>{totalPages > 1 && <nav aria-label="Request pages" className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5"><p className="text-xs text-text-sub">Page {currentPage} of {totalPages}</p><div className="flex gap-2"><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-layout-card text-text-sub disabled:opacity-40"><ChevronLeft size={18} /></button><button aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-layout-card text-text-sub disabled:opacity-40"><ChevronRight size={18} /></button></div></nav>}</>}
    {showNew && <NewRequestModal providerName={providerName} onClose={() => setShowNew(false)} onSuccess={request => { setShowNew(false); fetchRequests(); navigate(`/my-requests/${request.id}`) }} />}
  </ClientLayout>
}
