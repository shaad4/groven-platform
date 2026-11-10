import {
  getInitials,
  timeAgo,
  formatDate,
  getTagColor,
  TAG_COLORS,
} from '../utils/clientHelpers'

describe('getInitials helper', () => {
  test('returns initials for first and last name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  test('returns single initial for single name', () => {
    expect(getInitials('Jane')).toBe('J')
  })

  test('returns first two initials for multiple names', () => {
    expect(getInitials('John Fitzgerald Kennedy')).toBe('JF')
  })

  test('returns ?? for empty string or no name', () => {
    expect(getInitials('')).toBe('??')
    expect(getInitials(undefined)).toBe('??')
  })
})

describe('timeAgo helper', () => {
  test('returns null for empty date', () => {
    expect(timeAgo(null)).toBeNull()
    expect(timeAgo(undefined)).toBeNull()
  })

  test('returns just now for very recent times', () => {
    const now = new Date()
    const recent = new Date(now.getTime() - 10 * 1000) // 10s ago
    expect(timeAgo(recent.toISOString())).toBe('just now')
  })

  test('returns minutes ago', () => {
    const now = new Date()
    const fiveMins = new Date(now.getTime() - 5 * 60 * 1000) // 5m ago
    expect(timeAgo(fiveMins.toISOString())).toBe('5m ago')
  })

  test('returns hours ago', () => {
    const now = new Date()
    const twoHours = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2h ago
    expect(timeAgo(twoHours.toISOString())).toBe('2h ago')
  })

  test('returns days ago', () => {
    const now = new Date()
    const threeDays = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3d ago
    expect(timeAgo(threeDays.toISOString())).toBe('3d ago')
  })

  test('returns formatted date for older than a week', () => {
    const olderDate = new Date('2020-01-15T12:00:00')
    const result = timeAgo(olderDate.toISOString())
    expect(result).toContain('Jan 15, 2020')
  })
})

describe('formatDate helper', () => {
  test('returns em dash for empty or missing date', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  test('formats valid date string correctly', () => {
    const dateStr = '2026-07-22T10:00:00'
    expect(formatDate(dateStr)).toContain('Jul 22, 2026')
  })
})

describe('getTagColor helper', () => {
  test('returns a valid color object with bg, dot, and text properties', () => {
    const color = getTagColor('marketing')
    expect(color).toHaveProperty('bg')
    expect(color).toHaveProperty('dot')
    expect(color).toHaveProperty('text')
    
    // Ensure the color exists in the TAG_COLORS palette
    expect(TAG_COLORS).toContainEqual(color)
  })

  test('returns consistent color for the same name', () => {
    const colorA1 = getTagColor('design')
    const colorA2 = getTagColor('design')
    const colorB = getTagColor('billing')
    
    expect(colorA1).toEqual(colorA2)
    expect(colorA1).not.toBeNull()
  })

  test('handles empty or missing name gracefully', () => {
    const color = getTagColor()
    expect(color).toHaveProperty('bg')
    expect(color).toHaveProperty('dot')
    expect(color).toHaveProperty('text')
  })
})
