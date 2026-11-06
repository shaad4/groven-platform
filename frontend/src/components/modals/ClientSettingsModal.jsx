import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getProfile, updateProfile, changePassword, uploadAvatar,
  getNotifications, updateNotifications,
} from '../../api/settings.api'
import {
  User, Bell, Trash2, AlertTriangle, X, Eye, EyeOff, Check, Loader2, Camera, Info,
} from 'lucide-react'

import { deleteAccount } from '../../api/settings.api'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { useWalkthrough } from '../../context/WalkthroughContext'
import { RotateCcw } from 'lucide-react'

// Nav 

const NAV = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'danger-zone', label: 'Danger zone', icon: Trash2, danger: true },
]

// Primitives 

function Spinner({ size = 14 }) {
  return <Loader2 size={size} className="animate-spin" />
}

function Toggle({ checked, onChange, disabled }) {
  const { colors } = useTenantBranding()
  const { accent, accentSoft } = colors
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-[22px] w-10 flex-shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{
        backgroundColor: checked ? accent : '#D1D5D1',
      }}
      onFocus={e => {
        e.target.style.boxShadow = `0 0 0 2px ${accentSoft}`
      }}
      onBlur={e => {
        e.target.style.boxShadow = ''
      }}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Input({ value, onChange, placeholder, maxLength, readOnly, className = '' }) {
  const { colors } = useTenantBranding()
  const { accent, accentSoft } = colors
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      readOnly={readOnly}
      className={`w-full h-9 px-3 rounded-lg border text-[13px] transition-all focus:outline-none ${readOnly
          ? 'border-[#E8EAE8] bg-[#F7F8F7] text-[#9EA89E] cursor-not-allowed'
          : 'border-[#E0E4E0] bg-white text-[#141A14] placeholder:text-[#C5CAC5]'
        } ${className}`}
      onFocus={e => {
        if (!readOnly) {
          e.target.style.borderColor = accent
          e.target.style.boxShadow = `0 0 0 2px ${accentSoft}`
        }
      }}
      onBlur={e => {
        if (!readOnly) {
          e.target.style.borderColor = ''
          e.target.style.boxShadow = ''
        }
      }}
    />
  )
}

function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  const { colors } = useTenantBranding()
  const { accent, accentSoft } = colors
  return (
    <div>
      <label className="block text-[11px] font-medium text-[#6B756B] uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 px-3 pr-9 rounded-lg border border-[#E0E4E0] bg-white text-[13px] text-[#141A14] placeholder:text-[#C5CAC5] focus:outline-none transition-all"
          onFocus={e => {
            e.target.style.borderColor = accent
            e.target.style.boxShadow = `0 0 0 2px ${accentSoft}`
          }}
          onBlur={e => {
            e.target.style.borderColor = ''
            e.target.style.boxShadow = ''
          }}
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9EA89E] hover:text-[#4A544A] transition-colors">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <label className="block text-[11px] font-medium text-[#6B756B] uppercase tracking-wide mb-1.5">{children}</label>
}

function FormRow({ label, hint, children }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <p className="text-[11px] text-[#9EA89E] mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  )
}

function Toast({ type, message }) {
  const { colors } = useTenantBranding()
  const { accent, accentSoft, accentDark } = colors
  if (!message) return null
  return (
    <div
      className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg border"
      style={
        type === 'success'
          ? { backgroundColor: accentSoft, borderColor: `${accent}40`, color: accentDark }
          : { backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }
      }
    >
      {type === 'success' ? <Check size={12} /> : <X size={12} />}
      {message}
    </div>
  )
}

function Btn({ children, onClick, loading, variant = 'primary', size = 'md', disabled, className = '' }) {
  const { colors } = useTenantBranding()
  const { accent, accentDark } = colors
  const sizes = { sm: 'px-3 py-1.5 text-[12px]', md: 'px-3.5 py-2 text-[13px]' }

  const isDanger = className.includes('bg-red') || className.includes('text-red')
  const style = variant === 'primary' && !disabled && !loading && !isDanger
    ? { backgroundColor: accent }
    : {}

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${
        variant === 'primary'
          ? 'text-white shadow-sm'
          : variant === 'ghost'
            ? 'bg-transparent text-[#4A544A] hover:bg-[#F2F4F2] border border-[#E0E4E0]'
            : 'bg-transparent text-red-600 border border-red-200 hover:bg-red-50'
      } ${className}`}
      style={style}
      onMouseEnter={e => {
        if (variant === 'primary' && !disabled && !loading && !isDanger) {
          e.target.style.backgroundColor = accentDark
        }
      }}
      onMouseLeave={e => {
        if (variant === 'primary' && !disabled && !loading && !isDanger) {
          e.target.style.backgroundColor = accent
        }
      }}
    >
      {loading ? <Spinner size={13} /> : children}
    </button>
  )
}

function Divider() {
  return <div className="border-t border-[#F0F2F0] my-5" />
}

function SectionTitle({ title, description }) {
  return (
    <div className="mb-6">
      <h3 className="text-[15px] font-semibold text-[#141A14]">{title}</h3>
      {description && <p className="text-[12px] text-[#9EA89E] mt-0.5">{description}</p>}
    </div>
  )
}

function InfoBox({ children }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F7F8F7] border border-[#E8EAE8]">
      <Info size={13} className="text-[#9EA89E] mt-0.5 flex-shrink-0" />
      <p className="text-[12px] text-[#9EA89E] leading-relaxed">{children}</p>
    </div>
  )
}

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

//  Password Strength 

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  if (s <= 1) return { score: s, label: 'Weak', color: '#f87171' }
  if (s <= 3) return { score: s, label: 'Fair', color: '#fbbf24' }
  return { score: s, label: 'Strong', color: 'BRAND_ACCENT' }
}

//  Sections 

function ProfileSection({ user, tenant, onClose }) {
  const { colors } = useTenantBranding()
  const { accent, accentSoft, accentDark } = colors
  const [displayName, setDisplayName] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const { startWalkthrough } = useWalkthrough()
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileStatus, setProfileStatus] = useState(null)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwStatus, setPwStatus] = useState(null)
  const [hoveredAvatar, setHoveredAvatar] = useState(false)
  const avatarRef = useRef()

  useEffect(() => {
    getProfile().then(r => { setDisplayName(r.data.data.display_name); setAvatarPreview(r.data.data.avatar_url) })
  }, [])

  const initials = (displayName || user?.display_name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const strength = passwordStrength(newPw)
  const passwordsMatch = newPw && confirmPw && newPw === confirmPw

  const handleAvatarSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    try {
      const res = await uploadAvatar(file)
      setAvatarPreview(res.data.data.avatar_url)
    } catch { setProfileStatus({ type: 'error', message: 'Upload failed.' }) }
  }

  const handleSaveProfile = async () => {
    setProfileLoading(true); setProfileStatus(null)
    try { await updateProfile({ display_name: displayName }); setProfileStatus({ type: 'success', message: 'Profile saved.' }) }
    catch { setProfileStatus({ type: 'error', message: 'Could not save.' }) }
    finally { setProfileLoading(false) }
  }

  const handleChangePassword = async () => {
    setPwLoading(true); setPwStatus(null)
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw })
      setPwStatus({ type: 'success', message: 'Password updated.' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      const e = err?.response?.data?.errors || {}
      setPwStatus({ type: 'error', message: e.current_password?.[0] || e.new_password?.[0] || 'Could not update password.' })
    } finally { setPwLoading(false) }
  }

  return (
    <div>
      <SectionTitle title="Profile" description="Your name and photo visible to others." />

      {/* Avatar row */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative group flex-shrink-0">
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            className="w-14 h-14 rounded-full border-2 border-dashed overflow-hidden flex items-center justify-center bg-[#F2F4F2] transition-colors"
            style={{
              borderColor: hoveredAvatar ? accent : `${accent}40`,
            }}
            onMouseEnter={() => setHoveredAvatar(true)}
            onMouseLeave={() => setHoveredAvatar(false)}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-base font-semibold" style={{ color: accent }}>{initials}</span>
            }
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </div>
          </button>
          <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarSelect} />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[#141A14]">{user?.display_name || displayName}</p>
          <p className="text-[12px] text-[#9EA89E] mt-0.5">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4 mb-5">
        <FormRow label="Display name" hint="How your name appears on messages.">
          <div className="relative">
            <Input value={displayName} onChange={setDisplayName} maxLength={60} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#C5CAC5]">{displayName.length}/60</span>
          </div>
        </FormRow>
        <FormRow label="Email address">
          <Input value={user?.email || ''} readOnly />
          {/* <p className="text-[11px] text-[#9EA89E] mt-1.5">
            Contact <span className="font-medium" style={{ color: accent }}>{tenant?.name || 'your provider'}</span> to change your email.
          </p> */}
        </FormRow>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0F2F0]">
        <Toast type={profileStatus?.type} message={profileStatus?.message} />
        <Btn onClick={handleSaveProfile} loading={profileLoading}>Save profile</Btn>
      </div>

      {/* Password */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-[#141A14]">Change password</p>
            <p className="text-[11px] text-[#9EA89E] mt-0.5">Use a strong, unique password.</p>
          </div>
          <a href="/forgot-password" className="text-[12px] hover:underline" style={{ color: accent }}>Forgot password?</a>
        </div>

        <div className="space-y-3.5">
          <PasswordInput label="Current password" value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <PasswordInput label="New password" value={newPw} onChange={setNewPw} placeholder="••••••••" />
              {newPw && (
                <div className="mt-2">
                  <div className="h-1 rounded-full bg-[#EEF0EE] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(strength.score / 5) * 100}%`,
                        backgroundColor: strength.color === 'BRAND_ACCENT' ? accent : strength.color
                      }}
                    />
                  </div>
                  <p className="text-[11px] mt-1 font-medium" style={{ color: strength.score >= 4 ? accent : '#9EA89E' }}>{strength.label}</p>
                </div>
              )}
            </div>
            <div>
              <PasswordInput label="Confirm new password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" />
              {confirmPw && (
                <p className="text-[11px] mt-1.5 font-medium" style={{ color: passwordsMatch ? accent : '#ef4444' }}>
                  {passwordsMatch ? '✓ Match' : '✗ No match'}
                </p>
              )}
            </div>
          </div>
          <p className="text-[11px] text-[#9EA89E]">At least 8 characters with letters and numbers.</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[#F0F2F0]">
          <Toast type={pwStatus?.type} message={pwStatus?.message} />
          <Btn onClick={handleChangePassword} loading={pwLoading} disabled={!passwordsMatch || !currentPw}>Update password</Btn>
        </div>
      </div>

      {/* Replay Walkthrough */}
      <div className="mt-8 border-t border-[#F0F2F0] pt-6">
        <p className="text-[13px] font-semibold text-[#141A14] mb-1">Onboarding walkthrough</p>
        <p className="text-[11px] text-[#9EA89E] mb-3">Re-take the interactive tour to get familiar with your portal.</p>
        <Btn variant="ghost" size="sm" onClick={() => { startWalkthrough('client'); onClose(); }}>
          <RotateCcw size={14} className="mr-1" /> Replay Walkthrough
        </Btn>
      </div>
    </div>
  )
}

function NotificationsSection({ tenant }) {
  const [notifPrefs, setNotifPrefs] = useState(null)
  const [savingKey, setSavingKey] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { getNotifications().then(r => setNotifPrefs(r.data.data)) }, [])

  const handleToggle = async (section, key, value) => {
    const k = `${section}.${key}`
    setSavingKey(k)
    const prev = notifPrefs
    setNotifPrefs(p => ({ ...p, [section]: { ...p[section], [key]: value } }))
    try { await updateNotifications({ [section]: { [key]: value } }) }
    catch { setNotifPrefs(prev); setError('Could not save preference.') }
    finally { setSavingKey(null) }
  }

  const providerName = tenant?.name || 'your provider'

  const notifItems = [
    { key: 'status_change', label: 'Request status changes', desc: `Get notified when ${providerName} updates your request stage.` },
    { key: 'new_message', label: `New message from ${providerName}`, desc: `Get notified when ${providerName} sends a message on your request.` },
    { key: 'files_delivered', label: 'Files delivered', desc: `Get notified when ${providerName} delivers files or a link.` },
  ]

  if (!notifPrefs) return <div className="flex items-center justify-center h-48"><Spinner size={20} /></div>

  return (
    <div>
      <SectionTitle title="Notifications" description="Choose when you want to be notified by email." />

      <InfoBox>
        In-app notifications are always on — you'll see updates in the bell menu at all times.
      </InfoBox>

      <div className="mt-5">
        <p className="text-[11px] font-semibold text-[#9EA89E] uppercase tracking-wider mb-3.5">Email me when…</p>
        <div className="space-y-4">
          {notifItems.map(({ key, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] text-[#141A14]">{label}</p>
                <p className="text-[11px] text-[#9EA89E] mt-0.5">{desc}</p>
              </div>
              <Toggle
                checked={notifPrefs?.email?.[key] ?? false}
                onChange={(v) => handleToggle('email', key, v)}
                disabled={savingKey === `email.${key}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <InfoBox>
          Emails are sent from {providerName} via Groven. You can unsubscribe at any time from within any email.
        </InfoBox>
      </div>

      {error && <p className="text-[12px] text-red-600 mt-3">{error}</p>}
      <p className="text-[11px] text-[#9EA89E] mt-4">Changes are saved automatically.</p>
    </div>
  )
}

function DangerZoneSection({ tenant }) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { logout } = useAuth()

  const providerName = tenant?.name || 'this workspace'

  const handleOpenModal = () => { setShowModal(true); setCountdown(3) }

  useEffect(() => {
    if (countdown <= 0 || !showModal) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, showModal])

  const handleLeave = async () => {
    setLoading(true)
    try {
      await deleteAccount()
      await logout()
    } catch {
      setLoading(false)
    }
  }

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={14} className="text-red-600" />
          <h3 className="text-[15px] font-semibold text-red-800">Danger zone</h3>
        </div>
        <p className="text-[12px] text-red-500 mb-5">This action is permanent and cannot be reversed.</p>

        <div className="rounded-xl border border-red-200 overflow-hidden">
          <div className="px-4 py-3.5 flex items-start justify-between gap-4 bg-white">
            <div>
              <p className="text-[13px] font-medium text-[#141A14]">Leave workspace</p>
              <p className="text-[12px] text-[#9EA89E] mt-0.5 max-w-xs">
                Removes your access to {providerName}. Your Groven account stays active and you can still access any other workspaces you're a part of.
              </p>
            </div>
            <Btn variant="danger-ghost" size="sm" onClick={handleOpenModal} className="flex-shrink-0 mt-0.5">
              Leave workspace
            </Btn>
          </div>
        </div>
      </div>

      {showModal && (
        <ConfirmModal title="Leave workspace" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle size={13} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-red-800 leading-relaxed">
                You'll lose access to {providerName} and all requests, deliveries, and messages there. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2.5 justify-end pt-1">
              <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn
                variant="primary"
                onClick={handleLeave}
                loading={loading}
                disabled={countdown > 0}
                className="!bg-red-600 hover:!bg-red-700"
              >
                {countdown > 0 ? `Wait ${countdown}s…` : 'Leave workspace'}
              </Btn>
            </div>
          </div>
        </ConfirmModal>
      )}
    </>
  )
}

//  Main Modal 

function ClientSettingsModalInner({ onClose }) {
  const { user, tenant } = useAuth()
  const { colors } = useTenantBranding()
  const { accent, accentSoft } = colors
  const [activeSection, setActiveSection] = useState('profile')
  const contentRef = useRef(null)

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [activeSection])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const SECTIONS = {
    'profile': <ProfileSection user={user} tenant={tenant} onClose={onClose} />,
    'notifications': <NotificationsSection tenant={tenant} />,
    'danger-zone': <DangerZoneSection tenant={tenant} />,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] hidden sm:block" onClick={onClose} />

      {/* Modal shell */}
      <div
        className="relative flex bg-white w-full h-[100dvh] sm:w-[700px] sm:h-[580px] sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{
          animation: 'modalIn 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sidebar nav ── */}
        <aside className="hidden sm:flex flex-col w-[190px] flex-shrink-0 border-r border-[#F0F2F0] bg-[#FAFBFA] overflow-y-auto">
          <div className="px-4 pt-5 pb-3 border-b border-[#F0F2F0]">
            <p className="text-[13px] font-semibold text-[#141A14]">Account</p>
          </div>
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`w-full text-left flex items-center gap-2.5 text-[13px] px-2.5 py-2 rounded-lg transition-colors ${
                  activeSection === id
                    ? id === 'danger-zone'
                      ? 'bg-red-50 text-red-600 font-medium'
                      : 'font-medium'
                    : id === 'danger-zone'
                      ? 'text-red-500 hover:bg-red-50/60'
                      : 'text-[#4A544A] hover:bg-[#F2F4F2] hover:text-[#141A14]'
                }`}
                style={
                  activeSection === id && id !== 'danger-zone'
                    ? { backgroundColor: accentSoft, color: accent }
                    : {}
                }
              >
                <Icon size={14} className="flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F2F0] flex-shrink-0">
            <p className="text-[14px] font-semibold text-[#141A14]">
              Account settings
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
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`shrink-0 flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg transition-colors ${
                  activeSection === id
                    ? id === 'danger-zone'
                      ? 'bg-red-50 text-red-600 font-semibold'
                      : 'font-semibold'
                    : id === 'danger-zone'
                      ? 'text-red-500 hover:bg-red-50/60'
                      : 'text-[#4A544A] hover:bg-[#F2F4F2] hover:text-[#141A14]'
                }`}
                style={
                  activeSection === id && id !== 'danger-zone'
                    ? { backgroundColor: accentSoft, color: accent }
                    : {}
                }
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

export default function ClientSettingsModal({ open, onClose }) {
  if (!open) return null
  return createPortal(<ClientSettingsModalInner onClose={onClose} />, document.body)
}