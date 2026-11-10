import { useEffect, useState, useCallback, useRef } from 'react'
import { Search } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import adminTenantsApi from '../../api/admin/adminTenants.api'
import { PlanBadge, StatusPill } from '../../components/ui/AdminUI'
import TenantDetailPanel from '../../components/modals/TenantDetailPanel'
import { getInitials, getAvatarColor, joinedLabel } from '../../utils/adminDisplay'

function TenantLogo({ tenant }) {
  const [imgError, setImgError] = useState(false)
  const showImage = tenant.logo_url && !imgError

  if (showImage) {
    return (
      <img
        src={tenant.logo_url}
        alt={tenant.name}
        onError={() => setImgError(true)}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ background: getAvatarColor(tenant.slug) }}
    >
      {getInitials(tenant.name)}
    </div>
  )
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(1)
  const PAGE_SIZE = 10

  const [activeTenant, setActiveTenant] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const isFirstRender = useRef(true)
  const pageRef = useRef(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await adminTenantsApi.list({
        search: search || undefined,
        plan: planFilter || undefined,
        status: statusFilter || undefined,
        page: pageRef.current,
        page_size: PAGE_SIZE,
      })
      setTenants(data.data.results)
      setTotal(data.data.total)
      setNumPages(data.data.num_pages ?? 1)
    } catch {
      setTenants([])
      setTotal(0)
      setNumPages(1)
    } finally {
      setLoading(false)
    }
  }, [search, planFilter, statusFilter])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    pageRef.current = 1
    setPage(1)
    load()
  }, [search, planFilter, statusFilter])

  useEffect(() => { load() }, [load, page])

  const visibleTenants = tenants.filter((t) => {
    if (!statusFilter) return true
    const isSuspended = t.is_suspended
    return statusFilter === 'suspended' ? isSuspended : !isSuspended
  })

  const openDetail = async (row) => {
    setPanelOpen(true)
    try {
      const { data } = await adminTenantsApi.get(row.id)
      setActiveTenant(data.data)
    } catch {
      setActiveTenant(row)
    }
  }

  const refreshDetail = async () => {
    if (!activeTenant) return
    const { data } = await adminTenantsApi.get(activeTenant.id)
    setActiveTenant(data.data)
    load()
  }

  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === numPages || Math.abs(n - page) <= 1)
    .reduce((acc, n, idx, arr) => {
      if (idx > 0 && n - arr[idx - 1] > 1) acc.push('ellipsis-' + n)
      acc.push(n)
      return acc
    }, [])

  return (
    <AdminLayout>
      <div className="flex items-start justify-between px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-semibold text-[#10241C]">Tenants</h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-[#7C867D]">All provider workspaces.</p>
        </div>
        <span className="rounded-lg border border-[#D8DCD8] bg-white px-3 py-1.5 sm:px-3.5 sm:py-2 text-[12px] sm:text-[13px] font-medium text-[#5B655C]">
          {total} tenants
        </span>
      </div>

      <div className="px-4 sm:px-8 pb-10">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] sm:min-w-[260px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BA39B]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or slug..."
              className="h-10 w-full rounded-lg border border-[#D8DCD8] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
            />
          </div>

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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-[#D8DCD8] bg-white px-3 text-[13px] text-[#5B655C] outline-none focus:border-[#1D9E75] flex-shrink-0"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          {(search || planFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setPlanFilter(''); setStatusFilter('') }}
              className="text-[13px] font-medium text-[#0F6E56] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-[#E5E8E5] bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#EEF1EE] text-[11px] uppercase tracking-wide text-[#9BA39B]">
                <th className="px-4 sm:px-5 py-3 font-medium">Tenant</th>
                <th className="px-4 sm:px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Clients</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Requests</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Joined</th>
                <th className="px-4 sm:px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-[#9BA39B]">Loading…</td></tr>
              ) : visibleTenants.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-[#9BA39B]">No tenants match your filters.</td></tr>
              ) : (
                visibleTenants.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openDetail(t)}
                    className="cursor-pointer border-b border-[#F3F5F3] last:border-0 hover:bg-[#FAFBFA]"
                  >
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <TenantLogo tenant={t} />
                        <span className="text-[13px] font-medium text-[#10241C] truncate max-w-[120px] sm:max-w-none">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5"><PlanBadge plan={t.plan} /></td>
                    <td className="px-5 py-3.5 text-[13px] text-[#2A332E] hidden md:table-cell">
                      {t.client_count}/{t.client_limit === -1 ? '∞' : t.client_limit}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-[#2A332E] hidden md:table-cell">
                      {t.request_count}/{t.request_limit == null || t.request_limit === -1 ? '∞' : t.request_limit}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-[#7C867D] hidden lg:table-cell">{joinedLabel(t.created_at)}</td>
                    <td className="px-4 sm:px-5 py-3.5"><StatusPill status={t.is_suspended ? 'Suspended' : 'Active'} /></td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetail(t) }}
                        className="rounded-lg border border-[#D8DCD8] bg-white px-3 py-1.5 text-[12px] font-medium text-[#5B655C] hover:bg-[#F3F5F3]"
                      >
                        View Details
                      </button>
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
              Page {page} of {numPages} · {total} tenants
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { pageRef.current = Math.max(1, page - 1); setPage(pageRef.current); load() }}
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
                    onClick={() => { pageRef.current = item; setPage(item); load() }}
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
                onClick={() => { pageRef.current = Math.min(numPages, page + 1); setPage(pageRef.current); load() }}
                disabled={page === numPages}
                className="h-8 rounded-lg border border-[#D8DCD8] bg-white px-3 text-[13px] text-[#5B655C] hover:bg-[#F3F5F3] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <TenantDetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        tenant={activeTenant}
        onChanged={refreshDetail}
      />
    </AdminLayout>
  )
}