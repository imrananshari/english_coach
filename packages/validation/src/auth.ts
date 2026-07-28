import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address.');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.');
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export const signupSchema = loginSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, 'Enter your full name.')
    .max(100, 'Name is too long.'),
  age: z.coerce
    .number()
    .int('Enter your age as a whole number.')
    .min(13, 'You must be at least 13 years old.')
    .max(100, 'Enter a valid age.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
