import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../lib/socket';
import { useSessionStore } from '../store/useSessionStore';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import type { NVR } from '../types/nvr';


import type { Camera } from '../types/camera';

import { useGridStore } from '../store/useGridStore';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { token } = useSessionStore();
  const { updateChannelStatus, updateNvrStatus } = useGridStore();

  useEffect(() => {
    if (token) {
      socket.connect();
      
      // 1. Initial Snapshot from REST
      const fetchActiveDetection = async () => {
        try {
          const res = await apiService.nvrs.detection.active();
          if (res.data.activeNvrIds && res.data.activeNvrIds.length > 0) {
            queryClient.setQueriesData<NVR[]>({ queryKey: ['nvrs'] }, (old) => {
              if (!old) return old;
              const activeIds = new Set(res.data.activeNvrIds);
              
              return old.map(nvr => ({
                ...nvr,
                // If it's in the active list, we know it's currently being scanned
                isScanning: activeIds.has(nvr.id)
              }));
            });
          }
        } catch (err) {
          console.error('Failed to fetch initial detection state:', err);
        }
      };


      fetchActiveDetection();
    } else {
      socket.disconnect();
    }

    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);


  useEffect(() => {
    // 1. NVR Status Updates
    socket.on('nvr:status', (data: { nvrId: string; status: string; lastSeenAt?: string; offlineSince?: string }) => {
  // Backend emits ONLINE/OFFLINE (Prisma enum), frontend type expects lowercase
  const normalizedStatus = data.status.toLowerCase() as NVR['status'];

  queryClient.setQueriesData<NVR[]>(
    { queryKey: ['nvrs'], exact: false },
    (old) => {
      if (!old) return old;
      return old.map((nvr) =>
        nvr.id === data.nvrId
          ? { ...nvr, status: normalizedStatus, lastSeenAt: data.lastSeenAt, offlineSince: data.offlineSince }
          : nvr
      );
    }
  );

  updateNvrStatus(data.nvrId, normalizedStatus, data.lastSeenAt, data.offlineSince);
});

    // src/components/SocketProvider.tsx

socket.on('camera:status', (data: { cameraId: string; nvrId: string; channel: number; isOnline: boolean; lastSeenAt?: string }) => {
  queryClient.setQueriesData<(Camera | null)[]>(
    { queryKey: ['channels', data.nvrId] },
    (old) => {
      if (!old) return old;
      return old.map((cam) =>
        cam?.id === data.cameraId
          ? { ...cam, isOnline: data.isOnline, lastSeenAt: data.lastSeenAt ?? cam.lastSeenAt }
          : cam
      );
    }
  );

  // GridStore updateChannelStatus also needs to use isOnline now
  updateChannelStatus(data.cameraId, data.isOnline ? 'online' : 'offline', data.lastSeenAt);
});

    // 3. New Camera Detection
    socket.on('camera:new', (data: { camera: Camera }) => {
      toast.info(`New camera detected: ${data.camera.name}`);
      queryClient.invalidateQueries({ queryKey: ['nvrs'] });
      queryClient.invalidateQueries({ queryKey: ['channels', data.camera.nvrId] });
    });


    return () => {
      socket.off('nvr:status');
      socket.off('camera:status');
      socket.off('camera:new');
    };
  }, [queryClient, updateChannelStatus, updateNvrStatus]);

  return <>{children}</>;
};

