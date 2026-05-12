import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export function useRecordingCameras() {
  return useQuery({
    queryKey: ['recordings', 'cameras'],
    queryFn: async () => {
      const res = await api.get('/recordings');
      return res.data;
    },
  });
}

export function useRecordings(
  nvrId: string | null,
  channel: number | null,
  dateRange?: { from: string; to: string }
) {
  return useQuery({
    queryKey: ['recordings', nvrId, channel, dateRange],
    queryFn: async () => {
      if (!nvrId || channel === null) return [];
      const res = await api.get(`/recordings/${nvrId}/${channel}`, {
        params: dateRange,
      });
      return res.data;
    },
    enabled: !!nvrId && channel !== null,
  });
}

export function useStorageStats() {
  return useQuery({
    queryKey: ['recordings', 'stats'],
    queryFn: async () => {
      const res = await api.get('/recordings/stats');
      return res.data;
    },
  });
}

export function getRecordingStreamUrl(recordingId: string): string {
  return `${BASE}/recordings/stream/${recordingId}`;
}
