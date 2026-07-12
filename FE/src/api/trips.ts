import { request } from './client';
import type {
  AddDestinationToDayRequest,
  CreateTripRequest,
  Trip,
  TripDay,
  UpdateTripRequest,
} from './types';

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
