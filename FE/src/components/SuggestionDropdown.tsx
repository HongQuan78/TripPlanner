import type { LocationSearchResult } from '../api/types';
import styles from './SuggestionDropdown.module.css';
import { suggestionOptionId } from './suggestionOption';

interface SuggestionDropdownProps {
  id: string;
  suggestions: LocationSearchResult[];
  activeIndex: number;
  onChoose: (suggestion: LocationSearchResult) => void;
}

export default function SuggestionDropdown({
  id,
  suggestions,
  activeIndex,
  onChoose,
}: SuggestionDropdownProps) {
  return (
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
          <span className={styles.name}>{suggestion.name}</span>
          <span className={styles.pill}>{suggestion.countryCode}</span>
          <span className={styles.pill}>{suggestion.locationType}</span>
        </li>
      ))}
    </ul>
  );
}
