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
  hlsUrl: string;
  pathName: string;
  durationSeconds: number;
  /** HiFocus only — NVR local timezone offset in ms. Required by seek. */
  tzOffsetMs?: number;
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

/**
 * POST /api/playback/seek
 * Stops the old MediaMTX path and provisions a new one from the seek position.
 * All fields must match the backend seekSchema exactly.
 */
export interface PlaybackSeekRequest {
  nvrId: string;
  channel: number;
  /** ISO 8601 UTC — absolute start of the new segment */
  startTime: string;
  /** ISO 8601 UTC — end of the original session (unchanged) */
  endTime: string;
  /** pathName of the currently active session — backend tears this down */
  oldPathName: string;
  /** HiFocus timezone offset in ms from resolvePlayback; 0 for Hikvision */
  tzOffsetMs: number;
}

export interface PlaybackSeekResponse {
  whepUrl: string;
  hlsUrl: string;
  pathName: string;
  durationSeconds: number;
  tzOffsetMs?: number;
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
