import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useSessionStore } from '../../store/useSessionStore';
import type { LoginFormData } from '../../schemas/auth.schema';
import type { User } from '../../types/user';
import { USE_MOCKDATA } from '../../config';
import { MOCK_USER } from '../../lib/mockData';

interface LoginResponse {
  user: User;
  token: string;
}

export const useLogin = () => {
  const { setSession } = useSessionStore();

  return useMutation({
    mutationFn: async (data: LoginFormData) => {
      if (USE_MOCKDATA) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (data.email === 'admin@matrix.vms' && data.password === 'password123') {
          return { user: MOCK_USER, token: 'mock-jwt-token' };
        }
        throw { response: { status: 401 } };
      }
      const response = await api.post<LoginResponse>('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      setSession(data.user, data.token);
    },
  });
};
