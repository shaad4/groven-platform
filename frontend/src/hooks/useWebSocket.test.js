const mockEffects = []
const mockDispatch = jest.fn()
jest.mock('react', () => ({
  useEffect: (effect) => mockEffects.push(effect),
  useRef: (value) => ({ current: value }),
}))
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }))
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
  stopSecond()
  expect(ref.current).toBeNull()
  jest.runOnlyPendingTimers()
  expect(sockets).toHaveLength(3)
  jest.useRealTimers()
  delete global.WebSocket
})
