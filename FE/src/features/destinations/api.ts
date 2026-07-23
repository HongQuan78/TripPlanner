import { request } from '@/shared/api/client';
import type {
  Attraction,
  AttractionFilters,
  DestinationDetails,
  LocationSearchResult,
} from '@/shared/api/types';

export function searchLocations(query: string): Promise<LocationSearchResult[]> {
  return request<LocationSearchResult[]>(
    `/api/locations/search?query=${encodeURIComponent(query)}`,
  );
}

export function getAttractions(
  latitude: number,
  longitude: number,
  filters?: AttractionFilters,
  offset?: number,
): Promise<Attraction[]> {
  let url = `/api/locations/attractions?latitude=${latitude}&longitude=${longitude}`;
  if (filters && filters.kinds.length > 0) {
    url += `&kinds=${encodeURIComponent(filters.kinds.join(','))}`;
  }
  if (filters && filters.minRate !== null) {
    url += `&minRate=${filters.minRate}`;
  }
  if (offset && offset > 0) {
    url += `&offset=${offset}`;
  }
  return request<Attraction[]>(url);
}

export function getDestinationDetails(xid: string): Promise<DestinationDetails> {
  return request<DestinationDetails>(`/api/locations/${encodeURIComponent(xid)}/details`);
}
