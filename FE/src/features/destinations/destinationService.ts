import { HttpClient, httpClient } from '@/shared/api/httpClient';
import type { Attraction } from '@/shared/api/models/destination/attraction';
import type { AttractionFilters } from '@/shared/api/models/destination/attractionFilters';
import type { DestinationDetails } from '@/shared/api/models/destination/destinationDetails';
import type { LocationSearchResult } from '@/shared/api/models/destination/locationSearchResult';

export class DestinationService {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  searchLocations(query: string): Promise<LocationSearchResult[]> {
    return this.http.request<LocationSearchResult[]>(
      `/api/locations/search?query=${encodeURIComponent(query)}`,
    );
  }

  getAttractions(
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
    return this.http.request<Attraction[]>(url);
  }

  getDestinationDetails(xid: string): Promise<DestinationDetails> {
    return this.http.request<DestinationDetails>(
      `/api/locations/${encodeURIComponent(xid)}/details`,
    );
  }
}

export const destinationService = new DestinationService(httpClient);
