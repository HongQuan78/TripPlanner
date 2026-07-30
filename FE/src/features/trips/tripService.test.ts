import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '@/shared/api/httpClient';
import { TripService } from './tripService';

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let service: TripService;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  service = new TripService(new HttpClient(''));
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const trip = {
  id: 7,
  name: 'Paris getaway',
  startDate: '2026-08-01',
  endDate: '2026-08-03',
  tripDays: [{ day: '2026-08-01', destinations: [] }],
};

describe('getTrips', () => {
  it('calls the trips endpoint and returns the parsed list', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [trip]));

    const parsed = await service.getAll();

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips');
    expect(parsed).toEqual([trip]);
  });
});

describe('getTrip', () => {
  it('calls the trip endpoint with the id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, trip));

    const parsed = await service.getById(7);

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips/7');
    expect(parsed).toEqual(trip);
  });
});

describe('createTrip', () => {
  it('posts the trip body to the trips endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, trip));

    const parsed = await service.create({
      name: 'Paris getaway',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
    });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Paris getaway',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
    });
    expect(parsed).toEqual(trip);
  });
});

describe('updateTrip', () => {
  it('puts the whole trip body with the confirmed flag', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, trip));

    await service.update(7, {
      name: 'Paris getaway',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      confirmed: true,
    });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips/7');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Paris getaway',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      confirmed: true,
    });
  });
});

describe('addDestinationToDay', () => {
  it('posts the xid to the day destinations endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, trip.tripDays[0]));

    await service.addDestinationToDay(7, '2026-08-01', { xid: 'W123' });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips/7/days/2026-08-01/destinations');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ xid: 'W123' });
  });
});

describe('removeDestinationFromDay', () => {
  it('deletes the destination from the day', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await service.removeDestinationFromDay(7, '2026-08-01', 42);

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips/7/days/2026-08-01/destinations/42');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('DELETE');
  });
});

describe('addToSavedPlaces', () => {
  it('posts the destination to the saved-places endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, trip));

    await service.addToSavedPlaces(7, { xid: 'W123' });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips/7/saved-places');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ xid: 'W123' });
  });
});

describe('removeFromSavedPlaces', () => {
  it('deletes the destination from the saved-places pool', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await service.removeFromSavedPlaces(7, 99);

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips/7/saved-places/99');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('DELETE');
  });
});

describe('scheduleSavedPlace', () => {
  it('posts the destination id to the day schedule endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, trip));

    await service.scheduleSavedPlace(7, '2026-08-01', { destinationId: 99 });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips/7/days/2026-08-01/schedule');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ destinationId: 99 });
  });
});

describe('reorderDayDestinations', () => {
  it('puts the destination id order to the day order endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, trip));

    const parsed = await service.reorderDayDestinations(7, '2026-08-01', { destinationIds: [3, 1, 2] });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips/7/days/2026-08-01/destinations/order');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ destinationIds: [3, 1, 2] });
    expect(parsed).toEqual(trip);
  });
});

describe('moveDestinationBetweenDays', () => {
  it('puts the target date to the destination move endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, trip));

    const parsed = await service.moveDestinationBetweenDays(7, '2026-08-01', 42, { toDate: '2026-08-02' });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/trips/7/days/2026-08-01/destinations/42/move');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ toDate: '2026-08-02' });
    expect(parsed).toEqual(trip);
  });
});
