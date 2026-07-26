import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAttractions, getDestinationDetails, searchLocations } from './api';
import type { AttractionFilters, LocationSearchResult } from '@/shared/api/types';

const locationStaleTime = 5 * 60 * 1000;

export const ATTRACTIONS_PAGE_SIZE = 20;
export const ATTRACTIONS_MAX_OFFSET = 1000;

export const LOCATION_QUERY_MIN_LENGTH = 2;

export function useLocationSearch(query: string) {
  return useQuery({
    queryKey: ['locationSearch', query],
    queryFn: () => searchLocations(query),
    enabled: query.length >= LOCATION_QUERY_MIN_LENGTH,
    retry: false,
    staleTime: locationStaleTime,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });
}

export function useLocationSuggestions(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['locationSearch', trimmed],
    queryFn: () => searchLocations(trimmed),
    enabled: trimmed.length >= LOCATION_QUERY_MIN_LENGTH,
    retry: false,
    staleTime: locationStaleTime,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });
}

export function useAttractions(
  location: LocationSearchResult | null,
  filters: AttractionFilters,
) {
  return useInfiniteQuery({
    queryKey: [
      'attractions',
      location?.latitude,
      location?.longitude,
      filters.kinds.join(','),
      filters.minRate,
    ],
    queryFn: ({ pageParam }) =>
      pageParam > 0
        ? getAttractions(location!.latitude, location!.longitude, filters, pageParam)
        : getAttractions(location!.latitude, location!.longitude, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + ATTRACTIONS_PAGE_SIZE;
      return lastPage.length === ATTRACTIONS_PAGE_SIZE && nextOffset <= ATTRACTIONS_MAX_OFFSET
        ? nextOffset
        : undefined;
    },
    enabled: location !== null && location.locationType === 'City',
    retry: false,
    staleTime: locationStaleTime,
    refetchOnWindowFocus: false,
  });
}

const nearbyCap = 8;

export function useNearbyAttractions(
  latitude: number | null,
  longitude: number | null,
  selfXid: string,
) {
  return useQuery({
    queryKey: ['nearbyAttractions', latitude, longitude],
    queryFn: () => getAttractions(latitude!, longitude!),
    enabled: latitude !== null && longitude !== null,
    retry: false,
    staleTime: locationStaleTime,
    refetchOnWindowFocus: false,
    select: (attractions) =>
      attractions.filter((attraction) => attraction.xid !== selfXid).slice(0, nearbyCap),
  });
}

export function useDestinationDetails(xid: string) {
  return useQuery({
    queryKey: ['destinationDetails', xid],
    queryFn: () => getDestinationDetails(xid),
    enabled: xid.length > 0,
    retry: false,
    staleTime: locationStaleTime,
    refetchOnWindowFocus: false,
  });
}
