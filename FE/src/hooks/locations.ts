import { useQuery } from '@tanstack/react-query';
import { getAttractions, getDestinationDetails, searchLocations } from '../api/locations';
import type { LocationSearchResult } from '../api/types';

const locationStaleTime = 5 * 60 * 1000;

export function useLocationSearch(query: string) {
  return useQuery({
    queryKey: ['locationSearch', query],
    queryFn: () => searchLocations(query),
    enabled: query.length > 0,
    retry: false,
    staleTime: locationStaleTime,
    refetchOnWindowFocus: false,
  });
}

export function useAttractions(location: LocationSearchResult | null) {
  return useQuery({
    queryKey: ['attractions', location?.latitude, location?.longitude],
    queryFn: () => getAttractions(location!.latitude, location!.longitude),
    enabled: location !== null && location.locationType === 'City',
    retry: false,
    staleTime: locationStaleTime,
    refetchOnWindowFocus: false,
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
