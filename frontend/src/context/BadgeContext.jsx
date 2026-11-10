import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'


import dashboardApi from '../api/dashboard.api'
import { useAuth } from './AuthContext'
import { selectAccessToken } from '../features/auth/authSlice'

import { useDispatch } from 'react-redux'
import { setStatus, removeConnection } from '../features/ws/wsSlice'

import { wsUrl } from '../utils/urls'

export const BadgeContext = createContext(null)

// ── tiny audio notify ──────────────────────────────────────────────────────────
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
    osc.onended = () => ctx.close()
  } catch {
    // AudioContext blocked — silently skip
  }
}

export function BadgeProvider({ children }) {
  const { user } = useAuth()
  const accessToken = useSelector(selectAccessToken)
  const dispatch = useDispatch()


  // ── sidebar badges (provider only) ────────────────────────────────────────
  const [badges, setBadges]   = useState({ clients: 0, requests: 0 })
  const [loading, setLoading] = useState(false)

  // ── bell (shared provider + client) ───────────────────────────────────────
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [notifications, setNotifications] = useState([])
  const [notifLoaded,   setNotifLoaded]   = useState(false)

  // ── listener registries ────────────────────────────────────────────────────
  // Provider: LiveFeed activity events
  const activityListenersRef = useRef([])
  // Client: real-time card updates (status_change, new_message, files_delivered)
  const portalListenersRef   = useRef([])

  // ── sidebar badges polling (provider only) ─────────────────────────────────
  const userId = user?.id
  const userRole = user?.role

  const loadBadges = useCallback(async () => {
    if (!userId || userRole === 'client') return
    try {
      setLoading(true)
      const res = await dashboardApi.getBadges()
      setBadges(res.data?.data || { clients: 0, requests: 0 })
    } catch (error) {
      console.log('failed to load badges:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, userRole])

  useEffect(() => {
    if (userRole === 'client') return
    const hostname = window.location.hostname
    const isSubdomain = hostname.split('.').length >= 3
    if (!isSubdomain) return  
    loadBadges()
    const interval = setInterval(loadBadges, 30_000)
    return () => clearInterval(interval)
}, [loadBadges, userRole])

  // ── notification helpers (shared) ─────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!userId) return
    try {
      const { default: notificationsApi } = await import('../api/notifications.api')
      const res = await notificationsApi.list()
      const data = Array.isArray(res.data) ? res.data : []
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.is_read).length)
      setNotifLoaded(true)
    } catch {
      setNotifLoaded(true)
    }
  }, [userId])

  const markRead = useCallback(async (id) => {
    try {
      const { default: notificationsApi } = await import('../api/notifications.api')
      await notificationsApi.markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch { /* non-critical */ }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      const { default: notificationsApi } = await import('../api/notifications.api')
      await notificationsApi.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch { /* non-critical */ }
  }, [])

  // ── single WS connection — ws/feed/ works for both roles ──────────────────
  const wsRef      = useRef(null)
  const retryRef   = useRef(null)
  const delayRef   = useRef(1000)
  const unmounted  = useRef(false)

  const connectFeed = useCallback(() => {
    if (unmounted.current || !accessToken || !userId) return

    const hostname = window.location.hostname
    const parts = hostname.split('.')

    const isSubdomain = parts.length >= 3 
    if (!isSubdomain) return

    const tenant = parts[0]

    const url = wsUrl(
      `/ws/feed/?token=${accessToken}&tenant=${tenant}`
    )

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (unmounted.current) return ws.close()
      delayRef.current = 1000
      dispatch(setStatus({ key: 'feed', status: 'connected' }))
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)

        // ── bell notifications (both roles) ───────────────────────────────
        if (msg.type === 'notification') {
          const newNotif = {
            id:                 msg.notification_id,
            event_type:         msg.event_type,
            title:              msg.title,
            body:               msg.body,
            related_request_id: msg.related_request_id,
            related_client_id:  msg.related_client_id,
            is_read:            false,
            created_at:         msg.created_at,
          }
          setNotifications((prev) => [newNotif, ...prev].slice(0, 50))
          setUnreadCount((c) => c + 1)
          playNotificationSound()
        }

        // ── provider: live feed activity ───────────────────────────────────
        if (msg.type === 'activity') {
          activityListenersRef.current.forEach((cb) => cb(msg))
        }

        // ── client: real-time card updates ────────────────────────────────
        // Backend sends these as notification events with event_type field.
        // Forward to portal listeners so ClientDashboard can update in place.
        if (msg.type === 'notification' && (
          msg.event_type === 'status_change' ||
          msg.event_type === 'new_message'   ||
          msg.event_type === 'files_delivered'
        )) {
          portalListenersRef.current.forEach((cb) => cb({
            type:       msg.event_type,
            request_id: msg.related_request_id,
            new_status: msg.event_type === 'files_delivered' ? 'delivered' : msg.new_status,     // backend should include this on status_change
            updated_at: msg.updated_at,
          }))
        }

      } catch { /* malformed frame */ }
    }

    ws.onclose = () => {
      if (unmounted.current) return
      dispatch(setStatus({ key: 'feed', status: 'disconnected' }))
      const delay = delayRef.current
      delayRef.current = Math.min(delay * 2, 30000)
      retryRef.current = setTimeout(connectFeed, delay)
    }

    ws.onerror = () => ws.close()
  }, [accessToken, userId, dispatch])

  useEffect(() => {
    unmounted.current = false
    const isSubdomain = window.location.hostname.split('.').length >= 3
    if (user && accessToken && isSubdomain) {
      connectFeed()
      loadNotifications()
    }
    return () => {
      unmounted.current = true
      clearTimeout(retryRef.current)
      wsRef.current?.close()
      dispatch(removeConnection('feed'))
    }
  }, [userId, accessToken, connectFeed, loadNotifications, dispatch])

  // ── listener registration ──────────────────────────────────────────────────
  const registerActivityListener = useCallback((cb) => {
    activityListenersRef.current.push(cb)
    return () => {
      activityListenersRef.current = activityListenersRef.current.filter((fn) => fn !== cb)
    }
  }, [])

  const registerPortalListener = useCallback((cb) => {
    portalListenersRef.current.push(cb)
    return () => {
      portalListenersRef.current = portalListenersRef.current.filter((fn) => fn !== cb)
    }
  }, [])

  const value = {
    // sidebar (provider)
    badges,
    loading,
    loadBadges,
    setBadges,
    // bell (shared)
    unreadCount,
    notifications,
    notifLoaded,
    markRead,
    markAllRead,
    loadNotifications,
    // provider live feed
    registerActivityListener,
    // client portal real-time
    registerPortalListener,
  }

  return (
    <BadgeContext.Provider value={value}>
      {children ?? <Outlet />}
    </BadgeContext.Provider>
  )
}