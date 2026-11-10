import { setAdminAccessToken, clearAdminAuth } from '../../features/adminAuth/adminAuthSlice'

let isLoggingOut = false
export const setAdminLoggingOut = (value) => { isLoggingOut = value }

export const resetAdminLoggingOut = () => { isLoggingOut = false }


let isRefreshing = false
let pendingQueue = []

const resolveQueue = (token) =>
  pendingQueue.forEach(({ resolve }) => resolve(token))

const rejectQueue = (error) =>
  pendingQueue.forEach(({ reject }) => reject(error))

export const adminAuthResponseInterceptor = async (_store, adminApi, error) => {
  if (isLoggingOut) {
    return Promise.reject(error)
  }

  const original = error.config

  const is401 = error.response?.status === 401
  const isRetry = original?._retry
  const isRefreshCall = original?.url?.includes('/token/refresh/')
  const isLoginCall = original?.url?.includes('/login/')

  if (!is401 || isRetry || isRefreshCall || isLoginCall) {
    return Promise.reject(error)
  }

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      pendingQueue.push({ resolve, reject })
    }).then((newToken) => {
      original.headers.Authorization = `Bearer ${newToken}`
      return adminApi(original)
    })
  }

  original._retry = true
  isRefreshing = true

  try {
    const { data } = await adminApi.post('/token/refresh/')
    const newToken = data.access

    _store.dispatch(setAdminAccessToken(newToken))

    resolveQueue(newToken)

    original.headers.Authorization = `Bearer ${newToken}`
    return adminApi(original)

  } catch (refreshError) {
    rejectQueue(refreshError)

    _store.dispatch(clearAdminAuth())
    window.location.replace('/grove-admin/login')

    return Promise.reject(refreshError)

  } finally {
    isRefreshing = false
    pendingQueue = []
  }
}