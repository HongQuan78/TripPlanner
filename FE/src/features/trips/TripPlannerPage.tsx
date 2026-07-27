import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ApiError } from '@/shared/api/client';
import type { Destination, TripDay } from '@/shared/api/types';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import EditTripForm from './EditTripForm';
import { resolveDragAction } from './dragActions';
import StarRating from '@/features/destinations/StarRating';
import {
  useMoveDestinationBetweenDays,
  useRemoveDestinationFromDay,
  useRemoveFromSavedPlaces,
  useReorderDayDestinations,
  useScheduleSavedPlace,
  useTrip,
} from './hooks';
import {
  formatDate,
  formatDateRange,
  formatSegmentDate,
  pluralizeCount,
  todayISO,
  tripStatus,
} from '@/shared/lib/dates';
import { formatCategory } from '@/shared/lib/formatCategory';
import stateStyles from '@/shared/ui/PageState.module.css';
import styles from './TripPlannerPage.module.css';

function DestinationRow({
  destination,
  sortableId,
  isFirst,
  isLast,
  otherDays,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMoveToDay,
}: {
  destination: Destination;
  sortableId: string;
  isFirst: boolean;
  isLast: boolean;
  otherDays: TripDay[];
  onRemove: (destination: Destination) => void;
  onMoveUp: (destination: Destination) => void;
  onMoveDown: (destination: Destination) => void;
  onMoveToDay: (destination: Destination, toDate: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const content = (
    <>
      <span className={styles.rowName}>{destination.name}</span>
      <span className={styles.rowCategory}>{formatCategory(destination.category)}</span>
      <StarRating rating={destination.rating} />
    </>
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${isDragging ? styles.rowDragging : ''}`}
    >
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`Reorder or move ${destination.name}`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⠿</span>
      </button>

      {destination.xid === null ? (
        <span className={styles.rowContent}>{content}</span>
      ) : (
        <Link to={`/attractions/${destination.xid}`} className={styles.rowLink}>
          {content}
        </Link>
      )}

      <div className={styles.rowMove}>
        <button
          type="button"
          className={styles.move}
          aria-label={`Move ${destination.name} up`}
          disabled={isFirst}
          onClick={() => onMoveUp(destination)}
        >
          <span aria-hidden="true">↑</span>
        </button>
        <button
          type="button"
          className={styles.move}
          aria-label={`Move ${destination.name} down`}
          disabled={isLast}
          onClick={() => onMoveDown(destination)}
        >
          <span aria-hidden="true">↓</span>
        </button>
      </div>

      {otherDays.length > 0 && (
        <select
          className={styles.assign}
          aria-label={`Move ${destination.name} to another day`}
          value=""
          onChange={(event) => {
            if (event.target.value !== '') {
              onMoveToDay(destination, event.target.value);
            }
          }}
        >
          <option value="">Move to day…</option>
          {otherDays.map((day) => (
            <option key={day.day} value={day.day}>
              {formatDate(day.day)}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove ${destination.name}`}
        onClick={() => onRemove(destination)}
      >
        Remove
      </button>
    </li>
  );
}

function SavedPlaceCard({
  destination,
  days,
  onSchedule,
  onRemove,
}: {
  destination: Destination;
  days: TripDay[];
  onSchedule: (destinationId: number, date: string) => void;
  onRemove: (destination: Destination) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `place-${destination.id}`,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const name = (
    <span className={styles.savedName}>{destination.name}</span>
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.savedCard} ${isDragging ? styles.savedCardDragging : ''}`}
    >
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`Drag ${destination.name} onto a day`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⠿</span>
      </button>

      {destination.xid === null ? (
        name
      ) : (
        <Link to={`/attractions/${destination.xid}`} className={styles.savedLink}>
          {name}
        </Link>
      )}

      <select
        className={styles.assign}
        aria-label={`Add ${destination.name} to a day`}
        value=""
        onChange={(event) => {
          if (event.target.value !== '') {
            onSchedule(destination.id, event.target.value);
          }
        }}
      >
        <option value="">Add to day…</option>
        {days.map((day) => (
          <option key={day.day} value={day.day}>
            {formatDate(day.day)}
          </option>
        ))}
      </select>

      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove ${destination.name} from Saved Places`}
        onClick={() => onRemove(destination)}
      >
        Remove
      </button>
    </li>
  );
}

function DaySegment({
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

export default function TripPlannerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tripId = Number(id);
  const isValidId = Number.isInteger(tripId) && tripId > 0;
  const trip = useTrip(tripId);
  const removeDestination = useRemoveDestinationFromDay();
  const scheduleSavedPlace = useScheduleSavedPlace();
  const removeSavedPlace = useRemoveFromSavedPlaces();
  const reorderDay = useReorderDayDestinations();
  const moveDestination = useMoveDestinationBetweenDays();
  const [editing, setEditing] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{
    day: TripDay;
    destination: Destination;
  } | null>(null);

  const dayHeadingRefs = useRef(new Map<string, HTMLHeadingElement>());
  const focusDayAfterRemoval = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const tripData = trip.data;

  useEffect(() => {
    const target = focusDayAfterRemoval.current;
    if (target === null) {
      return;
    }
    const heading = dayHeadingRefs.current.get(target);
    if (heading) {
      heading.focus();
      focusDayAfterRemoval.current = null;
    }
  }, [tripData]);

  if (!isValidId || (trip.error instanceof ApiError && trip.error.status === 404)) {
    return (
      <section className={styles.page}>
        <div className={stateStyles.state}>
          <span className={stateStyles.emoji} aria-hidden="true">
            🙈
          </span>
          <h1 className={stateStyles.heading}>Trip not found</h1>
          <p className={stateStyles.text}>
            We could not find this trip — it may not exist or it may belong to someone else.
          </p>
        </div>
      </section>
    );
  }

  if (trip.isPending) {
    return (
      <section className={styles.page}>
        <p className={styles.loading}>Loading trip…</p>
      </section>
    );
  }

  if (trip.isError) {
    return (
      <section className={styles.page}>
        <div className={stateStyles.state}>
          <span className={stateStyles.emoji} aria-hidden="true">
            ⛅
          </span>
          <h1 className={stateStyles.heading}>Service unavailable</h1>
          <p className={stateStyles.text}>
            Something went wrong while loading this trip. Please try again.
          </p>
          <button type="button" className={styles.retry} onClick={() => void trip.refetch()}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  const data = trip.data;
  const today = todayISO();
  const status = tripStatus(data.startDate, data.endDate, today);
  const dayCount = data.tripDays.length;
  const placeCount = data.tripDays.reduce((total, day) => total + day.destinations.length, 0);
  const unplannedCount = data.tripDays.filter((day) => day.destinations.length === 0).length;
  const savedPlaces = data.savedPlaces;

  const removeError =
    removeDestination.error instanceof ApiError
      ? removeDestination.error.message
      : removeSavedPlace.error instanceof ApiError
        ? removeSavedPlace.error.message
        : removeDestination.isError || removeSavedPlace.isError
          ? 'Something went wrong. Please try again.'
          : null;

  const scheduleError =
    scheduleSavedPlace.error instanceof ApiError
      ? scheduleSavedPlace.error.message
      : scheduleSavedPlace.isError
        ? 'Something went wrong while scheduling. Please try again.'
        : null;

  const reorderError =
    reorderDay.error instanceof ApiError
      ? reorderDay.error.message
      : reorderDay.isError
        ? 'Something went wrong while reordering. Please try again.'
        : null;

  const moveError =
    moveDestination.error instanceof ApiError
      ? moveDestination.error.message
      : moveDestination.isError
        ? 'Something went wrong while moving. Please try again.'
        : null;

  function schedule(destinationId: number, date: string) {
    scheduleSavedPlace.mutate({ tripId, date, destinationId });
  }

  function reorder(day: TripDay, orderedIds: number[]) {
    reorderDay.mutate({ tripId, date: day.day, destinationIds: orderedIds });
  }

  function moveToDay(fromDate: string, destination: Destination, toDate: string) {
    moveDestination.mutate({ tripId, fromDate, destinationId: destination.id, toDate });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      return;
    }
    const action = resolveDragAction(String(active.id), String(over.id), data.tripDays);
    if (!action) {
      return;
    }
    if (action.kind === 'schedule') {
      schedule(action.destinationId, action.date);
      return;
    }
    if (action.kind === 'move') {
      moveDestination.mutate({
        tripId,
        fromDate: action.fromDate,
        destinationId: action.destinationId,
        toDate: action.toDate,
      });
      return;
    }
    reorderDay.mutate({ tripId, date: action.date, destinationIds: action.orderedIds });
  }

  function handleConfirmRemoval() {
    if (!pendingRemoval) {
      return;
    }
    const dayKey = pendingRemoval.day.day;
    removeDestination.mutate(
      {
        tripId,
        date: pendingRemoval.day.day,
        destinationId: pendingRemoval.destination.id,
      },
      {
        onSuccess: () => {
          focusDayAfterRemoval.current = dayKey;
        },
        onSettled: () => setPendingRemoval(null),
      },
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.ticket}>
        <div className={styles.ticketTop}>
          <div>
            <h1 className={styles.title}>{data.name}</h1>
            <span className={styles.dates}>{formatDateRange(data.startDate, data.endDate)}</span>
          </div>
          {!editing && (
            <button type="button" className={styles.edit} onClick={() => setEditing(true)}>
              Edit trip
            </button>
          )}
        </div>

        {editing ? (
          <EditTripForm
            trip={data}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className={styles.ticketStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{dayCount}</span>
              <span className={styles.statLabel}>{dayCount === 1 ? 'Day' : 'Days'}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{placeCount}</span>
              <span className={styles.statLabel}>{placeCount === 1 ? 'Place' : 'Places'}</span>
            </div>
            <div className={styles.stat}>
              {unplannedCount > 0 ? (
                <span className={styles.statHint}>{pluralizeCount(unplannedCount, 'day')}</span>
              ) : (
                <span className={styles.statHintDone}>All planned</span>
              )}
              <span className={styles.statLabel}>Unplanned</span>
            </div>
          </div>
        )}
      </div>

      {removeError && (
        <p className={styles.error} role="alert">
          {removeError}
        </p>
      )}

      {scheduleError && (
        <p className={styles.error} role="alert">
          {scheduleError}
        </p>
      )}

      {reorderError && (
        <p className={styles.error} role="alert">
          {reorderError}
        </p>
      )}

      {moveError && (
        <p className={styles.error} role="alert">
          {moveError}
        </p>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <section className={styles.saved} aria-labelledby="saved-places-heading">
          <div className={styles.savedHead}>
            <h2 id="saved-places-heading" className={styles.savedTitle}>
              Saved Places
            </h2>
            {savedPlaces.length > 0 && (
              <span className={styles.segCount}>{pluralizeCount(savedPlaces.length, 'place')}</span>
            )}
          </div>

          {savedPlaces.length === 0 ? (
            <p className={styles.savedEmpty}>
              No saved places yet. Add destinations from search, then drag them onto a day.
            </p>
          ) : (
            <ul className={styles.savedList}>
              {savedPlaces.map((destination) => (
                <SavedPlaceCard
                  key={destination.id}
                  destination={destination}
                  days={data.tripDays}
                  onSchedule={schedule}
                  onRemove={(target) =>
                    removeSavedPlace.mutate({ tripId, destinationId: target.id })
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <div className={styles.rail}>
          {data.tripDays.map((day) => (
            <DaySegment
              key={day.day}
              day={day}
              allDays={data.tripDays}
              isToday={status.kind === 'ongoing' && day.day === today}
              onRemove={(targetDay, destination) =>
                setPendingRemoval({ day: targetDay, destination })
              }
              onReorder={reorder}
              onAddDestination={() => navigate('/')}
              onMoveToDay={moveToDay}
              headingRef={(element) => {
                if (element) {
                  dayHeadingRefs.current.set(day.day, element);
                } else {
                  dayHeadingRefs.current.delete(day.day);
                }
              }}
            />
          ))}
        </div>
      </DndContext>

      {pendingRemoval && (
        <ConfirmDialog
          title="Remove destination"
          message={`Remove ${pendingRemoval.destination.name} from this day?`}
          confirmLabel="Remove"
          danger
          pending={removeDestination.isPending}
          onConfirm={handleConfirmRemoval}
          onCancel={() => setPendingRemoval(null)}
        />
      )}
    </section>
  );
}
