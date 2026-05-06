import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import type { NVR } from '../../types/nvr';
import { USE_MOCKDATA } from '../../config';
import { MOCK_NVRS } from '../../lib/mockData';

export const useNVRs = (stationId: string) => {
  return useQuery({
    queryKey: ['nvrs', stationId],
    queryFn: async () => {
      if (USE_MOCKDATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return MOCK_NVRS[stationId] || [];
      }
      const response = await api.get<NVR[]>(`/stations/${stationId}/nvrs`);
      return response.data;
    },
    enabled: !!stationId,
  });
};
