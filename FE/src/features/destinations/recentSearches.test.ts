import { beforeEach, describe, expect, it } from 'vitest';
import type { LocationSearchResult } from '@/shared/api/models/destination/locationSearchResult';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from './recentSearches';

function city(name: string, latitude: number, longitude: number): LocationSearchResult {
  return {
    name,
    countryCode: 'FR',
    locationType: 'City',
    latitude,
    longitude,
    isPartialMatch: false,
  };
}

const paris = city('Paris', 48.8566, 2.3522);
const tokyo = city('Tokyo', 35.6762, 139.6503);

beforeEach(() => {
  clearRecentSearches();
});

describe('recentSearches', () => {
  it('starts empty', () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it('keeps the most recent choice first', () => {
    addRecentSearch(paris);
    addRecentSearch(tokyo);

    expect(getRecentSearches().map((entry) => entry.name)).toEqual(['Tokyo', 'Paris']);
  });

  it('dedupes by identity rather than stacking repeats', () => {
    addRecentSearch(paris);
    addRecentSearch(tokyo);
    addRecentSearch(paris);

    expect(getRecentSearches().map((entry) => entry.name)).toEqual(['Paris', 'Tokyo']);
  });

  it('treats a same-named place at different coordinates as distinct', () => {
    addRecentSearch(paris);
    addRecentSearch(city('Paris', 33.6609, -95.5555));

    expect(getRecentSearches()).toHaveLength(2);
  });

  it('caps the history at five entries', () => {
    for (let index = 0; index < 8; index += 1) {
      addRecentSearch(city(`City ${index}`, index, index));
    }

    expect(getRecentSearches().map((entry) => entry.name)).toEqual([
      'City 7',
      'City 6',
      'City 5',
      'City 4',
      'City 3',
    ]);
  });

  it('returns a copy so callers cannot mutate the stored history', () => {
    addRecentSearch(paris);

    const snapshot = getRecentSearches();
    snapshot.push(tokyo);
    snapshot[0] = tokyo;

    expect(getRecentSearches().map((entry) => entry.name)).toEqual(['Paris']);
  });

  it('returns a copy from addRecentSearch as well', () => {
    const returned = addRecentSearch(paris);
    returned.length = 0;

    expect(getRecentSearches()).toHaveLength(1);
  });

  it('empties the history on clear', () => {
    addRecentSearch(paris);

    expect(clearRecentSearches()).toEqual([]);
    expect(getRecentSearches()).toEqual([]);
  });
});
