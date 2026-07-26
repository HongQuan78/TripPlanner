import type { LocationSearchResult } from '@/shared/api/types';

const RECENT_SEARCH_LIMIT = 5;

let history: LocationSearchResult[] = [];

function isSameLocation(a: LocationSearchResult, b: LocationSearchResult): boolean {
  return (
    a.name === b.name &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.locationType === b.locationType
  );
}

export function getRecentSearches(): LocationSearchResult[] {
  return [...history];
}

export function addRecentSearch(location: LocationSearchResult): LocationSearchResult[] {
  history = [location, ...history.filter((entry) => !isSameLocation(entry, location))].slice(
    0,
    RECENT_SEARCH_LIMIT,
  );
  return [...history];
}

export function clearRecentSearches(): LocationSearchResult[] {
  history = [];
  return [...history];
}
