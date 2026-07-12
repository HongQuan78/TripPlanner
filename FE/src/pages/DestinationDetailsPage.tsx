import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import type { DestinationDetails } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import PhotoCarousel from '../components/PhotoCarousel';
import { useDestinationDetails } from '../hooks/locations';
import { useAddToTrip } from '../trips/AddToTripContext';
import styles from './DestinationDetailsPage.module.css';
import stateStyles from './PageState.module.css';

function InfoRow({ label, value, href }: { label: string; value: string | null; href?: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      {value === null ? (
        <span className={styles.missing}>Not available</span>
      ) : href ? (
        <a className={styles.website} href={href} target="_blank" rel="noopener noreferrer">
          {value}
        </a>
      ) : (
        <span className={styles.infoValue}>{value}</span>
      )}
    </div>
  );
}

export default function DestinationDetailsPage({
  onAddToTrip,
}: {
  onAddToTrip?: (details: DestinationDetails) => void;
}) {
  const { xid } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { requestAdd } = useAddToTrip();
  const details = useDestinationDetails(xid ?? '');

  const backButton = (
    <button type="button" className={styles.back} onClick={() => navigate(-1)}>
      ← Back
    </button>
  );

  if (details.isPending) {
    return (
      <section className={styles.page}>
        {backButton}
        <p className={styles.loading}>Loading destination…</p>
      </section>
    );
  }

  if (details.isError) {
    const isNotFound = details.error instanceof ApiError && details.error.status === 404;
    return (
      <section className={styles.page}>
        {backButton}
        <div className={stateStyles.state}>
          <span className={stateStyles.emoji} aria-hidden="true">
            {isNotFound ? '🙈' : '⛅'}
          </span>
          <h1 className={stateStyles.heading}>
            {isNotFound ? 'Destination not found' : 'Service unavailable'}
          </h1>
          <p className={stateStyles.text}>
            {isNotFound
              ? 'We could not find this destination — it may no longer exist.'
              : 'Something went wrong while loading this destination. Please try again.'}
          </p>
          {!isNotFound && (
            <button
              type="button"
              className={styles.retry}
              onClick={() => void details.refetch()}
            >
              Try again
            </button>
          )}
        </div>
      </section>
    );
  }

  const destination = details.data;

  return (
    <section className={styles.page}>
      {backButton}
      <article className={styles.card}>
        <PhotoCarousel images={destination.imageUrls} name={destination.name} />
        <header className={styles.header}>
          <h1 className={styles.name}>{destination.name}</h1>
          {destination.category !== null && (
            <span className={styles.category}>{destination.category}</span>
          )}
        </header>
        {destination.description !== null ? (
          <p className={styles.description}>{destination.description}</p>
        ) : (
          <p className={styles.missing}>No description available.</p>
        )}
        <div className={styles.info}>
          <InfoRow label="Address" value={destination.address} />
          <InfoRow label="Opening hours" value={destination.openingHours} />
          <InfoRow
            label="Website"
            value={destination.website}
            href={destination.website ?? undefined}
          />
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => {
              if (onAddToTrip) {
                onAddToTrip(destination);
              } else {
                requestAdd(destination.xid);
              }
            }}
          >
            Add to Trip
          </button>
          {!isAuthenticated && (
            <p className={styles.hint}>You will be asked to log in to finish adding.</p>
          )}
        </div>
      </article>
    </section>
  );
}
