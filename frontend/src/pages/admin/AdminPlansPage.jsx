import { useEffect, useState, useCallback, useRef } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import adminPlansApi from '../../api/admin/adminPlans.api'
import { PlanBadge } from '../../components/ui/AdminUI'
import PlanOverridePanel from '../../components/modals/PlanOverridePanel'
import { getInitials, getAvatarColor } from '../../utils/adminDisplay'
import { Search, Settings } from 'lucide-react'
import PlanDetailsPanel from '../../components/modals/PlanDetailsPanel'

function PlanTenantLogo({ row }) {
  const [imgError, setImgError] = useState(false)
  const showImage = row.logo_url && !imgError

  if (showImage) {
    return (
      <img
        src={row.logo_url}
        alt={row.tenant_name}
        onError={() => setImgError(true)}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ background: getAvatarColor(row.tenant_id) }}
    >
      {getInitials(row.tenant_name)}
    </div>
  )
}

export default function AdminPlansPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [usageFilter, setUsageFilter] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const [activeTenant, setActiveTenant] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const prevFilters = useRef({ search, planFilter, usageFilter })


  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await adminPlansApi.list()
      setData(data.data)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const isAtLimit = (row) => {
    const clientMaxed = row.client_limit !== -1 && row.client_count >= row.client_limit
    const requestMaxed = row.request_limit != null && row.request_limit !== -1 && row.request_count >= row.request_limit
    return clientMaxed || requestMaxed
  }

  const rows = (data?.rows || []).filter((r) => {
    if (search && !r.tenant_name.toLowerCase().includes(search.toLowerCase())) return false
    if (planFilter && (r.plan || '').toLowerCase() !== planFilter) return false
    if (usageFilter === 'at_limit' && !isAtLimit(r)) return false
    return true
  })

  useEffect(() => {
    const f = prevFilters.current
    if (f.search !== search || f.planFilter !== planFilter || f.usageFilter !== usageFilter) {
      setPage(1)
      prevFilters.current = { search, planFilter, usageFilter }
    }
  }, [search, planFilter, usageFilter])

  const totalRows = rows.length
  const numPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === numPages || Math.abs(n - page) <= 1)
    .reduce((acc, n, idx, arr) => {
      if (idx > 0 && n - arr[idx - 1] > 1) acc.push('ellipsis-' + n)
      acc.push(n)
      return acc
    }, [])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-7 w-7 rounded-full border-2 border-[#D8DCD8] border-t-[#1D9E75] animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex items-start justify-between px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-semibold text-[#10241C]">Plans</h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-[#7C867D]">Manage plans and usage limits.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setDetailsOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[#D8DCD8] bg-white px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[12px] sm:text-[13px] font-medium text-[#5B655C] hover:bg-[#FAFBFA]"
          >
            <Settings size={13} /> <span className="hidden sm:inline">Manage plans</span>
          </button>
          <span className="rounded-lg border border-[#D8DCD8] bg-white px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[12px] sm:text-[13px] font-medium text-[#5B655C] whitespace-nowrap">
            {data?.rows?.length ?? 0} tenants
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-8 pb-10">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4"> 
          <div className="rounded-xl border border-[#E5E8E5] bg-white p-3 sm:p-5">
            <span className="text-[11px] sm:text-[13px] text-[#7C867D]">Free plan</span>
            <p className="mt-1 sm:mt-2 text-xl sm:text-[28px] font-semibold text-[#10241C]">{data?.free_count ?? 0}</p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[12px] text-[#9BA39B] truncate">tenants on free</p>
          </div>
          <div className="rounded-xl border border-[#E5E8E5] bg-white p-3 sm:p-5">
            <span className="text-[11px] sm:text-[13px] text-[#7C867D]">Pro plan</span>
            <p className="mt-1 sm:mt-2 text-xl sm:text-[28px] font-semibold text-[#0F6E56]">{data?.pro_count ?? 0}</p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[12px] text-[#9BA39B] truncate">tenants on pro</p>
          </div>
          <div className="rounded-xl border border-[#E2483D]/40 bg-[#FDF1EF] p-3 sm:p-5">
            <span className="text-[11px] sm:text-[13px] text-[#C73A30]">At plan limit</span>
            <p className="mt-1 sm:mt-2 text-xl sm:text-[28px] font-semibold text-[#C73A30]">{data?.at_limit_count ?? 0}</p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[12px] font-medium text-[#C73A30] truncate">Need attention</p>
          </div>
          <div className="rounded-xl border border-[#E5E8E5] bg-white p-3 sm:p-5">
            <span className="text-[11px] sm:text-[13px] text-[#7C867D]">Total revenue</span>
            <p className="mt-1 sm:mt-2 text-xl sm:text-[28px] font-semibold text-[#10241C] truncate">
              {Number(data?.total_revenue ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[12px] text-[#9BA39B] truncate">lifetime, Stripe payments</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 mb-4 flex flex-wrap items-center gap-3">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-10 rounded-lg border border-[#D8DCD8] bg-white px-3 text-[13px] text-[#5B655C] outline-none focus:border-[#1D9E75] flex-shrink-0"
          >
            <option value="">All plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>

          <select
            value={usageFilter}
            onChange={(e) => setUsageFilter(e.target.value)}
            className="h-10 rounded-lg border border-[#D8DCD8] bg-white px-3 text-[13px] text-[#5B655C] outline-none focus:border-[#1D9E75] flex-shrink-0"
          >
            <option value="">All usage</option>
            <option value="at_limit">At limit</option>
          </select>

          <div className="relative min-w-[200px] sm:min-w-[260px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BA39B]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tenant name..."
              className="h-10 w-full rounded-lg border border-[#D8DCD8] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-[#E5E8E5] bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#EEF1EE] text-[11px] uppercase tracking-wide text-[#9BA39B]">
                <th className="px-4 sm:px-5 py-3 font-medium">Tenant</th>
                <th className="px-4 sm:px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Clients</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Requests</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-[13px] text-[#9BA39B]">No tenants match your filters.</td></tr>
              ) : (
                pagedRows.map((r) => (
                  <tr
                    key={r.tenant_id}
                    onClick={() => { setActiveTenant(r); setPanelOpen(true) }}
                    className={`cursor-pointer border-b border-[#F3F5F3] last:border-0 hover:bg-[#FAFBFA] ${
                      isAtLimit(r) ? 'border-l-2 border-l-[#E2483D]' : ''
                    }`}
                  >
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <PlanTenantLogo row={r} />
                        <p className="text-[13px] font-medium text-[#10241C] truncate max-w-[120px] sm:max-w-none">{r.tenant_name}</p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5"><PlanBadge plan={r.plan} /></td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <UsageCell used={r.client_count} limit={r.client_limit} />
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <UsageCell used={r.request_count} limit={r.request_limit} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {numPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[13px] text-[#7C867D]">
              Page {page} of {numPages} · {totalRows} tenants
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 rounded-lg border border-[#D8DCD8] bg-white px-3 text-[13px] text-[#5B655C] hover:bg-[#F3F5F3] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {pageNumbers.map((item) =>
                String(item).startsWith('ellipsis') ? (
                  <span key={item} className="px-1 text-[13px] text-[#9BA39B]">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`h-8 w-8 rounded-lg border text-[13px] font-medium transition-colors ${
                      page === item
                        ? 'border-[#1D9E75] bg-[#1D9E75] text-white'
                        : 'border-[#D8DCD8] bg-white text-[#5B655C] hover:bg-[#F3F5F3]'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(numPages, p + 1))}
                disabled={page === numPages}
                className="h-8 rounded-lg border border-[#D8DCD8] bg-white px-3 text-[13px] text-[#5B655C] hover:bg-[#F3F5F3] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <PlanOverridePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        tenant={activeTenant}
        onChanged={load}
      />
      <PlanDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        plans={data?.plans}
        onChanged={load}
      />
    </AdminLayout>
  )
}

function UsageCell({ used, limit }) {
  const unlimited = limit === -1 || limit == null
  if (unlimited) {
    return <span className="text-[13px] text-[#1D9E75]">↗ Unlimited</span>
  }
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const atLimit = used >= limit
  const color = atLimit ? '#E2483D' : pct >= 80 ? '#D9A33B' : '#1D9E75'
  return (
    <div className="w-28">
      <span className={`text-[13px] font-medium ${atLimit ? 'text-[#C73A30]' : 'text-[#2A332E]'}`}>
        {used} / {limit}
      </span>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#EEF1EE]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}