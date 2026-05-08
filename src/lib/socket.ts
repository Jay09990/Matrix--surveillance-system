import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') 
  : 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // Connect manually when token is available
});
