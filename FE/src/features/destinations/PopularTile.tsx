import { useEffect, useRef, useState } from 'react';
import type { PopularCity } from './popularCities';
import styles from './SearchPage.module.css';

export default function PopularTile({
  city,
  gradientClass,
  onSelect,
}: {
  city: PopularCity;
  gradientClass: string;
  onSelect: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = city.imageUrl !== null && !failed;

  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [city.imageUrl]);

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
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      <span className={styles.tileScrim} aria-hidden="true" />
      <span className={styles.tileName}>{city.name}</span>
    </button>
  );
}
