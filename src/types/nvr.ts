export interface NVR {
  id: string;
  stationId: string;
  name: string;
  ipAddress: string;
  rtspPort: number;
  httpPort: number;
  username: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen?: string;
  type: 'HIKVISION' | 'HIFOCUS';
}
