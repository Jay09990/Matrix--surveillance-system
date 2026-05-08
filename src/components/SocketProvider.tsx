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
      // Sync React Query cache
      queryClient.setQueriesData<NVR[]>({ queryKey: ['nvrs'] }, (old) => {
        if (!old) return old;
        return old.map((nvr) => 
          nvr.id === data.nvrId 
            ? { ...nvr, status: data.status, lastSeenAt: data.lastSeenAt, offlineSince: data.offlineSince }
            : nvr
        );
      });

      // Sync Grid Store (New!)
      updateNvrStatus(data.nvrId, data.status, data.lastSeenAt, data.offlineSince);
    });

    // 2. Camera Status Updates
    socket.on('camera:status', (data: { cameraId: string; nvrId: string; channel: number; isOnline: boolean; lastSeenAt?: string }) => {
      const status = data.isOnline ? 'online' : 'offline';
      
      // Update the channel list query if it's currently loaded for this NVR
      queryClient.setQueriesData<Camera[]>({ queryKey: ['channels', data.nvrId] }, (old) => {
        if (!old) return old;
        return old.map((cam) => 
          cam.id === data.cameraId 
            ? { ...cam, status, lastSeenAt: data.lastSeenAt || cam.lastSeenAt }
            : cam
        );
      });

      // Update the main NVR list (if nested cameras exist there)
      queryClient.setQueriesData<NVR[]>({ queryKey: ['nvrs'] }, (old) => {
        if (!old) return old;
        return old.map((nvr) => {
          if (nvr.id !== data.nvrId) return nvr;
          return nvr;
        });
      });
      
      // Sync Grid Store (New!)
      updateChannelStatus(data.cameraId, status, data.lastSeenAt);

      // Invalidate station-specific lists to be sure
      queryClient.invalidateQueries({ queryKey: ['nvrs', 'station'] });
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

