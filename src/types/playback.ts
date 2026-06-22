/**
 * Types for NVR-backed playback sessions and recording discovery.
 */

export interface PlaybackResolveRequest {
  nvrId: string;
  channel: number;
  startTime: string;
  endTime: string;
}

export interface PlaybackResolveResponse {
  whepUrl: string;
  pathName: string;
}

export interface PlaybackRecording {
  id?: string;
  pathName?: string;
  filename?: string;
  startTime: string;
  endTime: string | null;
  durationSeconds?: number | null;
  sizeBytes?: string | number | null;
}

export interface PlaybackCamera {
  cameraId: string;
  nvrId: string;
  channel: number;
  cameraName: string;
  isOnline: boolean;
  nvr: {
    id: string;
    name: string;
    ip: string;
    station: {
      id: string;
      name: string;
      city: string;
    };
  };
}
