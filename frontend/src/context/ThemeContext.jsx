import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { normalizeTheme, readTheme, resolveTheme, THEME_STORAGE_KEY } from '../utils/theme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setPreference] = useState(readTheme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const resolvedTheme = resolveTheme(theme, systemDark)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = (event) => setSystemDark(event.matches)
    const syncStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setPreference(readTheme())
    }
    media.addEventListener('change', update)
    window.addEventListener('storage', syncStorage)
    return () => {
      media.removeEventListener('change', update)
      window.removeEventListener('storage', syncStorage)
    }
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.dataset.theme = resolvedTheme
    root.style.colorScheme = resolvedTheme
    const themeColor = document.querySelector('meta[name="theme-color"]')
    if (themeColor) themeColor.content = resolvedTheme === 'dark' ? '#151515' : '#f6f7f4'
  }, [resolvedTheme])

  const value = useMemo(() => ({
    theme, resolvedTheme,
    setTheme: (next) => {
      const preference = normalizeTheme(next)
      setPreference(preference)
      try { localStorage.setItem(THEME_STORAGE_KEY, preference) } catch { /* Storage is optional. */ }
    },
  }), [theme, resolvedTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
