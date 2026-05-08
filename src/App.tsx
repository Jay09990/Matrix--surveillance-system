import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { RequireAuth, RequireAdmin } from './components/RouteGuards';

// Pages
import LoginPage from './pages/LoginPage';
import StationSelectorPage from './pages/StationSelectorPage';
import LiveViewPage from './pages/LiveViewPage';
import AddNVRPage from './pages/AddNVRPage';

import AdminDashboardPage from './pages/AdminDashboardPage';


const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <Navigate to="/stations" replace />,
      },
      {
        path: '/stations',
        element: <StationSelectorPage />,
      },
      {
        path: '/live/:stationId',
        element: <LiveViewPage />,
      },
      {
        path: '/admin',
        element: <RequireAdmin />,
        children: [
          {
            index: true,
            element: <AdminDashboardPage />,
          },
          {
            path: 'nvrs/add',
            element: <AddNVRPage />,
          },
          {
            path: 'nvrs/edit/:nvrId',
            element: <AddNVRPage />,
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" theme="dark" richColors />
    </>
  );
}

export default App;
