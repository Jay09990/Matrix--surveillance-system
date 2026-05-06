import type { Camera, CameraStreamResponse, HealthResponse } from '../types/camera';

const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await fetch(`${getBaseUrl()}/health`);
  if (!response.ok) {
    throw new Error('Backend offline');
  }
  return response.json();
};

export const getCameras = async (): Promise<Camera[]> => {
  const response = await fetch(`${getBaseUrl()}/api/cameras`);
  if (!response.ok) {
    throw new Error('Failed to fetch cameras');
  }
  return response.json();
};

export const getCameraStreamUrl = async (cameraId: string): Promise<CameraStreamResponse> => {
  const response = await fetch(`${getBaseUrl()}/api/cameras/${cameraId}/stream`);
  if (!response.ok) {
    throw new Error('Failed to fetch stream URL');
  }
  return response.json();
};