import { selectAccessToken } from '../../features/auth/authSlice'
import { getSubdomain } from '../../utils/domain'

export const authRequestInterceptor = (_store, config) => {
  if (!_store) return config

  const state = _store.getState()

  const token = selectAccessToken(state)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const subdomain = getSubdomain()
  if (subdomain) {
    config.headers['X-Tenant-Slug'] = subdomain
  }

  return config
}