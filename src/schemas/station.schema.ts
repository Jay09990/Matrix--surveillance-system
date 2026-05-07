import { z } from 'zod';

export const stationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
});

export type StationFormData = z.infer<typeof stationSchema>;
