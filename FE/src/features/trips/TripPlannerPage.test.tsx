import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/client';
import type { Trip } from '@/shared/api/types';
import TripPlannerPage from './TripPlannerPage';
import { resolveDragAction } from './dragActions';

vi.mock('./api', () => ({
  getTrips: vi.fn(),
  getTrip: vi.fn(),
  createTrip: vi.fn(),
  updateTrip: vi.fn(),
  addDestinationToDay: vi.fn(),
  removeDestinationFromDay: vi.fn(),
  addToSavedPlaces: vi.fn(),
  removeFromSavedPlaces: vi.fn(),
  scheduleSavedPlace: vi.fn(),
  reorderDayDestinations: vi.fn(),
  moveDestinationBetweenDays: vi.fn(),
}));

import {
  getTrip,
  moveDestinationBetweenDays,
  removeDestinationFromDay,
  removeFromSavedPlaces,
  reorderDayDestinations,
  scheduleSavedPlace,
  updateTrip,
} from './api';

const getTripMock = vi.mocked(getTrip);
const removeDestinationFromDayMock = vi.mocked(removeDestinationFromDay);
const removeFromSavedPlacesMock = vi.mocked(removeFromSavedPlaces);
const scheduleSavedPlaceMock = vi.mocked(scheduleSavedPlace);
const reorderDayDestinationsMock = vi.mocked(reorderDayDestinations);
const moveDestinationBetweenDaysMock = vi.mocked(moveDestinationBetweenDays);
const updateTripMock = vi.mocked(updateTrip);

const savedLouvre = {
  id: 99,
  name: 'Notre-Dame',
  rating: 4,
  category: 'Landmark',
  xid: 'xid-notredame',
  openingHours: null,
};

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
        },
      ],
    },
    { day: '2026-08-02', destinations: [] },
  ],
  savedPlaces: [],
};

const tripWithSaved: Trip = { ...trip, savedPlaces: [savedLouvre] };

const eiffel = {
  id: 43,
  name: 'Eiffel Tower',
  rating: 5,
  category: 'Landmark',
  xid: 'xid-eiffel',
  openingHours: null,
};

const tripTwoDests: Trip = {
  ...trip,
  tripDays: [
    { day: '2026-08-01', destinations: [trip.tripDays[0].destinations[0], eiffel] },
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
  removeFromSavedPlacesMock.mockReset();
  scheduleSavedPlaceMock.mockReset();
  reorderDayDestinationsMock.mockReset();
  moveDestinationBetweenDaysMock.mockReset();
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

  it('shows the Saved Places empty state when the pool is empty', async () => {
    getTripMock.mockResolvedValue(trip);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Saved Places' })).toBeInTheDocument();
    });
    expect(screen.getByText(/no saved places yet/i)).toBeInTheDocument();
  });

  it('lists saved places with a link and an accessible add-to-day control', async () => {
    getTripMock.mockResolvedValue(tripWithSaved);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Notre-Dame')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /notre-dame/i })).toHaveAttribute(
      'href',
      '/attractions/xid-notredame',
    );
    expect(screen.getByLabelText('Add Notre-Dame to a day')).toBeInTheDocument();
  });

  it('schedules a saved place onto a day via the accessible select and moves it optimistically', async () => {
    getTripMock.mockResolvedValueOnce(tripWithSaved);
    getTripMock.mockResolvedValue({
      ...trip,
      tripDays: [
        trip.tripDays[0],
        { day: '2026-08-02', destinations: [savedLouvre] },
      ],
      savedPlaces: [],
    });
    scheduleSavedPlaceMock.mockResolvedValue({
      ...trip,
      tripDays: [
        trip.tripDays[0],
        { day: '2026-08-02', destinations: [savedLouvre] },
      ],
      savedPlaces: [],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Notre-Dame')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Add Notre-Dame to a day'), {
      target: { value: '2026-08-02' },
    });

    await waitFor(() => {
      expect(scheduleSavedPlaceMock).toHaveBeenCalledWith(7, '2026-08-02', { destinationId: 99 });
    });
    await waitFor(() => {
      expect(screen.queryByText(/no saved places yet/i)).toBeInTheDocument();
    });
  });

  it('rolls back and shows an alert when scheduling hits a duplicate on the day', async () => {
    getTripMock.mockResolvedValue(tripWithSaved);
    scheduleSavedPlaceMock.mockRejectedValue(
      new ApiError(400, 'Destination already exists in this day.'),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Notre-Dame')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Add Notre-Dame to a day'), {
      target: { value: '2026-08-01' },
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Destination already exists in this day.');
    });
    expect(screen.getByText('Notre-Dame')).toBeInTheDocument();
  });

  it('removes a saved place from the pool', async () => {
    getTripMock.mockResolvedValueOnce(tripWithSaved);
    getTripMock.mockResolvedValue(trip);
    removeFromSavedPlacesMock.mockResolvedValue(undefined);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Notre-Dame')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /remove notre-dame from saved places/i }));

    await waitFor(() => {
      expect(removeFromSavedPlacesMock).toHaveBeenCalledWith(7, 99);
    });
  });

  it('disables Move up on the first row and Move down on the last row', async () => {
    getTripMock.mockResolvedValue(tripTwoDests);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Move Louvre Museum up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Louvre Museum down' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Eiffel Tower up' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Eiffel Tower down' })).toBeDisabled();
  });

  it('reorders a day optimistically via the accessible Move down control', async () => {
    getTripMock.mockResolvedValue(tripTwoDests);
    reorderDayDestinationsMock.mockImplementation(() => new Promise(() => {}));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Move Louvre Museum down' }));

    await waitFor(() => {
      expect(reorderDayDestinationsMock).toHaveBeenCalledWith(7, '2026-08-01', {
        destinationIds: [43, 42],
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Move Louvre Museum up' })).toBeEnabled();
    });
    expect(screen.getByRole('button', { name: 'Move Louvre Museum down' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Eiffel Tower up' })).toBeDisabled();
  });

  it('rolls back and shows an alert when a reorder fails', async () => {
    getTripMock.mockResolvedValue(tripTwoDests);
    reorderDayDestinationsMock.mockRejectedValue(new ApiError(400, 'Reorder rejected.'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Move Louvre Museum down' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Reorder rejected.');
    });
    expect(screen.getByRole('button', { name: 'Move Louvre Museum up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Eiffel Tower down' })).toBeDisabled();
  });

  it('moves a destination to another day via the accessible Move-to-day select', async () => {
    getTripMock.mockResolvedValue(tripTwoDests);
    moveDestinationBetweenDaysMock.mockImplementation(() => new Promise(() => {}));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Move Louvre Museum to another day'), {
      target: { value: '2026-08-02' },
    });

    await waitFor(() => {
      expect(moveDestinationBetweenDaysMock).toHaveBeenCalledWith(7, '2026-08-01', 42, {
        toDate: '2026-08-02',
      });
    });
  });

  it('excludes the row own day from the Move-to-day options', async () => {
    getTripMock.mockResolvedValue(tripTwoDests);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Move Louvre Museum to another day');
    const optionValues = within(select)
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value);
    expect(optionValues).toEqual(['', '2026-08-02']);
  });

  it('rolls back and shows an alert when a cross-day move fails', async () => {
    getTripMock.mockResolvedValue(tripTwoDests);
    moveDestinationBetweenDaysMock.mockRejectedValue(new ApiError(404, 'Day Not Found'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Move Louvre Museum to another day'), {
      target: { value: '2026-08-02' },
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Day Not Found');
    });
  });
});

describe('resolveDragAction', () => {
  const days = tripTwoDests.tripDays;

  it('schedules a saved place dropped onto an empty day droppable', () => {
    expect(resolveDragAction('place-99', 'day-2026-08-02', days)).toEqual({
      kind: 'schedule',
      destinationId: 99,
      date: '2026-08-02',
    });
  });

  it('schedules a saved place dropped onto a destination row of a populated day', () => {
    expect(resolveDragAction('place-99', 'dest-2026-08-01-42', days)).toEqual({
      kind: 'schedule',
      destinationId: 99,
      date: '2026-08-01',
    });
  });

  it('reorders when a row is dropped over another row in the same day', () => {
    expect(resolveDragAction('dest-2026-08-01-42', 'dest-2026-08-01-43', days)).toEqual({
      kind: 'reorder',
      date: '2026-08-01',
      orderedIds: [43, 42],
    });
  });

  it('moves a row dropped onto a destination row of a different day (US6)', () => {
    expect(resolveDragAction('dest-2026-08-01-42', 'dest-2026-08-02-43', days)).toEqual({
      kind: 'move',
      destinationId: 42,
      fromDate: '2026-08-01',
      toDate: '2026-08-02',
    });
  });

  it('moves a row dropped onto a different (empty) day droppable (US6)', () => {
    expect(resolveDragAction('dest-2026-08-01-42', 'day-2026-08-02', days)).toEqual({
      kind: 'move',
      destinationId: 42,
      fromDate: '2026-08-01',
      toDate: '2026-08-02',
    });
  });

  it('is a no-op when the row is dropped over itself', () => {
    expect(resolveDragAction('dest-2026-08-01-42', 'dest-2026-08-01-42', days)).toBeNull();
  });

  it('is a no-op when a row is dropped over its own day droppable', () => {
    expect(resolveDragAction('dest-2026-08-01-42', 'day-2026-08-01', days)).toBeNull();
  });

  it('is a no-op when the active id matches no known handler', () => {
    expect(resolveDragAction('place-99', 'saved-list', days)).toBeNull();
    expect(resolveDragAction('dest-2026-08-01-42', 'saved-list', days)).toBeNull();
  });
});
