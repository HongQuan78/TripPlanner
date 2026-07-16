import { Outlet } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import RequireAuth from './auth/RequireAuth';
import AppLayout from './layout/AppLayout';
import DestinationDetailsPage from './pages/DestinationDetailsPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import TripPlannerPage from './pages/TripPlannerPage';
import TripsPage from './pages/TripsPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import { AddToTripProvider } from './trips/AddToTripContext';

export const routes: RouteObject[] = [
  {
    element: (
      <AuthProvider>
        <AddToTripProvider>
          <Outlet />
        </AddToTripProvider>
      </AuthProvider>
    ),
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <SearchPage /> },
          { path: '/search', element: <SearchPage /> },
          { path: '/attractions/:xid', element: <DestinationDetailsPage /> },
          {
            path: '/trips',
            element: (
              <RequireAuth>
                <TripsPage />
              </RequireAuth>
            ),
          },
          {
            path: '/trips/:id',
            element: (
              <RequireAuth>
                <TripPlannerPage />
              </RequireAuth>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      { path: '/register', element: <RegisterPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
    ],
  },
];
