import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAttractions, getDestinationDetails, searchLocations } from './api';

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('searchLocations', () => {
  it('calls the search endpoint with the encoded query', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await searchLocations('New York');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/locations/search?query=New%20York');
  });

  it('returns the parsed result list', async () => {
    const results = [
      {
        name: 'Paris',
        countryCode: 'FR',
        locationType: 'City',
        latitude: 48.8566,
        longitude: 2.3522,
        isPartialMatch: false,
      },
    ];
    fetchMock.mockResolvedValue(jsonResponse(200, results));

    const parsed = await searchLocations('Paris');

    expect(parsed).toEqual(results);
  });
});

describe('getAttractions', () => {
  it('calls the attractions endpoint with the coordinates', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await getAttractions(48.8566, 2.3522);

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/locations/attractions?latitude=48.8566&longitude=2.3522',
    );
  });

  it('returns the parsed attraction list', async () => {
    const attractions = [
      {
        xid: 'W123',
        name: 'Louvre',
        kinds: ['museums'],
        rating: '3h',
        imageUrl: null,
        distanceMeters: 120.5,
      },
    ];
    fetchMock.mockResolvedValue(jsonResponse(200, attractions));

    const parsed = await getAttractions(48.8566, 2.3522);

    expect(parsed).toEqual(attractions);
  });
});

describe('getDestinationDetails', () => {
  it('calls the details endpoint with the encoded xid', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await getDestinationDetails('W/123');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/locations/W%2F123/details');
  });

  it('returns the parsed details', async () => {
    const details = {
      xid: 'W123',
      name: 'Louvre Museum',
      category: 'Museums',
      description: 'A famous museum.',
      imageUrls: ['https://example.com/1.jpg'],
      address: 'Rue de Rivoli, Paris',
      openingHours: 'Mo-Su 09:00-18:00',
      website: 'https://www.louvre.fr',
      latitude: 48.8606,
      longitude: 2.3376,
    };
    fetchMock.mockResolvedValue(jsonResponse(200, details));

    const parsed = await getDestinationDetails('W123');

    expect(parsed).toEqual(details);
  });
});
