import { useEffect, useRef, useState } from 'react'
import ThemeToggle from '../ui/ThemeToggle'
import { GrovenLogo } from '../marketing/BrandMark'
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
  const menuRef = useRef(null)
  const desktopMenuRef = useRef(null)
  const accountTrigger = useRef(null)
  useEffect(() => {
    const close = (event) => {
      if (event.type === 'keydown') {
        if (event.key === 'Escape') { setIsPopupOpen(false); accountTrigger.current?.focus() }
      } else if (!menuRef.current?.contains(event.target) && !desktopMenuRef.current?.contains(event.target)) setIsPopupOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [])

  const handleSignOut = async () => {
    setAdminLoggingOut(true)
    try { await adminAuthApi.logout() } catch { /* Clear the local session even if offline. */ }
    dispatch(clearAdminAuth())
    navigate('/grove-admin/login', { replace: true })
  }

  const toggleAccount = event => { accountTrigger.current = event.currentTarget; setIsPopupOpen(open => !open) }
  const accountContent = <>
    <p className="truncate border-b border-border px-2 py-3 text-xs text-text-dim">{admin?.email}</p>
    <div className="py-3"><p className="mb-2 px-2 text-xs font-medium text-text-sub">Appearance</p><ThemeToggle /></div>
    <button onClick={handleSignOut} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-sm text-status-danger-text hover:bg-status-danger-bg"><LogOut size={16} />Sign out</button>
  </>

  return (
    <>
      <aside className="hidden h-dvh w-[248px] shrink-0 flex-col border-r border-border bg-layout-card lg:flex">
        <div className="px-6 py-7">
          <GrovenLogo /><p className="mt-2 text-xs text-text-dim">Administration</p>
        </div>
        <p className="eyebrow mb-3 mt-4 px-6">Platform</p>
        <nav aria-label="Admin navigation" className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${isActive ? 'bg-primary-light font-semibold text-primary-ink' : 'text-text-sub hover:bg-surface hover:text-text-main'}`}>
              <Icon size={18} aria-hidden="true" />{label}
            </NavLink>
          ))}
        </nav>
        <div ref={desktopMenuRef} className="relative border-t border-border p-4">
          <button onClick={toggleAccount} aria-label="Admin account" aria-expanded={isPopupOpen} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-sm text-text-sub hover:bg-surface"><User size={18} />Account settings</button>
          {isPopupOpen && <div className="absolute bottom-full left-3 z-50 mb-2 w-72 rounded-xl border border-border bg-layout-card p-3 shadow-soft">{accountContent}</div>}
        </div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-layout-card/95 px-4 backdrop-blur-xl lg:hidden">
        <div><GrovenLogo className="h-6" /><p className="mt-1 text-[11px] text-text-dim">Administration</p></div>
        <div ref={menuRef} className="relative flex items-center gap-2">
          <button onClick={toggleAccount} aria-label="Admin account" aria-expanded={isPopupOpen} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-text-sub"><User size={18} /></button>
          {isPopupOpen && <div className="absolute right-0 top-14 z-50 w-72 rounded-xl border border-border bg-layout-card p-3 shadow-soft">{accountContent}</div>}
        </div>
      </header>
      <nav aria-label="Admin mobile navigation" className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-layout-card/95 px-2 pt-2 backdrop-blur-xl lg:hidden">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} onClick={() => setIsPopupOpen(false)} className={({ isActive }) => `flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-3 text-[11px] font-medium ${isActive ? 'bg-primary-light text-primary-ink' : 'text-text-sub'}`}><Icon size={19} aria-hidden="true" />{label}</NavLink>)}
      </nav>
    </>
  )
}
