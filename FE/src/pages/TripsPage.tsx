import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Trip } from '../api/types';
import CreateTripForm from '../components/CreateTripForm';
import skeletonStyles from '../components/Skeleton.module.css';
import { useTrips } from '../hooks/trips';
import { formatShortDate, todayISO, tripStatus } from '../lib/dates';
import stateStyles from './PageState.module.css';
import styles from './TripsPage.module.css';

const TRIP_SKELETON_COUNT = 4;

const statusClass = {
  upcoming: styles.statusUpcoming,
  ongoing: styles.statusOngoing,
  past: styles.statusPast,
} as const;

function TripPass({ trip, today }: { trip: Trip; today: string }) {
  const dayCount = trip.tripDays.length;
  const placeCount = trip.tripDays.reduce((total, day) => total + day.destinations.length, 0);
  const status = tripStatus(trip.startDate, trip.endDate, today);

  return (
    <Link
      to={`/trips/${trip.id}`}
      className={`${styles.pass} ${status.kind === 'past' ? styles.passPast : ''}`}
    >
      <div className={styles.passTop}>
        <div className={styles.passHead}>
          <h2 className={styles.passName}>{trip.name}</h2>
          <span className={`${styles.status} ${statusClass[status.kind]}`}>{status.label}</span>
        </div>
        <div className={styles.route}>
          <span>{formatShortDate(trip.startDate)}</span>
          <span className={styles.routeLine} aria-hidden="true" />
          <span className={skeletonStyles.visuallyHidden}> to </span>
          <span>{formatShortDate(trip.endDate)}</span>
        </div>
      </div>
      <div className={styles.perf}>
        <div className={styles.stubs}>
          <div className={styles.stub}>
            <span className={styles.stubValue}>{dayCount}</span>
            <span className={styles.stubLabel}>{dayCount === 1 ? 'Day' : 'Days'}</span>
          </div>
          <div className={styles.stub}>
            <span className={styles.stubValue}>{placeCount}</span>
            <span className={styles.stubLabel}>{placeCount === 1 ? 'Place' : 'Places'}</span>
          </div>
        </div>
      </div>
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
        <p className={skeletonStyles.visuallyHidden}>Loading your trips…</p>
        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: TRIP_SKELETON_COUNT }, (_, index) => (
            <div key={index} className={styles.skeletonPass} />
          ))}
        </div>
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
  const today = todayISO();

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
            <TripPass key={trip.id} trip={trip} today={today} />
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
