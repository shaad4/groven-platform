import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, MoreHorizontal, RotateCcw } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import adminUsersApi from '../../api/admin/adminUsers.api'
import { RoleBadge, StatusPill } from '../../components/ui/AdminUI'
import UserDetailPanel from '../../components/modals/UserDetailPanel'
import { getInitials, getAvatarColor, joinedLabel, relativeTimeLabel } from '../../utils/adminDisplay'

function UserAvatar({ user }) {
  const [imgError, setImgError] = useState(false)
  const showImage = user.avatar_url && !imgError

  if (showImage) {
    return (
      <img
        src={user.avatar_url}
        alt={user.display_name}
        onError={() => setImgError(true)}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ background: getAvatarColor(user.email) }}
    >
      {getInitials(user.display_name)}
    </div>
  )
}

function RowActionsMenu({ user, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!user.is_active) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(user) }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9BA39B] hover:bg-[#F3F5F3] hover:text-[#1D9E75]"
        title="Reactivate"
      >
        <RotateCcw size={14} />
      </button>
    )
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9BA39B] hover:bg-[#F3F5F3]"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-[#E5E8E5] bg-white py-1 shadow-lg">
          <button
            onClick={() => { setOpen(false); onSelect(user) }}
            className="w-full px-3 py-2 text-left text-[13px] text-[#2A332E] hover:bg-[#FAFBFA]"
          >
            View details
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(1)
  const PAGE_SIZE = 20

  const [activeUser, setActiveUser] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const pageRef = useRef(page)
  useEffect(() => { pageRef.current = page }, [page])

  const load = useCallback(async () => {
  setLoading(true)
  try {
    const { data } = await adminUsersApi.list({
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      page: pageRef.current,
      page_size: PAGE_SIZE,
    })
    setUsers(data.data.users)
    setTotal(data.data.total)
    setNumPages(data.data.num_pages ?? 1)
  } catch {
    setUsers([])
    setTotal(0)
    setNumPages(1)
  } finally {
    setLoading(false)
  }
}, [search, roleFilter, statusFilter]) 

  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    pageRef.current = 1
    setPage(1)
    load()
  }, [search, roleFilter, statusFilter])


  useEffect(() => { load() }, [load, page])

  // Client-side status fallback in case backend filtering on the
  // repository layer doesn't map "active"/"deactivated" yet.
  const visibleUsers = users.filter((u) => {
    if (!statusFilter) return true
    return statusFilter === 'deactivated' ? !u.is_active : u.is_active
  })

  const openDetail = (u) => {
    setActiveUser(u)
    setPanelOpen(true)
  }

  const handleChanged = () => {
    load()
    setPanelOpen(false)
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
          <h1 className="text-[22px] sm:text-[24px] font-semibold text-[#10241C]">Users</h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-[#7C867D]">All provider and client accounts.</p>
        </div>
        <span className="rounded-lg border border-[#D8DCD8] bg-white px-3 py-1.5 sm:px-3.5 sm:py-2 text-[12px] sm:text-[13px] font-medium text-[#5B655C]">
          {total} users
        </span>
      </div>

      <div className="px-4 sm:px-8 pb-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] sm:min-w-[260px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BA39B]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or name..."
              className="h-10 w-full rounded-lg border border-[#D8DCD8] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/15"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-lg border border-[#D8DCD8] bg-white px-3 text-[13px] text-[#5B655C] outline-none focus:border-[#1D9E75] flex-shrink-0"
          >
            <option value="">All roles</option>
            <option value="provider">Provider</option>
            <option value="client">Client</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-[#D8DCD8] bg-white px-3 text-[13px] text-[#5B655C] outline-none focus:border-[#1D9E75] flex-shrink-0"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>

          {(search || roleFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter('') }}
              className="text-[13px] font-medium text-[#0F6E56] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#E5E8E5] bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#EEF1EE] text-[11px] uppercase tracking-wide text-[#9BA39B]">
                <th className="px-4 sm:px-5 py-3 font-medium">User</th>
                <th className="px-4 sm:px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Workspace</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Joined</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Last login</th>
                <th className="px-4 sm:px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium w-12 hidden sm:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-[#9BA39B]">Loading…</td></tr>
              ) : visibleUsers.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-[#9BA39B]">No users match your filters.</td></tr>
              ) : (
                visibleUsers.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => openDetail(u)}
                    className="cursor-pointer border-b border-[#F3F5F3] last:border-0 hover:bg-[#FAFBFA]"
                  >
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={u} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#10241C] truncate max-w-[120px] sm:max-w-none">{u.display_name}</p>
                          <p className="text-[12px] text-[#9BA39B] truncate max-w-[120px] sm:max-w-none">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3.5 text-[13px] text-[#0F6E56] hidden md:table-cell">{u.tenant_slug}.groven.in</td>
                    <td className="px-5 py-3.5 text-[13px] text-[#7C867D] hidden lg:table-cell">{joinedLabel(u.joined_at)}</td>
                    <td className="px-5 py-3.5 text-[13px] text-[#7C867D] hidden lg:table-cell">{relativeTimeLabel(u.last_login) || 'Never'}</td>
                    <td className="px-4 sm:px-5 py-3.5">
                      <StatusPill status={u.is_active ? 'Active' : 'Deactivated'} />
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <RowActionsMenu user={u} onSelect={openDetail} />
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
              Page {page} of {numPages} · {total} users
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

      <UserDetailPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        user={activeUser}
        onChanged={handleChanged}
      />
    </AdminLayout>
  )
}