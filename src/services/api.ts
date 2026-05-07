import { api } from '../lib/axios';
import type { Station } from '../types/station';
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

  // --- Stations ---
  stations: {
    list: () => api.get<Station[]>('/stations'),
    get: (id: string) => api.get<Station>(`/stations/${id}`),
    create: (data: any) => api.post('/stations', data),
    delete: (id: string) => api.delete(`/stations/${id}`),
  },

  // --- NVRs ---
  nvrs: {
    listByStation: (stationId: string) => api.get<NVR[]>(`/stations/${stationId}/nvrs`),
    create: (stationId: string, data: any) => api.post(`/stations/${stationId}/nvrs`, data),
    update: (stationId: string, id: string, data: any) => api.put(`/stations/${stationId}/nvrs/${id}`, data),
    delete: (stationId: string, id: string) => api.delete(`/stations/${stationId}/nvrs/${id}`),
    
    // Detection
    detection: {
      status: (nvrId: string) => api.get(`/nvrs/${nvrId}/detection/status`),
      start: (nvrId: string) => api.post(`/nvrs/${nvrId}/detection/start`),
      stop: (nvrId: string) => api.post(`/nvrs/${nvrId}/detection/stop`),
      active: () => api.get('/nvrs/detection/active'),
    }
  },

  // --- Cameras & Streams ---
  cameras: {
    listByNvr: (nvrId: string) => api.get<Camera[]>(`/nvrs/${nvrId}/cameras`),
  },

  streams: {
    resolve: (nvrId: string, channel: number) => 
      api.get(`/nvrs/${nvrId}/streams/${channel}`),
  }
};
