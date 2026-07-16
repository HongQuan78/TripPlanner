import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
          xid: 'xid-louvre',
          openingHours: null,
          cuisineType: null,
          isHalalFriendly: null,
        },
      ],
    },
    { day: '2026-08-02', destinations: [] },
  ],
};

function renderPage(path = '/trips/7') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/trips/:id" element={<TripPlannerPage />} />
          <Route path="/" element={<p>search screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getTripMock.mockReset();
  removeDestinationFromDayMock.mockReset();
  updateTripMock.mockReset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 6, 1, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TripPlannerPage', () => {
  it('renders a section per day with date headings and destination details', async () => {
    getTripMock.mockResolvedValue(trip);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Paris getaway' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Sat · Aug 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sun · Aug 2' })).toBeInTheDocument();
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    expect(screen.getByText('Landmark')).toBeInTheDocument();
    expect(screen.getByLabelText('Rated 3 of 3')).toBeInTheDocument();
    expect(screen.getByText(/no destinations planned/i)).toBeInTheDocument();
  });

  it('renders the summary ticket stats with the unplanned hint', async () => {
    getTripMock.mockResolvedValue(trip);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Paris getaway' })).toBeInTheDocument();
    });

    expect(screen.getByText('1 place')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.getByText('Unplanned')).toBeInTheDocument();
  });

  it('shows "All planned" when every day has a destination', async () => {
    getTripMock.mockResolvedValue({
      ...trip,
      tripDays: [trip.tripDays[0], { day: '2026-08-02', destinations: trip.tripDays[0].destinations }],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Paris getaway' })).toBeInTheDocument();
    });

    expect(screen.getByText('All planned')).toBeInTheDocument();
  });

  it('marks the current day with a Today marker while the trip is ongoing', async () => {
    vi.setSystemTime(new Date(2026, 7, 1, 9, 0));
    getTripMock.mockResolvedValue(trip);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sat · Aug 1 Today' })).toBeInTheDocument();
    });
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('hands off to discovery when adding a destination to a day', async () => {
    getTripMock.mockResolvedValue(trip);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add a destination to Aug 1, 2026' }));

    await waitFor(() => {
      expect(screen.getByText('search screen')).toBeInTheDocument();
    });
  });

  it('moves focus to the day heading after a successful removal', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Louvre Museum')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Sat · Aug 1' })).toHaveFocus();
  });

  it('links a trip destination with an xid to its details page', async () => {
    getTripMock.mockResolvedValue(trip);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /louvre museum/i })).toHaveAttribute(
      'href',
      '/attractions/xid-louvre',
    );
  });

  it('renders a destination without an xid as non-clickable text', async () => {
    getTripMock.mockResolvedValue({
      ...trip,
      tripDays: [
        {
          day: '2026-08-01',
          destinations: [{ ...trip.tripDays[0].destinations[0], xid: null }],
        },
        trip.tripDays[1],
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /louvre museum/i })).not.toBeInTheDocument();
  });

  it('does not navigate when clicking Remove on a linked destination', async () => {
    getTripMock.mockResolvedValue(trip);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /remove louvre museum/i }));

    expect(screen.getByRole('heading', { name: 'Paris getaway' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown or foreign trip id', async () => {
    getTripMock.mockRejectedValue(new ApiError(404, 'Trip Not Found'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/trip not found/i)).toBeInTheDocument();
    });
  });

  it('shows the not-found state for a malformed trip id without fetching', () => {
    renderPage('/trips/abc');

    expect(screen.getByText(/trip not found/i)).toBeInTheDocument();
    expect(getTripMock).not.toHaveBeenCalled();
  });

  it('shows an error and keeps the destination when removal fails', async () => {
    getTripMock.mockResolvedValue(trip);
    removeDestinationFromDayMock.mockRejectedValue(new ApiError(503, 'Service unavailable.'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /remove louvre museum/i }));
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => {
      expect(screen.getByText('Service unavailable.')).toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { name: 'Mon · Aug 3' })).toBeInTheDocument();
    });
    expect(updateTripMock.mock.calls[0]).toEqual([
      7,
      { name: 'Paris getaway', startDate: '2026-08-01', endDate: '2026-08-03', confirmed: false },
    ]);
  });

  it('shows a generic error when saving fails without an API error', async () => {
    getTripMock.mockResolvedValue(trip);
    updateTripMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Paris getaway' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit trip/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
      expect(screen.queryByRole('heading', { name: 'Sun · Aug 2' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Sun · Aug 2' })).toBeInTheDocument();
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
