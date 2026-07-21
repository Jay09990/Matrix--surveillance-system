import { z } from 'zod';

export const assignableRoleSchema = z.enum(['ADMIN', 'VIEWER']);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  role: assignableRoleSchema,
});
export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: assignableRoleSchema,
});
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
