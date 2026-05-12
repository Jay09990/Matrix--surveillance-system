export interface Recording {
  id: string;
  nvrId: string;
  channel: number;
  startTime: string;
  endTime: string;
  fileName: string;
  fileSize: number; // in bytes
  duration: number; // in seconds
  thumbnailUrl?: string;
}

export interface RecordingCamera {
  nvrId: string;
  channel: number;
  cameraName: string;
  recordingCount: number;
}

export interface StorageStats {
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  recordingCount: number;
  oldestRecording?: string;
  newestRecording?: string;
}
