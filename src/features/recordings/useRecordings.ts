import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import type { RecordingCamera } from '../../types/recording';

export function useRecordingCameras() {
  return useQuery<RecordingCamera[]>({
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

export function useRecordingTimeline(nvrId: string | null, channel: number | null, date: string | null) {
  return useQuery({
    queryKey: ['recordings', 'timeline', nvrId, channel, date],
    enabled: !!nvrId && channel !== null && !!date,
    queryFn: async () => {
      if (!nvrId || channel === null || !date) return [];
      const res = await api.get(`/recordings/${nvrId}/${channel}/timeline`, { params: { date } });
      return res.data;
    },
  });
}

export function useRecordingDays(nvrId: string | null, channel: number | null) {
  return useQuery({
    queryKey: ['recordings', 'days', nvrId, channel],
    enabled: !!nvrId && channel !== null,
    queryFn: async () => {
      if (!nvrId || channel === null) return { days: [] };
      const res = await api.get(`/recordings/${nvrId}/${channel}/days`);
      return res.data as { days: string[] };
    },
  });
}
