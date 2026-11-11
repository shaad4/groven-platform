const SILENCE = 0.0001
const CADENCE_MS = { incoming: 3400, outgoing: 4200 }

/**
 * A small, original call sound synthesizer. No audio is created until start/unlock.
 * Call unlock() directly in a user gesture; it never blocks call setup.
 * start('incoming' | 'outgoing') remembers its intent if autoplay is unavailable.
 * stop() ends ringing; dispose() also closes the private AudioContext. A later
 * explicit unlock/start recreates it, including after React StrictMode cleanup.
 */
export function createCallRingtone() {
  let context = null
  let output = null
  let cadenceTimer = null
  let mode = null
  let disposed = false
  const voices = new Set()

  function releaseVoice(voice) {
    clearTimeout(voice.cleanupTimer)
    voice.oscillator.onended = null
    voice.oscillator.disconnect()
    voice.envelope.disconnect()
    voices.delete(voice)
  }

  function clearCadence() {
    clearTimeout(cadenceTimer)
    cadenceTimer = null
  }

  function silenceVoices(fade = false) {
    const now = context?.currentTime ?? 0
    for (const voice of voices) {
      // A very short release avoids clicks. Future/suspended notes are removed now.
      const release = fade && context?.state === 'running' && voice.startAt <= now
      try {
        if (release) {
          voice.envelope.gain.cancelScheduledValues(now)
          voice.envelope.gain.setTargetAtTime(0, now, 0.006)
        }
        voice.oscillator.stop(release ? now + 0.025 : now)
      } catch { /* An already-ended oscillator needs only disconnection. */ }
      if (release) {
        clearTimeout(voice.cleanupTimer)
        voice.cleanupTimer = setTimeout(() => releaseVoice(voice), 45)
      } else {
        releaseVoice(voice)
      }
    }
  }

  function handleContextState() {
    if (disposed) return
    if (context?.state !== 'running') {
      clearCadence()
      silenceVoices()
      return
    }
    if (mode && cadenceTimer === null) playCycle()
  }

  function getContext() {
    if (disposed || typeof window === 'undefined') return null
    if (context?.state === 'closed') {
      context.removeEventListener('statechange', handleContextState)
      output?.disconnect()
      context = null
      output = null
    }
    if (context) return context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return null
    try {
      context = new AudioContextClass()
      output = context.createGain()
      output.gain.value = 0.38
      output.connect(context.destination)
      context.addEventListener('statechange', handleContextState)
      return context
    } catch {
      // Unsupported/denied audio should never prevent receiving or placing a call.
      try { context?.close().catch(() => {}) } catch { /* Context setup failed. */ }
      output?.disconnect()
      context = null
      output = null
      return null
    }
  }

  function tone(frequency, delay, duration, level, sustained = false) {
    let oscillator
    let envelope
    let voice
    try {
      const startAt = context.currentTime + 0.02 + delay
      oscillator = context.createOscillator()
      envelope = context.createGain()
      voice = { oscillator, envelope, startAt, cleanupTimer: null }
      voices.add(voice)
      oscillator.onended = () => releaseVoice(voice)
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, startAt)
      envelope.gain.setValueAtTime(SILENCE, startAt)
      envelope.gain.linearRampToValueAtTime(level, startAt + (sustained ? 0.04 : 0.025))
      if (sustained) envelope.gain.setValueAtTime(level, startAt + duration - 0.08)
      envelope.gain.exponentialRampToValueAtTime(SILENCE, startAt + duration)
      oscillator.connect(envelope)
      envelope.connect(output)
      oscillator.start(startAt)
      oscillator.stop(startAt + duration + 0.025)
    } catch {
      try { oscillator?.stop() } catch { /* The oscillator may not have started. */ }
      if (voice) releaseVoice(voice)
      else {
        oscillator?.disconnect()
        envelope?.disconnect()
      }
    }
  }

  function playCycle() {
    cadenceTimer = null
    if (disposed || !mode || context?.state !== 'running') return
    if (mode === 'incoming') {
      // Two rounded, rising chimes with quiet octave overtones.
      tone(622.25, 0, 0.62, 0.26)
      tone(1244.5, 0, 0.42, 0.025)
      tone(783.99, 0.23, 0.74, 0.24)
      tone(1567.98, 0.23, 0.5, 0.022)
    } else {
      // A softer, lower two-pulse ringback, followed by a generous quiet interval.
      for (const delay of [0, 0.65]) {
        tone(392, delay, 0.4, 0.13, true)
        tone(493.88, delay, 0.4, 0.055, true)
      }
    }
    // Only one cycle is scheduled ahead: throttled tabs never build a sound backlog.
    cadenceTimer = setTimeout(playCycle, CADENCE_MS[mode])
  }

  function unlock() {
    disposed = false
    const audioContext = getContext()
    if (!audioContext) return
    if (audioContext.state === 'running') {
      handleContextState()
      return
    }
    try {
      // Invoke resume synchronously inside the gesture, before any await (Safari).
      Promise.resolve(audioContext.resume()).then(() => {
        if (!disposed && context === audioContext) handleContextState()
      }).catch(() => {})
    } catch { /* A later explicit gesture can retry after autoplay/interruption. */ }
  }

  function start(type = 'incoming') {
    disposed = false
    const nextMode = type === 'outgoing' || type === 'ringback' ? 'outgoing' : 'incoming'
    if (mode !== nextMode) {
      clearCadence()
      silenceVoices(true)
      mode = nextMode
    }
    getContext()
    handleContextState()
  }

  function stop() {
    mode = null
    clearCadence()
    silenceVoices(true)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    mode = null
    clearCadence()
    silenceVoices()
    context?.removeEventListener('statechange', handleContextState)
    output?.disconnect()
    try { context?.close().catch(() => {}) } catch { /* Already closed. */ }
    output = null
    context = null
  }

  return { unlock, start, stop, dispose }
}
