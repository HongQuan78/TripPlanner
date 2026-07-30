import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Attraction } from '@/shared/api/models/destination/attraction';
import { useNearbyAttractions } from './hooks';
import styles from './NearbyRail.module.css';

function NearbyCard({ attraction }: { attraction: Attraction }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = attraction.imageUrl !== null && !imageFailed;
  const kind = attraction.kinds[0]?.replaceAll('_', ' ') ?? null;
  const ratingLevel = attraction.rating === null ? null : Number.parseInt(attraction.rating, 10);
  const isRated = ratingLevel !== null && ratingLevel >= 1 && ratingLevel <= 3;
  const distanceKm =
    attraction.distanceMeters === null ? null : (attraction.distanceMeters / 1000).toFixed(1);

  return (
    <Link to={`/attractions/${attraction.xid}`} className={styles.card}>
      <div className={styles.thumb}>
        {showImage ? (
          <img
            className={styles.image}
            src={attraction.imageUrl ?? undefined}
            alt=""
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={styles.placeholder} data-testid="image-placeholder" aria-hidden="true">
            <span className={styles.placeholderLabel}>No photo yet</span>
          </div>
        )}
      </div>
      <div className={styles.body}>
        {kind !== null && <span className={styles.kind}>{kind}</span>}
        <h3 className={styles.name}>{attraction.name}</h3>
        <div className={styles.meta}>
          {isRated ? (
            <span className={styles.rating}>
              <span className={styles.star} aria-hidden="true">
                ★
              </span>
              <span className={styles.ratingValue}>{ratingLevel}</span>
            </span>
          ) : (
            <span />
          )}
          {distanceKm !== null && <span className={styles.distance}>{distanceKm} km away</span>}
        </div>
      </div>
    </Link>
  );
}

export default function NearbyRail({
  latitude,
  longitude,
  selfXid,
}: {
  latitude: number | null;
  longitude: number | null;
  selfXid: string;
}) {
  const nearby = useNearbyAttractions(latitude, longitude, selfXid);

  if (nearby.data === undefined || nearby.data.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Nearby attractions</h2>
      <div className={styles.rail}>
        {nearby.data.map((attraction) => (
          <NearbyCard key={attraction.xid} attraction={attraction} />
        ))}
      </div>
    </section>
  );
}
