import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/shared/api/client';
import type { DestinationDetails } from '@/shared/api/types';
import { useAuth } from '@/features/auth/AuthContext';
import AttractionHero from './AttractionHero';
import AttractionMap from './AttractionMap';
import NearbyRail from './NearbyRail';
import { useDestinationDetails } from './hooks';
import { useAddToTrip } from '@/features/trips/AddToTripContext';
import { parseOpenNow } from './openNow';
import styles from './DestinationDetailsPage.module.css';
import stateStyles from '@/shared/ui/PageState.module.css';

function OpenNowBadge({ openingHours }: { openingHours: string | null }) {
  const result = parseOpenNow(openingHours);
  if (result === null) {
    return null;
  }
  if (result.status === 'open') {
    return (
      <span className={styles.openBadge}>
        <span className={styles.openDot} aria-hidden="true" />
        Open now
      </span>
    );
  }
  return <span className={styles.closedBadge}>Closed</span>;
}

function InfoRow({
  label,
  value,
  href,
  badge,
  emptyLabel = 'Not available',
}: {
  label: string;
  value: string | null;
  href?: string;
  badge?: ReactNode;
  emptyLabel?: string;
}) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoKey}>{label}</span>
      <span className={styles.infoVal}>
        {value === null ? (
          <span className={styles.na}>{emptyLabel}</span>
        ) : href ? (
          <a className={styles.website} href={href} target="_blank" rel="noopener noreferrer">
            {value}
            <span className={styles.visuallyHidden}> (opens in new tab)</span>
          </a>
        ) : (
          <span className={styles.hoursLine}>
            {value}
            {badge}
          </span>
        )}
      </span>
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
  const stateHeadingRef = useRef<HTMLHeadingElement>(null);

  const goBack = () => navigate(-1);

  useEffect(() => {
    if (details.isError) {
      stateHeadingRef.current?.focus();
    }
  }, [details.isError]);

  if (details.isPending) {
    return (
      <section className={styles.page}>
        <button type="button" className={styles.stateBack} onClick={goBack}>
          <span aria-hidden="true">←</span> Back
        </button>
        <p className={styles.loading}>Loading destination…</p>
      </section>
    );
  }

  if (details.isError) {
    const isNotFound = details.error instanceof ApiError && details.error.status === 404;
    return (
      <section className={styles.page}>
        <button type="button" className={styles.stateBack} onClick={goBack}>
          <span aria-hidden="true">←</span> Back
        </button>
        <div className={stateStyles.state}>
          <span className={stateStyles.emoji} aria-hidden="true">
            {isNotFound ? '🙈' : '⛅'}
          </span>
          <h1 className={stateStyles.heading} tabIndex={-1} ref={stateHeadingRef}>
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
  const hasCoords = destination.latitude !== null && destination.longitude !== null;
  const openNow = parseOpenNow(destination.openingHours);

  const triggerAdd = () => {
    if (onAddToTrip) {
      onAddToTrip(destination);
    } else {
      requestAdd(destination.xid);
    }
  };

  const addNote = isAuthenticated ? (
    <p className={styles.btnNote}>Added to your active itinerary in one click.</p>
  ) : (
    <p className={styles.btnNote}>
      <Link className={styles.noteLink} to="/login">
        Log in
      </Link>{' '}
      to add to your trip
    </p>
  );

  return (
    <section className={styles.page}>
      <div className={styles.heroFull}>
        <AttractionHero
          key={destination.xid}
          images={destination.imageUrls}
          name={destination.name}
          category={destination.category}
          onBack={goBack}
        />
      </div>

      <div className={styles.body}>
        <div className={styles.main}>
          <section className={styles.leadSection}>
            {destination.description !== null ? (
              <p className={styles.lead}>{destination.description}</p>
            ) : (
              <p className={styles.na}>No description available.</p>
            )}
          </section>

          {hasCoords && (
            <section className={styles.section}>
              <h2 className={styles.secHead}>Location</h2>
              <AttractionMap
                key={destination.xid}
                latitude={destination.latitude!}
                longitude={destination.longitude!}
                name={destination.name}
              />
            </section>
          )}

          <section className={styles.section}>
            <h2 className={styles.secHead}>Details</h2>
            <div className={styles.infoBlock}>
              <InfoRow label="Address" value={destination.address} />
              <InfoRow
                label="Opening hours"
                value={destination.openingHours}
                badge={<OpenNowBadge openingHours={destination.openingHours} />}
                emptyLabel="Opening hours not available"
              />
              <InfoRow
                label="Website"
                value={destination.website}
                href={destination.website ?? undefined}
              />
            </div>
          </section>

          <NearbyRail
            latitude={destination.latitude}
            longitude={destination.longitude}
            selfXid={destination.xid}
          />
        </div>

        <aside className={styles.aside}>
          <div className={styles.panel}>
            {destination.category !== null && (
              <span className={styles.panelEyebrow}>{destination.category}</span>
            )}
            <p className={styles.panelTitle}>{destination.name}</p>
            {(destination.openingHours !== null || openNow !== null) && (
              <div className={styles.facts}>
                {destination.openingHours !== null && (
                  <div className={styles.fact}>
                    <span className={styles.factKey}>Hours</span>
                    <span className={styles.factVal}>{destination.openingHours}</span>
                  </div>
                )}
                {openNow !== null && (
                  <div className={styles.fact}>
                    <span className={styles.factKey}>Status</span>
                    <span
                      className={
                        openNow.status === 'open'
                          ? `${styles.factVal} ${styles.factOpen}`
                          : styles.factVal
                      }
                    >
                      {openNow.status === 'open' ? 'Open now' : 'Closed'}
                    </span>
                  </div>
                )}
              </div>
            )}
            <button type="button" className={styles.btnPrimary} onClick={triggerAdd}>
              Add to Trip
            </button>
            {addNote}
          </div>
        </aside>
      </div>

      <div className={styles.stickyBar}>
        <div className={styles.stickyCtx}>
          {destination.category !== null && (
            <span className={styles.stickyKey}>{destination.category}</span>
          )}
          {openNow !== null && (
            <span
              className={
                openNow.status === 'open'
                  ? `${styles.stickyVal} ${styles.factOpen}`
                  : styles.stickyVal
              }
            >
              {openNow.status === 'open' ? (
                <>
                  <span className={styles.openDot} aria-hidden="true" /> Open now
                </>
              ) : (
                'Closed'
              )}
            </span>
          )}
          {!isAuthenticated && (
            <span className={styles.stickyNote}>
              <Link className={styles.noteLink} to="/login">
                Log in
              </Link>{' '}
              to add to your trip
            </span>
          )}
        </div>
        <button
          type="button"
          className={`${styles.btnPrimary} ${styles.stickyBtn}`}
          onClick={triggerAdd}
        >
          Add to Trip
        </button>
      </div>
    </section>
  );
}
