import { createCallRingtone } from './callRingtone'

function audioParam() {
  return { value: 0, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn(), cancelScheduledValues: jest.fn(), setTargetAtTime: jest.fn() }
}

function audioHarness() {
  const contexts = []
  const AudioContext = jest.fn().mockImplementation(() => {
    const listeners = new Set()
    const context = {
      state: 'suspended', currentTime: 0, destination: {}, oscillators: [], nodes: [], listeners,
      createGain: jest.fn(() => {
        const node = { gain: audioParam(), connect: jest.fn(), disconnect: jest.fn() }
        context.nodes.push(node)
        return node
      }),
      createOscillator: jest.fn(() => {
        const node = { frequency: audioParam(), connect: jest.fn(), disconnect: jest.fn(), start: jest.fn(), stop: jest.fn(), onended: null }
        context.oscillators.push(node)
        context.nodes.push(node)
        return node
      }),
      addEventListener: jest.fn((event, listener) => { if (event === 'statechange') listeners.add(listener) }),
      removeEventListener: jest.fn((event, listener) => { if (event === 'statechange') listeners.delete(listener) }),
      resume: jest.fn(() => {
        context.state = 'running'
        listeners.forEach(listener => listener())
        return Promise.resolve()
      }),
      close: jest.fn(() => { context.state = 'closed'; return Promise.resolve() }),
    }
    contexts.push(context)
    return context
  })
  return { AudioContext, contexts }
}

describe('call ringtone lifecycle', () => {
  let harness
  let ringtone
  let originalWindow

  beforeEach(() => {
    jest.useFakeTimers()
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    harness = audioHarness()
    Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { AudioContext: harness.AudioContext } })
    ringtone = createCallRingtone()
  })

  afterEach(() => {
    ringtone.dispose()
    jest.clearAllTimers()
    jest.useRealTimers()
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else delete globalThis.window
  })

  test('does not resume autoplay-blocked audio until an explicit unlock', async () => {
    expect(harness.AudioContext).not.toHaveBeenCalled()
    ringtone.start('incoming')
    const context = harness.contexts[0]
    expect(context.resume).not.toHaveBeenCalled()
    expect(context.oscillators).toHaveLength(0)
    expect(jest.getTimerCount()).toBe(0)

    ringtone.unlock()
    await Promise.resolve()
    expect(context.resume).toHaveBeenCalledTimes(1)
    expect(context.oscillators.length).toBeGreaterThan(0)
    expect(jest.getTimerCount()).toBe(1)
  })

  test('stop cancels future notes and their repeating cadence', () => {
    ringtone.unlock()
    ringtone.start('incoming')
    const context = harness.contexts[0]
    const scheduledNotes = [...context.oscillators]
    expect(scheduledNotes.length).toBeGreaterThan(0)
    expect(scheduledNotes.some(note => note.start.mock.calls[0][0] > context.currentTime)).toBe(true)

    ringtone.stop()
    for (const note of scheduledNotes) {
      expect(note.stop).toHaveBeenLastCalledWith(context.currentTime)
      expect(note.disconnect).toHaveBeenCalled()
      expect(note.onended).toBeNull()
    }
    jest.advanceTimersByTime(10000)
    expect(context.oscillators).toHaveLength(scheduledNotes.length)
    expect(jest.getTimerCount()).toBe(0)
  })

  test('a pending resume cannot start ringing after the call has stopped', async () => {
    ringtone.start('incoming')
    const context = harness.contexts[0]
    let finishResume
    context.resume.mockImplementation(() => new Promise(resolve => {
      finishResume = () => {
        context.state = 'running'
        context.listeners.forEach(listener => listener())
        resolve()
      }
    }))
    ringtone.unlock()
    ringtone.stop()
    finishResume()
    await Promise.resolve()
    ringtone.unlock()
    jest.advanceTimersByTime(10000)
    expect(context.oscillators).toHaveLength(0)
    expect(jest.getTimerCount()).toBe(0)
  })

  test('dispose releases audio resources and permits a silent fresh unlock', async () => {
    // Also exercise the prefixed constructor used by older Safari.
    window.webkitAudioContext = window.AudioContext
    delete window.AudioContext
    ringtone.unlock()
    ringtone.start('outgoing')
    const firstContext = harness.contexts[0]
    expect(firstContext.oscillators.length).toBeGreaterThan(0)

    ringtone.dispose()
    ringtone.dispose()
    expect(firstContext.close).toHaveBeenCalledTimes(1)
    expect(firstContext.listeners.size).toBe(0)
    expect(firstContext.nodes.every(node => node.disconnect.mock.calls.length > 0)).toBe(true)
    expect(jest.getTimerCount()).toBe(0)

    ringtone.unlock()
    await Promise.resolve()
    const secondContext = harness.contexts[1]
    expect(harness.AudioContext).toHaveBeenCalledTimes(2)
    expect(secondContext.oscillators).toHaveLength(0)
    ringtone.start('incoming')
    expect(secondContext.oscillators.length).toBeGreaterThan(0)
    expect(firstContext.state).toBe('closed')
  })
})
