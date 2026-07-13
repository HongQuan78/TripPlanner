import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAddDestinationToDay, useTrips } from '../hooks/trips';
import { formatDate, formatDateRange } from '../lib/dates';
import Modal from './Modal';
import dialogStyles from './Dialog.module.css';
import styles from './AddToTripDialog.module.css';

export default function AddToTripDialog({ xid, onClose }: { xid: string; onClose: () => void }) {
  const trips = useTrips();
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const addDestination = useAddDestinationToDay();
  const selectedTrip =
    selectedTripId === null
      ? null
      : (trips.data?.find((trip) => trip.id === selectedTripId) ?? null);

  function handleClose() {
    if (addDestination.isPending) {
      return;
    }
    onClose();
  }

  function handleBack() {
    setSelectedTripId(null);
    addDestination.reset();
  }

  function handlePickDay(date: string) {
    if (selectedTrip === null) {
      return;
    }
    addDestination.mutate(
      { tripId: selectedTrip.id, date, body: { xid } },
      { onSuccess: onClose },
    );
  }

  const addError =
    addDestination.error instanceof ApiError
      ? addDestination.error.message
      : addDestination.isError
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <Modal label="Add to trip" onClose={handleClose}>
      <h2 className={dialogStyles.title}>
        {selectedTrip ? `Pick a day in ${selectedTrip.name}` : 'Pick a trip'}
      </h2>

      {trips.isPending && <p className={styles.loading}>Loading your trips…</p>}

      {trips.isError && (
        <>
          <p className={dialogStyles.error}>Could not load your trips. Please try again.</p>
          <button
            type="button"
            className={styles.back}
            onClick={() => void trips.refetch()}
          >
            Try again
          </button>
        </>
      )}

      {trips.isSuccess && trips.data.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyEmoji} aria-hidden="true">
            🧳
          </span>
          <p className={styles.emptyText}>No trips yet — create one first, then add this spot.</p>
          <Link to="/trips" className={styles.createLink} onClick={onClose}>
            Create a trip
          </Link>
        </div>
      )}

      {trips.isSuccess && trips.data.length > 0 && selectedTrip === null && (
        <div className={styles.list}>
          {trips.data.map((trip) => (
            <button
              key={trip.id}
              type="button"
              className={styles.option}
              onClick={() => setSelectedTripId(trip.id)}
            >
              <span className={styles.optionName}>{trip.name}</span>
              <span className={styles.optionMeta}>
                {formatDateRange(trip.startDate, trip.endDate)}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedTrip !== null && (
        <>
          <button
            type="button"
            className={styles.back}
            disabled={addDestination.isPending}
            onClick={handleBack}
          >
            ← Back to trips
          </button>
          <div className={styles.list}>
            {selectedTrip.tripDays.map((day) => (
              <button
                key={day.day}
                type="button"
                className={styles.option}
                disabled={addDestination.isPending}
                onClick={() => handlePickDay(day.day)}
              >
                <span className={styles.optionName}>{formatDate(day.day)}</span>
                <span className={styles.optionMeta}>
                  {day.destinations.length}{' '}
                  {day.destinations.length === 1 ? 'destination' : 'destinations'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {addError && <p className={dialogStyles.error}>{addError}</p>}

      <div className={dialogStyles.actions}>
        <button
          type="button"
          className={dialogStyles.cancel}
          disabled={addDestination.isPending}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
