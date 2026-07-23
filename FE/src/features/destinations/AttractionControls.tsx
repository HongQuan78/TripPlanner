import { ATTRACTION_CATEGORIES, MIN_RATE_OPTIONS } from './attractionFilters';
import type { AttractionSort } from './attractionFilters';
import styles from './AttractionControls.module.css';

interface AttractionControlsProps {
  categories: string[];
  minRate: number | null;
  sort: AttractionSort;
  onToggleCategory: (value: string) => void;
  onMinRateChange: (value: number | null) => void;
  onSortChange: (value: AttractionSort) => void;
  onClearFilters: () => void;
}

export default function AttractionControls({
  categories,
  minRate,
  sort,
  onToggleCategory,
  onMinRateChange,
  onSortChange,
  onClearFilters,
}: AttractionControlsProps) {
  const hasActiveFilters = categories.length > 0 || minRate !== null;

  return (
    <div className={styles.controls}>
      <fieldset className={styles.filterGroup}>
        <legend className={styles.legend}>Category</legend>
        <div className={styles.checkboxRow}>
          {ATTRACTION_CATEGORIES.map((category) => (
            <label key={category.value} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={categories.includes(category.value)}
                onChange={() => onToggleCategory(category.value)}
              />
              {category.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.selectGroup}>
        <label className={styles.selectLabel} htmlFor="attraction-min-rate">
          Minimum rating
        </label>
        <select
          id="attraction-min-rate"
          className={styles.select}
          value={minRate === null ? '' : String(minRate)}
          onChange={(event) =>
            onMinRateChange(event.target.value === '' ? null : Number(event.target.value))
          }
        >
          {MIN_RATE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value === null ? '' : String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.selectGroup}>
        <label className={styles.selectLabel} htmlFor="attraction-sort">
          Sort by
        </label>
        <select
          id="attraction-sort"
          className={styles.select}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as AttractionSort)}
        >
          <option value="recommended">Recommended</option>
          <option value="rating">Highest rating</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button type="button" className={styles.clearFilters} onClick={onClearFilters}>
          Clear filters
        </button>
      )}
    </div>
  );
}
