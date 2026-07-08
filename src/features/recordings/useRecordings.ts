import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import type { PlaybackCamera, PlaybackRecording } from '../../types/playback';

export interface RecordingWithMeta extends PlaybackRecording {
  nvrId: string;
  channel: number;
  stationName: string;
  nvrName: string;
  cameraName: string;
}

/**
 * Playback data hooks backed by NVR storage and MediaMTX playback sessions.
 */

export function usePlaybackCameras() {
  return useQuery<PlaybackCamera[]>({
    queryKey: ['playback', 'cameras'],
    queryFn: async () => {
      const { data: nvrs } = await apiService.nvrs.list();
      const camerasByNvr = await Promise.all(
        nvrs.map(async (nvr) => {
          const { data: cameras } = await apiService.cameras.listByNvr(nvr.id);

          return cameras.map((camera) => ({
            cameraId: camera.id,
            nvrId: camera.nvrId,
            channel: camera.channel,
            cameraName: camera.name,
            isOnline: camera.isOnline,
            nvr: {
              id: nvr.id,
              name: nvr.name,
              ip: nvr.ip,
              station: nvr.station,
            },
          }));
        })
      );

      return camerasByNvr.flat();
    },
  });
}

export function usePlaybackRecordings(
  nvrId: string | null,
  channel: number | null,
  date: string | null
) {
  return useQuery<PlaybackRecording[]>({
    queryKey: ['playback', 'recordings', nvrId, channel, date],
    enabled: !!nvrId && channel !== null && !!date,
    staleTime: 0,
    queryFn: async () => {
      if (!nvrId || channel === null || !date) return [];
      const { data } = await apiService.playback.recordings(nvrId, channel, date);
      return data;
    },
  });
}

export function useRecordingDays(
  nvrId: string | null,
  channel: number | null,
  year: number,
  month: number,
) {
  return useQuery<number[]>({
    queryKey: ['playback', 'recording-days', nvrId, channel, year, month],
    enabled: !!nvrId && channel !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await apiService.playback.recordingDays(nvrId!, channel!, year, month);
      return data.days;
    },
  });
}

/**
 * Fetches recordings for ALL cameras for a given date in parallel.
 * Used by DownloadPage to populate the full recordings table.
 */
export function useAllRecordingsForDate(date: string | null) {
  const { data: cameras } = usePlaybackCameras();

  return useQuery<RecordingWithMeta[]>({
    queryKey: [
      'playback',
      'all-recordings',
      date,
      cameras?.map((c) => `${c.nvrId}-${c.channel}`).join(',') ?? '',
    ],
    enabled: !!date && !!cameras && cameras.length > 0,
    queryFn: async () => {
      if (!date || !cameras || cameras.length === 0) return [];

      const results = await Promise.allSettled(
        cameras.map(async (camera: PlaybackCamera) => {
          const { data } = await apiService.playback.recordings(
            camera.nvrId,
            camera.channel,
            date,
          );
          return (data as PlaybackRecording[]).map((rec): RecordingWithMeta => ({
            ...rec,
            nvrId: camera.nvrId,
            channel: camera.channel,
            stationName: camera.nvr.station?.name ?? 'Unknown Station',
            nvrName: camera.nvr.name ?? 'Unknown NVR',
            cameraName: camera.cameraName,
          }));
        }),
      );

      return results
        .filter(
          (r): r is PromiseFulfilledResult<RecordingWithMeta[]> =>
            r.status === 'fulfilled',
        )
        .flatMap((r) => r.value);
    },
  });
}


