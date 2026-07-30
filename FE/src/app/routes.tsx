import { Outlet } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import RequireAuth from '@/features/auth/RequireAuth';
import AppLayout from './AppLayout';
import DestinationDetailsPage from '@/features/destinations/DestinationDetailsPage';
import LoginPage from '@/features/auth/LoginPage';
import NotFoundPage from './NotFoundPage';
import RegisterPage from '@/features/auth/RegisterPage';
import SearchPage from '@/features/destinations/SearchPage';
import TripPlannerPage from '@/features/trips/TripPlannerPage';
import TripsPage from '@/features/trips/TripsPage';
import VerifyEmailPage from '@/features/auth/VerifyEmailPage';
import { AddToTripProvider } from '@/features/trips/AddToTripContext';

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
