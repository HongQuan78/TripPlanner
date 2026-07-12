import { useState } from 'react';
import styles from './PhotoCarousel.module.css';

export default function PhotoCarousel({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const total = images.length;

  if (total === 0) {
    return (
      <div className={styles.placeholder} data-testid="image-placeholder" aria-hidden="true">
        🏞️
      </div>
    );
  }

  if (total === 1) {
    return (
      <div className={styles.carousel}>
        <img className={styles.image} src={images[0]} alt={name} />
      </div>
    );
  }

  return (
    <div className={styles.carousel}>
      <img
        className={styles.image}
        src={images[index]}
        alt={`${name} photo ${index + 1} of ${total}`}
      />
      <button
        type="button"
        className={`${styles.control} ${styles.prev}`}
        aria-label="Previous photo"
        onClick={() => setIndex((current) => (current - 1 + total) % total)}
      >
        ‹
      </button>
      <button
        type="button"
        className={`${styles.control} ${styles.next}`}
        aria-label="Next photo"
        onClick={() => setIndex((current) => (current + 1) % total)}
      >
        ›
      </button>
      <div className={styles.dots} aria-hidden="true">
        {images.map((url, dotIndex) => (
          <span
            key={url}
            className={dotIndex === index ? `${styles.dot} ${styles.dotActive}` : styles.dot}
          />
        ))}
      </div>
    </div>
  );
}
