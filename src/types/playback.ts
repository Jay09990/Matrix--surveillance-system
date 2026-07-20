import type { NVRType } from './nvr';

/**
 * Types for NVR-backed playback sessions and recording discovery.
 * Rewritten to match the backend API contract exactly (field names, ISO strings).
 */

// ── Session creation ──────────────────────────────────────────────────────────

/** POST /api/playback/sessions — request body */
export interface PlaybackCreateSessionRequest {
  nvrId: string;
  channel: number;
  /** ISO 8601 UTC — start of the recording window to stream */
  recordingStart: string;
  /** ISO 8601 UTC — end of the recording window to stream */
  recordingEnd: string;
}

/** POST /api/playback/sessions — 201 response */
export interface PlaybackCreateSessionResponse {
  sessionId: string;
  hlsUrl: string;
  whepUrl: string;
  durationSeconds: number;
  /** ISO 8601 UTC */
  recordingStart: string;
  /** ISO 8601 UTC */
  recordingEnd: string;
}

// ── Seek ──────────────────────────────────────────────────────────────────────

/**
 * POST /api/playback/sessions/:id/seek — request body.
 * positionMs is RELATIVE MILLISECONDS from recordingStart, NOT absolute epoch ms.
 */
export interface PlaybackSeekRequest {
  positionMs: number;
}

/** POST /api/playback/sessions/:id/seek — 200 response */
export interface PlaybackSeekResponse {
  hlsUrl: string;
  whepUrl: string;
}

// ── Session state (GET + pause/resume/speed responses) ───────────────────────

/** GET /api/playback/sessions/:id — 200 response (also returned by pause/resume/speed) */
export interface PlaybackSessionStateResponse {
  sessionId: string;
  state: 'PLAYING' | 'PAUSED' | 'SEEKING' | 'STOPPED';
  currentPositionMs: number;
  speed: number;
  hlsUrl: string;
  whepUrl: string;
  durationSeconds: number;
  /** ISO 8601 UTC */
  recordingStart: string;
  /** ISO 8601 UTC */
  recordingEnd: string;
}

// ── Position heartbeat ────────────────────────────────────────────────────────

/**
 * POST /api/playback/sessions/:id/position — request body.
 * positionMs is RELATIVE MILLISECONDS from recordingStart.
 */
export interface PlaybackPositionRequest {
  positionMs: number;
}

// ── Speed ─────────────────────────────────────────────────────────────────────

/** POST /api/playback/sessions/:id/speed — request body */
export interface PlaybackSpeedRequest {
  speed: number;
}

// ── Recording discovery ───────────────────────────────────────────────────────

/** One segment returned by GET /api/playback/recordings/:nvrId/:channel — unchanged */
export interface PlaybackRecording {
  id?: string;
  pathName?: string;
  filename?: string;
  startTime: string;
  endTime: string | null;
  durationSeconds?: number | null;
  sizeBytes?: string | number | null;
}

/** Camera entry returned by the playback cameras listing — unchanged */
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
    type: NVRType;
    station: {
      id: string;
      name: string;
      city: string;
    };
  };
}
