import { api } from '../lib/axios';
import type { NVR } from '../types/nvr';
import type { Camera } from '../types/camera';

/**
 * Centralized API Service
 *
 * This file serves as the single source of truth for all backend interactions.
 */

export const apiService = {
  // --- Auth ---
  auth: {
    login: (credentials: any) => api.post('/auth/login', credentials),
    me: () => api.get('/auth/me'),
  },

  // --- NVRs (flat endpoints) ---
  nvrs: {
    list: () => api.get<NVR[]>('/nvrs'),
    listByStation: (stationId: string) => api.get<NVR[]>(`/nvrs/station/${stationId}`),
    get: (id: string) => api.get<NVR>(`/nvrs/${id}`),
    create: (data: any) => api.post<NVR>('/nvrs', data),
    update: (id: string, data: any) => api.put<NVR>(`/nvrs/${id}`, data),
    delete: (id: string) => api.delete(`/nvrs/${id}`),

    // Detection
    detection: {
      start: (nvrId: string) => api.post(`/nvrs/${nvrId}/detection/start`),
      stop: (nvrId: string) => api.post(`/nvrs/${nvrId}/detection/stop`),
      active: () => api.get<{ isRunning: boolean, activeNvrIds: string[] }>('/detection/active'),

    },


  },

  // --- Cameras & Streams ---
  cameras: {
    listByNvr: (nvrId: string) => api.get<Camera[]>(`/nvrs/${nvrId}/cameras`),
  },

  streams: {
    resolve: (payload: { nvrId: string; channel: number }[]) =>
      api.post('/streams/resolve', payload),
  },

};
