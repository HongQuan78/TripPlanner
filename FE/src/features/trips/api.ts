import { request } from '@/shared/api/client';
import type {
  AddDestinationToDayRequest,
  AddSavedPlaceRequest,
  CreateTripRequest,
  MoveDestinationRequest,
  ReorderDayDestinationsRequest,
  ScheduleSavedPlaceRequest,
  Trip,
  TripDay,
  UpdateTripRequest,
} from '@/shared/api/types';

export function getTrips(): Promise<Trip[]> {
  return request<Trip[]>('/api/trips');
}

export function getTrip(id: number): Promise<Trip> {
  return request<Trip>(`/api/trips/${id}`);
}

export function createTrip(body: CreateTripRequest): Promise<Trip> {
  return request<Trip>('/api/trips', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateTrip(id: number, body: UpdateTripRequest): Promise<Trip> {
  return request<Trip>(`/api/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function addDestinationToDay(
  tripId: number,
  date: string,
  body: AddDestinationToDayRequest,
): Promise<TripDay> {
  return request<TripDay>(`/api/trips/${tripId}/days/${date}/destinations`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function removeDestinationFromDay(
  tripId: number,
  date: string,
  destinationId: number,
): Promise<void> {
  return request<void>(`/api/trips/${tripId}/days/${date}/destinations/${destinationId}`, {
    method: 'DELETE',
  });
}

export function addToSavedPlaces(tripId: number, body: AddSavedPlaceRequest): Promise<Trip> {
  return request<Trip>(`/api/trips/${tripId}/saved-places`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function removeFromSavedPlaces(tripId: number, destinationId: number): Promise<void> {
  return request<void>(`/api/trips/${tripId}/saved-places/${destinationId}`, {
    method: 'DELETE',
  });
}

export function scheduleSavedPlace(
  tripId: number,
  date: string,
  body: ScheduleSavedPlaceRequest,
): Promise<Trip> {
  return request<Trip>(`/api/trips/${tripId}/days/${date}/schedule`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function reorderDayDestinations(
  tripId: number,
  date: string,
  body: ReorderDayDestinationsRequest,
): Promise<Trip> {
  return request<Trip>(`/api/trips/${tripId}/days/${date}/destinations/order`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function moveDestinationBetweenDays(
  tripId: number,
  fromDate: string,
  destinationId: number,
  body: MoveDestinationRequest,
): Promise<Trip> {
  return request<Trip>(`/api/trips/${tripId}/days/${fromDate}/destinations/${destinationId}/move`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
