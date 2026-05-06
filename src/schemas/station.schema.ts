import { z } from 'zod';

export const stationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  subnet: z.string().regex(/^(\d{1,3}\.){2}\d{1,3}$/, 'Invalid subnet format (e.g. 192.168.1)'),
});

export type StationFormData = z.infer<typeof stationSchema>;
