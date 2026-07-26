import type { LocationSearchResult } from '@/shared/api/types';
import styles from './SuggestionDropdown.module.css';
import { suggestionOptionId } from './suggestionOption';

interface SuggestionDropdownProps {
  id: string;
  suggestions: LocationSearchResult[];
  activeIndex: number;
  onChoose: (suggestion: LocationSearchResult) => void;
}

function MapPinGlyph() {
  return (
    <span className={styles.pin} aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    </span>
  );
}

export default function SuggestionDropdown({
  id,
  suggestions,
  activeIndex,
  onChoose,
}: SuggestionDropdownProps) {
  return (
    <div className={styles.panel}>
      <ul id={id} role="listbox" aria-label="Location suggestions" className={styles.list}>
        {suggestions.map((suggestion, index) => (
          <li
            key={`${suggestion.name}-${suggestion.latitude}-${suggestion.longitude}-${index}`}
            id={suggestionOptionId(id, index)}
            role="option"
            aria-selected={index === activeIndex}
            className={index === activeIndex ? `${styles.item} ${styles.active}` : styles.item}
            onMouseDown={(event) => {
              event.preventDefault();
              onChoose(suggestion);
            }}
          >
            <MapPinGlyph />
            <span className={styles.name}>{suggestion.name}</span>
            <span className={styles.pill}>{suggestion.countryCode}</span>
            <span className={styles.pill}>{suggestion.locationType}</span>
          </li>
        ))}
      </ul>
      {suggestions.length === 0 && <p className={styles.empty}>No attractions found.</p>}
    </div>
  );
}
