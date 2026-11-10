import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import AdminPageHeader from '../../components/layout/AdminPageHeader'
import adminStatsApi from '../../api/admin/adminStats.api'
import { PlanBadge } from '../../components/ui/AdminUI'
import { getInitials, getAvatarColor, joinedLabel } from '../../utils/adminDisplay'

function StatCard({ label, value, delta }) {
  const positive = delta != null && delta >= 0
  return (
    <div className="rounded-xl border border-[#E5E8E5] bg-white p-3 sm:p-5">
      <span className="text-[11px] sm:text-[13px] text-[#7C867D]">{label}</span>
      <p className="mt-1 sm:mt-2 text-xl sm:text-[28px] font-semibold text-[#10241C]">{value}</p>
      {delta != null && (
        <div className={`mt-1 flex items-center gap-1 text-[10px] sm:text-[12px] font-medium ${positive ? 'text-[#1D9E75]' : 'text-[#C73A30]'}`}>
          {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {positive ? '+' : ''}{delta} vs last week
        </div>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setError('')
    try {
      const { data } = await adminStatsApi.getStats()
      setStats(data.data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load dashboard stats.')
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-7 w-7 rounded-full border-2 border-[#D8DCD8] border-t-[#1D9E75] animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <div className="rounded-xl border border-[#F3D2CE] bg-[#FDF1EF] px-5 py-4 text-[13px] text-[#C73A30]">
            {error}
          </div>
        </div>
      </AdminLayout>
    )
  }

  const freeCount = stats?.free_count ?? 0
  const proCount = stats?.pro_count ?? 0
  const totalForBar = freeCount + proCount || 1
  const proPct = Math.round((proCount / totalForBar) * 100)

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Platform overview — read only."
        onRefresh={() => load(true)}
        refreshing={refreshing}
      />

      <div className="px-4 sm:px-8 pb-10">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <StatCard
            label="Total tenants"
            value={stats?.total_tenants ?? 0}
            delta={stats?.signup_delta}
          />
          <StatCard label="Total users" value={stats?.total_users ?? 0} />
          <StatCard label="Total requests" value={stats?.total_requests ?? 0} />
          <div className="rounded-xl border border-[#E5E8E5] bg-white p-3 sm:p-5">
            <span className="text-[11px] sm:text-[13px] text-[#7C867D]">Free vs pro</span>
            <div className="mt-1 sm:mt-2 flex items-baseline gap-2 sm:gap-3">
              <span className="text-sm sm:text-[16px] font-semibold text-[#10241C]">Free: {freeCount}</span>
              <span className="text-sm sm:text-[16px] font-semibold text-[#0F6E56]">Pro: {proCount}</span>
            </div>
            <div className="mt-2 sm:mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#EEF1EE]">
              <div className="h-full rounded-full bg-[#1D9E75]" style={{ width: `${proPct}%` }} />
            </div>
          </div>
        </div>

        {/* Signups this week */}
        <div className="mt-4 rounded-xl border border-[#E5E8E5] bg-white px-5 py-4">
          <span className="text-[13px] text-[#7C867D]">
            <span className="font-semibold text-[#10241C]">{stats?.signups_this_week ?? 0}</span> new tenant signups this week
          </span>
        </div>

        {/* At plan limit */}
        {stats?.tenants_at_limit?.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[#10241C]">At plan limit</h2>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E2483D] px-1 text-[11px] font-semibold text-white">
                  {stats.tenants_at_limit.length}
                </span>
              </div>
              <button
                onClick={() => navigate('/grove-admin/plans')}
                className="flex items-center gap-1 text-[13px] font-medium text-[#0F6E56] hover:underline"
              >
                View in Plans <ArrowUpRight size={13} />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E5E8E5] bg-white">
              {stats.tenants_at_limit.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between px-5 py-4 ${
                    i !== stats.tenants_at_limit.length - 1 ? 'border-b border-[#EEF1EE]' : ''
                  }`}
                >
                  <div>
                    <p className="text-[14px] font-medium text-[#10241C]">{t.name}</p>
                    <p className="text-[12px] text-[#9BA39B]">{t.slug}.groven.in</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent tenants */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#10241C]">Recent tenants</h2>
            <button
              onClick={() => navigate('/grove-admin/tenants')}
              className="flex items-center gap-1 text-[13px] font-medium text-[#0F6E56] hover:underline"
            >
              View all <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E5E8E5] bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#EEF1EE] text-[11px] uppercase tracking-wide text-[#9BA39B]">
                  <th className="px-4 sm:px-5 py-3 font-medium">Tenant</th>
                  <th className="px-4 sm:px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recent_tenants?.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer border-b border-[#F3F5F3] last:border-0 hover:bg-[#FAFBFA]"
                    onClick={() => navigate('/grove-admin/tenants')}
                  >
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                          style={{ background: getAvatarColor(t.slug) }}
                        >
                          {getInitials(t.name)}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#10241C]">{t.name}</p>
                          <p className="text-[12px] text-[#9BA39B]">{t.slug}.groven.in</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5"><PlanBadge plan={t.plan} /></td>
                    <td className="px-5 py-3.5 text-[13px] text-[#7C867D] hidden sm:table-cell">{joinedLabel(t.joined_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}