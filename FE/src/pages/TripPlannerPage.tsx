import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import type { Destination, TripDay } from '../api/types';
import ConfirmDialog from '../components/ConfirmDialog';
import EditTripForm from '../components/EditTripForm';
import StarRating from '../components/StarRating';
import { useRemoveDestinationFromDay, useTrip } from '../hooks/trips';
import {
  formatDate,
  formatDateRange,
  formatSegmentDate,
  pluralizeCount,
  todayISO,
  tripStatus,
} from '../lib/dates';
import stateStyles from './PageState.module.css';
import styles from './TripPlannerPage.module.css';

function DestinationRow({
  destination,
  onRemove,
}: {
  destination: Destination;
  onRemove: (destination: Destination) => void;
}) {
  const content = (
    <>
      <span className={styles.rowName}>{destination.name}</span>
      <span className={styles.rowCategory}>{destination.category}</span>
      <StarRating rating={destination.rating} />
    </>
  );

  return (
    <li className={styles.row}>
      {destination.xid === null ? (
        <span className={styles.rowContent}>{content}</span>
      ) : (
        <Link to={`/attractions/${destination.xid}`} className={styles.rowLink}>
          {content}
        </Link>
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

function DaySegment({
  day,
  isToday,
  onRemove,
  onAddDestination,
  headingRef,
}: {
  day: TripDay;
  isToday: boolean;
  onRemove: (day: TripDay, destination: Destination) => void;
  onAddDestination: (day: TripDay) => void;
  headingRef: (element: HTMLHeadingElement | null) => void;
}) {
  const placeCount = day.destinations.length;

  return (
    <section className={`${styles.segment} ${isToday ? styles.segmentToday : ''}`}>
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
        <ul className={styles.rows}>
          {day.destinations.map((destination) => (
            <DestinationRow
              key={destination.id}
              destination={destination}
              onRemove={(target) => onRemove(day, target)}
            />
          ))}
        </ul>
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
  const [editing, setEditing] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{
    day: TripDay;
    destination: Destination;
  } | null>(null);

  const dayHeadingRefs = useRef(new Map<string, HTMLHeadingElement>());
  const focusDayAfterRemoval = useRef<string | null>(null);

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

  const removeError =
    removeDestination.error instanceof ApiError
      ? removeDestination.error.message
      : removeDestination.isError
        ? 'Something went wrong. Please try again.'
        : null;

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

      <div className={styles.rail}>
        {data.tripDays.map((day) => (
          <DaySegment
            key={day.day}
            day={day}
            isToday={status.kind === 'ongoing' && day.day === today}
            onRemove={(targetDay, destination) =>
              setPendingRemoval({ day: targetDay, destination })
            }
            onAddDestination={() => navigate('/')}
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
