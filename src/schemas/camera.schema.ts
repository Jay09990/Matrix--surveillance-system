import { z } from 'zod';

export const cameraSchema = z.object({
  stationId: z.string().min(1, 'Station is required'),
  nvrId: z.string().min(1, 'NVR is required'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  channel: z.number().int().min(1).max(16, 'Channel must be between 1 and 16'),

  areaTag: z.string().min(1, 'Area tag required'),
});

export type CameraFormData = z.infer<typeof cameraSchema>;
