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
  const imageUrl = city.imageUrl === null || city.imageUrl === '' ? null : city.imageUrl;
  const { imgRef, loaded, markLoaded } = useImageLoaded(imageUrl);
  const [failed, setFailed] = useState(false);

  return (
    <button type="button" className={`${styles.tile} ${gradientClass}`} onClick={onSelect}>
      {imageUrl !== null && !failed && (
        <img
          ref={imgRef}
          className={loaded ? styles.tileImage : `${styles.tileImage} ${styles.tileImageHidden}`}
          src={imageUrl}
          alt=""
          aria-hidden="true"
          width={640}
          height={400}
          loading="lazy"
          decoding="async"
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
