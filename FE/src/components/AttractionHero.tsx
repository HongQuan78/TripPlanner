import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './AttractionHero.module.css';

interface AttractionHeroProps {
  images: string[];
  name: string;
  category: string | null;
  location?: string | null;
  photoCredit?: string | null;
  onBack: () => void;
}

export default function AttractionHero({
  images,
  name,
  category,
  location = null,
  photoCredit = null,
  onBack,
}: AttractionHeroProps) {
  const [index, setIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  const usableImages = images.filter((url) => !failedImages.includes(url));
  const total = usableImages.length;
  const safeIndex = total === 0 ? 0 : index % total;
  const currentImage = total === 0 ? null : usableImages[safeIndex];
  const isLoading = currentImage !== null && !loadedImages.includes(currentImage);

  const goTo = (next: number) => setIndex((next + total) % total);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (total < 2) {
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(safeIndex + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(safeIndex - 1);
    }
  };

  const overlay = (
    <>
      <button type="button" className={styles.back} onClick={onBack}>
        <span aria-hidden="true">←</span> Back
      </button>
      {photoCredit !== null && <span className={styles.credit}>{photoCredit}</span>}
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.overlay}>
        <div className={styles.overlayInner}>
          {category !== null && <span className={styles.eyebrow}>{category}</span>}
          <h1 className={styles.title}>{name}</h1>
          {location !== null && <p className={styles.location}>{location}</p>}
        </div>
      </div>
    </>
  );

  if (currentImage === null) {
    return (
      <div className={styles.hero}>
        <div className={styles.placeholder} data-testid="image-placeholder" aria-hidden="true">
          <span className={styles.placeholderLabel}>No photo yet</span>
        </div>
        {overlay}
      </div>
    );
  }

  const groupProps =
    total > 1
      ? { role: 'group' as const, 'aria-label': `${name} photos`, tabIndex: 0 }
      : {};

  return (
    <div className={styles.hero}>
      <div className={styles.photo} onKeyDown={handleKeyDown} {...groupProps}>
        {isLoading && (
          <div className={styles.loading} data-testid="image-loading" aria-hidden="true" />
        )}
        <img
          className={isLoading ? `${styles.image} ${styles.imageHidden}` : styles.image}
          src={currentImage}
          alt={total === 1 ? name : `${name} photo ${safeIndex + 1} of ${total}`}
          onLoad={() =>
            setLoadedImages((previous) =>
              previous.includes(currentImage) ? previous : [...previous, currentImage],
            )
          }
          onError={() =>
            setFailedImages((previous) =>
              previous.includes(currentImage) ? previous : [...previous, currentImage],
            )
          }
        />
      </div>
      {total > 1 && (
        <>
          <button
            type="button"
            className={`${styles.control} ${styles.prev}`}
            aria-label="Previous photo"
            onClick={() => goTo(safeIndex - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.control} ${styles.next}`}
            aria-label="Next photo"
            onClick={() => goTo(safeIndex + 1)}
          >
            ›
          </button>
          <div className={styles.dots} aria-hidden="true">
            {usableImages.map((url, dotIndex) => (
              <span
                key={url}
                className={
                  dotIndex === safeIndex ? `${styles.dot} ${styles.dotActive}` : styles.dot
                }
              />
            ))}
          </div>
        </>
      )}
      {overlay}
    </div>
  );
}
