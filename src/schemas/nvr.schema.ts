import { z } from 'zod';

export const nvrSchema = z.object({
  stationId: z.string().min(1, 'Station is required'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, { message: 'Invalid IP address' }),
  rtspPort: z.number().int().min(1).max(65535),
  httpPort: z.number().int().min(1).max(65535),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  type: z.enum(['HIKVISION', 'HIFOCUS']),
});

export type NVRFormData = z.infer<typeof nvrSchema>;
