import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import type { NVR } from '../../types/nvr';
import { USE_MOCKDATA } from '../../config';
import { MOCK_NVRS_FLAT } from '../../lib/mockData';

/** All NVRs across all stations */
export const useAllNVRs = () => {
  return useQuery({
    queryKey: ['nvrs'],
    queryFn: async (): Promise<NVR[]> => {
      if (USE_MOCKDATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return MOCK_NVRS_FLAT;
      }
      const response = await apiService.nvrs.list();
      return response.data;
    },
  });
};

/** NVRs filtered by station */
export const useNVRsByStation = (stationId: string | null) => {
  return useQuery({
    queryKey: ['nvrs', 'station', stationId],
    queryFn: async (): Promise<NVR[]> => {
      if (USE_MOCKDATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return MOCK_NVRS_FLAT.filter((nvr) => nvr.station.id === stationId);
      }
      const response = await apiService.nvrs.listByStation(stationId!);
      return response.data;
    },
    enabled: !!stationId,
  });
};

/** Single NVR by ID */
export const useNVR = (id: string | null) => {
  return useQuery({
    queryKey: ['nvr', id],
    queryFn: async (): Promise<NVR> => {
      if (USE_MOCKDATA) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const found = MOCK_NVRS_FLAT.find((n) => n.id === id);
        if (!found) throw new Error('NVR not found');
        return found;
      }
      const response = await apiService.nvrs.get(id!);
      return response.data;
    },
    enabled: !!id,
  });
};

// Keep legacy export name as alias for backward compat (used in NVRList sidebar)
export const useNVRs = useNVRsByStation;
