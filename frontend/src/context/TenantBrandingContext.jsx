import { createContext, useContext, useState, useEffect, useLayoutEffect, useMemo } from 'react'
import { authApi } from '../api/auth.api'
import { getBrandColors, tenantCacheKey, tenantSlugForHost } from '../utils/branding'
import { useTheme } from './ThemeContext'
import { useAuth } from './AuthContext'

const TenantBrandingContext = createContext(null)
const DOMAIN = import.meta.env.VITE_APP_DOMAIN || 'lvh.me'
const BRAND_PROPERTIES = ['--primary', '--primary-dark', '--primary-light', '--primary-text', '--on-primary', '--grove-50', '--grove-100', '--grove-200', '--grove-300', '--grove-500', '--grove-700', '--grove-900', '--grove-950']

function readCache(host, slug) {
  if (!slug) return null
  try {
    const data = JSON.parse(sessionStorage.getItem(tenantCacheKey(host)))
    return data?.slug === slug ? data : null
  } catch { return null }
}

export function TenantBrandingProvider({ children }) {
  const { user } = useAuth()
  const host = window.location.hostname
  const slug = tenantSlugForHost(host, DOMAIN)
  const { resolvedTheme } = useTheme()
  const [tenantInfo, setTenantInfo] = useState(() => readCache(host, slug))
  const [loading, setLoading] = useState(Boolean(slug))
  const [error, setError] = useState(false)
  const colors = useMemo(() => getBrandColors(tenantInfo?.accent_color, resolvedTheme), [tenantInfo?.accent_color, resolvedTheme])

  useEffect(() => {
    let active = true
    // An old, unscoped cache must never bleed into another workspace.
    try { sessionStorage.removeItem('grove_tenant_branding') } catch { /* Storage is optional. */ }
    setTenantInfo(readCache(host, slug))
    setError(false)
    if (!slug) { setLoading(false); return }
    setLoading(true)
    authApi.getTenantInfo().then(({ data }) => {
      if (!active) return
      if (data?.slug !== slug) throw new Error('Workspace mismatch')
      setTenantInfo(data)
      try { sessionStorage.setItem(tenantCacheKey(host), JSON.stringify(data)) } catch { /* Storage is optional. */ }
    }).catch(() => {
      if (!active) return
      setError(true)
      setTenantInfo(null)
      try { sessionStorage.removeItem(tenantCacheKey(host)) } catch { /* Storage is optional. */ }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [host, slug])

  useLayoutEffect(() => {
    const root = document.documentElement
    // Neutral surfaces follow the user's theme; only accents carry tenant branding.
    if (slug && tenantInfo) {
      const values = [colors.accent, colors.accentDark, colors.accentSoft, colors.accentText, colors.onAccent, colors.accentSoft, colors.accentSoft, `${colors.accent}30`, `${colors.accent}60`, colors.accent, colors.accentDark, colors.bg1, colors.bg3]
      BRAND_PROPERTIES.forEach((property, index) => root.style.setProperty(property, values[index]))
    } else {
      BRAND_PROPERTIES.forEach(property => root.style.removeProperty(property))
    }
    return () => BRAND_PROPERTIES.forEach(property => root.style.removeProperty(property))
  }, [colors, slug, tenantInfo])

  useEffect(() => {
    const previousTitle = document.title
    const icons = Array.from(document.querySelectorAll('link[rel="icon"]'))
    const previousIcons = icons.map(icon => ({ icon, href: icon.getAttribute('href'), type: icon.getAttribute('type'), sizes: icon.getAttribute('sizes') }))
    if (slug && tenantInfo) {
      document.title = `${tenantInfo.name} — ${user?.role === 'provider' ? 'Workspace' : 'Client portal'}`
      const initials = tenantInfo.name?.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'P'
      const safeInitials = initials.replace(/[&<>"']/g, '')
      const fallback = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="16" fill="${colors.accent}"/><text x="32" y="42" text-anchor="middle" font-family="sans-serif" font-size="26" fill="white">${safeInitials}</text></svg>`)}`
      icons.forEach(icon => { icon.href = tenantInfo.logo_url || fallback; icon.removeAttribute('type'); icon.removeAttribute('sizes') })
    }
    return () => {
      document.title = previousTitle
      previousIcons.forEach(({ icon, href, type, sizes }) => {
        if (href) icon.setAttribute('href', href)
        if (type) icon.setAttribute('type', type); else icon.removeAttribute('type')
        if (sizes) icon.setAttribute('sizes', sizes); else icon.removeAttribute('sizes')
      })
    }
  }, [slug, tenantInfo, colors.accent, user?.role])

  return <TenantBrandingContext.Provider value={{ tenantInfo, colors, loading, error }}>{children}</TenantBrandingContext.Provider>
}

export function useTenantBranding() {
  const context = useContext(TenantBrandingContext)
  if (!context) throw new Error('useTenantBranding must be used inside TenantBrandingProvider')
  return context
}
