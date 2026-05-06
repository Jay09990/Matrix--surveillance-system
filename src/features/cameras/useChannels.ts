import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import type { Camera } from '../../types/camera';
import { USE_MOCKDATA } from '../../config';
import { MOCK_CAMERAS } from '../../lib/mockData';

export const useChannels = (nvrId: string | null) => {
  return useQuery({
    queryKey: ['channels', nvrId],
    queryFn: async () => {
      let data: Camera[] = [];
      
      if (USE_MOCKDATA) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        data = nvrId ? (MOCK_CAMERAS[nvrId] || []) : [];
      } else {
        const response = await api.get<Camera[]>(`/nvrs/${nvrId}/cameras`);
        data = response.data;
      }
      
      // Matrix requirement: always return 32 slots, fill gaps
      const slots: (Camera | null)[] = new Array(32).fill(null);
      data.forEach((cam) => {
        if (cam.channel >= 1 && cam.channel <= 32) {
          slots[cam.channel - 1] = cam;
        }
      });
      return slots;
    },
    enabled: !!nvrId,
  });
};
