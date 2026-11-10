const DEFAULT_ACCENT = '#0F6E56'

function hexFromRgb(rgb) {
  return `#${rgb.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`
}

function luminance(rgb) {
  const linear = rgb.map(value => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

/** Keep the tenant hue while guaranteeing readable white button labels. */
export function getBrandColors(base = DEFAULT_ACCENT, mode = 'light') {
  const input = typeof base === 'string' && /^#[\da-f]{6}$/i.test(base) ? base : DEFAULT_ACCENT
  const source = [1, 3, 5].map(index => parseInt(input.slice(index, index + 2), 16))
  let button = [...source]
  while (1.05 / (luminance(button.map(Math.round)) + 0.05) < 4.5) button = button.map(channel => channel * 0.95)
  const mix = (rgb, amount, target = 255) => rgb.map(channel => channel + (target - channel) * amount)
  const accent = hexFromRgb(button)
  const dark = mode === 'dark'
  return {
    brand: input,
    accent,
    accentDark: hexFromRgb(mix(button, 0.18, 0)),
    accentText: dark ? hexFromRgb(mix(source, 0.65)) : accent,
    accentSoft: `${accent}${dark ? '30' : '12'}`,
    onAccent: '#ffffff',
    // Large dark surfaces stay neutral; the tenant hue belongs to accents.
    bg1: dark ? '#242424' : hexFromRgb(mix(button, 0.58, 15)),
    bg2: dark ? '#1e1e1e' : hexFromRgb(mix(button, 0.70, 15)),
    bg3: dark ? '#191919' : hexFromRgb(mix(button, 0.82, 15)),
  }
}

export function tenantCacheKey(hostname) {
  return `grove_tenant_branding:${hostname.toLowerCase()}`
}

export function tenantSlugForHost(hostname, domain = 'lvh.me') {
  const host = hostname.toLowerCase()
  const root = domain.toLowerCase().split(':')[0]
  if (host === root || host === `www.${root}` || !host.endsWith(`.${root}`)) return null
  const slug = host.slice(0, -(root.length + 1))
  return slug && !slug.includes('.') && !['api', 'www', 'app'].includes(slug) ? slug : null
}
