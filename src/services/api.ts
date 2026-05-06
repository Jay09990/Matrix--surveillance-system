import axios from 'axios';
import type { Camera, CameraStreamResponse, HealthResponse } from '../types/camera';

const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: getBaseUrl(),
});

export const checkHealth = async (): Promise<HealthResponse> => {
  const { data } = await api.get<HealthResponse>('/health');
  return data;
};

export const getCameras = async (): Promise<Camera[]> => {
  const { data } = await api.get<Camera[]>('/cameras');
  return data;
};

export const getCameraStreamUrl = async (cameraId: string): Promise<CameraStreamResponse> => {
  const { data } = await api.get<CameraStreamResponse>(`/cameras/${cameraId}/stream`);
  return data;
};