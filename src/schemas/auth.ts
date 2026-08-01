import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export const signupSchema = z.object({
  name: z.string().trim().max(80, 'Use 80 characters or fewer.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
})

export type LoginInput = z.input<typeof loginSchema>
export type SignupInput = z.input<typeof signupSchema>
