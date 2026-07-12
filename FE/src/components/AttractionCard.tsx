import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Attraction } from '../api/types';
import { useAddToTrip } from '../trips/AddToTripContext';
import styles from './AttractionCard.module.css';

export default function AttractionCard({ attraction }: { attraction: Attraction }) {
  const { requestAdd } = useAddToTrip();

  function handleAddToTrip(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    requestAdd(attraction.xid);
  }

  const [imageFailed, setImageFailed] = useState(false);
  const showImage = attraction.imageUrl !== null && !imageFailed;
  const ratingLevel = attraction.rating === null ? null : Number.parseInt(attraction.rating, 10);
  const hasRating = ratingLevel !== null && ratingLevel >= 1 && ratingLevel <= 3;
  const isHeritage = attraction.rating?.endsWith('h') ?? false;
  const tags = attraction.kinds.slice(0, 3).map((kind) => kind.replaceAll('_', ' '));

  return (
    <Link to={`/attractions/${attraction.xid}`} className={styles.card}>
      {showImage ? (
        <img
          className={styles.image}
          src={attraction.imageUrl ?? undefined}
          alt={attraction.name}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className={styles.placeholder} data-testid="image-placeholder" aria-hidden="true">
          🏞️
        </div>
      )}
      <div className={styles.body}>
        <h3 className={styles.name}>{attraction.name}</h3>
        <div className={styles.meta}>
          {hasRating ? (
            <span className={styles.rating} aria-label={`Rated ${ratingLevel} of 3`}>
              {'★'.repeat(ratingLevel)}
              {'☆'.repeat(3 - ratingLevel)}
            </span>
          ) : (
            <span className={styles.noRating}>Not rated</span>
          )}
          {isHeritage && <span className={styles.heritage}>heritage</span>}
        </div>
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          className={styles.addToTrip}
          aria-label={`Add ${attraction.name} to a trip`}
          onClick={handleAddToTrip}
        >
          ＋ Add to trip
        </button>
      </div>
    </Link>
  );
}
