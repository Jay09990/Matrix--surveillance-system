import type { NVR } from '../types/nvr';
import type { Camera } from '../types/camera';
import type { User } from '../types/user';

export const MOCK_USER: User = {
  id: 'u1',
  email: 'admin@matrix.vms',
  name: 'Admin User',
  role: 'admin',
};

// Flat NVR list matching the new API response shape
export const MOCK_NVRS_FLAT: NVR[] = [
  {
    id: 'n1',
    name: 'HQ-NVR-01',
    ip: '192.168.1.10',
    username: 'admin',
    type: 'HIKVISION',
    rtspPort: 554,
    httpPort: 80,
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    station: { id: 's1', name: 'New Delhi HQ', city: 'New Delhi' },
    _count: { cameras: 4 },
  },
  {
    id: 'n2',
    name: 'HQ-NVR-02',
    ip: '192.168.1.11',
    username: 'admin',
    type: 'HIKVISION',
    rtspPort: 554,
    httpPort: 80,
    status: 'online',
    lastSeenAt: new Date().toISOString(),
    station: { id: 's1', name: 'New Delhi HQ', city: 'New Delhi' },
    _count: { cameras: 1 },
  },
  {
    id: 'n3',
    name: 'MUM-NVR-01',
    ip: '10.0.0.5',
    username: 'admin',
    type: 'HIFOCUS',
    rtspPort: 554,
    httpPort: 8080,
    status: 'warning',
    lastSeenAt: new Date(Date.now() - 600000).toISOString(),
    station: { id: 's2', name: 'Mumbai Data Center', city: 'Mumbai' },
    _count: { cameras: 0 },
  },
  {
    id: 'n4',
    name: 'BLR-NVR-01',
    ip: '172.16.0.50',
    username: 'admin',
    type: 'HIFOCUS',
    rtspPort: 554,
    status: 'offline',
    lastSeenAt: new Date(Date.now() - 7200000).toISOString(),
    offlineSince: new Date(Date.now() - 7200000).toISOString(),
    station: { id: 's3', name: 'Bangalore Tech Park', city: 'Bangalore' },
    _count: { cameras: 0 },
  },
];

export const MOCK_CAMERAS: Record<string, Camera[]> = {
  n1: [
    { id: 'c1', nvrId: 'n1', channel: 1, name: 'Main Entrance', status: 'online', areaTag: 'entrance' },
    { id: 'c2', nvrId: 'n1', channel: 2, name: 'Lobby North', status: 'online', areaTag: 'lobby' },
    { id: 'c3', nvrId: 'n1', channel: 5, name: 'Server Room', status: 'warning', areaTag: 'server-room' },
    { id: 'c4', nvrId: 'n1', channel: 8, name: 'Loading Dock', status: 'offline', lastSeenAt: new Date(Date.now() - 3600000).toISOString(), areaTag: 'dock' },
  ],
  n2: [
    { id: 'c5', nvrId: 'n2', channel: 1, name: 'Perimeter West', status: 'online', areaTag: 'perimeter' },
  ],
};
