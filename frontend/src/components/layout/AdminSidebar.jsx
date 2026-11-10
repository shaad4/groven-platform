import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  LogOut,
  User,
} from 'lucide-react'
import { selectAdminUser, clearAdminAuth } from '../../features/adminAuth/adminAuthSlice'
import { setAdminLoggingOut } from '../../api/admin/adminAuthResponseInterceptor'
import adminAuthApi from '../../api/admin/adminAuth.api'


const NAV_ITEMS = [
  { to: '/grove-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/grove-admin/tenants', icon: Building2, label: 'Tenants' },
  { to: '/grove-admin/users', icon: Users, label: 'Users' },
  { to: '/grove-admin/plans', icon: CreditCard, label: 'Plans' },
]

export default function AdminSidebar() {
  const admin = useSelector(selectAdminUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  const handleSignOut = async () => {
    setAdminLoggingOut(true)
    try {
      await adminAuthApi.logout()
    } catch {
      // proceed regardless
    }
    dispatch(clearAdminAuth())
    navigate('/grove-admin/login', { replace: true })
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex h-screen w-[260px] shrink-0 flex-col bg-[#0A140F] border-r border-white/[0.06]">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-6 py-6">
          <span className="text-[16px] font-semibold text-white">Groven Admin</span>
          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
            Internal
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 pt-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
                  isActive
                    ? 'bg-white text-[#0A140F] font-medium'
                    : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-4 py-4">
          <p className="truncate px-2 text-[12px] text-white/40">{admin?.email}</p>
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-white/55 hover:bg-white/[0.06] hover:text-white/90 transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-[60px] z-40 border-b border-white/[0.06] bg-[#0A140F]/95 backdrop-blur-xl flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-white">Groven Admin</span>
          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/50">
            Internal
          </span>
        </div>
        <button
          onClick={() => setIsPopupOpen(!isPopupOpen)}
          className="h-8 w-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <User size={15} />
        </button>
      </div>

      {/* Mobile Profile Popup */}
      {isPopupOpen && (
        <div className="lg:hidden fixed top-[68px] right-4 w-[200px] z-50 rounded-xl border border-white/[0.08] bg-[#0A140F]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="truncate text-[12px] text-white/40">{admin?.email}</p>
          </div>
          <button
            onClick={() => {
              setIsPopupOpen(false)
              handleSignOut()
            }}
            className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/[0.08] transition-colors"
          >
            <LogOut size={14} />
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[64px] z-50 border-t border-white/[0.06] bg-[#0A140F]/95 backdrop-blur-xl">
        <div className="flex items-center justify-around h-full px-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsPopupOpen(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 min-w-[60px] rounded-lg px-2.5 py-1.5 transition-colors ${
                  isActive
                    ? 'text-white bg-white/[0.06]'
                    : 'text-white/45 hover:text-white/80'
                }`
              }
            >
              <Icon size={16} />
              <span className="text-[9px]">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  )
}