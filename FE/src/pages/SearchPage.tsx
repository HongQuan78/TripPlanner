import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import type { LocationSearchResult } from '../api/types';
import AttractionCard from '../components/AttractionCard';
import LocationResultList from '../components/LocationResultList';
import { useAttractions, useLocationSearch } from '../hooks/locations';
import stateStyles from './PageState.module.css';
import styles from './SearchPage.module.css';
import { getSearchState, saveSearchState } from './searchState';

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

  useEffect(() => {
    saveSearchState({ input, submittedQuery, selected });
  }, [input, submittedQuery, selected]);

  const search = useLocationSearch(submittedQuery);
  const attractions = useAttractions(selected);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (!query) {
      return;
    }
    setSelected(null);
    setSubmittedQuery(query);
  }

  function handleClear() {
    setInput('');
    setSubmittedQuery('');
    setSelected(null);
  }

  const results = (search.data ?? []).slice(0, 5);

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Where to next?</h1>
      <p className={styles.tagline}>Search for a city or country to discover attractions.</p>
      <form className={styles.form} role="search" onSubmit={handleSubmit}>
        <input
          type="search"
          className={styles.input}
          aria-label="Search"
          placeholder="Search for a city or country"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
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
