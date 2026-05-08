import { useMutation } from '@tanstack/react-query';

import { apiService } from '../../services/api';

export const useDetection = (nvrId: string | null) => {
  const startMutation = useMutation({
    mutationFn: (id: string) => apiService.nvrs.detection.start(id),
  });

  const stopMutation = useMutation({
    mutationFn: (id: string) => apiService.nvrs.detection.stop(id),
  });

  return {
    startDetection: startMutation.mutateAsync,
    stopDetection: stopMutation.mutateAsync,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
};
