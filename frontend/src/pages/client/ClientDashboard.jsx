import useLocalGreeting from '../../hooks/useLocalGreeting'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, ArrowUpRight, CheckCircle2, Clock3, PackageCheck, FileText, AlertCircle, RefreshCw } from 'lucide-react'
import requestsApi from '../../api/requests.api'
import { useAuth } from '../../context/AuthContext'
import { useBadges } from '../../hooks/useBadges'
import ClientLayout from '../../components/layout/ClientLayout'
import { Skeleton } from '../../components/ui/Skeleton'
import NewRequestModal from '../../components/modals/NewRequestModal'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { useWalkthrough } from '../../context/WalkthroughContext'
import { RequestSummary, RequestSummarySkeleton, RequestJourney, REQUEST_STATUS } from '../../components/client/RequestSummary'

const STATUS_ORDER = ['delivered', 'in_progress', 'in_review', 'received', 'closed']
const sortRequests = requests => [...requests].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || new Date(b.updated_at) - new Date(a.updated_at))
const FILTERS = [{ key: 'all', label: 'Recent work' }, { key: 'active', label: 'Active' }, { key: 'delivered', label: 'Needs review' }, { key: 'closed', label: 'Completed' }]

export default function ClientDashboard() {
  const greeting = useLocalGreeting()
  const { user, tenant } = useAuth()
  const { tenantInfo } = useTenantBranding()
  const navigate = useNavigate()
  const { registerPortalListener } = useBadges()
  const { startWalkthrough } = useWalkthrough()
  const [filter, setFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requests, setRequests] = useState([])
  const [toast, setToast] = useState('')
  const brand = tenantInfo || tenant
  const providerName = brand?.name || 'your provider'
  const firstName = user?.display_name?.split(' ')[0] || 'there'

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError('')
    try { const { data } = await requestsApi.list(); setRequests(sortRequests(data.data?.requests || [])) }
    catch { setError('We couldn’t load your requests. Please try again.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchRequests() }, [fetchRequests])
  useEffect(() => { if (localStorage.getItem('grove_walkthrough_client') !== 'completed') startWalkthrough('client') }, [startWalkthrough])
  useEffect(() => {
    return registerPortalListener(message => {
      if (message.type === 'status_change' || message.type === 'files_delivered') {
        const status = message.new_status || 'delivered'
        setRequests(previous => sortRequests(previous.map(request => request.id === message.request_id ? { ...request, status, updated_at: message.updated_at || new Date().toISOString() } : request)))
        setToast(message.type === 'files_delivered' ? 'Your delivery is ready for review.' : `Request updated: ${REQUEST_STATUS[status]?.label || status}.`)
      }
      if (message.type === 'new_message') { setRequests(previous => previous.map(request => request.id === message.request_id ? { ...request, _hasUnreadMessage: true, updated_at: new Date().toISOString() } : request)); setToast('You have a new message from your provider.') }
    })
  }, [registerPortalListener])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer) }, [toast])

  const active = requests.filter(request => !['delivered', 'closed'].includes(request.status)).length
  const reviews = requests.filter(request => request.status === 'delivered')
  const completed = requests.filter(request => request.status === 'closed').length
  const visible = requests.filter(request => filter === 'all' || (filter === 'active' ? !['delivered', 'closed'].includes(request.status) : request.status === filter))

  return <ClientLayout badges={{ requests: reviews.length }}>
    <header className="mb-5 flex items-start justify-between gap-3 sm:mb-8 sm:items-center"><div><p className="mb-2 hidden text-xs font-medium uppercase tracking-[0.16em] text-text-sub sm:block">Your workspace · {providerName}</p><h1 className="text-2xl font-semibold tracking-tight text-text-main sm:text-[34px]">{greeting}, {firstName}.</h1><p className="mt-2 hidden text-sm leading-6 text-text-sub sm:block">{brand?.tagline || 'Track requests and review deliveries.'}</p></div><button data-tour="client-new-request" aria-label="New request" onClick={() => setShowNew(true)} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 sm:min-h-12 sm:px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark"><Plus size={18} /><span className="sm:hidden">New</span><span className="hidden sm:inline">New request</span></button></header>
    <section data-tour="client-stats" aria-label="Request summary" aria-busy={loading} className="mb-5 grid grid-cols-3 sm:mb-8 gap-2.5 sm:gap-4">{[{ label: 'Active requests', short: 'Active', value: active, icon: Clock3 }, { label: 'Ready for review', short: 'To review', value: reviews.length, icon: PackageCheck }, { label: 'Completed', short: 'Completed', value: completed, icon: CheckCircle2 }].map(({ label, short, value, icon: Icon }, index) => <div key={label} className={`rounded-2xl border p-3.5 sm:p-5 ${index === 1 && reviews.length > 0 ? 'border-primary/25 bg-primary-light dark:border-border dark:bg-layout-card' : 'border-border bg-layout-card'}`}><div className="mb-4 flex items-center justify-between"><Icon size={18} className={index === 1 ? 'text-primary-ink' : 'text-text-dim'} /><span className="hidden text-xs text-text-dim sm:inline">0{index + 1}</span></div><p className="text-3xl font-semibold tracking-tight">{loading ? <Skeleton className="h-9 w-12" /> : value}</p><p className="mt-2 text-xs text-text-sub"><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span></p></div>)}</section>
    {reviews.length > 0 && <section className="mb-8 flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary-light p-5 dark:border-border dark:bg-layout-card sm:flex-row sm:items-center sm:p-6"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-layout-card text-primary-ink"><PackageCheck size={22} /></span><div className="flex-1"><h2 className="font-semibold text-text-main">{reviews.length === 1 ? 'Your delivery is ready.' : `${reviews.length} deliveries are ready.`}</h2><p className="mt-1 text-sm leading-6 text-text-sub">Review the files, request changes, or approve.</p></div><Link to={`/my-requests/${reviews[0].id}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark">Review delivery<ArrowUpRight size={16} /></Link></section>}
    <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_260px]">
      <section className="min-w-0" data-tour="client-requests"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-tight">Your requests</h2><Link to="/my-requests" className="flex min-h-10 items-center gap-1.5 text-xs font-medium text-primary-ink">View all<ArrowUpRight size={14} /></Link></div><div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1" aria-label="Filter requests">{FILTERS.map(item => <button key={item.key} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)} className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors ${filter === item.key ? 'bg-layout-card text-text-main shadow-sm' : 'text-text-sub hover:text-text-main'}`}>{item.label}</button>)}</div>
        {loading ? <div role="status" aria-label="Loading requests" aria-busy="true" className="space-y-3">{[1, 2, 3].map(index => <RequestSummarySkeleton key={index} />)}</div> : error ? <div role="alert" className="rounded-2xl border border-border bg-layout-card p-6"><AlertCircle size={22} className="text-text-sub" /><p className="mt-3 text-sm text-text-sub">{error}</p><button onClick={fetchRequests} className="mt-4 flex items-center gap-2 text-sm font-medium text-primary-ink"><RefreshCw size={15} />Try again</button></div> : visible.length ? <div className="space-y-3">{visible.slice(0, 5).map(request => <RequestSummary key={request.id} request={request} />)}{visible.length > 5 && <Link to="/my-requests" className="block rounded-xl border border-border py-3 text-center text-sm font-medium text-primary-ink">View all {requests.length} requests</Link>}</div> : <div className="rounded-2xl border border-dashed border-border bg-layout-card px-6 py-12 text-center"><FileText className="mx-auto mb-4 text-text-dim" size={28} /><h3 className="text-base font-semibold">{requests.length ? 'No requests in this view.' : 'No requests yet.'}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-text-sub">{requests.length ? 'There are no requests in this view. Try another filter to see your work.' : `Send a request to ${providerName}. Track its progress here.`}</p>{!requests.length && <button onClick={() => setShowNew(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary"><Plus size={16} />Create your first request</button>}</div>}
      </section>
      <aside className="hidden xl:block"><RequestJourney /><div className="mt-4 rounded-2xl border border-border bg-surface p-5"><p className="text-sm font-medium">Messages and files</p><p className="mt-2 text-xs leading-6 text-text-sub">Open a request to message your provider and share files.</p></div></aside>
    </div>
    {toast && <div role="status" className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 rounded-xl border border-border bg-layout-card px-5 py-4 text-sm shadow-lg lg:bottom-6 lg:left-auto lg:max-w-md">{toast}</div>}
    {showNew && <NewRequestModal providerName={providerName} onClose={() => setShowNew(false)} onSuccess={request => { setShowNew(false); fetchRequests(); navigate(`/my-requests/${request.id}`) }} />}
  </ClientLayout>
}
