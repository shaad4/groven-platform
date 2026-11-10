import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Bell,
  RefreshCw,
  MessageSquare,
  Package,
  X,
  CheckCheck,
  Paperclip,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react'
import { useBadges } from '../../hooks/useBadges'

//Helpers

function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function groupByDay(notifications) {
  const groups = {}
  const today     = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
 
  for (const n of notifications) {
    const d = new Date(n.created_at); d.setHours(0,0,0,0)
    let label
    if (d.getTime() === today.getTime())     label = 'TODAY'
    else if (d.getTime() === yesterday.getTime()) label = 'YESTERDAY'
    else label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' }).toUpperCase()
 
    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  }
  return groups
}

//Event Type config

const EVENT_CONFIG = {
  new_request:    { Icon: PlusCircle,   bg: 'bg-primary-light',  iconColor: 'text-primary-ink' },
  status_change:  { Icon: RefreshCw,    bg: 'bg-primary-light',  iconColor: 'text-primary-ink' },
  new_message:    { Icon: MessageSquare,bg: 'bg-primary-light',  iconColor: 'text-primary-ink' },
  files_delivered:{ Icon: Package,      bg: 'bg-status-progress-bg',  iconColor: 'text-status-progress-text' },
  invite_accepted:{ Icon: CheckCircle2, bg: 'bg-primary-light',  iconColor: 'text-primary-ink' },
}

const STATUS_META = {
  received:    { label: 'Submitted',   bg: 'bg-primary-light', text: 'text-primary-ink' },
  in_review:   { label: 'In Review',   bg: 'bg-status-review-bg', text: 'text-status-review-text' },
  in_progress: { label: 'In Progress', bg: 'bg-status-progress-bg', text: 'text-status-progress-text' },
  delivered:   { label: 'Delivered',   bg: 'bg-primary-light', text: 'text-primary-ink' },
  closed:      { label: 'Done',        bg: 'bg-surface', text: 'text-text-sub' },
}

//  status transition 
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
 
  
  const meta = notification.metadata
  if (meta?.from && meta?.to) return { from: meta.from, to: meta.to }
 
  return null
}

function StatusPills({ from, to }) {
  const fromMeta = STATUS_META[from]
  const toMeta   = STATUS_META[to]
  if (!fromMeta || !toMeta) return null
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${fromMeta.bg} ${fromMeta.text}`}>
        {fromMeta.label}
      </span>
      <span className="text-[11px] text-text-dim">→</span>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${toMeta.bg} ${toMeta.text}`}>
        {toMeta.label}
      </span>
    </div>
  )
}

// Notification item

function NotificationItem({ notification, onRead }) {
  const navigate = useNavigate()
  const cfg = EVENT_CONFIG[notification.event_type] || EVENT_CONFIG.new_request
  const { Icon, bg, iconColor } = cfg
  const transition = parseStatusTransition(notification)
 
  const handleClick = () => {
    if (!notification.is_read) onRead(notification.id)
    if (notification.related_request_id) {
      navigate(`/requests/${notification.related_request_id}`)
    }
  }
 
  // Extract snippet from body for message events
  const snippet =
    notification.event_type === 'new_message' && notification.body
      ? notification.body
      : null
 
  // File count for delivery events
  const fileCount =
    notification.event_type === 'files_delivered' && notification.metadata?.file_count
      ? notification.metadata.file_count
      : null
 
  return (
    <button
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface ${
        !notification.is_read ? 'bg-surface' : ''
      }`}
    >
      {/* icon bubble */}
      <div className="relative shrink-0 mt-0.5">
        <div className={`h-9 w-9 rounded-full ${bg} flex items-center justify-center`}>
          <Icon size={16} className={iconColor} />
        </div>
        {!notification.is_read && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-white" />
        )}
      </div>
 
      {/* content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-text-main leading-snug">
          {notification.title}
        </p>
        <p className="text-[11px] text-text-dim mt-0.5">
          {relativeTime(notification.created_at)}
        </p>
 
        {snippet && (
          <p className="text-[11px] text-text-sub italic mt-1 line-clamp-1">
            "{snippet}"
          </p>
        )}
 
        {fileCount && (
          <p className="flex items-center gap-1 text-[11px] text-text-dim mt-1">
            <Paperclip size={10} />
            {fileCount} file{fileCount !== 1 ? 's' : ''} delivered
          </p>
        )}
 
        {transition && (
          <StatusPills from={transition.from} to={transition.to} />
        )}
      </div>
    </button>
  )
}

// main bell component

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const dropdownRef     = useRef(null)
  const bellRef         = useRef(null)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  const {
    unreadCount,
    notifications,
    notifLoaded,
    markRead,
    markAllRead,
    loadNotifications,
  } = useBadges()

  // Track window resizing for mobile takeover
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // close on outside click
  useEffect(() => {
    function handler(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // refresh when dropdown opens
  useEffect(() => {
    if (open) loadNotifications()
  }, [open, loadNotifications])

  const grouped = groupByDay(notifications)
  const groupKeys = Object.keys(grouped)

  const renderContents = () => {
    return (
      <>
        {/* header */}
        <div className="flex items-center justify-between px-4 py-4 md:py-3.5 border-b border-border shrink-0 bg-layout-card">
          <div className="flex items-center gap-2">
            <span className="text-[16px] md:text-[15px] font-semibold text-text-main">Notifications</span>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[12px] font-semibold text-primary-ink hover:underline"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 md:h-7 md:w-7 items-center justify-center rounded-xl bg-layout-page md:bg-transparent hover:bg-surface md:hover:bg-surface transition-colors"
            >
              <X size={16} className="text-text-sub" />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="overflow-y-auto flex-1 bg-layout-card">
          {!notifLoaded ? (
            <div className="px-4 py-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-surface shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-surface rounded w-3/4" />
                    <div className="h-2.5 bg-surface rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center h-full min-h-[250px]">
              <div className="h-12 w-12 rounded-full bg-primary-light flex items-center justify-center mb-3">
                <Bell size={20} className="text-primary-ink" />
              </div>
              <p className="text-[13px] font-semibold text-text-main">You're all caught up</p>
              <p className="text-[12px] text-text-dim mt-1">No notifications yet.</p>
            </div>
          ) : (
            groupKeys.map((label) => (
              <div key={label}>
                <div className="px-4 py-2 bg-layout-page border-b border-border sticky top-0 z-10">
                  <span className="text-[11px] font-semibold tracking-wider text-text-dim">
                    {label}
                  </span>
                </div>
                <div className="divide-y divide-[#f1f3f1]">
                  {grouped[label].map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={(id) => {
                        markRead(id)
                        setOpen(false)
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* footer */}
        {notifications.length > 0 && (
          <div className="shrink-0 border-t border-border px-4 py-3 bg-surface pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {unreadCount > 0 ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <CheckCheck size={11} className="text-white" />
                </div>
                <p className="text-[12px] text-text-sub">
                  You have{' '}
                  <span className="font-semibold text-primary-ink">{unreadCount}</span>{' '}
                  unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <CheckCheck size={11} className="text-white" />
                </div>
                <p className="text-[12px] text-text-sub">All caught up</p>
              </div>
            )}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Bell button ── */}
      <button
        ref={bellRef}
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
          open
            ? 'border-primary/25 bg-primary-light'
            : 'border-border bg-layout-page hover:bg-surface'
        }`}
      >
        <Bell size={17} className={open ? 'text-primary-ink' : 'text-text-sub'} />

        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white border-2 border-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Desktop Dropdown ── */}
      {open && !isMobile && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-[200] w-[380px] rounded-2xl border border-border bg-layout-card shadow-xl shadow-black/[0.08] overflow-hidden flex flex-col"
          style={{ maxHeight: '520px' }}
        >
          {renderContents()}
        </div>
      )}

      {/* ── Mobile Page Takeover ── */}
      {open && isMobile && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[300] bg-layout-card flex flex-col animate-in slide-in-from-bottom-8 duration-300 pt-[max(0px,env(safe-area-inset-top))]">
          {renderContents()}
        </div>,
        document.body
      )}
    </div>
  )
}