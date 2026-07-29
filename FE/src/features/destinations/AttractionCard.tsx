import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Attraction } from '@/shared/api/models/destination/attraction';
import { useAddToTrip } from '@/features/trips/useAddToTrip';
import StarRating from '@/shared/ui/StarRating';
import { useImageLoaded } from '@/shared/lib/useImageLoaded';
import styles from './AttractionCard.module.css';

function formatDistance(meters: number): string {
  if (Math.round(meters) < 1000) {
    return `${Math.round(meters)} m from center`;
  }
  return `${(meters / 1000).toFixed(1)} km from center`;
}

export default function AttractionCard({ attraction }: { attraction: Attraction }) {
  const { requestAdd } = useAddToTrip();
  const { imgRef, loaded: imageLoaded, markLoaded } = useImageLoaded(attraction.imageUrl);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = attraction.imageUrl !== null && !imageFailed;

  const ratingLevel = attraction.rating === null ? null : Number.parseInt(attraction.rating, 10);
  const isRated = ratingLevel !== null && ratingLevel >= 1 && ratingLevel <= 3;
  const isHeritage = attraction.rating?.endsWith('h') ?? false;
  const tags = attraction.kinds.slice(0, 3).map((kind) => kind.replaceAll('_', ' '));

  return (
    <article className={styles.card}>
      <Link to={`/attractions/${attraction.xid}`} className={styles.cardLink}>
        <div className={styles.cover}>
          {showImage ? (
            <>
              {!imageLoaded && (
                <div
                  className={styles.imageLoading}
                  data-testid="image-loading"
                  aria-hidden="true"
                />
              )}
              <img
                ref={imgRef}
                className={imageLoaded ? styles.image : `${styles.image} ${styles.imageHidden}`}
                src={attraction.imageUrl ?? undefined}
                alt={attraction.name}
                onLoad={markLoaded}
                onError={() => setImageFailed(true)}
              />
            </>
          ) : (
            <div className={styles.placeholder} data-testid="image-placeholder" aria-hidden="true">
              🏞️
            </div>
          )}
          {isHeritage && <span className={styles.heritage}>heritage</span>}
          {isRated && (
            <span className={styles.ratingBadge}>
              <StarRating rating={ratingLevel} />
            </span>
          )}
        </div>
        <div className={styles.body}>
          <h3 className={styles.name}>{attraction.name}</h3>
          {attraction.distanceMeters !== null && (
            <p className={styles.distance}>{formatDistance(attraction.distanceMeters)}</p>
          )}
          {tags.length > 0 && (
            <div className={styles.tags}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      <button
        type="button"
        className={styles.addToTrip}
        aria-label={`Add ${attraction.name} to a trip`}
        onClick={() => requestAdd(attraction.xid)}
      >
        <span aria-hidden="true">＋</span> Add to trip
      </button>
    </article>
  );
}
