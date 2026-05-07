import type { Station } from '../types/station';
import type { NVR } from '../types/nvr';
import type { Camera } from '../types/camera';
import type { User } from '../types/user';

export const MOCK_USER: User = {
  id: 'u1',
  email: 'admin@matrix.vms',
  name: 'Admin User',
  role: 'admin',
};

export const MOCK_STATIONS: Station[] = [
  { id: 's1', name: 'New Delhi HQ', city: 'New Delhi', state: 'Delhi', status: 'online', nvrCount: 2, cameraCount: 12 },
  { id: 's2', name: 'Mumbai Data Center', city: 'Mumbai', state: 'Maharashtra', status: 'online', nvrCount: 3, cameraCount: 24 },
  { id: 's3', name: 'Bangalore Tech Park', city: 'Bangalore', state: 'Karnataka', status: 'warning', nvrCount: 1, cameraCount: 8 },
  { id: 's4', name: 'Chennai Hub', city: 'Chennai', state: 'Tamil Nadu', status: 'offline', nvrCount: 1, cameraCount: 4 },
];

export const MOCK_NVRS: Record<string, NVR[]> = {
  s1: [
    { id: 'n1', stationId: 's1', name: 'HQ-NVR-01', ip: '192.168.1.10', username: 'admin', status: 'online', type: 'HIKVISION', totalChannel: 32 },
    { id: 'n2', stationId: 's1', name: 'HQ-NVR-02', ip: '192.168.1.11', username: 'admin', status: 'online', type: 'HIKVISION', totalChannel: 16 },
  ],
  s2: [
    { id: 'n3', stationId: 's2', name: 'MUM-NVR-01', ip: '10.0.0.5', username: 'admin', status: 'online', type: 'HIFOCUS', totalChannel: 64 },
  ]
};

export const MOCK_CAMERAS: Record<string, Camera[]> = {
  n1: [
    { id: 'c1', nvrId: 'n1', channel: 1, name: 'Main Entrance', status: 'online', areaTag: 'entrance' },
    { id: 'c2', nvrId: 'n1', channel: 2, name: 'Lobby North', status: 'online', areaTag: 'lobby' },
    { id: 'c3', nvrId: 'n1', channel: 5, name: 'Server Room', status: 'warning', areaTag: 'server-room' },
    { id: 'c4', nvrId: 'n1', channel: 8, name: 'Loading Dock', status: 'offline', lastSeenAt: new Date(Date.now() - 3600000).toISOString(), areaTag: 'dock' },
  ],
  n2: [
    { id: 'c5', nvrId: 'n2', channel: 1, name: 'Perimeter West', status: 'online', areaTag: 'perimeter' },
  ]
};
