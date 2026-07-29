import { useState } from 'react';
import type { PopularCity } from './popularCities';
import { useImageLoaded } from '@/shared/lib/useImageLoaded';
import styles from './PopularTile.module.css';

export default function PopularTile({
  city,
  gradientClass,
  onSelect,
}: {
  city: PopularCity;
  gradientClass: string;
  onSelect: () => void;
}) {
  const { imgRef, loaded, markLoaded } = useImageLoaded(city.imageUrl);
  const [failed, setFailed] = useState(false);
  const showImage = city.imageUrl !== null && !failed;

  return (
    <button type="button" className={`${styles.tile} ${gradientClass}`} onClick={onSelect}>
      {showImage && (
        <img
          ref={imgRef}
          className={loaded ? styles.tileImage : `${styles.tileImage} ${styles.tileImageHidden}`}
          src={city.imageUrl ?? undefined}
          alt=""
          aria-hidden="true"
          data-testid="tile-image"
          data-loaded={loaded}
          onLoad={markLoaded}
          onError={() => setFailed(true)}
        />
      )}
      <span className={styles.tileScrim} aria-hidden="true" />
      <span className={styles.tileName}>{city.name}</span>
    </button>
  );
}
