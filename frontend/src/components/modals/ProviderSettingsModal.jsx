import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getProfile, updateProfile, changePassword, uploadAvatar,
  getWorkspace, updateWorkspace, uploadLogo,
  getNotifications, updateNotifications, deleteAccount,
} from '../../api/settings.api'
import {
  createCheckoutSession, getBillingPortalUrl, getBillingHistory,
} from '../../api/billing.api'
import {
  Building2, Palette, Bell, ShieldCheck, CreditCard,
  Workflow, Trash2, X, Eye, EyeOff, Lock, Unlock,
  Upload, AlertTriangle, Check, Loader2, ChevronRight,
  Camera,
} from 'lucide-react'

import { authApi } from '../../api/auth.api'
import { useWalkthrough } from '../../context/WalkthroughContext'
import { RotateCcw } from 'lucide-react'


// Nav config 

const NAV = [
  { id: 'business-profile',  label: 'Business profile',   icon: Building2,    group: 'workspace' },
  { id: 'portal-branding',   label: 'Portal & branding',  icon: Palette,      group: 'workspace' },
  { id: 'notifications',     label: 'Notifications',      icon: Bell,         group: 'workspace' },
  { id: 'account-security',  label: 'Account & security', icon: ShieldCheck,  group: 'account'   },
  { id: 'plan-billing',      label: 'Plan & billing',     icon: CreditCard,   group: 'account'   },
  { id: 'workflow',          label: 'Workflow',            icon: Workflow,     group: 'account'   },
  { id: 'danger-zone',       label: 'Danger zone',        icon: Trash2,       group: 'danger',   danger: true },
]

const STATUS_STAGES = [
  { key: 'received',     label: 'Received',    dot: 'bg-emerald-500' },
  { key: 'in_review',   label: 'In Review',   dot: 'bg-amber-500'   },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-indigo-500'  },
  { key: 'delivered',   label: 'Delivered',   dot: 'bg-blue-500'    },
  { key: 'closed',      label: 'On Hold',     dot: 'bg-red-500'     },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Primitives 

function Spinner({ size = 14 }) {
  return <Loader2 size={size} className="animate-spin" />
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-[22px] w-10 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2 ${
        checked ? 'bg-[#0F6E56]' : 'bg-[#D1D5D1]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Input({ value, onChange, placeholder, maxLength, readOnly, type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      readOnly={readOnly}
      className={`w-full h-9 px-3 rounded-lg border text-[13px] transition-all focus:outline-none ${
        readOnly
          ? 'border-[#E8EAE8] bg-[#F7F8F7] text-[#9EA89E] cursor-not-allowed'
          : 'border-[#E0E4E0] bg-white text-[#141A14] placeholder:text-[#C5CAC5] focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10'
      } ${className}`}
    />
  )
}

function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-[11px] font-medium text-[#6B756B] uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 px-3 pr-9 rounded-lg border border-[#E0E4E0] bg-white text-[13px] text-[#141A14] placeholder:text-[#C5CAC5] focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/10 transition-all"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9EA89E] hover:text-[#4A544A] transition-colors">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

function Label({ children, optional }) {
  return (
    <label className="block text-[11px] font-medium text-[#6B756B] uppercase tracking-wide mb-1.5">
      {children}
      {optional && <span className="ml-1.5 text-[#B0BAB0] normal-case tracking-normal font-normal">optional</span>}
    </label>
  )
}

function FormRow({ label, optional, hint, children }) {
  return (
    <div>
      {label && <Label optional={optional}>{label}</Label>}
      {children}
      {hint && <p className="text-[11px] text-[#9EA89E] mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  )
}

function Toast({ type, message }) {
  if (!message) return null
  return (
    <div className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg border ${
      type === 'success' ? 'bg-[#E8F5F0] border-[#B3DDD1] text-[#0F6E56]' : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      {type === 'success' ? <Check size={12} /> : <X size={12} />}
      {message}
    </div>
  )
}

function Btn({ children, onClick, loading, variant = 'primary', size = 'md', disabled, className = '' }) {
  const sizes = { sm: 'px-3 py-1.5 text-[12px]', md: 'px-3.5 py-2 text-[13px]', lg: 'px-4 py-2 text-sm' }
  const variants = {
    primary: 'bg-[#0F6E56] text-white hover:bg-[#0A5A44] shadow-sm',
    ghost: 'bg-transparent text-[#4A544A] hover:bg-[#F2F4F2] border border-[#E0E4E0]',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    'danger-ghost': 'bg-transparent text-red-600 border border-red-200 hover:bg-red-50',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading ? <Spinner size={13} /> : children}
    </button>
  )
}

function SectionTitle({ title, description }) {
  return (
    <div className="mb-6">
      <h3 className="text-[15px] font-semibold text-[#141A14]">{title}</h3>
      {description && <p className="text-[12px] text-[#9EA89E] mt-0.5">{description}</p>}
    </div>
  )
}

function Divider() {
  return <div className="border-t border-[#F0F2F0] my-5" />
}

function SectionFooter({ children }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-[#F0F2F0]">
      {children}
    </div>
  )
}

// ─── Password Strength ────────────────────────────────────────────────────────

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  if (s <= 1) return { score: s, label: 'Weak', color: 'bg-red-400' }
  if (s <= 3) return { score: s, label: 'Fair', color: 'bg-amber-400' }
  return { score: s, label: 'Strong', color: 'bg-[#0F6E56]' }
}

// ─── Avatar Upload ────────────────────────────────────────────────────────────

function AvatarUpload({ preview, onSelect, initials, shape = 'circle', size = 'md' }) {
  const ref = useRef()
  const sizes = { sm: 'w-11 h-11 text-sm', md: 'w-14 h-14 text-base', lg: 'w-16 h-16 text-lg' }
  const shapes = { circle: 'rounded-full', square: 'rounded-xl' }
  return (
    <div className="flex items-center gap-4">
      <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => ref.current?.click()}>
        <div className={`${sizes[size]} ${shapes[shape]} border-2 border-[#E8EAE8] overflow-hidden bg-[#F2F4F2] flex items-center justify-center`}>
          {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <span className="font-semibold text-[#6B756B]">{initials}</span>}
        </div>
        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity ${shapes[shape]}`}>
          <Camera size={16} className="text-white" />
        </div>
      </div>
      <div>
        <button type="button" onClick={() => ref.current?.click()} className="text-[13px] text-[#0F6E56] font-medium hover:underline block">Change photo</button>
        <p className="text-[11px] text-[#9EA89E] mt-0.5">PNG, JPG or WebP · Max 2 MB</p>
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={(e) => onSelect(e.target.files[0])} />
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-2xl border border-[#E8EAE8] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEF0EE]">
          <h3 className="text-[14px] font-semibold text-[#141A14]">{title}</h3>
          <button onClick={onClose} className="text-[#9EA89E] hover:text-[#4A544A] transition-colors p-1 rounded-lg hover:bg-[#F2F4F2]">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function BusinessProfileSection({ ws, setWs, logoPreview, handleLogoSelect }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const businessInitials = (ws?.name || 'G').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const handleSave = async () => {
    setLoading(true); setStatus(null)
    try {
      await updateWorkspace({ name: ws.name, tagline: ws.tagline })
      setStatus({ type: 'success', message: 'Saved.' })
    } catch {
      setStatus({ type: 'error', message: 'Could not save.' })
    } finally { setLoading(false) }
  }

  if (!ws) return <div className="flex items-center justify-center h-48"><Spinner size={20} /></div>

  return (
    <div>
      <SectionTitle title="Business profile" description="Visible on your portal and in client communications." />
      <FormRow label="Business logo" hint="PNG, JPG or SVG · Max 2 MB · Recommended 200×200 px">
        <AvatarUpload preview={logoPreview} onSelect={handleLogoSelect} initials={businessInitials} shape="square" size="lg" />
      </FormRow>
      <Divider />
      <FormRow label="Business name" hint="The name your clients see on their portal.">
        <Input value={ws.name} onChange={(v) => setWs(p => ({ ...p, name: v }))} maxLength={255} />
      </FormRow>
      <div className="mt-4">
        <FormRow label="Tagline" optional hint="A short line shown on your client portal homepage.">
          <Input value={ws.tagline || ''} onChange={(v) => setWs(p => ({ ...p, tagline: v }))} placeholder="e.g. Design & development for ambitious brands" maxLength={255} />
        </FormRow>
      </div>
      <SectionFooter>
        <Toast type={status?.type} message={status?.message} />
        <Btn onClick={handleSave} loading={loading}>Save changes</Btn>
      </SectionFooter>
    </div>
  )
}

function PortalBrandingSection({ ws, setWs }) {
  const { logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [slugLocked, setSlugLocked] = useState(true)
  const [slugWarning, setSlugWarning] = useState(false)
  const [showSlugConfirm, setShowSlugConfirm] = useState(false)
  const [pendingSlug, setPendingSlug] = useState('')
  const originalSlug = useRef(ws?.slug)

  const [slugStatus, setSlugStatus] = useState('idle')

  useEffect(() => {
    if (
      !ws?.slug ||
      ws.slug.length < 3 ||
      ws.slug === originalSlug.current ||
      slugLocked
    ) {
      setSlugStatus('idle')
      return
    }
    const timeout = setTimeout(async () => {
      try {
        setSlugStatus('checking')
        const res = await authApi.checkSlug(ws.slug)
        setSlugStatus(
          res.data.available
            ? 'available'
            : 'taken'
        )
      }
      catch {
        setSlugStatus('taken')
      }
    }, 500)

    return () => clearTimeout(timeout)

  }, [ws?.slug, slugLocked])

  const doSave = async () => {
    setLoading(true); setStatus(null); setSlugWarning(false); setShowSlugConfirm(false)
    try {
      const res = await updateWorkspace({ slug: ws.slug, accent_color: ws.accent_color, white_label_enabled: ws.white_label_enabled })
      if (res.data.data.slug_changed) { 
        await logout()
        return
      }
      setStatus({ type: 'success', message: 'Branding saved.' })
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || 'Could not save.' })
    } finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (ws.slug !== originalSlug.current) { setPendingSlug(ws.slug); setShowSlugConfirm(true); return }
    doSave()
  }

  if (!ws) return <div className="flex items-center justify-center h-48"><Spinner size={20} /></div>

  return (
    <>
      <div>
        <SectionTitle title="Portal & branding" description="What your clients see when they open their portal." />

        <FormRow label="Portal URL">
          <div className="flex items-stretch h-9 rounded-lg border border-[#E0E4E0] bg-white overflow-hidden focus-within:border-[#0F6E56] focus-within:ring-2 focus-within:ring-[#0F6E56]/10 transition-all">
            <span className="px-2.5 text-[11px] text-[#9EA89E] bg-[#F7F8F7] border-r border-[#E0E4E0] flex items-center select-none font-mono whitespace-nowrap">groven.in/</span>
            <input
              type="text"
              value={ws.slug}
              readOnly={slugLocked}
              onChange={(e) => {
                const slug = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '')

                setWs(p => ({
                  ...p,
                  slug,
                }))

              }}
              className={`flex-1 h-full px-2.5 text-[13px] font-mono focus:outline-none transition-colors ${slugLocked ? 'bg-[#F7F8F7] text-[#9EA89E] cursor-not-allowed' : 'bg-white text-[#141A14]'}`}
            />
            <button
              type="button"
              onClick={() => { setSlugLocked(!slugLocked); if (!slugLocked) setWs(p => ({ ...p, slug: originalSlug.current })) }}
              className={`px-2.5 flex items-center gap-1 text-[11px] font-medium border-l border-[#E0E4E0] transition-colors ${slugLocked ? 'text-[#0F6E56] hover:bg-[#F0FAF5]' : 'text-red-500 hover:bg-red-50'}`}
            >
              {slugLocked ? <><Lock size={11} /><span>Edit</span></> : <><Unlock size={11} /><span>Cancel</span></>}
            </button>
          </div>
          
          {slugStatus === 'checking' && (
            <p className="mt-2 text-[11px] text-[#9EA89E]">
              Checking availability...
            </p>
          )}

          {slugStatus === 'available' && (
            <p className="mt-2 text-[11px] text-green-600 font-medium">
              URL path available
            </p>
          )}

          {slugStatus === 'taken' && (
            <p className="mt-2 text-[11px] text-red-500 font-medium">
              URL path taken
            </p>
          )}
          
          {!slugLocked && (
            <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700 leading-relaxed"><span className="font-semibold">Changing your URL will break all existing portal links.</span> Clients you've already invited will get a 404 until you re-send their invites.</p>
            </div>
          )}
          {slugWarning && (
            <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
              <p className="text-[11px] text-amber-700">URL changed. Re-send invite links to existing clients.</p>
            </div>
          )}
        </FormRow>

        <Divider />

        <FormRow label="Accent color" hint="Used on buttons and highlights on your client portal.">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-lg border border-[#E0E4E0] overflow-hidden flex-shrink-0 cursor-pointer">
              <div className="absolute inset-0" style={{ backgroundColor: ws.accent_color || '#0F6E56' }} />
              <input type="color" value={ws.accent_color || '#0F6E56'} onChange={(e) => setWs(p => ({ ...p, accent_color: e.target.value }))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
            <Input value={ws.accent_color || '#0F6E56'} onChange={(v) => setWs(p => ({ ...p, accent_color: v }))} maxLength={7} className="max-w-[130px] font-mono" />
          </div>
        </FormRow>

        <SectionFooter>
          <Toast type={status?.type} message={status?.message} />
          <Btn onClick={handleSave} loading={loading} disabled={
            slugStatus === 'taken' ||
            slugStatus === 'checking'
          }>Save changes</Btn>
        </SectionFooter>
      </div>

      {showSlugConfirm && (
        <ConfirmModal title="Confirm URL change" onClose={() => { setShowSlugConfirm(false); setWs(p => ({ ...p, slug: originalSlug.current })) }}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-[12px] text-amber-800 space-y-1">
                <p className="font-semibold">This will break existing portal links.</p>
                <p>Clients accessing <code className="font-mono bg-amber-100 px-1 rounded">{originalSlug.current}</code> will get a 404 error.</p>
              </div>
            </div>
            <p className="text-[13px] text-[#4A544A]">Changing to <span className="font-mono text-[#141A14] font-medium">{pendingSlug}</span> is permanent. You'll need to re-share all portal links.</p>
            <div className="flex gap-2.5 justify-end pt-1">
              <Btn variant="ghost" onClick={() => { setShowSlugConfirm(false); setWs(p => ({ ...p, slug: originalSlug.current })) }}>Cancel</Btn>
              <Btn variant="danger" onClick={doSave} loading={loading}>Yes, change URL</Btn>
            </div>
          </div>
        </ConfirmModal>
      )}
    </>
  )
}

function NotificationsSection() {
  const [notifPrefs, setNotifPrefs] = useState(null)
  const [savingKey, setSavingKey] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { getNotifications().then(r => setNotifPrefs(r.data.data)) }, [])

  const handleToggle = async (section, key, value) => {
    const k = `${section}.${key}`
    setSavingKey(k)
    setError(null)
    const prevPrefs = notifPrefs
    setNotifPrefs(p => ({ ...p, [section]: { ...p[section], [key]: value } }))
    try {
      const res = await updateNotifications({ [section]: { [key]: value } })
      console.log('Save response:', res.data)  
    } catch (err) {
      console.error('Save failed:', err?.response?.data || err)  
      setNotifPrefs(prevPrefs)  
      setError('Could not save preference.')
    }
    finally { setSavingKey(null) }
  }

  const notifItems = [
    { key: 'new_request',            label: 'New request submitted',  desc: 'A client submits a new request.'                  },
    { key: 'client_reply',           label: 'Client reply',           desc: 'A client sends a message on a request.'           },
    { key: 'client_viewed_delivery', label: 'Delivery viewed',        desc: 'A client opens a file you delivered.'             },
    { key: 'client_accepted_invite', label: 'Invite accepted',        desc: 'A new client joins their portal.'                 },
    { key: 'request_overdue',        label: 'Request overdue',        desc: 'A due date passes without delivery.'              },
  ]

  if (!notifPrefs) return <div className="flex items-center justify-center h-48"><Spinner size={20} /></div>

  return (
    <div>
      <SectionTitle title="Notifications" description="Control when and how you get notified." />

      <div className="mb-5">
        <p className="text-[10px] font-semibold text-[#9EA89E] uppercase tracking-wider mb-3.5">In-app</p>
        <div className="space-y-4">
          {notifItems.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] text-[#141A14]">{label}</p>
                <p className="text-[11px] text-[#9EA89E] mt-0.5">{desc}</p>
              </div>
              <Toggle checked={notifPrefs?.in_app?.[key] ?? true} onChange={v => handleToggle('in_app', key, v)} disabled={savingKey === `in_app.${key}`} />
            </div>
          ))}
        </div>
      </div>

      <Divider />

      <div>
        <p className="text-[10px] font-semibold text-[#9EA89E] uppercase tracking-wider mb-3.5">Email</p>
        <div className="space-y-4">
          {notifItems.slice(0, 4).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] text-[#141A14]">{label}</p>
                <p className="text-[11px] text-[#9EA89E] mt-0.5">{desc}</p>
              </div>
              <Toggle checked={notifPrefs?.email?.[key] ?? true} onChange={v => handleToggle('email', key, v)} disabled={savingKey === `email.${key}`} />
            </div>
          ))}

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-[13px] text-[#141A14]">Weekly digest</p>
              <p className="text-[11px] text-[#9EA89E] mt-0.5">A weekly summary of activity across all clients.</p>
              {notifPrefs?.email?.weekly_summary && (
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  <span className="text-[11px] text-[#9EA89E] mr-0.5">Send on</span>
                  {DAYS.map(day => (
                    <button key={day} type="button"
                      onClick={() => handleToggle('email', 'weekly_summary_day', day)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border font-medium transition ${notifPrefs?.email?.weekly_summary_day === day ? 'bg-[#0F6E56] text-white border-[#0F6E56]' : 'border-[#E0E4E0] text-[#4A544A] hover:border-[#0F6E56] hover:text-[#0F6E56]'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Toggle checked={notifPrefs?.email?.weekly_summary ?? true} onChange={v => handleToggle('email', 'weekly_summary', v)} disabled={savingKey === 'email.weekly_summary'} />
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#9EA89E] mt-5 pt-4 border-t border-[#F0F2F0]">Changes are saved automatically.</p>
    </div>
  )
}

function AccountSecuritySection({ user, onClose }) {
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const { startWalkthrough } = useWalkthrough()
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileStatus, setProfileStatus] = useState(null)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwStatus, setPwStatus] = useState(null)

  useEffect(() => {
    getProfile().then(r => { setDisplayName(r.data.data.display_name); setAvatarPreview(r.data.data.avatar_url) })
  }, [])

  const initials = (displayName || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const strength = passwordStrength(newPw)
  const passwordsMatch = newPw && confirmPw && newPw === confirmPw

  const handleAvatarSelect = async (file) => {
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    try { const res = await uploadAvatar(file); setAvatarPreview(res.data.data.avatar_url) }
    catch { setProfileStatus({ type: 'error', message: 'Upload failed.' }) }
  }

  const handleSaveProfile = async () => {
    setProfileLoading(true); setProfileStatus(null)
    try { await updateProfile({ display_name: displayName }); setProfileStatus({ type: 'success', message: 'Profile updated.' }) }
    catch { setProfileStatus({ type: 'error', message: 'Could not save.' }) }
    finally { setProfileLoading(false) }
  }

  const handleChangePassword = async () => {
    setPwLoading(true); setPwStatus(null)
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw })
      setPwStatus({ type: 'success', message: 'Password changed.' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      const e = err?.response?.data?.errors || {}
      setPwStatus({ type: 'error', message: e.current_password?.[0] || e.new_password?.[0] || 'Could not update password.' })
    } finally { setPwLoading(false) }
  }

  return (
    <div>
      <SectionTitle title="Account & security" description="Your profile and password settings." />

      <AvatarUpload preview={avatarPreview} onSelect={handleAvatarSelect} initials={initials} />
      <Divider />

      <div className="space-y-4">
        <FormRow label="Email address" hint="Contact support to change your email address.">
          <Input value={user?.email || ''} readOnly />
        </FormRow>
        <FormRow label="Display name">
          <Input value={displayName} onChange={setDisplayName} maxLength={60} />
        </FormRow>
      </div>

      <SectionFooter>
        <Toast type={profileStatus?.type} message={profileStatus?.message} />
        <Btn onClick={handleSaveProfile} loading={profileLoading}>Save profile</Btn>
      </SectionFooter>

      <div className="mt-8">
        <p className="text-[13px] font-semibold text-[#141A14] mb-1">Change password</p>
        <p className="text-[12px] text-[#9EA89E] mb-4">Use a strong, unique password.</p>
        <div className="space-y-3.5">
          <PasswordInput label="Current password" value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
          <div>
            <PasswordInput label="New password" value={newPw} onChange={setNewPw} placeholder="••••••••" />
            {newPw && (
              <div className="mt-2">
                <div className="h-1 rounded-full bg-[#EEF0EE] overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                </div>
                <p className={`text-[11px] mt-1 font-medium ${strength.score >= 4 ? 'text-[#0F6E56]' : 'text-[#9EA89E]'}`}>{strength.label}</p>
              </div>
            )}
          </div>
          <div>
            <PasswordInput label="Confirm new password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" />
            {confirmPw && (
              <p className={`text-[11px] mt-1.5 font-medium ${passwordsMatch ? 'text-[#0F6E56]' : 'text-red-500'}`}>
                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords don\'t match'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[#F0F2F0]">
          <Toast type={pwStatus?.type} message={pwStatus?.message} />
          <Btn onClick={handleChangePassword} loading={pwLoading} disabled={!passwordsMatch || !currentPw}>Update password</Btn>
        </div>
      </div>

      {/* Replay Walkthrough */}
      <div className="mt-8 border-t border-[#F0F2F0] pt-6">
        <p className="text-[13px] font-semibold text-[#141A14] mb-1">Onboarding walkthrough</p>
        <p className="text-[12px] text-[#9EA89E] mb-3">Re-take the interactive tour to get familiar with your dashboard.</p>
        <Btn variant="ghost" size="sm" onClick={() => { startWalkthrough('provider'); onClose(); }}>
          <RotateCcw size={14} className="mr-1" /> Replay Walkthrough
        </Btn>
      </div>
    </div>
  )
}

function PlanBillingSection({ ws }) {
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [actionError, setActionError] = useState(null)

  const isPro = ws?.plan?.name === 'pro'
  const isUnlimited = (limit) => limit === -1

  useEffect(() => {
    if (!ws) return
    getBillingHistory()
      .then((r) => setHistory(r.data.data))
      .catch(() => setHistoryError(true))
  }, [ws])

  const handleUpgrade = async () => {
    setUpgradeLoading(true); setActionError(null)
    try {
      const res = await createCheckoutSession({
        successUrl: `${window.location.origin}/dashboard?upgraded=true`,
        cancelUrl: window.location.href,
      })
      window.location.href = res.data.data.checkout_url
    } catch {
      setActionError('Could not start checkout. Try again.')
      setUpgradeLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true); setActionError(null)
    try {
      const res = await getBillingPortalUrl({ returnUrl: window.location.href })
      window.location.href = res.data.data.portal_url
    } catch {
      setActionError('Could not open billing portal. Try again.')
      setPortalLoading(false)
    }
  }

  if (!ws) return <div className="flex items-center justify-center h-48"><Spinner size={20} /></div>

  return (
    <div>
      <SectionTitle title="Plan & billing" description="Your current plan and usage." />
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#F2F4F2] border border-[#E0E4E0] text-[12px] font-semibold text-[#141A14] capitalize">
            {ws.plan.name} plan
          </span>
          <p className="text-[12px] text-[#9EA89E] mt-1.5">
            {isUnlimited(ws.plan.client_limit)
              ? 'Unlimited clients and unlimited active requests.'
              : <>Up to <strong className="text-[#4A544A]">{ws.plan.client_limit}</strong> clients and <strong className="text-[#4A544A]">{ws.plan.request_limit}</strong> active requests.</>
            }
          </p>
        </div>
        {isPro ? (
          <Btn size="sm" variant="ghost" onClick={handleManageBilling} loading={portalLoading}>Manage billing</Btn>
        ) : (
          <Btn size="sm" onClick={handleUpgrade} loading={upgradeLoading}>Upgrade to Pro</Btn>
        )}
      </div>

      {actionError && <p className="text-[11px] text-red-600 mt-2">{actionError}</p>}

      <Divider />

      <div className="space-y-4">
        {[{ label: 'Clients', used: ws.usage.client_count, limit: ws.plan.client_limit }, { label: 'Active requests', used: ws.usage.active_request_count, limit: ws.plan.request_limit }].map(({ label, used, limit }) => {
          const unlimited = isUnlimited(limit)
          const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100)
          const near = !unlimited && pct >= 80
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-[#4A544A]">{label}</span>
                <span className="text-[11px] text-[#9EA89E] tabular-nums">{used} / {unlimited ? '∞' : limit}</span>
              </div>
              {!unlimited && (
                <div className="h-1.5 rounded-full bg-[#EEF0EE] overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${near ? 'bg-amber-400' : 'bg-[#0F6E56]'}`} style={{ width: `${pct}%` }} />
                </div>
              )}
              {near && <p className="text-[11px] text-amber-600 mt-1">Approaching the limit — consider upgrading.</p>}
            </div>
          )
        })}
      </div>

      <Divider />

      <div>
        <p className="text-[11px] font-semibold text-[#9EA89E] uppercase tracking-wider mb-2">Billing history</p>

        {historyError && (
          <p className="text-[12px] text-red-500 italic">Could not load billing history.</p>
        )}

        {!historyError && history === null && (
          <div className="flex items-center gap-2 text-[12px] text-[#9EA89E]">
            <Spinner size={13} /> Loading…
          </div>
        )}

        {!historyError && history?.length === 0 && (
          <p className="text-[12px] text-[#9EA89E] italic">
            {isPro ? 'No invoices yet.' : "No invoices — you're on the free plan."}
          </p>
        )}

        {!historyError && history?.length > 0 && (
          <div className="border border-[#EEF0EE] rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#FAFBFA] text-[#9EA89E] text-left">
                  <th className="font-medium px-3 py-2">Date</th>
                  <th className="font-medium px-3 py-2">Amount</th>
                  <th className="font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-[#F0F2F0]">
                    <td className="px-3 py-2 text-[#4A544A]">
                      {new Date(h.createdAt || h.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-3 py-2 text-[#141A14] tabular-nums">
                      {h.currency} {h.amount}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`capitalize px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        h.status === 'paid' ? 'bg-[#E6F5F0] text-[#0F6E56]'
                        : h.status === 'failed' ? 'bg-red-50 text-red-600'
                        : 'bg-[#F2F4F2] text-[#4A544A]'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


function WorkflowSection({ ws }) {
  const [statusLabels, setStatusLabels] = useState({})
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => { if (ws) setStatusLabels(ws.custom_status_labels || {}) }, [ws])

  const handleSave = async () => {
    setLoading(true); setStatus(null)
    try { await updateWorkspace({ custom_status_labels: statusLabels }); setStatus({ type: 'success', message: 'Labels saved.' }) }
    catch { setStatus({ type: 'error', message: 'Could not save labels.' }) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <SectionTitle title="Workflow" description="Customise how requests move through your pipeline." />
      <div>
        <p className="text-[11px] font-semibold text-[#9EA89E] uppercase tracking-wider mb-1.5">Status labels</p>
        <p className="text-[12px] text-[#9EA89E] mb-4">Rename the default stages to match how your team works.</p>
        <div className="space-y-2.5">
          {STATUS_STAGES.map(({ key, label, dot }) => (
            <div key={key} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-[11px] text-[#9EA89E] w-20 flex-shrink-0 truncate">{label}</span>
              <Input value={statusLabels[key] || ''} onChange={v => setStatusLabels(p => ({ ...p, [key]: v }))} maxLength={50} placeholder={label} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
      <Divider />
      <div>
        <p className="text-[11px] font-semibold text-[#9EA89E] uppercase tracking-wider mb-1.5">Reply templates</p>
        <p className="text-[12px] text-[#9EA89E]">Save common responses to reuse in request conversations.</p>
        <p className="text-[12px] text-[#C5CAC5] mt-1 italic">Coming soon.</p>
      </div>
      <SectionFooter>
        <Toast type={status?.type} message={status?.message} />
        <Btn onClick={handleSave} loading={loading}>Save labels</Btn>
      </SectionFooter>
    </div>
  )
}

function DangerZoneSection({ workspaceName }) {
  const [showModal, setShowModal] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { logout } = useAuth()

  const handleOpenModal = (type) => { setShowModal(type); setConfirmText(''); setCountdown(3) }

  useEffect(() => {
    if (countdown <= 0 || !showModal) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, showModal])

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteAccount()
      await logout()
    } catch {
      setLoading(false)
    }
  }

  const DANGER_ITEMS = [
    {
      id: 'delete-workspace',
      title: 'Delete workspace',
      desc: `Permanently removes "${workspaceName || 'this workspace'}" for everyone. Every client loses access and all client data is removed. Your Groven account stays active — you can create a new workspace later.`,
      action: 'Delete workspace',
      confirmPhrase: 'delete workspace',
      variant: 'danger',
    },
  ]

  const activeItem = DANGER_ITEMS.find(i => i.id === showModal)
  const canConfirm = countdown === 0 && (!activeItem?.confirmPhrase || confirmText.toLowerCase() === activeItem?.confirmPhrase)

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={14} className="text-red-600" />
          <h3 className="text-[15px] font-semibold text-red-800">Danger zone</h3>
        </div>
        <p className="text-[12px] text-red-500 mb-5">These actions are permanent and cannot be reversed.</p>

        <div className="rounded-xl border border-red-200 overflow-hidden divide-y divide-red-100">
          {DANGER_ITEMS.map((item) => (
            <div key={item.id} className="px-4 py-3.5 flex items-start justify-between gap-4 bg-white">
              <div>
                <p className="text-[13px] font-medium text-[#141A14]">{item.title}</p>
                <p className="text-[12px] text-[#9EA89E] mt-0.5 max-w-xs">{item.desc}</p>
              </div>
              <Btn variant={item.variant} size="sm" onClick={() => handleOpenModal(item.id)} className="flex-shrink-0 mt-0.5">{item.action}</Btn>
            </div>
          ))}
        </div>
      </div>

      {showModal && activeItem && (
        <ConfirmModal title={activeItem.title} onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle size={13} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-red-800 leading-relaxed">{activeItem.desc}</p>
            </div>
            {activeItem.confirmPhrase && (
              <div>
                <Label>Type <span className="font-mono font-bold text-red-600 normal-case">{activeItem.confirmPhrase}</span> to confirm</Label>
                <Input value={confirmText} onChange={setConfirmText} placeholder={activeItem.confirmPhrase} className="border-red-200 focus:border-red-400 focus:ring-red-100" />
              </div>
            )}
            <div className="flex items-center gap-2.5 justify-end pt-1">
              <Btn variant="ghost" onClick={() => setShowModal(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={handleDelete} loading={loading} disabled={!canConfirm}>
                {countdown > 0 ? `Wait ${countdown}s…` : activeItem.action}
              </Btn>
            </div>
          </div>
        </ConfirmModal>
      )}
    </>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

function ProviderSettingsModalInner({ onClose }) {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('business-profile')
  const [ws, setWs] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const contentRef = useRef(null)

  useEffect(() => {
    getWorkspace().then(r => { setWs(r.data.data); setLogoPreview(r.data.data.logo_url) })
  }, [])

  // Scroll content top on section change
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [activeSection])

  // Trap body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleLogoSelect = async (file) => {
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    try {
      const res = await uploadLogo(file)
      setLogoPreview(res.data.data.logo_url)
      setWs(p => ({ ...p, logo_url: res.data.data.logo_url }))
    } catch { /* silent */ }
  }

  const SECTIONS = {
    'business-profile': <BusinessProfileSection ws={ws} setWs={setWs} logoPreview={logoPreview} handleLogoSelect={handleLogoSelect} />,
    'portal-branding':  <PortalBrandingSection ws={ws} setWs={setWs} />,
    'notifications':    <NotificationsSection />,
    'account-security': <AccountSecuritySection user={user} onClose={onClose} />,
    'plan-billing':     <PlanBillingSection ws={ws} />,
    'workflow':         <WorkflowSection ws={ws} />,
    'danger-zone':      <DangerZoneSection workspaceName={ws?.name} />,
  }

  const groups = [
    { key: 'workspace', label: 'Workspace' },
    { key: 'account',   label: 'Account'   },
    { key: 'danger',    label: null         },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] hidden sm:block" onClick={onClose} />

      {/* Modal shell */}
      <div
        className="relative flex bg-white w-full h-[100dvh] sm:w-[780px] sm:h-[620px] sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{
          animation: 'modalIn 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sidebar nav ── */}
        <aside className="hidden sm:flex flex-col w-[200px] flex-shrink-0 border-r border-[#F0F2F0] bg-[#FAFBFA] overflow-y-auto">
          <div className="px-4 pt-5 pb-3 border-b border-[#F0F2F0]">
            <p className="text-[13px] font-semibold text-[#141A14]">Settings</p>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {groups.map(({ key, label }) => {
              const items = NAV.filter(n => n.group === key)
              return (
                <div key={key} className={label ? 'mb-3' : 'mt-3 pt-3 border-t border-[#F0F2F0]'}>
                  {label && <p className="text-[9px] font-semibold text-[#B0BAB0] uppercase tracking-widest px-2 mb-1.5">{label}</p>}
                  {items.map(({ id, label: itemLabel, icon: Icon, danger }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveSection(id)}
                      className={`w-full text-left flex items-center gap-2.5 text-[13px] px-2.5 py-2 rounded-lg transition-colors ${
                        activeSection === id
                          ? danger ? 'bg-red-50 text-red-600 font-medium' : 'bg-[#EAF5EF] text-[#0F6E56] font-medium'
                          : danger ? 'text-red-500 hover:bg-red-50/60' : 'text-[#4A544A] hover:bg-[#F2F4F2] hover:text-[#141A14]'
                      }`}
                    >
                      <Icon size={14} className="flex-shrink-0" />
                      {itemLabel}
                    </button>
                  ))}
                </div>
              )
            })}
          </nav>
        </aside>

        {/* ── Content ── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Mobile section switcher + close */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F2F0] flex-shrink-0">
            <p className="text-[14px] font-semibold text-[#141A14]">
              Workspace settings
            </p>
            <button
              onClick={onClose}
              className="ml-auto flex items-center justify-center w-7 h-7 rounded-lg text-[#9EA89E] hover:text-[#4A544A] hover:bg-[#F2F4F2] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Mobile sub-navigation tabs (scrollable) */}
          <div className="sm:hidden flex items-center gap-1 overflow-x-auto no-scrollbar px-4 py-2 border-b border-[#F0F2F0] bg-[#FAFBFA] flex-shrink-0">
            {NAV.map(({ id, label, icon: Icon, danger }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`shrink-0 flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg transition-colors ${
                  activeSection === id
                    ? danger
                      ? 'bg-red-50 text-red-600 font-semibold'
                      : 'bg-[#EAF5EF] text-[#0F6E56] font-semibold'
                    : danger
                      ? 'text-red-500 hover:bg-red-50/60'
                      : 'text-[#4A544A] hover:bg-[#F2F4F2] hover:text-[#141A14]'
                }`}
              >
                <Icon size={13} className="flex-shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-5 pb-20 sm:pb-5">
            {SECTIONS[activeSection]}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  )
}

export default function ProviderSettingsModal({ open, onClose }) {
  if (!open) return null
  return createPortal(<ProviderSettingsModalInner onClose={onClose} />, document.body)
}