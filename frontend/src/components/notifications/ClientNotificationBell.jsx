import DeviceNotifications from './DeviceNotifications'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Bell,
  X,
  CheckCheck,
  RefreshCw,
  MessageSquare,
  Package,
  CheckCircle2,
  PlusCircle,
  Paperclip,
} from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { useBadges } from '../../hooks/useBadges'
import { useTenantBranding } from '../../context/TenantBrandingContext'

// ── helpers ───────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function groupByDay(notifications) {
  const groups = {}
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)

  for (const n of notifications) {
    const d = new Date(n.created_at); d.setHours(0, 0, 0, 0)
    let label
    if (d.getTime() === today.getTime())          label = 'TODAY'
    else if (d.getTime() === yesterday.getTime()) label = 'YESTERDAY'
    else label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' }).toUpperCase()

    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  }
  return groups
}

const EVENT_ICON = {
  new_request:     PlusCircle,
  status_change:   RefreshCw,
  new_message:     MessageSquare,
  files_delivered: Package,
  invite_accepted: CheckCircle2,
}

const STATUS_META = {
  received:    { label: 'Submitted',   bg: 'bg-surface',      text: 'text-text-sub' },
  in_review:   { label: 'In Review',   bg: 'bg-status-review-bg',     text: 'text-status-review-text' },
  in_progress: { label: 'In Progress', bg: 'bg-status-progress-bg',    text: 'text-status-progress-text' },
  delivered:   { label: 'Ready',       isBrand: true },
  closed:      { label: 'Done',        bg: 'bg-surface',      text: 'text-text-sub' },
}

function parseStatusTransition(notification) {
  if (notification.event_type !== 'status_change') return null
  const match = notification.body?.match(/(\w[\w ]+)\s*→\s*(\w[\w ]+)/)
  if (match) {
    const fromKey = Object.entries(STATUS_META).find(([, v]) =>
      v.label.toLowerCase() === match[1].trim().toLowerCase()
    )?.[0]
    const toKey = Object.entries(STATUS_META).find(([, v]) =>
      v.label.toLowerCase() === match[2].trim().toLowerCase()
    )?.[0]
    if (fromKey && toKey) return { from: fromKey, to: toKey }
  }
  return null
}

function StatusPills({ from, to, accentSoft }) {
  const fromMeta = STATUS_META[from]
  const toMeta   = STATUS_META[to]
  if (!fromMeta || !toMeta) return null
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {fromMeta.isBrand
        ? <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: accentSoft, color: 'var(--primary-text)' }}>{fromMeta.label}</span>
        : <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${fromMeta.bg} ${fromMeta.text}`}>{fromMeta.label}</span>
      }
      <span className="text-[11px] text-text-dim">→</span>
      {toMeta.isBrand
        ? <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: accentSoft, color: 'var(--primary-text)' }}>{toMeta.label}</span>
        : <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${toMeta.bg} ${toMeta.text}`}>{toMeta.label}</span>
      }
    </div>
  )
}

// ── notification item ─────────────────────────────────────────

function NotificationItem({ notification, onRead, accent, accentSoft }) {
  const navigate   = useNavigate()
  const Icon       = EVENT_ICON[notification.event_type] || RefreshCw
  const isPrimary  = ['new_request', 'status_change', 'invite_accepted'].includes(notification.event_type)
  const isMessage  = notification.event_type === 'new_message'
  const isDelivery = notification.event_type === 'files_delivered'
  const transition = parseStatusTransition(notification)

  const snippet   = isMessage ? notification.body : null
  const fileCount = isDelivery && notification.metadata?.file_count ? notification.metadata.file_count : null

  const handleClick = () => {
    if (!notification.is_read) onRead(notification.id)
    if (notification.related_request_id) {
      navigate(`/my-requests/${notification.related_request_id}`)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left flex items-start gap-3 px-4 py-3.5 transition-all duration-200 border-b border-border/40 last:border-none hover:bg-surface/80"
      style={!notification.is_read ? { background: `${accentSoft}` } : {}}
    >
      <div className="relative shrink-0 mt-0.5">
        <div
          className={`h-8 w-8 rounded-xl flex items-center justify-center shadow-sm ${
            isMessage  ? 'bg-purple-50 border border-purple-100' :
            isDelivery ? 'bg-amber-50 border border-amber-100' :
            'border'
          }`}
          style={isPrimary ? { background: accentSoft, borderColor: `${accent}30` } : {}}
        >
          <Icon
            size={14}
            className={isMessage ? 'text-purple-600' : isDelivery ? 'text-amber-600' : ''}
            style={isPrimary ? { color: 'var(--primary-text)' } : {}}
          />
        </div>
        {!notification.is_read && (
          <span
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm"
            style={{ background: accent }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-text-main leading-snug font-medium">
          {notification.title}
        </p>
        <p className="text-[11px] text-text-dim mt-0.5">
          {relativeTime(notification.created_at)}
        </p>
        {snippet && (
          <p className="text-[12px] text-text-sub mt-1.5 line-clamp-2 leading-relaxed">
            "{snippet}"
          </p>
        )}
        {fileCount && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-surface border border-border/50 text-[11px] text-text-sub font-medium">
            <Paperclip size={10} className="text-text-dim" />
            {fileCount} file{fileCount !== 1 ? 's' : ''} delivered
          </div>
        )}
        {transition && (
          <StatusPills
            from={transition.from}
            to={transition.to}
            accentSoft={accentSoft}
          />
        )}
      </div>
    </button>
  )
}

// ── main bell ─────────────────────────────────────────────────

export default function ClientNotificationBell({ collapsed = false, isMobileNav = false }) {
  const [open, setOpen]   = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const bellRef     = useRef(null)
  const dropdownRef = useDialogFocus(open, () => setOpen(false))
  const { colors }  = useTenantBranding()
  const { accent, accentSoft } = colors

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)

  const {
    unreadCount,
    notifications,
    notifLoaded,
    markRead,
    markAllRead,
    loadNotifications,
  } = useBadges()

  const computePosition = useCallback(() => {
    if (isMobile) return {}
    if (!bellRef.current) return {}
    const rect = bellRef.current.getBoundingClientRect()
    const vpW  = window.innerWidth
    const vpH  = window.innerHeight
    const dropW = Math.min(340, vpW - 24)
    const dropH = Math.min(480, vpH - 24)

    let left = rect.right + 12
    let top  = rect.top

    if (left + dropW > vpW - 12) left = rect.left - dropW - 12
    if (top + dropH > vpH - 12) top = vpH - dropH - 12
    if (top < 12) top = 12

    left = Math.max(12, Math.min(left, vpW - dropW - 12))
    return { position: 'fixed', top, left, width: dropW, maxHeight: dropH }
  }, [isMobile])

  useEffect(() => {
    if (open) {
      setDropdownStyle(computePosition())
      loadNotifications()
    }
  }, [open, computePosition, loadNotifications])

  useEffect(() => {
    const reposition = () => {
      setIsMobile(window.innerWidth < 1024)
      if (open) setDropdownStyle(computePosition())
    }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, computePosition])

  useEffect(() => {
    function handler(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        bellRef.current    && !bellRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const grouped   = groupByDay(notifications)
  const groupKeys = Object.keys(grouped)

  return (
    <>
      <button
        ref={bellRef}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={isMobileNav
          ? 'relative flex flex-col items-center justify-center gap-1 min-w-[64px] rounded-xl px-1 py-2 transition-all duration-200'
          : `relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-text-sub transition-colors hover:bg-surface ${collapsed ? 'w-11 justify-center' : 'w-full'}`
        }
        style={isMobileNav
          ? { color: open ? accent : undefined }
          : open
            ? { background: accentSoft, color: 'var(--primary-text)' }
            : {}
        }
      >
        <div className="relative">
          <Bell size={isMobileNav ? 22 : 18} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className={`absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold border-2 border-white ${isMobileNav ? 'h-4 w-4' : 'h-4 w-4'}`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {!isMobileNav && !collapsed && <span>Notifications</span>}
        {isMobileNav && <span className="text-xs font-medium">Alerts</span>}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          tabIndex={-1}
          className={`
            ${isMobile
              ? 'fixed inset-0 z-[300] bg-layout-card flex flex-col animate-in slide-in-from-bottom-8 duration-300'
              : 'z-[300] rounded-2xl border border-border/60 bg-layout-card/95 backdrop-blur-xl shadow-soft overflow-hidden flex flex-col animate-in fade-in slide-in-from-left-2 duration-200'}
          `}
          style={isMobile ? {} : dropdownStyle}
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-4 md:py-3.5 border-b border-border/50 shrink-0 bg-layout-card/50 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2.5">
              <span className="text-base md:text-sm font-semibold text-text-main">Notifications</span>
              {unreadCount > 0 && (
                <span
                  className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full shadow-sm"
                  style={{ background: accent }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--primary-text)' }}
                >
                  Mark all read
                </button>
              )}
              <button
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full md:rounded-lg hover:bg-surface text-text-dim hover:text-text-main transition-colors bg-surface md:bg-transparent"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <DeviceNotifications />
          {/* body */}
          <div className="overflow-y-auto flex-1 bg-layout-page md:bg-transparent">
            {!notifLoaded ? (
              <div className="px-4 py-5 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded-xl bg-surface shrink-0" />
                    <div className="flex-1 space-y-2.5 pt-1">
                      <div className="h-3 bg-surface rounded w-3/4" />
                      <div className="h-2 bg-surface rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[250px] px-6 text-center">
                <div
                  className="h-12 w-12 rounded-2xl border border-border/50 flex items-center justify-center mb-4 shadow-sm"
                  style={{ background: accentSoft }}
                >
                  <Bell size={20} style={{ color: 'var(--primary-text)' }} />
                </div>
                <p className="text-sm font-semibold text-text-main">All caught up</p>
                <p className="text-xs text-text-sub mt-1">No notifications yet.</p>
              </div>
            ) : (
              groupKeys.map(label => (
                <div key={label}>
                  <div className="px-4 py-2 bg-surface/80 md:bg-surface/50 border-b border-border/50 sticky top-0 z-10 backdrop-blur-sm">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-text-dim">
                      {label}
                    </span>
                  </div>
                  {grouped[label].map(n => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={(id) => { markRead(id); setOpen(false) }}
                      accent={accent}
                      accentSoft={accentSoft}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* footer */}
          {notifications.length > 0 && (
            <div className="shrink-0 border-t border-border/50 px-4 py-4 md:py-3 bg-layout-card md:bg-surface/50 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-3">
              <div className="flex items-center justify-center gap-2">
                <CheckCheck size={14} style={{ color: 'var(--primary-text)' }} />
                <p className="text-sm md:text-xs font-medium text-text-sub">
                  {unreadCount > 0
                    ? <><span className="font-bold" style={{ color: 'var(--primary-text)' }}>{unreadCount}</span> unread</>
                    : 'All caught up'
                  }
                </p>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}