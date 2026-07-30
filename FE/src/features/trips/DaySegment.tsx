import { useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Destination } from '@/shared/api/models/destination/destination';
import type { TripDay } from '@/shared/api/models/trip/tripDay';
import DestinationRow from './DestinationRow';
import { formatDate, formatSegmentDate, pluralizeCount } from '@/shared/lib/dates';
import styles from './TripPlannerPage.module.css';

export default function DaySegment({
  day,
  allDays,
  isToday,
  onRemove,
  onReorder,
  onAddDestination,
  onMoveToDay,
  headingRef,
}: {
  day: TripDay;
  allDays: TripDay[];
  isToday: boolean;
  onRemove: (day: TripDay, destination: Destination) => void;
  onReorder: (day: TripDay, orderedIds: number[]) => void;
  onAddDestination: (day: TripDay) => void;
  onMoveToDay: (fromDate: string, destination: Destination, toDate: string) => void;
  headingRef: (element: HTMLHeadingElement | null) => void;
}) {
  const placeCount = day.destinations.length;
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.day}` });
  const sortableIds = day.destinations.map((destination) => `dest-${day.day}-${destination.id}`);
  const otherDays = allDays.filter((item) => item.day !== day.day);

  function move(destination: Destination, direction: -1 | 1) {
    const ids = day.destinations.map((item) => item.id);
    const from = ids.indexOf(destination.id);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= ids.length) {
      return;
    }
    onReorder(day, arrayMove(ids, from, to));
  }

  return (
    <section
      ref={setNodeRef}
      className={`${styles.segment} ${isToday ? styles.segmentToday : ''} ${
        isOver ? styles.segmentOver : ''
      }`}
    >
      <span className={styles.node} aria-hidden="true" />
      <div className={styles.segHead}>
        <h2 className={styles.segDate} ref={headingRef} tabIndex={-1}>
          {formatSegmentDate(day.day)}
          {isToday && (
            <>
              {' '}
              <span className={styles.todayMarker}>Today</span>
            </>
          )}
        </h2>
        {placeCount > 0 && (
          <span className={styles.segCount}>{pluralizeCount(placeCount, 'place')}</span>
        )}
      </div>

      {placeCount === 0 ? (
        <div className={styles.emptyDay}>No destinations planned for this day yet.</div>
      ) : (
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <ul className={styles.rows}>
            {day.destinations.map((destination, index) => (
              <DestinationRow
                key={destination.id}
                destination={destination}
                sortableId={`dest-${day.day}-${destination.id}`}
                isFirst={index === 0}
                isLast={index === placeCount - 1}
                otherDays={otherDays}
                onRemove={(target) => onRemove(day, target)}
                onMoveUp={(target) => move(target, -1)}
                onMoveDown={(target) => move(target, 1)}
                onMoveToDay={(target, toDate) => onMoveToDay(day.day, target, toDate)}
              />
            ))}
          </ul>
        </SortableContext>
      )}

      <button
        type="button"
        className={styles.addDestination}
        aria-label={`Add a destination to ${formatDate(day.day)}`}
        onClick={() => onAddDestination(day)}
      >
        <span aria-hidden="true">＋</span> Add destination
      </button>
    </section>
  );
}
