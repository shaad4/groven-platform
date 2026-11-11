const INITIAL_STATE = {
  callState: 'idle', localStream: null, remoteStream: null,
  isMuted: false, isCamOff: false, remoteCameraOff: false,
  callError: '', mediaNotice: '', connectedAt: null,
}
const stopTracks = stream => stream?.getTracks().forEach(track => { track.onended = null; track.stop() })
const mediaMessage = error => {
  if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(error?.name)) return 'Camera or microphone access was denied. Allow access in your browser or iPhone website settings, then try again.'
  if (error?.name === 'NotFoundError') return 'No microphone was found. Connect a microphone and try again.'
  if (error?.name === 'NotReadableError') return 'Your camera or microphone is busy. Close other calls or camera apps and try again.'
  return error?.message || 'The call could not start. Check your camera, microphone, and connection, then try again.'
}

// Owns the call independently of React renders; async work is scoped to one session.
export class WebRTCCall {
  constructor({ sendSignal, getIceServers, ringtone, onChange, mediaDevices = globalThis.navigator?.mediaDevices,
    PeerConnection = globalThis.RTCPeerConnection, Stream = globalThis.MediaStream }) {
    Object.assign(this, { sendSignal, getIceServers, ringtone, onChange, mediaDevices, PeerConnection, Stream })
    this.state = { ...INITIAL_STATE }
    this.generation = 0
    this.pendingCandidates = []
    this.localCandidates = []
  }

  update(patch) { this.state = { ...this.state, ...patch }; this.onChange?.(this.state) }
  signal(payload) {
    try { return this.sendSignal({ ...payload, call_id: this.callId }) !== false }
    catch { return false }
  }
  clearTimers() {
    clearTimeout(this.setupTimer); clearTimeout(this.disconnectTimer)
    this.setupTimer = null; this.disconnectTimer = null
  }
  cleanup() {
    this.generation += 1
    this.clearTimers()
    this.ringtone.stop()
    const peer = this.peer
    this.peer = null
    if (peer) {
      peer.onicecandidate = null; peer.ontrack = null
      peer.onconnectionstatechange = null; peer.oniceconnectionstatechange = null
      peer.close()
    }
    stopTracks(this.state.localStream)
    stopTracks(this.state.remoteStream)
    this.offer = null; this.callId = null
    this.pendingCandidates = []; this.localCandidates = []
    this.descriptionSent = false
  }
  end(notify = true) {
    if (notify && this.callId) this.signal({ type: 'call_end' })
    this.cleanup()
    this.update({ ...INITIAL_STATE })
  }
  fail(message, notify = true) {
    if (notify && this.callId) this.signal({ type: 'call_end' })
    this.cleanup()
    this.update({ ...INITIAL_STATE, callState: 'error', callError: message })
  }
  leave() { this.end(!['incoming', 'idle', 'error'].includes(this.state.callState)) }
  dispose() { this.leave(); this.ringtone.dispose() }
  deadline(message, milliseconds = 60000) {
    clearTimeout(this.setupTimer)
    this.setupTimer = setTimeout(() => this.fail(message), milliseconds)
  }

  async acquire(generation) {
    if (!this.mediaDevices?.getUserMedia || !this.PeerConnection) throw new Error('Calling needs a supported browser and a secure HTTPS connection.')
    let stream, audioOnly = false
    try {
      stream = await this.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } } })
    } catch (error) {
      if (generation !== this.generation) return null
      // A denial is final for this attempt: do not immediately show another permission prompt.
      if (!['NotFoundError', 'OverconstrainedError', 'NotReadableError'].includes(error.name)) throw error
      stream = await this.mediaDevices.getUserMedia({ audio: { echoCancellation: true }, video: false })
      audioOnly = true
    }
    if (generation !== this.generation) { stopTracks(stream); return null }
    if (!stream.getAudioTracks().some(track => track.readyState === 'live')) { stopTracks(stream); throw new Error('A working microphone is required to join this call.') }
    const noCamera = !stream.getVideoTracks().some(track => track.readyState === 'live')
    this.update({ localStream: stream, isCamOff: noCamera, mediaNotice: audioOnly || noCamera ? 'Camera unavailable. Your microphone is connected for an audio call.' : '' })
    stream.getTracks().forEach(track => {
      track.onended = () => {
        if (generation !== this.generation) return
        if (track.kind === 'audio') this.fail('Your microphone disconnected. Reconnect it and start a new call.')
        else { this.update({ isCamOff: true, mediaNotice: 'Your camera stopped. Audio is still connected.' }); this.signal({ type: 'call_media', camera_off: true }) }
      }
    })
    return stream
  }

  async createPeer(generation, stream) {
    const iceServers = await this.getIceServers()
    if (generation !== this.generation) return null
    const peer = new this.PeerConnection({ iceServers })
    this.peer = peer
    const remote = new this.Stream()
    peer.ontrack = event => {
      if (generation !== this.generation) return
      // Safari may deliver a track without event.streams[0].
      const tracks = event.streams?.[0]?.getTracks() || [event.track]
      tracks.forEach(track => { if (!remote.getTracks().some(item => item.id === track.id)) remote.addTrack(track) })
      this.update({ remoteStream: remote })
    }
    peer.onicecandidate = event => {
      if (!event.candidate || generation !== this.generation) return
      const candidate = event.candidate.toJSON?.() || event.candidate
      if (this.descriptionSent) this.signal({ type: 'ice_candidate', candidate })
      else this.localCandidates.push(candidate)
    }
    const connectionChanged = () => {
      if (generation !== this.generation) return
      const state = peer.connectionState || peer.iceConnectionState
      if (state === 'connected' || state === 'completed') {
        this.clearTimers(); this.ringtone.stop()
        this.update({ callState: 'active', connectedAt: this.state.connectedAt || Date.now() })
      } else if (state === 'disconnected') {
        this.ringtone.stop(); this.update({ callState: 'reconnecting' })
        if (!this.disconnectTimer) this.disconnectTimer = setTimeout(() => this.fail('The connection was lost. Check your network and call again.'), 15000)
      } else if (state === 'failed') this.fail('The call could not connect on this network. Try another network or contact your workspace administrator.')
    }
    peer.onconnectionstatechange = connectionChanged
    peer.oniceconnectionstatechange = connectionChanged
    stream.getTracks().forEach(track => peer.addTrack(track, stream))
    // Audio-only callers can still receive the other participant’s camera.
    if (!stream.getVideoTracks().length) peer.addTransceiver('video', { direction: 'recvonly' })
    return peer
  }
  sendDescription(type, description) {
    if (!this.signal({ type, sdp: description, camera_off: this.state.isCamOff })) throw new Error('Chat is reconnecting. Wait for it to reconnect, then call again.')
    this.descriptionSent = true
    this.localCandidates.splice(0).forEach(candidate => this.signal({ type: 'ice_candidate', candidate }))
  }
  async flushCandidates(peer, generation) {
    const candidates = this.pendingCandidates.splice(0)
    for (const candidate of candidates) {
      if (generation !== this.generation) return
      try { await peer.addIceCandidate(candidate) } catch { /* Other usable candidates may still connect. */ }
    }
  }

  async start() {
    if (!['idle', 'error'].includes(this.state.callState)) return
    this.cleanup()
    this.callId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const generation = this.generation
    this.ringtone.unlock()
    this.update({ ...INITIAL_STATE, callState: 'acquiring' })
    this.deadline('Camera or microphone access timed out. Allow access, then try again.')
    try {
      // Called directly from the button gesture for iOS permission handling.
      const stream = await this.acquire(generation)
      if (!stream) return
      const peer = await this.createPeer(generation, stream)
      if (!peer) return
      const offer = await peer.createOffer()
      if (generation !== this.generation) return
      await peer.setLocalDescription(offer)
      if (generation !== this.generation) return
      this.sendDescription('call_offer', peer.localDescription)
      this.update({ callState: 'calling' }); this.ringtone.start('outgoing')
      this.deadline('No answer. You can try calling again.')
    } catch (error) { if (generation === this.generation) this.fail(mediaMessage(error)) }
  }
  async accept() {
    if (this.state.callState !== 'incoming' || !this.offer) return
    const generation = this.generation, offer = this.offer
    this.ringtone.unlock(); this.ringtone.stop()
    this.update({ callState: 'acquiring' })
    this.deadline('The call could not connect. Check camera and microphone access, then try again.')
    try {
      const stream = await this.acquire(generation)
      if (!stream) return
      const peer = await this.createPeer(generation, stream)
      if (!peer) return
      await peer.setRemoteDescription(offer)
      if (generation !== this.generation) return
      await this.flushCandidates(peer, generation)
      if (generation !== this.generation) return
      const answer = await peer.createAnswer()
      if (generation !== this.generation) return
      await peer.setLocalDescription(answer)
      if (generation !== this.generation) return
      this.sendDescription('call_answer', peer.localDescription)
      this.offer = null
      if (this.state.callState !== 'active') {
        this.update({ callState: 'connecting' })
        this.deadline('The call could not connect on this network. Try another network or contact your workspace administrator.', 30000)
      }
    } catch (error) { if (generation === this.generation) this.fail(mediaMessage(error)) }
  }
  async handleSignal(message) {
    if (message.same_user) {
      if (message.call_id === this.callId && ['incoming', 'acquiring'].includes(this.state.callState) && ['call_answer', 'call_end'].includes(message.type)) this.end(false)
      return
    }
    if (message.type === 'call_offer') {
      if (!message.sdp || message.sdp.type !== 'offer') return
      if (!['idle', 'error'].includes(this.state.callState)) {
        if (message.call_id !== this.callId) {
          try { this.sendSignal({ type: 'call_busy', call_id: message.call_id }) } catch { /* The active call remains intact. */ }
        }
        return
      }
      this.cleanup()
      this.callId = message.call_id || `legacy-${Date.now()}`
      this.offer = message.sdp
      this.update({ ...INITIAL_STATE, callState: 'incoming', remoteCameraOff: Boolean(message.camera_off) })
      this.ringtone.start('incoming')
      this.setupTimer = setTimeout(() => this.end(false), 60000)
      return
    }
    if (!this.callId || (message.call_id && message.call_id !== this.callId)) return
    const peer = this.peer, generation = this.generation
    try {
      if (message.type === 'call_answer' && peer && peer.signalingState === 'have-local-offer') {
        this.ringtone.stop()
        await peer.setRemoteDescription(message.sdp)
        if (generation !== this.generation) return
        this.update({ remoteCameraOff: Boolean(message.camera_off) })
        await this.flushCandidates(peer, generation)
        if (generation !== this.generation) return
        if (this.state.callState !== 'active') {
          this.update({ callState: 'connecting' })
          this.deadline('The call could not connect on this network. Try another network or contact your workspace administrator.', 30000)
        }
      } else if (message.type === 'ice_candidate' && message.candidate) {
        if (!peer?.remoteDescription) {
          if (this.pendingCandidates.length < 256) this.pendingCandidates.push(message.candidate)
        } else await peer.addIceCandidate(message.candidate)
      } else if (message.type === 'call_media') this.update({ remoteCameraOff: Boolean(message.camera_off) })
      else if (message.type === 'call_busy') this.fail('They are already in a call. Try again in a moment.', false)
      else if (message.type === 'call_end') this.end(false)
    } catch (error) {
      if (generation === this.generation && message.type !== 'ice_candidate') this.fail(mediaMessage(error))
    }
  }
  toggleMute() {
    const tracks = this.state.localStream?.getAudioTracks().filter(track => track.readyState === 'live') || []
    if (!tracks.length) return
    const muted = !this.state.isMuted
    tracks.forEach(track => { track.enabled = !muted }); this.update({ isMuted: muted })
  }
  toggleCam() {
    const tracks = this.state.localStream?.getVideoTracks().filter(track => track.readyState === 'live') || []
    if (!tracks.length) return
    const off = !this.state.isCamOff
    tracks.forEach(track => { track.enabled = !off }); this.update({ isCamOff: off })
    this.signal({ type: 'call_media', camera_off: off })
  }
}
