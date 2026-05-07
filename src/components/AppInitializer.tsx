import { useEffect } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { api } from '../lib/axios';

export const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const { token, clearSession } = useSessionStore();

  useEffect(() => {
    const validateToken = async () => {
      if (!token) return;

      try {
        await api.get('/auth/me');
      } catch (error: any) {
        // The 401 interceptor in axios.ts will handle this, 
        // but we explicitly call it here to ensure it fires on load.
        if (error.response?.status === 401) {
          clearSession();
        }
      }
    };

    validateToken();
  }, [token, clearSession]);

  return <>{children}</>;
};
