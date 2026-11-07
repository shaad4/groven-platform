import { useEffect, useRef } from 'react'
import { useDispatch, useStore } from 'react-redux'
import { recoverSocketSession } from '../api/socketSession'
import { setStatus, removeConnection } from '../features/ws/wsSlice'

const BASE_DELAY = 1000
const MAX_DELAY = 30000

export function useWebSocket(url, onMessage, key = 'default', socketRef = null, accessToken = null) {
  const dispatch = useDispatch()
  const store = useStore()
  const onMessageRef = useRef(onMessage)
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  useEffect(() => {
    // Each effect owns its socket and retry timer. Old close events cannot
    // restart a connection after a URL change or StrictMode cleanup.
    let disposed = false
    let socket = null
    let retryTimer = null
    let delay = BASE_DELAY

    async function refreshExpiredSession() {
      if (disposed) return
      try {
        await recoverSocketSession(store, accessToken)
      } catch (error) {
        if (!disposed && ![401, 403].includes(error.response?.status)) {
          retryTimer = setTimeout(refreshExpiredSession, delay)
          delay = Math.min(delay * 2, MAX_DELAY)
        }
      }
    }

    function connect() {
      if (disposed || !url) return
      // An offline connection may outlive its token before it can receive the
      // server's expiry close event. Refresh before reopening that stale URL.
      try {
        const token = accessToken
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (Number.isFinite(payload.exp) && payload.exp * 1000 <= Date.now()) {
          refreshExpiredSession()
          return
        }
      } catch { /* let the server validate missing or malformed tokens */ }
      dispatch(setStatus({ key, status: 'reconnecting' }))
      const protocols = ['groven.v1']
      if (accessToken) protocols.push(`groven.auth.${accessToken}`)
      const ws = new WebSocket(url, protocols)
      socket = ws
      if (socketRef) socketRef.current = ws
      ws.onopen = () => {
        if (disposed) return ws.close()
        delay = BASE_DELAY
        dispatch(setStatus({ key, status: 'connected' }))
      }
      ws.onmessage = (event) => {
        if (disposed) return
        try {
          onMessageRef.current?.(JSON.parse(event.data))
        } catch { /* ignore malformed frames */ }
      }
      ws.onclose = (event) => {
        if (disposed) return
        dispatch(setStatus({ key, status: 'disconnected' }))
        // Access revocation or a missing request cannot be fixed by retrying.
        if ([4001, 4003, 4004].includes(event?.code)) return
        if (event?.code === 4008) {
          refreshExpiredSession()
          return
        }
        retryTimer = setTimeout(connect, delay)
        delay = Math.min(delay * 2, MAX_DELAY)
      }
      ws.onerror = () => ws.close()
    }
    connect()
    return () => {
      disposed = true
      clearTimeout(retryTimer)
      socket?.close()
      if (socketRef?.current === socket) socketRef.current = null
      dispatch(removeConnection(key))
    }
  }, [url, key, dispatch, socketRef, store, accessToken])
}
