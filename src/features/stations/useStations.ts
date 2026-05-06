import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import type { Station } from '../../types/station';
import { USE_MOCKDATA } from '../../config';
import { MOCK_STATIONS } from '../../lib/mockData';

export const useStations = () => {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      if (USE_MOCKDATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return MOCK_STATIONS;
      }
      const response = await api.get<Station[]>('/stations');
      return response.data;
    },
  });
};
