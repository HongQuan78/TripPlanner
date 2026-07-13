import { useEffect, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ApiError } from '../api/client';
import type { LocationSearchResult } from '../api/types';
import AttractionCard from '../components/AttractionCard';
import LocationResultList from '../components/LocationResultList';
import SuggestionDropdown from '../components/SuggestionDropdown';
import { suggestionOptionId } from '../components/suggestionOption';
import { useAttractions, useLocationSearch, useLocationSuggestions } from '../hooks/locations';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import stateStyles from './PageState.module.css';
import styles from './SearchPage.module.css';
import { getSearchState, saveSearchState } from './searchState';

const suggestionListId = 'location-suggestions';

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
      <h1 className={styles.title}>Where to next?</h1>
      <p className={styles.tagline}>Search for a city or country to discover attractions.</p>
      <form className={styles.form} role="search" onSubmit={handleSubmit}>
        <div className={styles.inputWrap}>
          <input
            type="search"
            className={styles.input}
            aria-label="Search"
            placeholder="Search for a city or country"
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
          {attractions.isFetching && <p className={styles.loading}>Loading attractions…</p>}
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
    </section>
  );
}
