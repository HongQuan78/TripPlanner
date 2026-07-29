import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '@/shared/api/models/trip/trip';
import { AddToTripProvider, PENDING_ADD_KEY } from './AddToTripContext';
import { useAddToTrip } from './useAddToTrip';

vi.mock('./tripService', () => ({
  tripService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    addDestinationToDay: vi.fn(),
    removeDestinationFromDay: vi.fn(),
    addToSavedPlaces: vi.fn(),
    removeFromSavedPlaces: vi.fn(),
    scheduleSavedPlace: vi.fn(),
  },
}));

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { tripService } from './tripService';
import { useAuth } from '@/features/auth/useAuth';

const getTripsMock = vi.mocked(tripService.getAll);
const addDestinationToDayMock = vi.mocked(tripService.addDestinationToDay);
const useAuthMock = vi.mocked(useAuth);

const trips: Trip[] = [
  {
    id: 7,
    name: 'Paris getaway',
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    tripDays: [
      { day: '2026-08-01', destinations: [] },
      { day: '2026-08-02', destinations: [] },
    ],
    savedPlaces: [],
  },
];

function setAuthenticated(isAuthenticated: boolean) {
  useAuthMock.mockReturnValue({
    user: isAuthenticated ? { id: 1, email: 'user@example.com', role: 'User' } : null,
    token: isAuthenticated ? 'token' : null,
    isAuthenticated,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

function LoginProbe() {
  const location = useLocation();
  return <p data-testid="login-screen">{location.search}</p>;
}

function Entry() {
  const { requestAdd } = useAddToTrip();
  return (
    <button type="button" onClick={() => requestAdd('W123')}>
      Add W123
    </button>
  );
}

function renderWithProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/attractions/W123']}>
        <AddToTripProvider>
          <Routes>
            <Route path="/attractions/:xid" element={<Entry />} />
            <Route path="/login" element={<LoginProbe />} />
          </Routes>
        </AddToTripProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getTripsMock.mockReset();
  addDestinationToDayMock.mockReset();
  useAuthMock.mockReset();
  sessionStorage.clear();
});

describe('AddToTripProvider', () => {
  it('opens the picker immediately when logged in', async () => {
    setAuthenticated(true);
    getTripsMock.mockResolvedValue(trips);
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: /add w123/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(await screen.findByRole('button', { name: /paris getaway/i })).toBeInTheDocument();
  });

  it('stashes the xid and redirects to login when logged out', () => {
    setAuthenticated(false);
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: /add w123/i }));

    expect(sessionStorage.getItem(PENDING_ADD_KEY)).toBe('W123');
    expect(screen.getByTestId('login-screen')).toHaveTextContent(
      'returnTo=%2Fattractions%2FW123',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('replays the pending add by reopening the picker after login', async () => {
    setAuthenticated(true);
    getTripsMock.mockResolvedValue(trips);
    sessionStorage.setItem(PENDING_ADD_KEY, 'W123');
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(sessionStorage.getItem(PENDING_ADD_KEY)).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: /paris getaway/i }));
    fireEvent.click(screen.getByRole('button', { name: /aug 1, 2026/i }));

    await waitFor(() => {
      expect(addDestinationToDayMock).toHaveBeenCalledWith(7, '2026-08-01', { xid: 'W123' });
    });
  });
});
