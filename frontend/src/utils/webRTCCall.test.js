import { WebRTCCall } from './webRTCCall'

class Stream {
  constructor(tracks = []) { this.tracks = tracks }
  getTracks() { return this.tracks }
  getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio') }
  getVideoTracks() { return this.tracks.filter(t => t.kind === 'video') }
  addTrack(track) { this.tracks.push(track) }
}
const track = kind => ({ kind, id: kind, enabled: true, readyState: 'live', stop: jest.fn(function () { this.readyState = 'ended' }) })
class Peer {
  static peers = []
  constructor() { Peer.peers.push(this); this.signalingState = 'stable'; this.connectionState = 'new'; this.added = [] }
  addTrack() {}
  addTransceiver() { return { sender: { replaceTrack: jest.fn(async () => {}) } } }
  async createOffer() { return { type: 'offer', sdp: 'offer' } }
  async createAnswer() { return { type: 'answer', sdp: 'answer' } }
  async setLocalDescription(value) { this.localDescription = value; this.signalingState = value.type === 'offer' ? 'have-local-offer' : 'stable' }
  async setRemoteDescription(value) { this.remoteDescription = value; this.signalingState = value.type === 'answer' ? 'stable' : 'have-remote-offer' }
  async addIceCandidate(candidate) { if (!this.remoteDescription) throw Error('Missing description'); this.added.push(candidate) }
  close() { this.closed = true; this.onconnectionstatechange?.() }
  connect() { this.connectionState = 'connected'; this.onconnectionstatechange() }
}
const offer = { type: 'call_offer', call_id: 'incoming-1', sdp: { type: 'offer', sdp: 'offer' } }
let calls
function setup(getUserMedia) {
  const stream = new Stream([track('audio'), track('video')])
  const mediaDevices = { getUserMedia: getUserMedia || jest.fn(async () => stream) }
  const sendSignal = jest.fn(() => true)
  const ringtone = { unlock: jest.fn(), start: jest.fn(), stop: jest.fn(), dispose: jest.fn() }
  const call = new WebRTCCall({ sendSignal, getIceServers: async () => [], ringtone, mediaDevices, PeerConnection: Peer, Stream, onChange: jest.fn() })
  calls.push(call)
  return { call, stream, mediaDevices, sendSignal, ringtone }
}
beforeEach(() => { calls = []; Peer.peers = []; jest.useFakeTimers() })
afterEach(() => { calls.forEach(call => call.dispose()); jest.useRealTimers() })

test('buffers ICE while an incoming call is ringing and flushes after remote description', async () => {
  const { call } = setup(); await call.handleSignal(offer)
  await call.handleSignal({ type: 'ice_candidate', call_id: offer.call_id, candidate: { candidate: 'early' } })
  expect(Peer.peers).toHaveLength(0)
  await call.accept()
  expect(Peer.peers[0].added).toEqual([{ candidate: 'early' }])
  expect(call.state.callState).toBe('connecting')
  Peer.peers[0].connect(); expect(call.state.callState).toBe('active')
})
test('caller queues ICE before answer and only becomes active after actual connection', async () => {
  const { call } = setup(); await call.start()
  await call.handleSignal({ type: 'ice_candidate', call_id: call.callId, candidate: { candidate: 'early-answer' } })
  await call.handleSignal({ type: 'call_answer', call_id: call.callId, sdp: { type: 'answer' } })
  expect(Peer.peers[0].added).toHaveLength(1); expect(call.state.callState).toBe('connecting')
  Peer.peers[0].connect(); expect(call.state.connectedAt).toBeTruthy()
})
test('cancelling permission acquisition stops the late stream and creates no peer', async () => {
  let resolve
  const { call, stream, sendSignal } = setup(jest.fn(() => new Promise(done => { resolve = done })))
  const start = call.start(); call.end(); resolve(stream); await start
  expect(Peer.peers).toHaveLength(0); expect(stream.getTracks().every(t => t.stop.mock.calls.length === 1)).toBe(true)
  expect(sendSignal.mock.calls.some(([m]) => m.type === 'call_offer')).toBe(false)
})
test('permission denial does not prompt for a second audio-only capture or create an empty call', async () => {
  const getUserMedia = jest.fn().mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
  const { call } = setup(getUserMedia); await call.start()
  expect(getUserMedia).toHaveBeenCalledTimes(1); expect(Peer.peers).toHaveLength(0)
  expect(call.state.callError).toMatch(/denied/); expect(call.state.callState).toBe('error')
})
test('missing camera falls back to audio and clearly reports the camera state', async () => {
  const audio = new Stream([track('audio')])
  const getUserMedia = jest.fn().mockRejectedValueOnce(Object.assign(new Error(), { name: 'NotFoundError' })).mockResolvedValueOnce(audio)
  const { call } = setup(getUserMedia); await call.start()
  expect(call.state.isCamOff).toBe(true); expect(call.state.mediaNotice).toMatch(/audio call/)
})
test('remote hangup stops current media without echoing another hangup', async () => {
  const { call, stream, sendSignal } = setup(); await call.start(); sendSignal.mockClear()
  await call.handleSignal({ type: 'call_end', call_id: call.callId })
  expect(sendSignal).not.toHaveBeenCalled(); expect(stream.getTracks().every(t => t.readyState === 'ended')).toBe(true)
  expect(Peer.peers[0].closed).toBe(true); expect(call.state.callState).toBe('idle')
})
test('brief network interruption can recover; sustained loss releases devices', async () => {
  const { call, stream } = setup(); await call.start(); const peer = Peer.peers[0]; peer.connect()
  peer.connectionState = 'disconnected'; peer.onconnectionstatechange(); expect(call.state.callState).toBe('reconnecting')
  jest.advanceTimersByTime(5000); peer.connect(); jest.advanceTimersByTime(15000); expect(call.state.callState).toBe('active')
  peer.connectionState = 'disconnected'; peer.onconnectionstatechange(); jest.advanceTimersByTime(15000)
  expect(call.state.callState).toBe('error'); expect(stream.getTracks().every(t => t.readyState === 'ended')).toBe(true)
})
test('stale call signals cannot terminate the current call and second offers return busy', async () => {
  const { call, sendSignal } = setup(); await call.start(); const current = call.callId
  await call.handleSignal({ type: 'call_end', call_id: 'old' }); expect(call.callId).toBe(current)
  await call.handleSignal(offer); expect(call.callId).toBe(current)
  expect(sendSignal).toHaveBeenCalledWith({ type: 'call_busy', call_id: offer.call_id })
})
test('streamless Safari track events create a remote media stream', async () => {
  const { call } = setup(); await call.start(); const video = track('video')
  Peer.peers[0].ontrack({ streams: [], track: video }); expect(call.state.remoteStream.getVideoTracks()).toEqual([video])
})
test('unanswered calls time out and closed signaling fails visibly', async () => {
  const { call, stream } = setup(); await call.start(); jest.advanceTimersByTime(60000)
  expect(call.state.callError).toMatch(/No answer/); expect(stream.getTracks().every(t => t.readyState === 'ended')).toBe(true)
  const offline = setup(); offline.sendSignal.mockReturnValue(false); await offline.call.start(); expect(offline.call.state.callError).toMatch(/reconnecting/)
})

 test('an unanswered sibling tab expires or closes silently', async () => {
  const { call, sendSignal } = setup(); await call.handleSignal(offer); jest.advanceTimersByTime(60000)
  expect(sendSignal).not.toHaveBeenCalled(); expect(call.state.callState).toBe('idle')
  await call.handleSignal(offer); call.leave(); expect(sendSignal).not.toHaveBeenCalled()
})
test('answering in another tab dismisses the duplicate incoming call without ending it', async () => {
  const { call, sendSignal } = setup(); await call.handleSignal(offer)
  await call.handleSignal({ type: 'call_answer', call_id: offer.call_id, same_user: true })
  expect(call.state.callState).toBe('idle'); expect(sendSignal).not.toHaveBeenCalled()
})

 test('camera recovery replaces the reserved sender without dropping audio', async () => {
  const audio = new Stream([track('audio')]), video = track('video')
  const capture = jest.fn().mockRejectedValueOnce(Object.assign(new Error(), { name: 'NotReadableError' }))
    .mockResolvedValueOnce(audio).mockResolvedValueOnce(new Stream([video]))
  const { call, sendSignal } = setup(capture)
  await call.start(); Peer.peers[0].connect()
  await call.toggleCam()
  expect(call.videoSender.replaceTrack).toHaveBeenCalledWith(video)
  expect(call.state.localStream.getAudioTracks()[0]).toBe(audio.getAudioTracks()[0])
  expect(call.state.mediaNotice).toBe('')
  expect(sendSignal).toHaveBeenCalledWith(expect.objectContaining({ type: 'call_media', camera_off: false }))
})
test('hangup during camera retry stops the late camera', async () => {
  const { call, mediaDevices } = setup(); await call.start()
  let resolve; mediaDevices.getUserMedia = jest.fn(() => new Promise(done => { resolve = done }))
  const retry = call.retryCamera(); call.end()
  const video = track('video'); resolve(new Stream([video])); await retry
  expect(video.stop).toHaveBeenCalled(); expect(call.state.callState).toBe('idle')
})
