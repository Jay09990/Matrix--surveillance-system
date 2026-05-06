import { Navigate, Outlet } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';

export const RequireAuth = () => {
  const { token } = useSessionStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const RequireAdmin = () => {
  const { user } = useSessionStore();

  if (user?.role !== 'admin') {
    return <Navigate to="/stations" replace />;
  }

  return <Outlet />;
};
