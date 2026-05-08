import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
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
        const response = await apiService.cameras.listByNvr(nvrId!);
        data = response.data;
      }

      
      // Matrix requirement: always return 16 slots, fill gaps
      const slots: (Camera | null)[] = new Array(16).fill(null);
      data.forEach((cam) => {
        if (cam.channel >= 1 && cam.channel <= 16) {
          slots[cam.channel - 1] = cam;
        }
      });

      return slots;
    },
    enabled: !!nvrId,
  });
};
