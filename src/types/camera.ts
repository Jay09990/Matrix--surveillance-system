export interface Camera {
  id: string;
  nvrId: string;
  channel: number;
  name: string;
  status: 'online' | 'offline' | 'warning' | 'no-signal';
  lastSeenAt?: string;
  streamUrl?: string; // e.g. the WHEP endpoint or HLS fallback
  areaTag?: string;
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
