import { useEffect, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ApiError } from '@/shared/api/client';
import type { LocationSearchResult } from '@/shared/api/types';
import AttractionCard from './AttractionCard';
import LocationResultList from './LocationResultList';
import skeletonStyles from '@/shared/ui/Skeleton.module.css';
import SuggestionDropdown from './SuggestionDropdown';
import { suggestionOptionId } from './suggestionOption';
import { useAttractions, useLocationSearch, useLocationSuggestions } from './hooks';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import stateStyles from '@/shared/ui/PageState.module.css';
import styles from './SearchPage.module.css';
import { getSearchState, saveSearchState } from './searchState';

const suggestionListId = 'location-suggestions';
const ATTRACTION_SKELETON_COUNT = 4;
const POPULAR_CITIES = ['Đà Nẵng', 'Paris', 'Tokyo', 'Rome', 'Barcelona', 'New York'];

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status !== 503 && error.status !== 0) {
    return error.message;
  }
  return 'Service unavailable — please try again.';
}

export default function SearchPage() {
  const restored = getSearchState();
  const [input, setInput] = useState(restored.input);
  const [submittedQuery, setSubmittedQuery] = useState(restored.submittedQuery);
  const [selected, setSelected] = useState<LocationSearchResult | null>(restored.selected);
  const [suppressedQuery, setSuppressedQuery] = useState(() =>
    restored.submittedQuery ? restored.input.trim() : '',
  );
  const [dismissedQuery, setDismissedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    saveSearchState({ input, submittedQuery, selected });
  }, [input, submittedQuery, selected]);

  const search = useLocationSearch(submittedQuery);
  const attractions = useAttractions(selected);

  const debouncedInput = useDebouncedValue(input, 300);
  const trimmedDebounced = debouncedInput.trim();
  const suggestionsSuppressed = trimmedDebounced === suppressedQuery;
  const suggestionsSource = useLocationSuggestions(suggestionsSuppressed ? '' : trimmedDebounced);
  const suggestions = (suggestionsSource.data ?? []).slice(0, 5);
  const dropdownOpen =
    input.trim().length >= 2 &&
    trimmedDebounced.length >= 2 &&
    !suggestionsSuppressed &&
    trimmedDebounced !== dismissedQuery &&
    suggestionsSource.isSuccess &&
    suggestions.length > 0;

  useEffect(() => {
    setActiveIndex(-1);
  }, [trimmedDebounced]);

  function handleChoose(suggestion: LocationSearchResult) {
    setInput(suggestion.name);
    setSuppressedQuery(suggestion.name);
    setDismissedQuery(trimmedDebounced);
    setSubmittedQuery(trimmedDebounced);
    setSelected(suggestion);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!dropdownOpen) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : (index - 1) % suggestions.length,
      );
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        event.preventDefault();
        handleChoose(suggestions[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      setDismissedQuery(trimmedDebounced);
      setActiveIndex(-1);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (!query) {
      return;
    }
    setSelected(null);
    setSubmittedQuery(query);
    setSuppressedQuery(query);
    setDismissedQuery(trimmedDebounced);
    setActiveIndex(-1);
  }

  function handleChipSelect(city: string) {
    setInput(city);
    setSelected(null);
    setSubmittedQuery(city);
    setSuppressedQuery(city);
    setDismissedQuery(trimmedDebounced);
    setActiveIndex(-1);
  }

  function handleClear() {
    setInput('');
    setSubmittedQuery('');
    setSelected(null);
    setSuppressedQuery('');
    setDismissedQuery('');
    setActiveIndex(-1);
  }

  const results = (search.data ?? []).slice(0, 5);

  return (
    <section className={styles.page}>
      <section className={styles.heroBand}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>Where to next?</h1>
          <p className={styles.tagline}>Search any city and start building the trip.</p>
          <form className={styles.form} role="search" onSubmit={handleSubmit}>
            <div className={styles.inputWrap}>
              <input
                type="search"
                className={styles.input}
                aria-label="Search"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={dropdownOpen}
                aria-controls={suggestionListId}
                aria-activedescendant={
                  dropdownOpen && activeIndex >= 0
                    ? suggestionOptionId(suggestionListId, activeIndex)
                    : undefined
                }
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
              />
              {dropdownOpen && (
                <SuggestionDropdown
                  id={suggestionListId}
                  suggestions={suggestions}
                  activeIndex={activeIndex}
                  onChoose={handleChoose}
                />
              )}
            </div>
            <button type="submit" className={styles.submit} disabled={input.trim().length === 0}>
              Search
            </button>
            <button type="button" className={styles.clear} onClick={handleClear}>
              Clear
            </button>
          </form>
          {submittedQuery === '' && (
            <div className={styles.popular}>
              <p className={styles.popularLabel}>Popular searches</p>
              <div className={styles.chipRow}>
                {POPULAR_CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    className={styles.chip}
                    onClick={() => handleChipSelect(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className={styles.results}>
        {search.isFetching && <p className={styles.loading}>Searching…</p>}

        {search.isError && !search.isFetching && (
          <div className={stateStyles.state}>
            <span className={stateStyles.emoji} aria-hidden="true">
              ⛅
            </span>
            <p className={stateStyles.text}>{errorMessage(search.error)}</p>
            <button type="button" className={styles.retry} onClick={() => void search.refetch()}>
              Try again
            </button>
          </div>
        )}

        {search.isSuccess && results.length === 0 && (
          <div className={stateStyles.state}>
            <span className={stateStyles.emoji} aria-hidden="true">
              🔍
            </span>
            <p className={stateStyles.text}>No matching places found.</p>
          </div>
        )}

        {results.length > 0 && (
          <LocationResultList results={results} selected={selected} onSelect={setSelected} />
        )}

        {selected !== null && selected.locationType === 'Country' && (
          <div className={stateStyles.state}>
            <span className={stateStyles.emoji} aria-hidden="true">
              🗺️
            </span>
            <p className={stateStyles.text}>
              {selected.name} is a country — search for a specific city to see attractions.
            </p>
          </div>
        )}

        {selected !== null && selected.locationType === 'City' && (
          <section className={styles.attractions}>
            <h2 className={styles.subtitle}>Attractions near {selected.name}</h2>
            {attractions.isFetching && !attractions.isSuccess && (
              <>
                <p className={skeletonStyles.visuallyHidden}>Loading attractions…</p>
                <div className={styles.grid} aria-hidden="true">
                  {Array.from({ length: ATTRACTION_SKELETON_COUNT }, (_, index) => (
                    <div
                      key={index}
                      className={`${skeletonStyles.card} ${styles.attractionSkeleton}`}
                    />
                  ))}
                </div>
              </>
            )}
            {attractions.isError && !attractions.isFetching && (
              <div className={stateStyles.state}>
                <span className={stateStyles.emoji} aria-hidden="true">
                  ⛅
                </span>
                <p className={stateStyles.text}>{errorMessage(attractions.error)}</p>
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => void attractions.refetch()}
                >
                  Try again
                </button>
              </div>
            )}
            {attractions.isSuccess && attractions.data.length === 0 && (
              <div className={stateStyles.state}>
                <span className={stateStyles.emoji} aria-hidden="true">
                  🗺️
                </span>
                <p className={stateStyles.text}>
                  No attractions in this area yet — try another city.
                </p>
              </div>
            )}
            {attractions.isSuccess && attractions.data.length > 0 && (
              <div className={styles.grid}>
                {attractions.data.map((attraction) => (
                  <AttractionCard key={attraction.xid} attraction={attraction} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  );
}
