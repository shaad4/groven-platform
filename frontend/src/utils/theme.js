export const THEME_STORAGE_KEY = 'groven-appearance'
export const THEME_OPTIONS = ['light', 'dark', 'system']

export function normalizeTheme(value) {
  return THEME_OPTIONS.includes(value) ? value : 'system'
}

export function resolveTheme(preference, systemDark) {
  const theme = normalizeTheme(preference)
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
}

export function readTheme() {
  try { return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY)) }
  catch { return 'system' }
}
