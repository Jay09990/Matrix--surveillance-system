import { z } from 'zod';

export const nvrSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  ip: z.string().regex(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    { message: 'Invalid IPv4 address' }
  ),
  type: z.enum(['HIKVISION', 'HIFOCUS']),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  totalChannel: z.number().int().min(1, 'At least 1 channel required'),
});

export type NVRFormData = z.infer<typeof nvrSchema>;
