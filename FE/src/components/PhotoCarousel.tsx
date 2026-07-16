import { useState } from 'react';
import styles from './PhotoCarousel.module.css';

export default function PhotoCarousel({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  const usableImages = images.filter((url) => !failedImages.includes(url));
  const total = usableImages.length;

  if (total === 0) {
    return (
      <div className={styles.placeholder} data-testid="image-placeholder" aria-hidden="true">
        🏞️
      </div>
    );
  }

  const safeIndex = index % total;
  const currentImage = usableImages[safeIndex];
  const isLoading = !loadedImages.includes(currentImage);

  return (
    <div className={styles.carousel}>
      {isLoading && <div className={styles.loading} data-testid="image-loading" aria-hidden="true" />}
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
      {total > 1 && (
        <>
          <button
            type="button"
            className={`${styles.control} ${styles.prev}`}
            aria-label="Previous photo"
            onClick={() => setIndex((safeIndex - 1 + total) % total)}
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.control} ${styles.next}`}
            aria-label="Next photo"
            onClick={() => setIndex((safeIndex + 1) % total)}
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
    </div>
  );
}
