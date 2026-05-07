export interface NVR {
  id: string;
  stationId: string;
  name: string;
  ip: string;
  username: string;
  type: 'HIKVISION' | 'HIFOCUS';
  totalChannel: number;
  status: 'online' | 'offline' | 'warning';
  lastSeenAt?: string;
}
