import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../api/auth.api'
import { getBrandColors } from '../utils/branding'

const TenantBrandingContext = createContext(null)

const CACHE_KEY = 'grove_tenant_branding'

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

function applyColors(colors) {
  const { accent, accentDark, accentSoft, bg1, bg3 } = colors
  const root = document.documentElement
  root.style.setProperty('--primary', accent)
  root.style.setProperty('--primary-dark', accentDark)
  root.style.setProperty('--primary-light', accentSoft)
  root.style.setProperty('--sidebar', bg1)
  root.style.setProperty('--grove-50', accentSoft)
  root.style.setProperty('--grove-100', accent)
  root.style.setProperty('--grove-200', accent)
  root.style.setProperty('--grove-300', accent)
  root.style.setProperty('--grove-500', accent)
  root.style.setProperty('--grove-700', accentDark)
  root.style.setProperty('--grove-900', bg1)
  root.style.setProperty('--grove-950', bg3)
}

/**
 * Provides the tenant's accent color + computed brand color ramp.
 *
 * Strategy (eliminates the "flash of green" on navigation):
 *  1. On mount, immediately read from sessionStorage cache — if found,
 *     apply colours synchronously before the first paint.
 *  2. Fetch fresh tenant info in the background; update cache + colours
 *     only if the accent_color has changed.
 *  3. TenantBrandingProvider is placed OUTSIDE the router so it never
 *     unmounts during page navigation, but even if it does remount,
 *     the cache ensures the correct colour is set on the very first render.
 */
export function TenantBrandingProvider({ children }) {
  // Initialise from cache so the correct colour is available synchronously
  const cached = readCache()
  const [tenantInfo, setTenantInfo] = useState(cached)

  // Apply cached colours immediately (before API responds)
  if (cached) {
    applyColors(getBrandColors(cached.accent_color))
  }

  useEffect(() => {
    authApi.getTenantInfo()
      .then(res => {
        const data = res.data
        // Only update state if accent_color changed (avoids unnecessary re-render)
        setTenantInfo(prev => {
          if (prev?.accent_color === data?.accent_color) return prev
          writeCache(data)
          return data
        })
      })
      .catch(() => {/* fail silently */})
  }, [])

  const colors = getBrandColors(tenantInfo?.accent_color)

  // Apply colours imperatively on documentElement — highest CSS specificity,
  // always beats the compiled stylesheet :root defaults.
  useEffect(() => {
    applyColors(colors)
  }, [colors])

  return (
    <TenantBrandingContext.Provider value={{ tenantInfo, colors }}>
      {children}
    </TenantBrandingContext.Provider>
  )
}

export function useTenantBranding() {
  const ctx = useContext(TenantBrandingContext)
  if (!ctx) throw new Error('useTenantBranding must be used inside TenantBrandingProvider')
  return ctx
}
