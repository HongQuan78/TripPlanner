import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Trip } from '@/shared/api/types';
import TripPlannerPage from './TripPlannerPage';

let capturedDragEnd: ((event: DragEndEvent) => void) | undefined;

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd: (event: DragEndEvent) => void;
    }) => {
      capturedDragEnd = onDragEnd;
      return <>{children}</>;
    },
    useSensor: () => ({}),
    useSensors: () => [],
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      isDragging: false,
    }),
    useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
  };
});

vi.mock('@dnd-kit/sortable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/sortable')>();
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

vi.mock('./api', () => ({
  getTrips: vi.fn(),
  getTrip: vi.fn(),
  createTrip: vi.fn(),
  updateTrip: vi.fn(),
  addDestinationToDay: vi.fn(),
  removeDestinationFromDay: vi.fn(),
  addToSavedPlaces: vi.fn(),
  removeFromSavedPlaces: vi.fn(),
  scheduleSavedPlace: vi.fn(),
  reorderDayDestinations: vi.fn(),
  moveDestinationBetweenDays: vi.fn(),
}));

import { getTrip, moveDestinationBetweenDays, reorderDayDestinations } from './api';

const getTripMock = vi.mocked(getTrip);
const moveDestinationBetweenDaysMock = vi.mocked(moveDestinationBetweenDays);
const reorderDayDestinationsMock = vi.mocked(reorderDayDestinations);

const louvre = {
  id: 42,
  name: 'Louvre Museum',
  rating: 3,
  category: 'Landmark',
  xid: 'xid-louvre',
  openingHours: null,
  cuisineType: null,
  isHalalFriendly: null,
};

const eiffel = {
  id: 43,
  name: 'Eiffel Tower',
  rating: 5,
  category: 'Landmark',
  xid: 'xid-eiffel',
  openingHours: null,
  cuisineType: null,
  isHalalFriendly: null,
};

const tripTwoDests: Trip = {
  id: 7,
  name: 'Paris getaway',
  startDate: '2026-08-01',
  endDate: '2026-08-02',
  tripDays: [
    { day: '2026-08-01', destinations: [louvre, eiffel] },
    { day: '2026-08-02', destinations: [] },
  ],
  savedPlaces: [],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/trips/7']}>
        <Routes>
          <Route path="/trips/:id" element={<TripPlannerPage />} />
          <Route path="/" element={<p>search screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('handleDragEnd move dispatch', () => {
  beforeEach(() => {
    capturedDragEnd = undefined;
    getTripMock.mockReset();
    moveDestinationBetweenDaysMock.mockReset();
    reorderDayDestinationsMock.mockReset();
  });

  it('dispatches a cross-day drag onto an empty day to the move mutation with mapped fields', async () => {
    getTripMock.mockResolvedValue(tripTwoDests);
    moveDestinationBetweenDaysMock.mockImplementation(() => new Promise(() => {}));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });
    expect(capturedDragEnd).toBeDefined();

    act(() => {
      capturedDragEnd!({
        active: { id: 'dest-2026-08-01-42' },
        over: { id: 'day-2026-08-02' },
      } as DragEndEvent);
    });

    await waitFor(() => {
      expect(moveDestinationBetweenDaysMock).toHaveBeenCalledWith(7, '2026-08-01', 42, {
        toDate: '2026-08-02',
      });
    });
    expect(reorderDayDestinationsMock).not.toHaveBeenCalled();
  });

  it('does not route a same-day drag to the move mutation', async () => {
    getTripMock.mockResolvedValue(tripTwoDests);
    reorderDayDestinationsMock.mockImplementation(() => new Promise(() => {}));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    });

    act(() => {
      capturedDragEnd!({
        active: { id: 'dest-2026-08-01-42' },
        over: { id: 'dest-2026-08-01-43' },
      } as DragEndEvent);
    });

    await waitFor(() => {
      expect(reorderDayDestinationsMock).toHaveBeenCalled();
    });
    expect(moveDestinationBetweenDaysMock).not.toHaveBeenCalled();
  });
});
