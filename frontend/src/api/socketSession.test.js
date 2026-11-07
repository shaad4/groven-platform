jest.mock('./auth.api', () => ({ authApi: { refreshToken: jest.fn() } }))
import { authApi } from './auth.api'
import { recoverSocketSession } from './socketSession'

function makeStore() {
  const state = { auth: { accessToken: 'expired' } }
  return { state, getState: () => state, dispatch: jest.fn((action) => {
    state.auth.accessToken = action.type === 'auth/setAccessToken' ? action.payload : null
  }) }
}

test('simultaneous socket expiry shares one refresh and publishes one token', async () => {
  const store = makeStore()
  let resolve
  authApi.refreshToken.mockReturnValue(new Promise(r => { resolve = r }))
  const first = recoverSocketSession(store, 'expired')
  const second = recoverSocketSession(store, 'expired')
  resolve({ data: { access: 'renewed' } })
  await Promise.all([first, second])
  expect(authApi.refreshToken).toHaveBeenCalledTimes(1)
  expect(store.dispatch).toHaveBeenCalledTimes(1)
  expect(store.state.auth.accessToken).toBe('renewed')
})

test('a refresh completing after logout cannot restore the old session', async () => {
  const store = makeStore()
  let resolve
  authApi.refreshToken.mockReturnValue(new Promise(r => { resolve = r }))
  const pending = recoverSocketSession(store, 'expired')
  store.state.auth.accessToken = null
  resolve({ data: { access: 'renewed' } })
  await pending
  expect(store.dispatch).not.toHaveBeenCalled()
})

test('rejected refresh clears the session instead of retrying an expired token', async () => {
  const store = makeStore()
  authApi.refreshToken.mockRejectedValue({ response: { status: 401 } })
  await expect(recoverSocketSession(store, 'expired')).rejects.toEqual({ response: { status: 401 } })
  expect(store.state.auth.accessToken).toBeNull()
})
