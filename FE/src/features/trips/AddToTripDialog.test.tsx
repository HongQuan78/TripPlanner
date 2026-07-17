import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/client';
import type { Trip } from '@/shared/api/types';
import AddToTripDialog from './AddToTripDialog';

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
}));

import { addDestinationToDay, addToSavedPlaces, getTrips } from './api';

const getTripsMock = vi.mocked(getTrips);
const addDestinationToDayMock = vi.mocked(addDestinationToDay);
const addToSavedPlacesMock = vi.mocked(addToSavedPlaces);

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
  {
    id: 8,
    name: 'Tokyo weekend',
    startDate: '2026-09-05',
    endDate: '2026-09-05',
    tripDays: [{ day: '2026-09-05', destinations: [] }],
    savedPlaces: [],
  },
];

function renderDialog(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AddToTripDialog xid="W123" onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onClose;
}

beforeEach(() => {
  getTripsMock.mockReset();
  addDestinationToDayMock.mockReset();
  addToSavedPlacesMock.mockReset();
});

describe('AddToTripDialog', () => {
  it('adds the destination to the picked trip and day with the xid', async () => {
    getTripsMock.mockResolvedValue(trips);
    addDestinationToDayMock.mockResolvedValue(trips[0].tripDays[1]);
    const onClose = renderDialog();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /paris getaway/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris getaway/i }));
    fireEvent.click(screen.getByRole('button', { name: /aug 2, 2026/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(addDestinationToDayMock).toHaveBeenCalledWith(7, '2026-08-02', { xid: 'W123' });
  });

  it('adds the destination to Saved Places for the picked trip', async () => {
    getTripsMock.mockResolvedValue(trips);
    addToSavedPlacesMock.mockResolvedValue({ ...trips[0], savedPlaces: [] });
    const onClose = renderDialog();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /paris getaway/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris getaway/i }));
    fireEvent.click(screen.getByRole('button', { name: /add to saved places/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(addToSavedPlacesMock).toHaveBeenCalledWith(7, { xid: 'W123' });
    expect(addDestinationToDayMock).not.toHaveBeenCalled();
  });

  it('lets me go back from the day list to the trip list', async () => {
    getTripsMock.mockResolvedValue(trips);
    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tokyo weekend/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /tokyo weekend/i }));

    expect(screen.getByRole('button', { name: /sep 5, 2026/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByRole('button', { name: /paris getaway/i })).toBeInTheDocument();
  });

  it('surfaces the backend message when the destination is already on that day', async () => {
    getTripsMock.mockResolvedValue(trips);
    addDestinationToDayMock.mockRejectedValue(
      new ApiError(400, 'Destination already exists in this day.'),
    );
    const onClose = renderDialog();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /paris getaway/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /paris getaway/i }));
    fireEvent.click(screen.getByRole('button', { name: /aug 1, 2026/i }));

    await waitFor(() => {
      expect(screen.getByText('Destination already exists in this day.')).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('prompts to create a trip when I have none', async () => {
    getTripsMock.mockResolvedValue([]);
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(/no trips yet/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /create a trip/i })).toHaveAttribute('href', '/trips');
  });

  it('closes without adding anything when cancelled', async () => {
    getTripsMock.mockResolvedValue(trips);
    const onClose = renderDialog();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /paris getaway/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(addDestinationToDayMock).not.toHaveBeenCalled();
  });
});
