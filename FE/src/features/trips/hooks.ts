import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripService } from './tripService';
import type { AddDestinationToDayRequest } from '@/shared/api/models/trip/addDestinationToDayRequest';
import type { AddSavedPlaceRequest } from '@/shared/api/models/trip/addSavedPlaceRequest';
import type { CreateTripRequest } from '@/shared/api/models/trip/createTripRequest';
import type { Trip } from '@/shared/api/models/trip/trip';
import type { UpdateTripRequest } from '@/shared/api/models/trip/updateTripRequest';

export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: () => tripService.getAll(),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useTrip(id: number) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripService.getById(id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTripRequest) => tripService.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useUpdateTrip(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTripRequest) => tripService.update(id, body),
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
    }) => tripService.addDestinationToDay(tripId, date, body),
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
    }) => tripService.removeDestinationFromDay(tripId, date, destinationId),
    onSuccess: (_data, { tripId }) => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useAddToSavedPlaces() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, body }: { tripId: number; body: AddSavedPlaceRequest }) =>
      tripService.addToSavedPlaces(tripId, body),
    onSuccess: (_data, { tripId }) => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useRemoveFromSavedPlaces() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, destinationId }: { tripId: number; destinationId: number }) =>
      tripService.removeFromSavedPlaces(tripId, destinationId),
    onSuccess: (_data, { tripId }) => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useScheduleSavedPlace() {
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
    }) => tripService.scheduleSavedPlace(tripId, date, { destinationId }),
    onMutate: async ({ tripId, date, destinationId }) => {
      await queryClient.cancelQueries({ queryKey: ['trip', tripId] });
      const previousTrip = queryClient.getQueryData<Trip>(['trip', tripId]);

      if (previousTrip) {
        const moving = previousTrip.savedPlaces.find((place) => place.id === destinationId);
        if (moving) {
          queryClient.setQueryData<Trip>(['trip', tripId], {
            ...previousTrip,
            savedPlaces: previousTrip.savedPlaces.filter((place) => place.id !== destinationId),
            tripDays: previousTrip.tripDays.map((day) =>
              day.day === date && !day.destinations.some((d) => d.id === moving.id)
                ? { ...day, destinations: [...day.destinations, moving] }
                : day,
            ),
          });
        }
      }

      return { previousTrip };
    },
    onError: (_error, { tripId }, context) => {
      if (context?.previousTrip) {
        queryClient.setQueryData(['trip', tripId], context.previousTrip);
      }
    },
    onSettled: (_data, _error, { tripId }) => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useMoveDestinationBetweenDays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tripId,
      fromDate,
      destinationId,
      toDate,
    }: {
      tripId: number;
      fromDate: string;
      destinationId: number;
      toDate: string;
    }) => tripService.moveDestinationBetweenDays(tripId, fromDate, destinationId, { toDate }),
    onMutate: async ({ tripId, fromDate, destinationId, toDate }) => {
      await queryClient.cancelQueries({ queryKey: ['trip', tripId] });
      const previousTrip = queryClient.getQueryData<Trip>(['trip', tripId]);

      if (previousTrip) {
        const sourceDay = previousTrip.tripDays.find((day) => day.day === fromDate);
        const moving = sourceDay?.destinations.find((destination) => destination.id === destinationId);
        if (moving) {
          queryClient.setQueryData<Trip>(['trip', tripId], {
            ...previousTrip,
            tripDays: previousTrip.tripDays.map((day) => {
              if (day.day === fromDate) {
                return {
                  ...day,
                  destinations: day.destinations.filter((destination) => destination.id !== destinationId),
                };
              }
              if (day.day === toDate && !day.destinations.some((destination) => destination.id === destinationId)) {
                return { ...day, destinations: [...day.destinations, moving] };
              }
              return day;
            }),
          });
        }
      }

      return { previousTrip };
    },
    onError: (_error, { tripId }, context) => {
      if (context?.previousTrip) {
        queryClient.setQueryData(['trip', tripId], context.previousTrip);
      }
    },
    onSettled: (_data, _error, { tripId }) => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

export function useReorderDayDestinations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tripId,
      date,
      destinationIds,
    }: {
      tripId: number;
      date: string;
      destinationIds: number[];
    }) => tripService.reorderDayDestinations(tripId, date, { destinationIds }),
    onMutate: async ({ tripId, date, destinationIds }) => {
      await queryClient.cancelQueries({ queryKey: ['trip', tripId] });
      const previousTrip = queryClient.getQueryData<Trip>(['trip', tripId]);

      if (previousTrip) {
        queryClient.setQueryData<Trip>(['trip', tripId], {
          ...previousTrip,
          tripDays: previousTrip.tripDays.map((day) => {
            if (day.day !== date) {
              return day;
            }
            const byId = new Map(day.destinations.map((destination) => [destination.id, destination]));
            const reordered = destinationIds
              .map((destinationId) => byId.get(destinationId))
              .filter((destination): destination is NonNullable<typeof destination> => destination !== undefined);
            return reordered.length === day.destinations.length
              ? { ...day, destinations: reordered }
              : day;
          }),
        });
      }

      return { previousTrip };
    },
    onError: (_error, { tripId }, context) => {
      if (context?.previousTrip) {
        queryClient.setQueryData(['trip', tripId], context.previousTrip);
      }
    },
    onSettled: (_data, _error, { tripId }) => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}
