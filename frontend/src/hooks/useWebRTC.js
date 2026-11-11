import { useEffect, useRef, useState } from 'react'
import requestsApi from '../api/requests.api'
import { WebRTCCall } from '../utils/webRTCCall'

import { createCallRingtone } from '../utils/callRingtone'

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
          : 'Calling is temporarily unavailable. Check your connection and try again shortly.', { cause: error })
      }
    },
    ringtone: createCallRingtone(),
    onChange: setState,
  })
  const call = controllerRef.current
  useEffect(() => {
    const onPageHide = () => call.leave()
    const unlockAudio = () => call.ringtone.unlock()
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('pointerdown', unlockAudio, { passive: true })
    document.addEventListener('keydown', unlockAudio)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('pointerdown', unlockAudio)
      document.removeEventListener('keydown', unlockAudio)
      call.dispose()
    }
  }, [call, requestId])
  return {
    ...(state || call.state),
    startCall: () => call.start(), acceptCall: () => call.accept(),
    declineCall: () => call.end(), hangUp: () => call.end(), dismissCall: () => call.end(false),
    handleSignal: message => call.handleSignal(message),
    toggleMute: () => call.toggleMute(), toggleCam: () => call.toggleCam(),
  }
}
