import type { LocationSearchResult } from '../api/types';
import styles from './LocationResultList.module.css';

interface LocationResultListProps {
  results: LocationSearchResult[];
  selected: LocationSearchResult | null;
  onSelect: (location: LocationSearchResult) => void;
}

function isSameLocation(a: LocationSearchResult, b: LocationSearchResult): boolean {
  return (
    a.name === b.name &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.locationType === b.locationType
  );
}

export default function LocationResultList({
  results,
  selected,
  onSelect,
}: LocationResultListProps) {
  return (
    <ul className={styles.list}>
      {results.map((result, index) => {
        const isSelected = selected !== null && isSameLocation(selected, result);
        return (
          <li key={`${result.name}-${result.latitude}-${result.longitude}-${index}`}>
            <button
              type="button"
              className={isSelected ? `${styles.item} ${styles.selected}` : styles.item}
              aria-pressed={isSelected}
              onClick={() => onSelect(result)}
            >
              <span className={styles.name}>{result.name}</span>
              <span className={styles.pill}>{result.countryCode}</span>
              <span className={styles.pill}>{result.locationType}</span>
              {result.isPartialMatch && <span className={styles.partial}>Partial match</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
