import { getBrandColors, tenantCacheKey, tenantSlugForHost } from '../utils/branding'

function luminance(hex) {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

describe('accessible tenant branding', () => {
  test.each(['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff0000', '#bb33ff', '#000000', '#0F6E56', '#55aa77'])('keeps white labels readable for %s', source => {
    for (const mode of ['light', 'dark']) {
      const colors = getBrandColors(source, mode)
      expect(1.05 / (luminance(colors.accent) + 0.05)).toBeGreaterThanOrEqual(4.5)
      expect(1.05 / (luminance(colors.accentDark) + 0.05)).toBeGreaterThanOrEqual(4.5)
      expect(colors.brand).toBe(source)
    }
  })
  test('produces readable dark theme text even for a black tenant accent', () => {
    const colors = getBrandColors('#000000', 'dark')
    expect((luminance(colors.accentText) + 0.05) / (luminance('#242424') + 0.05)).toBeGreaterThanOrEqual(4.5)
  })
  test.each(['#0F6E56', '#6653c9', '#ffff00'])('keeps large dark surfaces neutral for %s', source => {
    const colors = getBrandColors(source, 'dark')
    for (const surface of [colors.bg1, colors.bg2, colors.bg3]) {
      const channels = [1, 3, 5].map(index => parseInt(surface.slice(index, index + 2), 16))
      expect(channels[0]).toBe(channels[1])
      expect(channels[1]).toBe(channels[2])
      expect(channels[0]).toBeLessThanOrEqual(36)
    }
    expect(colors.brand).toBe(source)
  })
  test.each([null, undefined, 42, 'invalid', '#bad', '#ffffff; color: red'])('falls back safely for %s', input => {
    expect(getBrandColors(input)).toEqual(getBrandColors('#0F6E56'))
  })
})

describe('tenant branding isolation', () => {
  test('stores each hostname in a separate cache entry', () => {
    expect(tenantCacheKey('one.groven.in')).not.toBe(tenantCacheKey('two.groven.in'))
    expect(tenantCacheKey('ONE.groven.in')).toBe(tenantCacheKey('one.groven.in'))
  })
  test.each(['groven.in', 'www.groven.in', 'api.groven.in', 'app.groven.in', 'other.example.com', 'one.groven.in.evil.test', 'nested.one.groven.in'])('does not brand a platform or unrelated host: %s', host => {
    expect(tenantSlugForHost(host, 'groven.in')).toBeNull()
  })
  test('recognizes production and local tenant hosts', () => {
    expect(tenantSlugForHost('studio.groven.in', 'groven.in')).toBe('studio')
    expect(tenantSlugForHost('studio.lvh.me')).toBe('studio')
  })
})
