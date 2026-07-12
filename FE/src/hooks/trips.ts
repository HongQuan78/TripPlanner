import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDestinationToDay,
  createTrip,
  getTrip,
  getTrips,
  removeDestinationFromDay,
  updateTrip,
} from '../api/trips';
import type { AddDestinationToDayRequest, UpdateTripRequest } from '../api/types';

export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useTrip(id: number) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => getTrip(id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useUpdateTrip(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTripRequest) => updateTrip(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trip', id] });
    },
  });
}

export function useAddDestinationToDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tripId,
      date,
      body,
    }: {
      tripId: number;
      date: string;
      body: AddDestinationToDayRequest;
    }) => addDestinationToDay(tripId, date, body),
    onSuccess: (_data, { tripId }) => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useRemoveDestinationFromDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tripId,
      date,
      destinationId,
    }: {
      tripId: number;
      date: string;
      destinationId: number;
    }) => removeDestinationFromDay(tripId, date, destinationId),
    onSuccess: (_data, { tripId }) => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}
