import { authApi } from './auth.api'
import { clearAuth, setAccessToken } from '../features/auth/authSlice'

let pending = null
let pendingToken = null

export async function recoverSocketSession(store, expiredToken) {
  if (!expiredToken || store.getState().auth.accessToken !== expiredToken) return
  if (!pending || pendingToken !== expiredToken) {
    pendingToken = expiredToken
    const request = authApi.refreshToken()
    pending = request
    request.finally(() => {
      if (pending === request) pending = null
    }).catch(() => {})
  }
  try {
    const { data } = await pending
    if (!data?.access) throw new Error('Refresh response did not contain an access token')
    // Never resurrect a signed-out session or overwrite a newer HTTP refresh.
    if (store.getState().auth.accessToken === expiredToken) {
      store.dispatch(setAccessToken(data.access))
    }
  } catch (error) {
    if ([401, 403].includes(error.response?.status) && store.getState().auth.accessToken === expiredToken) {
      store.dispatch(clearAuth())
    }
    throw error
  }
}
