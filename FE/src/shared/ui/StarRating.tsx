import styles from './StarRating.module.css';

export default function StarRating({ rating }: { rating: number | null }) {
  if (rating !== null && rating >= 1 && rating <= 3) {
    return (
      <span className={styles.rating} aria-label={`Rated ${rating} of 3`}>
        {'★'.repeat(rating)}
        {'☆'.repeat(3 - rating)}
      </span>
    );
  }
  return <span className={styles.noRating}>Not rated</span>;
}
