import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import type { Destination, TripDay } from '../api/types';
import ConfirmDialog from '../components/ConfirmDialog';
import EditTripForm from '../components/EditTripForm';
import StarRating from '../components/StarRating';
import { useRemoveDestinationFromDay, useTrip } from '../hooks/trips';
import { formatDate, formatDateRange } from '../lib/dates';
import stateStyles from './PageState.module.css';
import styles from './TripPlannerPage.module.css';

function DestinationRow({
  destination,
  onRemove,
}: {
  destination: Destination;
  onRemove: (destination: Destination) => void;
}) {
  return (
    <li className={styles.row}>
      <span className={styles.rowName}>{destination.name}</span>
      <span className={styles.rowCategory}>{destination.category}</span>
      <StarRating rating={destination.rating} />
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

function DaySection({
  day,
  onRemove,
}: {
  day: TripDay;
  onRemove: (day: TripDay, destination: Destination) => void;
}) {
  return (
    <section className={styles.day}>
      <h2 className={styles.dayHeading}>{formatDate(day.day)}</h2>
      {day.destinations.length === 0 ? (
        <p className={styles.emptyDay}>No destinations planned for this day yet.</p>
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
    </section>
  );
}

export default function TripPlannerPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const isValidId = Number.isInteger(tripId) && tripId > 0;
  const trip = useTrip(tripId);
  const removeDestination = useRemoveDestinationFromDay();
  const [editing, setEditing] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{
    day: TripDay;
    destination: Destination;
  } | null>(null);

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
    removeDestination.mutate(
      {
        tripId,
        date: pendingRemoval.day.day,
        destinationId: pendingRemoval.destination.id,
      },
      {
        onSettled: () => setPendingRemoval(null),
      },
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.headerRow}>
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

      {editing && (
        <EditTripForm
          trip={data}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      )}

      {removeError && <p className={styles.error}>{removeError}</p>}

      <div className={styles.days}>
        {data.tripDays.map((day) => (
          <DaySection
            key={day.day}
            day={day}
            onRemove={(targetDay, destination) =>
              setPendingRemoval({ day: targetDay, destination })
            }
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
