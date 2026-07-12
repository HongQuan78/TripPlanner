import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import type { Trip } from '../api/types';
import TripPlannerPage from './TripPlannerPage';

vi.mock('../api/trips', () => ({
  getTrips: vi.fn(),
  getTrip: vi.fn(),
  createTrip: vi.fn(),
  updateTrip: vi.fn(),
  addDestinationToDay: vi.fn(),
  removeDestinationFromDay: vi.fn(),
}));

import { getTrip, removeDestinationFromDay, updateTrip } from '../api/trips';

const getTripMock = vi.mocked(getTrip);
const removeDestinationFromDayMock = vi.mocked(removeDestinationFromDay);
const updateTripMock = vi.mocked(updateTrip);

const trip: Trip = {
  id: 7,
  name: 'Paris getaway',
  startDate: '2026-08-01',
  endDate: '2026-08-02',
  tripDays: [
    {
      day: '2026-08-01',
      destinations: [
        {
          id: 42,
          name: 'Louvre Museum',
          rating: 3,
          category: 'Landmark',
          openingHours: null,
          cuisineType: null,
          isHalalFriendly: null,
        },
      ],
    },
    { day: '2026-08-02', destinations: [] },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/trips/7']}>
        <Routes>
          <Route path="/trips/:id" element={<TripPlannerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getTripMock.mockReset();
  removeDestinationFromDayMock.mockReset();
  updateTripMock.mockReset();
});

describe('TripPlannerPage', () => {
  it('renders a section per day with date headings and destination details', async () => {
    getTripMock.mockResolvedValue(trip);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Paris getaway' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Aug 1, 2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aug 2, 2026' })).toBeInTheDocument();
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    expect(screen.getByText('Landmark')).toBeInTheDocument();
    expect(screen.getByLabelText('Rated 3 of 3')).toBeInTheDocument();
    expect(screen.getByText(/no destinations planned/i)).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown or foreign trip id', async () => {
    getTripMock.mockRejectedValue(new ApiError(404, 'Trip Not Found'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/trip not found/i)).toBeInTheDocument();
    });
  });

  it('removes a destination after confirming the dialog', async () => {
    getTripMock.mockResolvedValueOnce(trip);
    getTripMock.mockResolvedValue({
      ...trip,
      tripDays: [{ day: '2026-08-01', destinations: [] }, trip.tripDays[1]],
    });
    removeDestinationFromDayMock.mockResolvedValue(undefined);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /remove louvre museum/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/remove louvre museum from this day/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Louvre Museum')).not.toBeInTheDocument();
    });
    expect(removeDestinationFromDayMock).toHaveBeenCalledWith(7, '2026-08-01', 42);
  });

  it('edits the trip with a pre-filled form and updates the day sections', async () => {
    getTripMock.mockResolvedValueOnce(trip);
    getTripMock.mockResolvedValue({
      ...trip,
      endDate: '2026-08-03',
      tripDays: [...trip.tripDays, { day: '2026-08-03', destinations: [] }],
    });
    updateTripMock.mockResolvedValue({ ...trip, endDate: '2026-08-03' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Paris getaway' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit trip/i }));

    expect(screen.getByLabelText(/trip name/i)).toHaveValue('Paris getaway');
    expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-08-01');
    expect(screen.getByLabelText(/end date/i)).toHaveValue('2026-08-02');

    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-08-03' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Aug 3, 2026' })).toBeInTheDocument();
    });
    expect(updateTripMock.mock.calls[0]).toEqual([
      7,
      { name: 'Paris getaway', startDate: '2026-08-01', endDate: '2026-08-03', confirmed: false },
    ]);
  });

  it('opens a confirmation with the server message on 409 and resubmits confirmed', async () => {
    getTripMock.mockResolvedValueOnce(trip);
    getTripMock.mockResolvedValue({
      ...trip,
      endDate: '2026-08-01',
      tripDays: [trip.tripDays[0]],
    });
    updateTripMock.mockRejectedValueOnce(
      new ApiError(409, 'Shrinking the trip removes 1 planned day. Continue?'),
    );
    updateTripMock.mockResolvedValueOnce({ ...trip, endDate: '2026-08-01' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Paris getaway' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit trip/i }));
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Shrinking the trip removes 1 planned day. Continue?'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(updateTripMock).toHaveBeenCalledTimes(2);
    });
    expect(updateTripMock.mock.calls[1]).toEqual([
      7,
      { name: 'Paris getaway', startDate: '2026-08-01', endDate: '2026-08-01', confirmed: true },
    ]);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Aug 2, 2026' })).not.toBeInTheDocument();
    });
  });

  it('keeps everything unchanged when the 409 confirmation is cancelled', async () => {
    getTripMock.mockResolvedValue(trip);
    updateTripMock.mockRejectedValueOnce(
      new ApiError(409, 'Shrinking the trip removes 1 planned day. Continue?'),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Paris getaway' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit trip/i }));
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(updateTripMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Aug 2, 2026' })).toBeInTheDocument();
  });

  it('keeps the destination when the remove dialog is cancelled', async () => {
    getTripMock.mockResolvedValue(trip);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /remove louvre museum/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    expect(removeDestinationFromDayMock).not.toHaveBeenCalled();
  });
});
