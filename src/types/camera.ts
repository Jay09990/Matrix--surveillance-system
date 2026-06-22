export interface Camera {
  id: string;
  nvrId: string;
  channel: number;
  name: string;
  isOnline: boolean;       // what the backend actually sends
  isActive: boolean;       // what the backend actually sends
  lastSeenAt?: string | null;
  offlineSince?: string | null;
  protocol?: string | null;
  areaTag?: string | null;
  streamUrl?: string;      // frontend-only, added after stream resolve
}

export interface CameraStreamResponse {
  cameraId: string;
  name: string;
  streams: {
    hls?: string;
    webrtc?: string;
  };
}

export interface HealthResponse {
  status: string;
}
