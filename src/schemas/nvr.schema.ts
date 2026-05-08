import { z } from 'zod';

export const nvrSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  ip: z.string().regex(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    { message: 'Invalid IPv4 address' }
  ),
  type: z.enum(['HIKVISION', 'HIFOCUS']),
  rtspPort: z.number().int().min(1).max(65535).optional(),
  httpPort: z.number().int().min(1).max(65535).optional(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  stationName: z.string().min(2, 'Station name must be at least 2 characters'),
  stationCity: z.string().min(2, 'City must be at least 2 characters'),
});

export type NVRFormData = z.infer<typeof nvrSchema>;
