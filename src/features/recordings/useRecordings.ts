import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import type { PlaybackCamera, PlaybackRecording } from '../../types/playback';

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
    queryFn: async () => {
      if (!nvrId || channel === null || !date) return [];
      const { data } = await apiService.playback.recordings(nvrId, channel, date);
      return data;
    },
  });
}
