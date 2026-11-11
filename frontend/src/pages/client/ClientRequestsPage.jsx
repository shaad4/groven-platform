import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, SlidersHorizontal, FileText, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react'
import ClientLayout from '../../components/layout/ClientLayout'
import NewRequestModal from '../../components/modals/NewRequestModal'
import MobileFilterSheet from '../../components/ui/MobileFilterSheet'
import requestsApi from '../../api/requests.api'
import { useAuth } from '../../context/AuthContext'
import { useBadges } from '../../hooks/useBadges'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { RequestSummary, RequestSummarySkeleton, REQUEST_STATUS } from '../../components/client/RequestSummary'

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
  const [filtersOpen, setFiltersOpen] = useState(false)
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
    <header className="mb-4 flex items-center justify-between gap-3 md:mb-8"><div className="min-w-0"><p className="mb-2 hidden text-xs font-medium uppercase tracking-[0.16em] text-text-sub md:block">Workspace / Requests</p><h1 className="text-2xl font-semibold tracking-tight md:text-[34px]">Requests</h1><p className="mt-2 hidden text-sm leading-6 text-text-sub md:block">Requests and deliveries from {providerName}.</p></div><button onClick={() => setShowNew(true)} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark md:min-h-12 md:px-5"><Plus size={18} />New request</button></header>
    <section className="mb-4 md:mb-6 md:rounded-2xl md:border md:border-border md:bg-layout-card md:p-5" aria-label="Find requests">
      <div className="flex gap-2 md:gap-3"><label className="relative min-w-0 flex-1"><span className="sr-only">Search requests by title</span><Search size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-text-dim" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your requests…" className="h-11 w-full rounded-xl border border-border bg-layout-card pl-10 pr-3 text-sm outline-none placeholder:text-text-dim focus:border-primary focus:ring-4 focus:ring-primary-light md:bg-layout-page" /></label><button onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen} className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-layout-card px-3 text-sm font-medium md:hidden"><SlidersHorizontal size={16} />Filters{statusFilter !== 'all' && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-on-primary">1</span>}</button><label className="relative hidden md:flex md:w-52"><SlidersHorizontal size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-text-dim" /><span className="sr-only">Filter by request status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-layout-page pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary-light">{FILTERS.map(filter => <option value={filter.key} key={filter.key}>{filter.label}</option>)}</select></label></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 md:mt-4 md:gap-3 md:border-t md:border-border md:pt-4"><p className="text-xs text-text-sub">{loading ? 'Loading requests…' : `${filtered.length} ${filtered.length === 1 ? 'request' : 'requests'}${statusFilter !== 'all' ? ` · ${REQUEST_STATUS[statusFilter].label}` : ''}`}</p>{reviews > 0 && <button onClick={() => setStatusFilter('delivered')} className="hidden rounded-lg bg-primary-light px-3 py-1.5 text-xs font-medium text-primary-ink md:block">{reviews} ready for review</button>}{(search || statusFilter !== 'all') && <button onClick={() => { setSearch(''); setStatusFilter('all') }} className="text-xs font-medium text-text-sub underline underline-offset-4">Clear filters</button>}</div>
    </section>
    <MobileFilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter requests" onReset={() => setStatusFilter('all')}>
      <label className="block text-sm font-medium text-text-main">Request status<select aria-label="Filter by request status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-border bg-layout-card px-3 text-sm outline-none focus:border-primary">{FILTERS.map(filter => <option value={filter.key} key={filter.key}>{filter.label}</option>)}</select></label>
      {reviews > 0 && <button onClick={() => setStatusFilter('delivered')} className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl bg-surface px-3 text-sm text-text-main"><span>Ready for review</span><span className="text-xs text-text-sub">{reviews}</span></button>}
    </MobileFilterSheet>
    {loading ? <div role="status" aria-label="Loading requests" aria-busy="true" className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map(index => <RequestSummarySkeleton key={index} />)}</div> : error ? <div role="alert" className="rounded-2xl border border-border bg-layout-card p-6"><AlertCircle size={24} className="text-text-dim" /><p className="mt-3 text-sm text-text-sub">{error}</p><button onClick={fetchRequests} className="mt-4 flex items-center gap-2 text-sm font-medium text-primary-ink"><RefreshCw size={16} />Try again</button></div> : !visible.length ? <div className="rounded-2xl border border-dashed border-border bg-layout-card px-5 py-16 text-center"><FileText size={30} className="mx-auto mb-4 text-text-dim" /><h2 className="text-lg font-semibold">{requests.length ? 'No matching requests.' : 'No requests yet.'}</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-text-sub">{requests.length ? 'Try a different search or status to find what you’re looking for.' : `Send your first request to ${providerName}.`}</p>{!requests.length && <button onClick={() => setShowNew(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary"><Plus size={16} />Create a request</button>}</div> : <><div className="grid gap-4 md:grid-cols-2">{visible.map(request => <RequestSummary key={request.id} request={request} />)}</div>{totalPages > 1 && <nav aria-label="Request pages" className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5"><p className="text-xs text-text-sub">Page {currentPage} of {totalPages}</p><div className="flex gap-2"><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-layout-card text-text-sub disabled:opacity-40"><ChevronLeft size={18} /></button><button aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-layout-card text-text-sub disabled:opacity-40"><ChevronRight size={18} /></button></div></nav>}</>}
    {showNew && <NewRequestModal providerName={providerName} onClose={() => setShowNew(false)} onSuccess={request => { setShowNew(false); fetchRequests(); navigate(`/my-requests/${request.id}`) }} />}
  </ClientLayout>
}
