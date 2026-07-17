import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/client';
import type { Trip } from '@/shared/api/types';
import TripsPage from './TripsPage';

vi.mock('./api', () => ({
  getTrips: vi.fn(),
  getTrip: vi.fn(),
  createTrip: vi.fn(),
  updateTrip: vi.fn(),
  addDestinationToDay: vi.fn(),
  removeDestinationFromDay: vi.fn(),
}));

import { createTrip, getTrips } from './api';

const getTripsMock = vi.mocked(getTrips);
const createTripMock = vi.mocked(createTrip);

const trips: Trip[] = [
  {
    id: 7,
    name: 'Paris getaway',
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    tripDays: [
      { day: '2026-08-01', destinations: [] },
      { day: '2026-08-02', destinations: [] },
      { day: '2026-08-03', destinations: [] },
    ],
    savedPlaces: [],
  },
  {
    id: 8,
    name: 'Tokyo weekend',
    startDate: '2026-09-05',
    endDate: '2026-09-05',
    tripDays: [{ day: '2026-09-05', destinations: [] }],
    savedPlaces: [],
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/trips']}>
        <Routes>
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/:id" element={<p>planner screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getTripsMock.mockReset();
  createTripMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TripsPage', () => {
  it('renders each trip as a boarding pass with route, stub counts, and a planner link', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 6, 16, 9, 0));
    getTripsMock.mockResolvedValue(trips);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Paris getaway')).toBeInTheDocument();
    });

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/trips/7');
    expect(links[1]).toHaveAttribute('href', '/trips/8');

    const paris = within(links[0]);
    expect(paris.getByText('1 Aug')).toBeInTheDocument();
    expect(paris.getByText('3 Aug')).toBeInTheDocument();
    expect(paris.getByText('3')).toBeInTheDocument();
    expect(paris.getByText('Days')).toBeInTheDocument();
    expect(paris.getByText('Places')).toBeInTheDocument();
    expect(paris.getByText('In 16 days')).toBeInTheDocument();

    const tokyo = within(links[1]);
    expect(tokyo.getByText('Day')).toBeInTheDocument();
    expect(tokyo.getByText('Tokyo weekend')).toBeInTheDocument();
  });

  it('derives ongoing and past status pills from the current date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 7, 2, 9, 0));
    getTripsMock.mockResolvedValue(trips);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Paris getaway')).toBeInTheDocument();
    });

    expect(screen.getByText('Ongoing · Day 2')).toBeInTheDocument();
    expect(screen.getByText('In 34 days')).toBeInTheDocument();
  });

  it('shows an empty state with a create prompt when I have no trips', async () => {
    getTripsMock.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no trips yet/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /create your first trip/i })).toBeInTheDocument();
  });

  it('opens the create form from the empty-state prompt', async () => {
    getTripsMock.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create your first trip/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create your first trip/i }));

    expect(screen.getByLabelText(/trip name/i)).toBeInTheDocument();
  });

  it('requires a trip name before submitting', async () => {
    getTripsMock.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create your first trip/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create your first trip/i }));
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-08-03' } });
    fireEvent.click(screen.getByRole('button', { name: /^create trip$/i }));

    expect(screen.getByText(/trip name is required/i)).toBeInTheDocument();
    expect(createTripMock).not.toHaveBeenCalled();
  });

  it('rejects a start date after the end date', async () => {
    getTripsMock.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create your first trip/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create your first trip/i }));
    fireEvent.change(screen.getByLabelText(/trip name/i), { target: { value: 'Paris getaway' } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-08-05' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-08-03' } });
    fireEvent.click(screen.getByRole('button', { name: /^create trip$/i }));

    expect(screen.getByText(/start date must be on or before the end date/i)).toBeInTheDocument();
    expect(createTripMock).not.toHaveBeenCalled();
  });

  it('creates a trip and navigates into its planner', async () => {
    getTripsMock.mockResolvedValue([]);
    createTripMock.mockResolvedValue(trips[0]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create your first trip/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create your first trip/i }));
    fireEvent.change(screen.getByLabelText(/trip name/i), { target: { value: 'Paris getaway' } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-08-03' } });
    fireEvent.click(screen.getByRole('button', { name: /^create trip$/i }));

    await waitFor(() => {
      expect(screen.getByText('planner screen')).toBeInTheDocument();
    });
    expect(createTripMock.mock.calls[0][0]).toEqual({
      name: 'Paris getaway',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
    });
  });

  it('surfaces a server error from the create form', async () => {
    getTripsMock.mockResolvedValue([]);
    createTripMock.mockRejectedValue(new ApiError(400, 'Start date cannot be in the past.'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create your first trip/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create your first trip/i }));
    fireEvent.change(screen.getByLabelText(/trip name/i), { target: { value: 'Paris getaway' } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-08-03' } });
    fireEvent.click(screen.getByRole('button', { name: /^create trip$/i }));

    await waitFor(() => {
      expect(screen.getByText('Start date cannot be in the past.')).toBeInTheDocument();
    });
  });

  it('shows an error state with a retry when the trip list fails to load', async () => {
    getTripsMock.mockRejectedValueOnce(new ApiError(503, 'Service unavailable.'));
    getTripsMock.mockResolvedValueOnce(trips);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/could not load your trips/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Paris getaway')).toBeInTheDocument();
    });
  });
});
