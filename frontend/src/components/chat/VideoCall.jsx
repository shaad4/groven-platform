import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Headphones, Mic, MicOff, Phone, PhoneIncoming, PhoneOff, Play, Video, VideoOff } from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import './VideoCall.css'

const CALL_LABELS = {
  incoming: 'Incoming call',
  acquiring: 'Preparing your camera',
  calling: 'Calling',
  connecting: 'Connecting',
  active: 'Connected',
  reconnecting: 'Reconnecting',
  error: 'Call unavailable',
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?'
}

function messageText(value) {
  return typeof value === 'string' ? value : typeof value?.message === 'string' ? value.message : ''
}

// A track can change without a new MediaStream object, including camera toggles.
function useStreamStatus(stream) {
  const subscribe = useCallback(notify => {
    if (!stream) return () => {}
    let trackCleanups = []
    const watchTracks = () => {
      trackCleanups.forEach(cleanup => cleanup())
      trackCleanups = stream.getTracks().map(track => {
        const events = ['mute', 'unmute', 'ended']
        events.forEach(event => track.addEventListener(event, notify))
        return () => events.forEach(event => track.removeEventListener(event, notify))
      })
      notify()
    }
    watchTracks()
    stream.addEventListener('addtrack', watchTracks)
    stream.addEventListener('removetrack', watchTracks)
    stream.addEventListener('inactive', notify)
    // MediaStreamTrack.enabled has no change event.
    const interval = window.setInterval(notify, 500)
    return () => {
      window.clearInterval(interval)
      trackCleanups.forEach(cleanup => cleanup())
      stream.removeEventListener('addtrack', watchTracks)
      stream.removeEventListener('removetrack', watchTracks)
      stream.removeEventListener('inactive', notify)
    }
  }, [stream])
  const snapshot = useCallback(() => {
    const videos = stream?.getVideoTracks() || []
    const audio = stream?.getAudioTracks() || []
    const live = track => track.readyState !== 'ended' && track.enabled
    return [videos.length > 0, videos.some(live), videos.some(track => live(track) && !track.muted), audio.some(live), videos.some(track => track.readyState !== 'ended'), audio.some(track => track.readyState !== 'ended')].map(Number).join(':')
  }, [stream])
  const status = useSyncExternalStore(subscribe, snapshot, () => '0:0:0:0:0:0')
  const [hasVideo, videoEnabled, videoReceiving, hasAudio, hasLiveVideo, hasLiveAudio] = status.split(':').map(value => value === '1')
  return { hasVideo, videoEnabled, videoReceiving, hasAudio, hasLiveVideo, hasLiveAudio }
}

function MediaTile({ stream, name, local = false, cameraOff = false, muted = false, waitingLabel = 'Waiting for video', className = '' }) {
  const videoRef = useRef(null)
  const playRef = useRef(null)
  const [playback, setPlayback] = useState({ stream: null, playing: false, blocked: false })
  const media = useStreamStatus(stream)
  const current = playback.stream === stream ? playback : { playing: false, blocked: false }
  const showVideo = Boolean(stream && media.videoReceiving && !cameraOff && current.playing)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    const update = (playing, blocked = false) => {
      if (!cancelled) setPlayback(previous => previous.stream === stream && previous.playing === playing && previous.blocked === blocked ? previous : { stream, playing, blocked })
    }
    const play = () => {
      if (!stream || cancelled) return
      try {
        const promise = video.play()
        promise?.then(() => update(video.videoWidth > 0 && !video.paused)).catch(error => {
          if (error.name !== 'AbortError') update(false, true)
        })
      } catch {
        update(false, true)
      }
    }
    const onPlaying = () => update(video.videoWidth > 0 && !video.paused)
    const onPause = () => update(false)
    const onError = () => update(false, true)
    video.srcObject = stream || null
    video.muted = local
    video.addEventListener('loadedmetadata', play)
    video.addEventListener('canplay', play)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('loadeddata', onPlaying)
    video.addEventListener('pause', onPause)
    video.addEventListener('error', onError)
    stream?.addEventListener('addtrack', play)
    playRef.current = play
    play()
    return () => {
      cancelled = true
      playRef.current = null
      video.removeEventListener('loadedmetadata', play)
      video.removeEventListener('canplay', play)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('loadeddata', onPlaying)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('error', onError)
      stream?.removeEventListener('addtrack', play)
      video.pause()
      video.srcObject = null
    }
  }, [stream, local])

  useEffect(() => {
    if (media.videoReceiving) playRef.current?.()
  }, [media.videoReceiving])

  let fallbackLabel = waitingLabel
  if (cameraOff) fallbackLabel = 'Camera off'
  else if (stream && !media.hasVideo && media.hasAudio) fallbackLabel = 'Audio call'
  else if (stream && media.hasVideo && !media.videoEnabled) fallbackLabel = 'Camera unavailable'
  else if (stream && media.hasVideo && !media.videoReceiving) fallbackLabel = local ? 'Camera paused' : 'Waiting for camera'
  if (current.blocked) fallbackLabel = 'Playback paused'
  const audioOnly = cameraOff || !media.videoEnabled
  const FallbackIcon = audioOnly && media.hasAudio ? Headphones : VideoOff

  return (
    <section className={`video-call__tile ${local ? 'video-call__tile--local' : ''} ${className}`} aria-label={local ? 'Your camera preview' : `${name}'s call video`}>
      <video ref={videoRef} autoPlay playsInline muted={local} aria-hidden={!showVideo} aria-label={local ? 'Your camera' : `${name}'s camera`} className={`video-call__video ${showVideo ? 'video-call__video--visible' : ''}`} />
      {!showVideo && (
        <div className="video-call__placeholder">
          <div className="video-call__avatar" aria-hidden="true">{initials(name)}</div>
          {!local && <h2 className="video-call__participant">{name}</h2>}
          <p className="video-call__media-state"><FallbackIcon size={local ? 14 : 17} aria-hidden="true" /><span>{fallbackLabel}</span></p>
        </div>
      )}
      {current.blocked && stream && (
        <button type="button" onClick={() => playRef.current?.()} className="video-call__play" aria-label={local ? 'Play your camera preview' : 'Play call video and audio'}>
          <Play size={17} aria-hidden="true" />{local ? 'Play preview' : audioOnly ? 'Play call audio' : 'Tap to play'}
        </button>
      )}
      <div className="video-call__tile-label"><span>{local ? 'You' : name}</span>{muted && <MicOff size={14} aria-label="Microphone muted" />}</div>
    </section>
  )
}

function CallTimer({ connectedAt, running }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running || !connectedAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [running, connectedAt])
  const started = typeof connectedAt === 'number' ? connectedAt : Date.parse(connectedAt)
  if (!connectedAt || !Number.isFinite(started)) return null
  const seconds = Math.max(0, Math.floor((now - started) / 1000))
  const hours = Math.floor(seconds / 3600)
  const value = [hours || null, Math.floor(seconds / 60) % 60, seconds % 60].filter(part => part !== null).map(part => String(part).padStart(2, '0')).join(':')
  return <span className="video-call__timer" aria-label={`Call duration ${value}`}>{value}</span>
}

function CallControl({ label, children, onClick, kind = '', pressed, disabled = false }) {
  return <button type="button" aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick} className={`video-call__control ${kind ? `video-call__control--${kind}` : ''}`}><span className="video-call__control-icon">{children}</span><span>{label}</span></button>
}

export default function VideoCall({
  callState = 'idle', localStream, remoteStream, isMuted, isCamOff, clientName,
  onAccept, onDecline, onHangUp, onToggleMute, onToggleCam,
  callError, mediaNotice, connectedAt, remoteCameraOff = false, onDismiss, cameraPending = false,
}) {
  const titleId = useId()
  const isOpen = callState !== 'idle'
  const isIncoming = callState === 'incoming'
  const isError = callState === 'error'
  const localMedia = useStreamStatus(localStream)
  // Ending a live call always requires the explicit End call control.
  const dialogRef = useDialogFocus(isOpen, isError ? onDismiss || onHangUp : undefined)
  useEffect(() => {
    if (!isOpen) return
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current
      // Accepting a call replaces the incoming controls without closing the dialog.
      if (dialog && !dialog.contains(document.activeElement)) dialog.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [callState, isOpen, dialogRef])
  if (!isOpen || typeof document === 'undefined') return null
  const name = clientName?.trim() || 'Your contact'
  const notice = messageText(mediaNotice)
  const error = messageText(callError)
  const stateLabel = CALL_LABELS[callState] || 'Connecting'
  const waitingLabel = {
    acquiring: 'Allow camera and microphone access in your browser',
    calling: 'Waiting for an answer',
    connecting: 'Establishing the connection',
    active: 'Waiting for your contact’s media',
    reconnecting: 'Restoring your connection',
  }[callState] || 'Waiting for video'

  return createPortal(
    <div className={`video-call ${isIncoming ? 'video-call--incoming' : ''}`}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={isIncoming ? 'video-call__incoming' : 'video-call__session'}>
        {isIncoming ? (
          <>
            <p className="video-call__eyebrow"><PhoneIncoming size={17} aria-hidden="true" />Incoming video call</p>
            <div className="video-call__avatar video-call__avatar--incoming" aria-hidden="true">{initials(name)}</div>
            <h1 id={titleId} className="video-call__incoming-name">{name}</h1>
            <p className="video-call__incoming-copy">Join with your camera and microphone.</p>
            {notice && <p className="video-call__notice" role="status">{notice}</p>}
            <div className="video-call__incoming-actions">
              <CallControl label="Decline call" kind="decline" onClick={onDecline}><PhoneOff size={23} aria-hidden="true" /></CallControl>
              <CallControl label="Accept call" kind="accept" onClick={onAccept}><Phone size={23} aria-hidden="true" /></CallControl>
            </div>
          </>
        ) : (
          <>
            <header className="video-call__header">
              <div className="video-call__identity"><span className="video-call__header-icon"><Video size={21} aria-hidden="true" /></span><div><p className="video-call__eyebrow">Call</p><h1 id={titleId}>{name}</h1></div></div>
              <div className="video-call__status"><span role="status">{stateLabel}</span><CallTimer connectedAt={connectedAt} running={callState === 'active' || callState === 'reconnecting'} /></div>
            </header>
            {(notice || (error && !isError)) && <p className="video-call__notice" role="status"><AlertCircle size={17} aria-hidden="true" /><span>{error || notice}</span></p>}
            <div className="video-call__stage">
              {isError ? (
                <div className="video-call__error" role="alert"><span className="video-call__error-icon"><PhoneOff size={28} aria-hidden="true" /></span><h2>Couldn’t complete the call</h2><p>{error || 'The connection could not be established. Close this window and try again.'}</p></div>
              ) : (
                <>
                  <MediaTile stream={remoteStream} name={name} cameraOff={remoteCameraOff} waitingLabel={waitingLabel} />
                  {localStream && <MediaTile stream={localStream} name="You" local cameraOff={isCamOff} muted={isMuted} className="video-call__pip" />}
                  {callState === 'reconnecting' && <div className="video-call__connection-note" role="status">Connection interrupted. Trying to reconnect…</div>}
                </>
              )}
            </div>
            <footer className="video-call__footer">
              {isError ? <button type="button" onClick={onDismiss || onHangUp} className="video-call__dismiss">Close call</button> : (
                <div className="video-call__controls" aria-label="Call controls">
                  <CallControl label={isMuted ? 'Unmute' : 'Mute'} pressed={Boolean(isMuted)} kind={isMuted ? 'selected' : ''} onClick={onToggleMute} disabled={!localMedia.hasLiveAudio || !onToggleMute}>{isMuted ? <MicOff size={21} aria-hidden="true" /> : <Mic size={21} aria-hidden="true" />}</CallControl>
                  <CallControl label={callState === 'acquiring' || callState === 'calling' ? 'Cancel call' : 'End call'} kind="end" onClick={onHangUp}><PhoneOff size={23} aria-hidden="true" /></CallControl>
                  <CallControl label={cameraPending ? 'Starting camera…' : !localMedia.hasLiveVideo ? 'Retry camera' : isCamOff ? 'Start camera' : 'Stop camera'} pressed={Boolean(isCamOff)} kind={isCamOff ? 'selected' : ''} onClick={onToggleCam} disabled={!onToggleCam || cameraPending}>{isCamOff || !localMedia.hasLiveVideo ? <VideoOff size={21} aria-hidden="true" /> : <Video size={21} aria-hidden="true" />}</CallControl>
                </div>
              )}
            </footer>
          </>
        )}
      </div>
    </div>, document.body,
  )
}
