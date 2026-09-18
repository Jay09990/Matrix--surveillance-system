import { z } from 'zod';

export const nvrSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ip: z.string().regex(
    /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    { message: 'Invalid IP address' }
  ),
  type: z.enum(['HIKVISION', 'HIFOCUS']),
  rtspPort: z.coerce.number().min(1).max(65535).optional().or(z.literal('')),
  httpPort: z.coerce.number().min(1).max(65535).optional().or(z.literal('')),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional().or(z.literal('')),
  stationName: z.string().min(1, 'Station name is required'),
  stationCity: z.string().min(1, 'Station city is required'),
});

export type NVRFormData = z.infer<typeof nvrSchema>;
