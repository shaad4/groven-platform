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
  in_review:   { label: 'In Review',   bg: 'bg-amber-50',     text: 'text-amber-700' },
  in_progress: { label: 'In Progress', bg: 'bg-indigo-50',    text: 'text-indigo-700' },
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

function StatusPills({ from, to, accent, accentSoft, accentDark }) {
  const fromMeta = STATUS_META[from]
  const toMeta   = STATUS_META[to]
  if (!fromMeta || !toMeta) return null
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {fromMeta.isBrand
        ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: accentSoft, color: accentDark }}>{fromMeta.label}</span>
        : <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${fromMeta.bg} ${fromMeta.text}`}>{fromMeta.label}</span>
      }
      <span className="text-[10px] text-text-dim">→</span>
      {toMeta.isBrand
        ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: accentSoft, color: accentDark }}>{toMeta.label}</span>
        : <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${toMeta.bg} ${toMeta.text}`}>{toMeta.label}</span>
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
            style={isPrimary ? { color: accent } : {}}
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
            accent={accent}
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
  const dropdownRef = useRef(null)
  const navigate    = useNavigate()
  const { colors }  = useTenantBranding()
  const { accent, accentDark, accentSoft } = colors

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

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
    const dropW = 340
    const dropH = 480

    let left = rect.right + 12
    let top  = rect.top

    if (left + dropW > vpW - 12) left = rect.left - dropW - 12
    if (top + dropH > vpH - 12) top = vpH - dropH - 12
    if (top < 12) top = 12

    return { position: 'fixed', top, left, width: dropW, maxHeight: dropH }
  }, [isMobile])

  useEffect(() => {
    if (open) {
      setDropdownStyle(computePosition())
      loadNotifications()
    }
  }, [open, computePosition, loadNotifications])

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
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={isMobileNav
          ? 'relative flex flex-col items-center justify-center gap-1 min-w-[64px] rounded-xl px-1 py-2 transition-all duration-200'
          : 'relative flex items-center justify-center rounded-xl transition-all duration-200 h-9 w-9'
        }
        style={isMobileNav
          ? { color: open ? accent : undefined }
          : open
            ? { background: accentSoft, color: accent }
            : {}
        }
      >
        <div className="relative">
          <Bell size={isMobileNav ? 22 : 18} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className={`absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold border-2 border-white ${isMobileNav ? 'h-4 w-4' : 'h-4 w-4'}`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {isMobileNav && <span className="text-[9px] font-bold uppercase tracking-wide">Alerts</span>}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={`
            ${isMobile
              ? 'fixed inset-0 z-[300] bg-white flex flex-col animate-in slide-in-from-bottom-8 duration-300'
              : 'z-[300] rounded-2xl border border-border/60 bg-white/95 backdrop-blur-xl shadow-soft overflow-hidden flex flex-col animate-in fade-in slide-in-from-left-2 duration-200'}
          `}
          style={isMobile ? {} : dropdownStyle}
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-4 md:py-3.5 border-b border-border/50 shrink-0 bg-white/50 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2.5">
              <span className="text-base md:text-sm font-semibold text-text-main">Notifications</span>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-sm"
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
                  style={{ color: accent }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 md:h-7 md:w-7 items-center justify-center rounded-full md:rounded-lg hover:bg-surface text-text-dim hover:text-text-main transition-colors bg-surface md:bg-transparent"
              >
                <X size={16} />
              </button>
            </div>
          </div>

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
                  <Bell size={20} style={{ color: accent }} />
                </div>
                <p className="text-sm font-semibold text-text-main">All caught up</p>
                <p className="text-xs text-text-sub mt-1">No notifications yet.</p>
              </div>
            ) : (
              groupKeys.map(label => (
                <div key={label}>
                  <div className="px-4 py-2 bg-surface/80 md:bg-surface/50 border-b border-border/50 sticky top-0 z-10 backdrop-blur-sm">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-text-dim">
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
                      accentDark={accentDark}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* footer */}
          {notifications.length > 0 && (
            <div className="shrink-0 border-t border-border/50 px-4 py-4 md:py-3 bg-white md:bg-surface/50 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-3">
              <div className="flex items-center justify-center gap-2">
                <CheckCheck size={14} style={{ color: accent }} />
                <p className="text-sm md:text-xs font-medium text-text-sub">
                  {unreadCount > 0
                    ? <><span className="font-bold" style={{ color: accent }}>{unreadCount}</span> unread</>
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