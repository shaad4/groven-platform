import { useEffect, useRef, useState } from 'react'
import requestsApi from '../api/requests.api'
import { WebRTCCall } from '../utils/webRTCCall'

// Kept behind an adapter so call cleanup always stops audio synchronously.
function createRingtone() {
  let audio
  return {
    unlock() {},
    start(type) {
      this.stop()
      audio = new Audio(type === 'incoming' ? '/sounds/incoming-ring.mp3' : '/sounds/ringback.wav')
      audio.loop = true; audio.volume = 0.35
      audio.play().catch(() => {})
    },
    stop() { if (audio) { audio.pause(); audio.currentTime = 0; audio = null } },
    dispose() { this.stop() },
  }
}

export function useWebRTC({ sendSignal, requestId }) {
  const signalRef = useRef(sendSignal)
  signalRef.current = sendSignal
  const requestRef = useRef(requestId)
  requestRef.current = requestId
  const [state, setState] = useState(null)
  const controllerRef = useRef(null)
  if (!controllerRef.current) controllerRef.current = new WebRTCCall({
    sendSignal: payload => signalRef.current(payload),
    getIceServers: async () => {
      try {
        const { data } = await requestsApi.getCallConfig(requestRef.current)
        if (!Array.isArray(data.data?.ice_servers)) throw new Error('Invalid call configuration')
        return data.data.ice_servers
      } catch (error) {
        throw new Error([403, 404].includes(error.response?.status)
          ? 'This request is no longer available for a call.'
          : 'Calling is temporarily unavailable. Check your connection and try again shortly.')
      }
    },
    ringtone: createRingtone(),
    onChange: setState,
  })
  const call = controllerRef.current
  useEffect(() => {
    const onPageHide = () => call.leave()
    window.addEventListener('pagehide', onPageHide)
    return () => { window.removeEventListener('pagehide', onPageHide); call.dispose() }
  }, [call, requestId])
  return {
    ...(state || call.state),
    startCall: () => call.start(), acceptCall: () => call.accept(),
    declineCall: () => call.end(), hangUp: () => call.end(), dismissCall: () => call.end(false),
    handleSignal: message => call.handleSignal(message),
    toggleMute: () => call.toggleMute(), toggleCam: () => call.toggleCam(),
  }
}
