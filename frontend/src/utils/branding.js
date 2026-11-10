// utils/branding.js

export function getBrandColors(base = '#0F6E56') {

  const safeBase = base || '#0F6E56'
  const cleaned = safeBase.replace('#', '')
  const hex = /^[0-9A-Fa-f]{6}$/.test(cleaned) ? cleaned : '0F6E56'

  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  let h, s
  const l = (max + min) / 2

  if (max === min) {

    h = 0
    s = 0

  } else {

    const d = max - min

    s =
      l > .5
        ? d / (2 - max - min)
        : d / (max + min)

    switch (max) {

      case r:

        h =
          (g - b) / d +
          (g < b ? 6 : 0)

        break

      case g:

        h =
          (b - r) / d + 2

        break

      default:

        h =
          (r - g) / d + 4

    }

    h *= 60

  }

  s *= 100

  return {
    accent: `hsl(${h}, ${Math.max(s - 5, 45)}%, 48%)`,
    accentDark: `hsl(${h}, ${Math.max(s - 10, 35)}%, 34%)`,
    accentSoft: `hsla(${h}, ${s}%, 50%, 0.12)`,
    bg1: `hsl(${h}, ${Math.max(s - 15, 35)}%, 24%)`,
    bg2: `hsl(${(h + 20) % 360}, ${Math.max(s - 20, 30)}%, 18%)`,
    bg3: `hsl(${(h + 10) % 360}, ${Math.max(s - 25, 25)}%, 14%)`,
  }

}