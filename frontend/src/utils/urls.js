const PROTOCOL = window.location.protocol  // 'https:' or 'http:'
const WS_PROTOCOL = PROTOCOL === 'https:' ? 'wss:' : 'ws:'
const DOMAIN = import.meta.env.VITE_APP_DOMAIN || 'lvh.me'

const PORT = import.meta.env.VITE_PORT || ''
const PORT_SUFFIX = PORT ? `:${PORT}` : ''

const API_PORT = import.meta.env.VITE_API_PORT || ''
const API_PORT_SUFFIX = API_PORT ? `:${API_PORT}` : ''

export const appUrl = (slug, path = '') =>
  slug
    ? `${PROTOCOL}//${slug}.${DOMAIN}${PORT_SUFFIX}${path}`
    : `${PROTOCOL}//${DOMAIN}${PORT_SUFFIX}${path}`

export const wsUrl = (path) =>
  `${WS_PROTOCOL}//api.${DOMAIN}${API_PORT_SUFFIX}${path}`