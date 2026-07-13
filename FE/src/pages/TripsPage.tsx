import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Trip } from '../api/types';
import CreateTripForm from '../components/CreateTripForm';
import { useTrips } from '../hooks/trips';
import { formatDateRange } from '../lib/dates';
import stateStyles from './PageState.module.css';
import styles from './TripsPage.module.css';

function TripCard({ trip }: { trip: Trip }) {
  const dayCount = trip.tripDays.length;
  return (
    <Link to={`/trips/${trip.id}`} className={styles.card}>
      <h2 className={styles.cardName}>{trip.name}</h2>
      <span className={styles.cardDates}>{formatDateRange(trip.startDate, trip.endDate)}</span>
      <span className={styles.cardDays}>
        {dayCount} {dayCount === 1 ? 'day' : 'days'}
      </span>
    </Link>
  );
}

export default function TripsPage() {
  const trips = useTrips();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  function handleCreated(trip: Trip) {
    setCreating(false);
    navigate(`/trips/${trip.id}`);
  }

  if (trips.isPending) {
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>My trips</h1>
        <p className={styles.loading}>Loading your trips…</p>
      </section>
    );
  }

  if (trips.isError) {
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>My trips</h1>
        <div className={stateStyles.state}>
          <span className={stateStyles.emoji} aria-hidden="true">
            ⛅
          </span>
          <p className={stateStyles.text}>Could not load your trips. Please try again.</p>
          <button type="button" className={styles.retry} onClick={() => void trips.refetch()}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  const hasTrips = trips.data.length > 0;

  return (
    <section className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>My trips</h1>
        {hasTrips && !creating && (
          <button type="button" className={styles.newTrip} onClick={() => setCreating(true)}>
            New trip
          </button>
        )}
      </div>

      {creating && (
        <CreateTripForm onCreated={handleCreated} onCancel={() => setCreating(false)} />
      )}

      {hasTrips ? (
        <div className={styles.grid}>
          {trips.data.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        !creating && (
          <div className={stateStyles.state}>
            <span className={stateStyles.emoji} aria-hidden="true">
              🧳
            </span>
            <h2 className={stateStyles.heading}>No trips yet</h2>
            <p className={stateStyles.text}>
              Plan your next adventure — create a trip and start adding destinations.
            </p>
            <button
              type="button"
              className={styles.emptyAction}
              onClick={() => setCreating(true)}
            >
              Create your first trip
            </button>
          </div>
        )
      )}
    </section>
  );
}
