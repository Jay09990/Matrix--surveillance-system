import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';

export const useDetection = (nvrId: string | null) => {
  const statusQuery = useQuery({
    queryKey: ['detection-status', nvrId],
    queryFn: async () => {
      if (!nvrId) return null;
      const res = await api.get(`/nvrs/${nvrId}/detection/status`);
      return res.data;
    },
    enabled: !!nvrId,
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/nvrs/${id}/detection/start`);
      return res.data;
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/nvrs/${id}/detection/stop`);
      return res.data;
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    startDetection: startMutation.mutateAsync,
    stopDetection: stopMutation.mutateAsync,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
};
