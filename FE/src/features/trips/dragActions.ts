import { arrayMove } from '@dnd-kit/sortable';
import type { TripDay } from '@/shared/api/models/trip/tripDay';

export function parseDestId(id: string): { date: string; destinationId: number } {
  const rest = id.slice('dest-'.length);
  const lastDash = rest.lastIndexOf('-');
  return {
    date: rest.slice(0, lastDash),
    destinationId: Number(rest.slice(lastDash + 1)),
  };
}

export type DragAction =
  | { kind: 'schedule'; destinationId: number; date: string }
  | { kind: 'reorder'; date: string; orderedIds: number[] }
  | { kind: 'move'; destinationId: number; fromDate: string; toDate: string };

export function resolveDragAction(
  activeId: string,
  overId: string,
  tripDays: TripDay[],
): DragAction | null {
  if (activeId.startsWith('place-')) {
    const destinationId = Number(activeId.slice('place-'.length));
    if (overId.startsWith('day-')) {
      return { kind: 'schedule', destinationId, date: overId.slice('day-'.length) };
    }
    if (overId.startsWith('dest-')) {
      return { kind: 'schedule', destinationId, date: parseDestId(overId).date };
    }
    return null;
  }

  if (activeId.startsWith('dest-')) {
    const activeDest = parseDestId(activeId);
    const toDate = overId.startsWith('dest-')
      ? parseDestId(overId).date
      : overId.startsWith('day-')
        ? overId.slice('day-'.length)
        : null;

    if (toDate === null) {
      return null;
    }

    if (toDate !== activeDest.date) {
      return {
        kind: 'move',
        destinationId: activeDest.destinationId,
        fromDate: activeDest.date,
        toDate,
      };
    }

    if (!overId.startsWith('dest-')) {
      return null;
    }

    const overDest = parseDestId(overId);
    const day = tripDays.find((item) => item.day === activeDest.date);
    if (!day) {
      return null;
    }
    const ids = day.destinations.map((item) => item.id);
    const from = ids.indexOf(activeDest.destinationId);
    const to = ids.indexOf(overDest.destinationId);
    if (from === -1 || to === -1 || from === to) {
      return null;
    }
    return { kind: 'reorder', date: activeDest.date, orderedIds: arrayMove(ids, from, to) };
  }

  return null;
}
