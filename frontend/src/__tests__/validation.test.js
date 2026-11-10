import { signupSchema, getPasswordStrength } from '../utils/validation'

describe('getPasswordStrength helper', () => {
  test('returns 0 for empty or very short simple password', () => {
    expect(getPasswordStrength('')).toBe(0)
    expect(getPasswordStrength('abc')).toBe(0)
  })

  test('returns 1 if only length criteria is met (length >= 8)', () => {
    expect(getPasswordStrength('abcdefgh')).toBe(1)
  })

  test('returns 2 if length and uppercase criteria are met', () => {
    expect(getPasswordStrength('Abcdefgh')).toBe(2)
  })

  test('returns 3 if length, uppercase, and number criteria are met', () => {
    expect(getPasswordStrength('Abcdefg1')).toBe(3)
  })

  test('returns 4 if all criteria are met (length, uppercase, number, special character)', () => {
    expect(getPasswordStrength('Abcdefg1!')).toBe(4)
  })
})

describe('signupSchema validation', () => {
  const validData = {
    full_name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'Password123',
    confirm_password: 'Password123',
  }

  test('passes validation with correct data', () => {
    const result = signupSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  test('fails if full_name is less than 2 characters', () => {
    const result = signupSchema.safeParse({
      ...validData,
      full_name: 'J',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errorMsg = result.error.flatten().fieldErrors.full_name[0]
      expect(errorMsg).toBe('Full name is required')
    }
  })

  test('fails if full_name contains numbers or special characters', () => {
    const result = signupSchema.safeParse({
      ...validData,
      full_name: 'John123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errorMsg = result.error.flatten().fieldErrors.full_name[0]
      expect(errorMsg).toBe('Only letters are allowed')
    }
  })

  test('fails if email is invalid', () => {
    const result = signupSchema.safeParse({
      ...validData,
      email: 'invalid-email',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errorMsg = result.error.flatten().fieldErrors.email[0]
      expect(errorMsg).toBe('Enter a valid email')
    }
  })

  test('fails if password is too short', () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: 'Pas1',
      confirm_password: 'Pas1',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errorMsg = result.error.flatten().fieldErrors.password[0]
      expect(errorMsg).toBe('Minimum 8 characters')
    }
  })

  test('fails if password does not contain uppercase, lowercase, and number', () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: 'password',
      confirm_password: 'password',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errorMsg = result.error.flatten().fieldErrors.password[0]
      expect(errorMsg).toBe('Must contain uppercase, lowercase and number')
    }
  })

  test('fails if password and confirm_password do not match', () => {
    const result = signupSchema.safeParse({
      ...validData,
      confirm_password: 'DifferentPassword123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten()
      expect(errors.fieldErrors.confirm_password[0]).toBe('Passwords do not match')
    }
  })
})
