import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import type { Camera } from '../../types/camera';
import { USE_MOCKDATA } from '../../config';
import { MOCK_CAMERAS } from '../../lib/mockData';

export const useChannels = (nvrId: string | null) => {
  return useQuery({
    queryKey: ['channels', nvrId],
    queryFn: async () => {
      if (USE_MOCKDATA) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return nvrId ? (MOCK_CAMERAS[nvrId] || []) : [];
      }

      const response = await apiService.cameras.listByNvr(nvrId!);
      return response.data; // backend already returns 16 slots
    },
    enabled: !!nvrId,
  });
};
