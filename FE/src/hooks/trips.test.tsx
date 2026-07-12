import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '../api/types';

vi.mock('../api/trips', () => ({
  getTrips: vi.fn(),
  getTrip: vi.fn(),
  createTrip: vi.fn(),
  updateTrip: vi.fn(),
  addDestinationToDay: vi.fn(),
  removeDestinationFromDay: vi.fn(),
}));

import {
  addDestinationToDay,
  createTrip,
  getTrip,
  getTrips,
  removeDestinationFromDay,
  updateTrip,
} from '../api/trips';
import {
  useAddDestinationToDay,
  useCreateTrip,
  useRemoveDestinationFromDay,
  useTrip,
  useTrips,
  useUpdateTrip,
} from './trips';

const trip: Trip = {
  id: 7,
  name: 'Paris getaway',
  startDate: '2026-08-01',
  endDate: '2026-08-03',
  tripDays: [{ day: '2026-08-01', destinations: [] }],
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
});

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
