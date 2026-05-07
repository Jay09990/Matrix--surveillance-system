export interface Station {
  id: string;
  name: string;
  city: string;
  state: string;
  status: 'online' | 'offline' | 'warning';
  nvrCount?: number;
  cameraCount?: number;
}
