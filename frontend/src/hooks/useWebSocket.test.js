const mockEffects = []
const mockDispatch = jest.fn()
jest.mock('react', () => ({
  useEffect: (effect) => mockEffects.push(effect),
  useRef: (value) => ({ current: value }),
}))
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch, useStore: () => ({}) }))
jest.mock('../api/socketSession', () => ({ recoverSocketSession: jest.fn() }))
import { useWebSocket } from './useWebSocket'

test('old close events cannot reconnect after cleanup and a new connection', () => {
  jest.useFakeTimers()
  const sockets = []
  global.WebSocket = jest.fn(function () {
    this.close = jest.fn()
    sockets.push(this)
  })
  const ref = { current: null }
  useWebSocket('ws://first', jest.fn(), 'chat', ref)
  mockEffects.shift()()
  const stopFirst = mockEffects.shift()()
  const oldClose = sockets[0].onclose
  stopFirst()
  useWebSocket('ws://second', jest.fn(), 'chat', ref)
  mockEffects.shift()()
  const stopSecond = mockEffects.shift()()
  oldClose()
  jest.runOnlyPendingTimers()
  expect(sockets).toHaveLength(2)
  expect(ref.current).toBe(sockets[1])
  sockets[1].onclose()
  jest.advanceTimersByTime(1000)
  expect(sockets).toHaveLength(3)
  sockets[2].onclose({ code: 4003 })
  jest.runOnlyPendingTimers()
  expect(sockets).toHaveLength(3)
  stopSecond()
  expect(ref.current).toBeNull()
  jest.runOnlyPendingTimers()
  expect(sockets).toHaveLength(3)
  jest.useRealTimers()
  delete global.WebSocket
})

import { recoverSocketSession } from '../api/socketSession'

test('token expiry refreshes the session without reconnecting the expired URL', async () => {
  jest.useFakeTimers()
  recoverSocketSession.mockResolvedValue(undefined)
  let socket
  global.WebSocket = jest.fn(function () {
    this.close = jest.fn()
    socket = this
  })
  useWebSocket('ws://localhost/ws/chat/?token=expired', jest.fn(), 'chat')
  mockEffects.shift()()
  const stop = mockEffects.shift()()
  socket.onclose({ code: 4008 })
  await Promise.resolve()
  expect(recoverSocketSession).toHaveBeenCalledWith(expect.anything(), 'expired')
  jest.runOnlyPendingTimers()
  expect(global.WebSocket).toHaveBeenCalledTimes(1)
  stop()
  jest.useRealTimers()
  delete global.WebSocket
})
