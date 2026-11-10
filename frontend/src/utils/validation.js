import { z } from 'zod'

export const signupSchema = z
  .object({
    full_name: z
      .string()
      .min(2, 'Full name is required')
      .max(50, 'Too long')
      .regex(/^[A-Za-z\s]+$/, 'Only letters are allowed'),
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        'Must contain uppercase, lowercase and number'
      ),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })

export const getPasswordStrength = (password = '') => {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}
