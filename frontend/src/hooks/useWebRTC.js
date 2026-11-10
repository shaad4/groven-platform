import { useEffect, useRef, useCallback, useState } from 'react'

const ICE_SERVERS = [{ urls: import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302' }]

export function useWebRTC({ sendSignal, currentUserId }) {
  const [callState, setCallState]       = useState('idle')
  const [remoteStream, setRemoteStream] = useState(null)
  const [localStream, setLocalStream]   = useState(null)
  const [isMuted, setIsMuted]           = useState(false)
  const [isCamOff, setIsCamOff]         = useState(false)

  const pc             = useRef(null)
  const incomingOffer  = useRef(null)


  //  Ringtone 
  const ringtoneRef = useRef(null)
  const startRingtone = useCallback((type = 'incoming') => {
    stopRingtone()
    const src = type === 'incoming'
      ? '/sounds/incoming-ring.mp3'
      : '/sounds/ringback.wav'

    const audio = new Audio(src)
    audio.loop = true
    audio.volume = 0.5
    audio.play().catch(() => {})
    ringtoneRef.current = audio
  }, [])

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause()
      ringtoneRef.current.currentTime = 0
      ringtoneRef.current = null
    }
  }, [])

  //  Peer connection 
  const createPC = useCallback(() => {
    const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    conn.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: 'ice_candidate', candidate: e.candidate })
    }

    conn.ontrack = (e) => setRemoteStream(e.streams[0])

    conn.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(conn.connectionState)) {
        hangUp()
      }
    }

    return conn
  }, [sendSignal])

  //  Get media 
  const getMedia = useCallback(async (audioOnly = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: !audioOnly,
        audio: true,
      })
      setLocalStream(stream)
      return stream
    } catch {
      // Try audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        })
        setLocalStream(stream)
        return stream
      } catch {
        // No media at all — still allow call to connect
        setLocalStream(null)
        return null
      }
    }
  }, [])

  //  Hang up 
  const hangUp = useCallback(() => {
    stopRingtone()
    sendSignal({ type: 'call_end' })
    localStream?.getTracks().forEach(t => t.stop())
    pc.current?.close()
    pc.current = null
    setLocalStream(null)
    setRemoteStream(null)
    setCallState('idle')
    incomingOffer.current = null
  }, [localStream, sendSignal, stopRingtone])

  //  Start call (caller) 
  const startCall = useCallback(async () => {
    console.log('1 startCall')
    
    setCallState('calling')
    startRingtone('ringback')
    pc.current = createPC()

    console.log('2 before getMedia')

    const stream = await getMedia()

    console.log('3 after getMedia', stream)

  
    if (stream) {
      stream.getTracks().forEach(t => pc.current.addTrack(t, stream))
    }

    console.log('4 before offer')

    const offer = await pc.current.createOffer()

    console.log('5 offer created')

    await pc.current.setLocalDescription(offer)

    console.log('6 sending offer')
    sendSignal({ type: 'call_offer', sdp: offer })
  }, [createPC, getMedia, sendSignal, startRingtone])

  //  Accept call (callee) 
  const acceptCall = useCallback(async () => {
    if (!incomingOffer.current) return
    stopRingtone()
    setCallState('active')
    pc.current = createPC()

    const stream = await getMedia()
    if (stream) {
      stream.getTracks().forEach(t => pc.current.addTrack(t, stream))
    }

    await pc.current.setRemoteDescription(new RTCSessionDescription(incomingOffer.current))
    const answer = await pc.current.createAnswer()
    await pc.current.setLocalDescription(answer)
    sendSignal({ type: 'call_answer', sdp: answer })
    incomingOffer.current = null
  }, [createPC, getMedia, sendSignal, stopRingtone])

  //  Decline 
  const declineCall = useCallback(() => {
    stopRingtone()
    sendSignal({ type: 'call_end' })
    incomingOffer.current = null
    setCallState('idle')
  }, [sendSignal, stopRingtone])

  //  Handle incoming signals 
  const handleSignal = useCallback(async (msg) => {
    if (msg.type === 'call_offer') {
      console.log('CALL OFFER RECEIVED')
      incomingOffer.current = msg.sdp
      setCallState('incoming')
      startRingtone()
    }

    if (msg.type === 'call_answer' && pc.current) {
      stopRingtone()
      await pc.current.setRemoteDescription(new RTCSessionDescription(msg.sdp))
      setCallState('active')
    }

    if (msg.type === 'ice_candidate' && pc.current) {
      try {
        await pc.current.addIceCandidate(new RTCIceCandidate(msg.candidate))
      } catch { /* silent */ }
    }

    if (msg.type === 'call_end') {
      stopRingtone()
      localStream?.getTracks().forEach(t => t.stop())
      pc.current?.close()
      pc.current = null
      setLocalStream(null)
      setRemoteStream(null)
      setCallState('idle')
    }
  }, [localStream, startRingtone, stopRingtone])

  // Mute / cam 
  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(p => !p)
  }, [localStream])

  const toggleCam = useCallback(() => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCamOff(p => !p)
  }, [localStream])

  // ── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopRingtone()
      localStream?.getTracks().forEach(t => t.stop())
      pc.current?.close()
    }
  }, [])

  return {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isCamOff,
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    handleSignal,
    toggleMute,
    toggleCam,
  }
}