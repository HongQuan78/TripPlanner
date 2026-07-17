import { request } from '@/shared/api/client';
import type { Attraction, DestinationDetails, LocationSearchResult } from '@/shared/api/types';

export function searchLocations(query: string): Promise<LocationSearchResult[]> {
  return request<LocationSearchResult[]>(
    `/api/locations/search?query=${encodeURIComponent(query)}`,
  );
}

export function getAttractions(latitude: number, longitude: number): Promise<Attraction[]> {
  return request<Attraction[]>(
    `/api/locations/attractions?latitude=${latitude}&longitude=${longitude}`,
  );
}

export function getDestinationDetails(xid: string): Promise<DestinationDetails> {
  return request<DestinationDetails>(`/api/locations/${encodeURIComponent(xid)}/details`);
}
