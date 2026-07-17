import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '@/shared/api/types';

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
}));

import {
  addDestinationToDay,
  addToSavedPlaces,
  createTrip,
  getTrip,
  getTrips,
  removeDestinationFromDay,
  removeFromSavedPlaces,
  reorderDayDestinations,
  scheduleSavedPlace,
  updateTrip,
} from './api';
import {
  useAddDestinationToDay,
  useAddToSavedPlaces,
  useCreateTrip,
  useRemoveDestinationFromDay,
  useRemoveFromSavedPlaces,
  useReorderDayDestinations,
  useScheduleSavedPlace,
  useTrip,
  useTrips,
  useUpdateTrip,
} from './hooks';

const savedPlace = {
  id: 99,
  name: 'Notre-Dame',
  rating: 4,
  category: 'Landmark',
  xid: 'xid-notredame',
  openingHours: null,
  cuisineType: null,
  isHalalFriendly: null,
};

const trip: Trip = {
  id: 7,
  name: 'Paris getaway',
  startDate: '2026-08-01',
  endDate: '2026-08-03',
  tripDays: [{ day: '2026-08-01', destinations: [] }],
  savedPlaces: [],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, Wrapper };
}

beforeEach(() => {
  vi.mocked(getTrips).mockReset();
  vi.mocked(getTrip).mockReset();
  vi.mocked(createTrip).mockReset();
  vi.mocked(updateTrip).mockReset();
  vi.mocked(addDestinationToDay).mockReset();
  vi.mocked(removeDestinationFromDay).mockReset();
  vi.mocked(addToSavedPlaces).mockReset();
  vi.mocked(removeFromSavedPlaces).mockReset();
  vi.mocked(scheduleSavedPlace).mockReset();
  vi.mocked(reorderDayDestinations).mockReset();
});

const firstDest = {
  id: 1,
  name: 'Louvre',
  rating: 5,
  category: 'Landmark',
  xid: 'xid-louvre',
  openingHours: null,
  cuisineType: null,
  isHalalFriendly: null,
};

const secondDest = {
  id: 2,
  name: 'Eiffel Tower',
  rating: 5,
  category: 'Landmark',
  xid: 'xid-eiffel',
  openingHours: null,
  cuisineType: null,
  isHalalFriendly: null,
};

describe('useTrips', () => {
  it('fetches the trip list', async () => {
    vi.mocked(getTrips).mockResolvedValue([trip]);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTrips(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([trip]);
  });
});

describe('useTrip', () => {
  it('fetches a single trip by id', async () => {
    vi.mocked(getTrip).mockResolvedValue(trip);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTrip(7), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getTrip).toHaveBeenCalledWith(7);
    expect(result.current.data).toEqual(trip);
  });

  it('does not fetch for an invalid id', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useTrip(Number.NaN), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getTrip).not.toHaveBeenCalled();
  });
});

describe('useCreateTrip', () => {
  it('creates a trip and invalidates the trip list', async () => {
    vi.mocked(createTrip).mockResolvedValue(trip);
    const { queryClient, Wrapper } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateTrip(), { wrapper: Wrapper });
    result.current.mutate({
      name: 'Paris getaway',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trips'] });
  });
});

describe('useUpdateTrip', () => {
  it('updates the trip and invalidates the list and the trip', async () => {
    vi.mocked(updateTrip).mockResolvedValue(trip);
    const { queryClient, Wrapper } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateTrip(7), { wrapper: Wrapper });
    result.current.mutate({
      name: 'Paris getaway',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      confirmed: false,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(updateTrip).toHaveBeenCalledWith(7, {
      name: 'Paris getaway',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      confirmed: false,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trips'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trip', 7] });
  });
});

describe('useAddDestinationToDay', () => {
  it('posts the destination and invalidates the list and the trip', async () => {
    vi.mocked(addDestinationToDay).mockResolvedValue(trip.tripDays[0]);
    const { queryClient, Wrapper } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddDestinationToDay(), { wrapper: Wrapper });
    result.current.mutate({ tripId: 7, date: '2026-08-01', body: { xid: 'W123' } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(addDestinationToDay).toHaveBeenCalledWith(7, '2026-08-01', { xid: 'W123' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trips'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trip', 7] });
  });
});

describe('useRemoveDestinationFromDay', () => {
  it('deletes the destination and invalidates the list and the trip', async () => {
    vi.mocked(removeDestinationFromDay).mockResolvedValue(undefined);
    const { queryClient, Wrapper } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRemoveDestinationFromDay(), { wrapper: Wrapper });
    result.current.mutate({ tripId: 7, date: '2026-08-01', destinationId: 42 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(removeDestinationFromDay).toHaveBeenCalledWith(7, '2026-08-01', 42);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trips'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trip', 7] });
  });
});

describe('useAddToSavedPlaces', () => {
  it('adds a destination to the pool and invalidates the list and the trip', async () => {
    vi.mocked(addToSavedPlaces).mockResolvedValue({ ...trip, savedPlaces: [savedPlace] });
    const { queryClient, Wrapper } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddToSavedPlaces(), { wrapper: Wrapper });
    result.current.mutate({ tripId: 7, body: { xid: 'W123' } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(addToSavedPlaces).toHaveBeenCalledWith(7, { xid: 'W123' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trips'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trip', 7] });
  });
});

describe('useRemoveFromSavedPlaces', () => {
  it('removes a destination from the pool and invalidates the list and the trip', async () => {
    vi.mocked(removeFromSavedPlaces).mockResolvedValue(undefined);
    const { queryClient, Wrapper } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRemoveFromSavedPlaces(), { wrapper: Wrapper });
    result.current.mutate({ tripId: 7, destinationId: 99 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(removeFromSavedPlaces).toHaveBeenCalledWith(7, 99);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trips'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trip', 7] });
  });
});

describe('useScheduleSavedPlace', () => {
  it('optimistically moves the place from the pool onto the day', async () => {
    vi.mocked(scheduleSavedPlace).mockImplementation(
      () => new Promise(() => {}),
    );
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(['trip', 7], { ...trip, savedPlaces: [savedPlace] });

    const { result } = renderHook(() => useScheduleSavedPlace(), { wrapper: Wrapper });
    result.current.mutate({ tripId: 7, date: '2026-08-01', destinationId: 99 });

    await waitFor(() => {
      const cached = queryClient.getQueryData<Trip>(['trip', 7]);
      expect(cached?.savedPlaces).toHaveLength(0);
      expect(cached?.tripDays[0].destinations).toHaveLength(1);
    });
  });

  it('rolls back the optimistic move when the schedule fails', async () => {
    vi.mocked(scheduleSavedPlace).mockRejectedValue(
      new Error('Destination already exists in this day.'),
    );
    const { queryClient, Wrapper } = createWrapper();
    const initial = { ...trip, savedPlaces: [savedPlace] };
    queryClient.setQueryData(['trip', 7], initial);

    const { result } = renderHook(() => useScheduleSavedPlace(), { wrapper: Wrapper });
    result.current.mutate({ tripId: 7, date: '2026-08-01', destinationId: 99 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    const cached = queryClient.getQueryData<Trip>(['trip', 7]);
    expect(cached?.savedPlaces).toHaveLength(1);
    expect(cached?.tripDays[0].destinations).toHaveLength(0);
  });
});

describe('useReorderDayDestinations', () => {
  it('optimistically reorders the day destinations in the cache', async () => {
    vi.mocked(reorderDayDestinations).mockImplementation(() => new Promise(() => {}));
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(['trip', 7], {
      ...trip,
      tripDays: [{ day: '2026-08-01', destinations: [firstDest, secondDest] }],
    });

    const { result } = renderHook(() => useReorderDayDestinations(), { wrapper: Wrapper });
    result.current.mutate({ tripId: 7, date: '2026-08-01', destinationIds: [2, 1] });

    await waitFor(() => {
      const cached = queryClient.getQueryData<Trip>(['trip', 7]);
      expect(cached?.tripDays[0].destinations.map((d) => d.id)).toEqual([2, 1]);
    });
    expect(reorderDayDestinations).toHaveBeenCalledWith(7, '2026-08-01', {
      destinationIds: [2, 1],
    });
  });

  it('rolls back the optimistic reorder when the request fails', async () => {
    vi.mocked(reorderDayDestinations).mockRejectedValue(new Error('Reorder failed.'));
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(['trip', 7], {
      ...trip,
      tripDays: [{ day: '2026-08-01', destinations: [firstDest, secondDest] }],
    });

    const { result } = renderHook(() => useReorderDayDestinations(), { wrapper: Wrapper });
    result.current.mutate({ tripId: 7, date: '2026-08-01', destinationIds: [2, 1] });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    const cached = queryClient.getQueryData<Trip>(['trip', 7]);
    expect(cached?.tripDays[0].destinations.map((d) => d.id)).toEqual([1, 2]);
  });
});
