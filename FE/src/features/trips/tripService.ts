import { HttpClient, httpClient } from '@/shared/api/httpClient';
import type { AddDestinationToDayRequest } from '@/shared/api/models/trip/addDestinationToDayRequest';
import type { AddSavedPlaceRequest } from '@/shared/api/models/trip/addSavedPlaceRequest';
import type { CreateTripRequest } from '@/shared/api/models/trip/createTripRequest';
import type { MoveDestinationRequest } from '@/shared/api/models/trip/moveDestinationRequest';
import type { ReorderDayDestinationsRequest } from '@/shared/api/models/trip/reorderDayDestinationsRequest';
import type { ScheduleSavedPlaceRequest } from '@/shared/api/models/trip/scheduleSavedPlaceRequest';
import type { Trip } from '@/shared/api/models/trip/trip';
import type { TripDay } from '@/shared/api/models/trip/tripDay';
import type { UpdateTripRequest } from '@/shared/api/models/trip/updateTripRequest';

export class TripService {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getAll(): Promise<Trip[]> {
    return this.http.request<Trip[]>('/api/trips');
  }

  getById(id: number): Promise<Trip> {
    return this.http.request<Trip>(`/api/trips/${id}`);
  }

  create(body: CreateTripRequest): Promise<Trip> {
    return this.http.request<Trip>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  update(id: number, body: UpdateTripRequest): Promise<Trip> {
    return this.http.request<Trip>(`/api/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  addDestinationToDay(
    tripId: number,
    date: string,
    body: AddDestinationToDayRequest,
  ): Promise<TripDay> {
    return this.http.request<TripDay>(`/api/trips/${tripId}/days/${date}/destinations`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  removeDestinationFromDay(tripId: number, date: string, destinationId: number): Promise<void> {
    return this.http.request<void>(
      `/api/trips/${tripId}/days/${date}/destinations/${destinationId}`,
      { method: 'DELETE' },
    );
  }

  addToSavedPlaces(tripId: number, body: AddSavedPlaceRequest): Promise<Trip> {
    return this.http.request<Trip>(`/api/trips/${tripId}/saved-places`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  removeFromSavedPlaces(tripId: number, destinationId: number): Promise<void> {
    return this.http.request<void>(`/api/trips/${tripId}/saved-places/${destinationId}`, {
      method: 'DELETE',
    });
  }

  scheduleSavedPlace(
    tripId: number,
    date: string,
    body: ScheduleSavedPlaceRequest,
  ): Promise<Trip> {
    return this.http.request<Trip>(`/api/trips/${tripId}/days/${date}/schedule`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  reorderDayDestinations(
    tripId: number,
    date: string,
    body: ReorderDayDestinationsRequest,
  ): Promise<Trip> {
    return this.http.request<Trip>(`/api/trips/${tripId}/days/${date}/destinations/order`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  moveDestinationBetweenDays(
    tripId: number,
    fromDate: string,
    destinationId: number,
    body: MoveDestinationRequest,
  ): Promise<Trip> {
    return this.http.request<Trip>(
      `/api/trips/${tripId}/days/${fromDate}/destinations/${destinationId}/move`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }
}

export const tripService = new TripService(httpClient);
