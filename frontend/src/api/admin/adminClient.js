import axios from 'axios'
import { adminAuthResponseInterceptor } from './adminAuthResponseInterceptor'

let _store
export const injectAdminStore = (store) => { _store = store }

const adminApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/grove-admin`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // sends httpOnly grove_admin_refresh cookie
})

adminApi.interceptors.request.use((config) => {
  if (!_store) return config
  const token = _store.getState().adminAuth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminApi.interceptors.response.use(
  (response) => response,
  (error) => adminAuthResponseInterceptor(_store, adminApi, error)
)

export default adminApi