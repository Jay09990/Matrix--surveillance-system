export type NVRType = 'HIKVISION' | 'HIFOCUS';
export type NVRStatus = 'online' | 'offline' | 'warning';

export interface NVR {
  id: string;
  name: string;
  ip: string;
  type: NVRType;
  username: string;
  rtspPort?: number;
  httpPort?: number;
  status: NVRStatus;
  lastSeenAt?: string;
  offlineSince?: string;
  station: {
    id: string;
    name: string;
    city: string;
  };
  _count: {
    cameras: number;
  };
}
