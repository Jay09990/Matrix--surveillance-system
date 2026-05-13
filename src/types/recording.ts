export interface Recording {
  id: string;
  nvrId: string;
  channel: number;
  filename: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  sizeBytes: string;
  createdAt: string;
}

export interface RecordingCamera {
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

export interface TimelineSegment {
  id: string;
  filename: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  sizeBytes: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeGB: string;
  availableBytes: number;
  availableGB: string;
}

export interface SeekResult {
  id: string;
  offsetSeconds: number;
}
