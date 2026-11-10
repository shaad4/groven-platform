import { createContext, useContext, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setLoggingOut } from '../api/interceptors/authResponseInterceptor'
import {
  setCredentials,
  setMemberships,
  clearAuth,
  selectCurrentUser,
  selectTenant,
  selectIsAuth,
} from '../features/auth/authSlice'
import { authApi } from '../api/auth.api'
import { getSubdomain } from '../utils/domain'

import { appUrl } from '../utils/urls'

const SKIP_RESTORE_PATHS = ['/accept-invite', '/client-login']

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const dispatch = useDispatch()

  const user   = useSelector(selectCurrentUser)
  const tenant = useSelector(selectTenant)
  const isAuth = useSelector(selectIsAuth)

  const [loading, setLoading] = useState(true)

  const saveSession = ({ accessToken, user, tenant, membership_count }) => {
    dispatch(setCredentials({ accessToken, user, tenant, membership_count }))
  }

  const logout = async () => {
    setLoggingOut(true)
    
    try { await authApi.logout() } catch (_) { /* silent */ }

    const role      = user?.role
    const subdomain = getSubdomain()

    dispatch(clearAuth())

    const destination =
      subdomain
        ? appUrl(subdomain, '/client-login')
        : appUrl(null, '/login')

    window.location.href = destination
  }

  useEffect(() => {
    const restore = async () => {
        if (SKIP_RESTORE_PATHS.includes(window.location.pathname)) {
            setLoading(false)
            return
        }
        
        dispatch(clearAuth())

        try {
            
            const refreshRes  = await authApi.refreshToken()
            const accessToken = refreshRes.data.access

            const meRes = await authApi.me(accessToken)

            dispatch(setCredentials({
            accessToken,
            user:   meRes.data.user,
            tenant: meRes.data.tenant,
            }))
            

            try {
                const membershipsRes = await authApi.getMemberships(accessToken)
                dispatch(setMemberships(membershipsRes.data))
            } catch (_) { /* silent */ }

        } catch {
            dispatch(clearAuth())
        } finally {
            setLoading(false)
        }
    }

    restore()
  }, [dispatch])

  return (
    <AuthContext.Provider value={{
      user,
      tenant,
      isAuth,
      loading,
      saveSession,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)