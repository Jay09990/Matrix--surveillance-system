export interface Station {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  nvrCount?: number;
  cameraCount?: number;
}
