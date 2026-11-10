import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { setStatus, removeConnection } from '../features/ws/wsSlice'

const BASE_DELAY = 1000
const MAX_DELAY = 30000

export function useWebSocket(url, onMessage, key = 'default', socketRef = null) {
  const dispatch = useDispatch()
  const onMessageRef = useRef(onMessage)
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  useEffect(() => {
    // Each effect owns its socket and retry timer. Old close events cannot
    // restart a connection after a URL change or StrictMode cleanup.
    let disposed = false
    let socket = null
    let retryTimer = null
    let delay = BASE_DELAY

    function connect() {
      if (disposed || !url) return
      dispatch(setStatus({ key, status: 'reconnecting' }))
      const ws = new WebSocket(url)
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
      ws.onclose = () => {
        if (disposed) return
        dispatch(setStatus({ key, status: 'disconnected' }))
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
  }, [url, key, dispatch, socketRef])
}
