import { useEffect, useMemo, useRef, useState } from 'react';
import type { FocusEvent, FormEvent, KeyboardEvent } from 'react';
import type { LocationSearchResult } from '@/shared/api/models/destination/locationSearchResult';
import AttractionCard from './AttractionCard';
import AttractionControls from './AttractionControls';
import { dedupeAttractions, sortAttractions } from './attractionFilters';
import type { AttractionSort } from './attractionFilters';
import skeletonStyles from '@/shared/ui/Skeleton.module.css';
import PopularTile from './PopularTile';
import { POPULAR_CITIES } from './popularCities';
import { HOW_IT_WORKS, TILE_GRADIENTS } from './landingContent';
import { errorMessage } from './errorMessage';
import { HistoryGlyph, SearchGlyph } from './searchIcons';
import SuggestionDropdown from './SuggestionDropdown';
import { suggestionOptionId } from './suggestionOption';
import { useAttractions, useLocationSearch, useLocationSuggestions } from './hooks';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import stateStyles from '@/shared/ui/PageState.module.css';
import styles from './SearchPage.module.css';
import { getSearchState, saveSearchState } from './searchState';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from './recentSearches';

const suggestionListId = 'location-suggestions';
const keyboardHintId = 'location-search-keyboard-hint';
const recentLabelId = 'recent-searches-label';
const popularLabelId = 'popular-searches-label';

const ATTRACTION_SKELETON_COUNT = 4;
const SUGGESTION_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

export default function SearchPage() {
  const [input, setInput] = useState(() => getSearchState().input);
  const [submittedQuery, setSubmittedQuery] = useState(() => getSearchState().submittedQuery);
  const [selected, setSelected] = useState<LocationSearchResult | null>(
    () => getSearchState().selected,
  );
  const [activeSearch, setActiveSearch] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recents, setRecents] = useState<LocationSearchResult[]>(() => getRecentSearches());
  const [announcement, setAnnouncement] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [minRate, setMinRate] = useState<number | null>(null);
  const [sort, setSort] = useState<AttractionSort>('recommended');
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const announceCount = useRef(0);

  function announce(message: string) {
    announceCount.current += 1;
    setAnnouncement(announceCount.current % 2 === 0 ? `${message}\u200B` : message);
  }

  useEffect(() => {
    saveSearchState({ input, submittedQuery, selected });
  }, [input, submittedQuery, selected]);

  function resetFilters() {
    setCategories([]);
    setMinRate(null);
    setSort('recommended');
  }

  function handleSelectLocation(location: LocationSearchResult | null) {
    resetFilters();
    setSelected(location);
  }

  const search = useLocationSearch(submittedQuery);
  const attractions = useAttractions(selected, { kinds: categories, minRate });
  const loadedAttractions = useMemo(
    () => dedupeAttractions(attractions.data?.pages.flat() ?? []),
    [attractions.data],
  );
  const sortedAttractions = sortAttractions(loadedAttractions, sort);

  function handleToggleCategory(value: string) {
    setCategories((current) =>
      current.includes(value)
        ? current.filter((category) => category !== value)
        : [...current, value],
    );
  }

  function handleClearFilters() {
    setCategories([]);
    setMinRate(null);
  }

  const hasActiveFilters = categories.length > 0 || minRate !== null;

  const trimmedInput = input.trim();
  const debouncedInput = useDebouncedValue(input, 300);
  const trimmedDebounced = debouncedInput.trim();
  const suggestionsSource = useLocationSuggestions(activeSearch ? trimmedDebounced : '');
  const submittedMatchesInput = submittedQuery !== '' && submittedQuery === trimmedInput;
  const optionSource = submittedMatchesInput ? search : suggestionsSource;
  const options = (optionSource.data ?? []).slice(0, SUGGESTION_LIMIT);
  const optionsResolved = optionSource.isSuccess && !optionSource.isFetching;
  const optionsMatchInput = submittedMatchesInput || trimmedDebounced === trimmedInput;
  const dropdownOpen =
    activeSearch &&
    optionsMatchInput &&
    trimmedInput.length >= MIN_QUERY_LENGTH &&
    (options.length > 0 || optionsResolved);

  useEffect(() => {
    setActiveIndex(-1);
  }, [trimmedInput]);

  useEffect(() => {
    if (!dropdownOpen) {
      return;
    }
    function handlePointerDown(event: Event) {
      const target = event.target;
      if (target instanceof Node && formRef.current?.contains(target)) {
        return;
      }
      setActiveSearch(false);
      setActiveIndex(-1);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [dropdownOpen]);

  function handleFormBlur(event: FocusEvent<HTMLFormElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && formRef.current?.contains(next)) {
      return;
    }
    setActiveSearch(false);
    setActiveIndex(-1);
  }

  function handleChoose(location: LocationSearchResult) {
    setInput(location.name);
    setSubmittedQuery('');
    setActiveSearch(false);
    setActiveIndex(-1);
    handleSelectLocation(location);
    setRecents(addRecentSearch(location));
    announce(`${location.name} selected.`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setActiveSearch(false);
      setActiveIndex(-1);
      return;
    }
    if (
      event.key === 'ArrowDown' &&
      !activeSearch &&
      trimmedInput.length >= MIN_QUERY_LENGTH
    ) {
      event.preventDefault();
      setActiveSearch(true);
      return;
    }
    if (!dropdownOpen || options.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < options.length) {
        event.preventDefault();
        handleChoose(options[activeIndex]);
      }
    }
  }

  function runSearch(query: string) {
    handleSelectLocation(null);
    setInput(query);
    setSubmittedQuery(query);
    setActiveSearch(true);
    setActiveIndex(-1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      return;
    }
    runSearch(query);
  }

  function handleTileSelect(city: string) {
    runSearch(city);
    inputRef.current?.focus();
  }

  function handleClear() {
    setInput('');
    setSubmittedQuery('');
    handleSelectLocation(null);
    setActiveSearch(false);
    setActiveIndex(-1);
    setAnnouncement('');
  }

  function handleClearRecents() {
    setRecents(clearRecentSearches());
  }

  const showPreSearchBody = selected === null;

  return (
    <section className={styles.page}>
      <section className={styles.heroBand}>
        <span className={styles.heroSurface} aria-hidden="true">
          <span className={styles.heroScrim} />
        </span>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>Where to next?</h1>
          <p className={styles.tagline}>Search any city and start building the trip.</p>
          <form
            className={styles.form}
            role="search"
            ref={formRef}
            onSubmit={handleSubmit}
            onBlur={handleFormBlur}
          >
            <div className={styles.bar}>
              <span className={styles.barGlyph} aria-hidden="true">
                <SearchGlyph />
              </span>
              <input
                ref={inputRef}
                type="search"
                className={styles.input}
                aria-label="Search"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={dropdownOpen}
                aria-controls={dropdownOpen && options.length > 0 ? suggestionListId : undefined}
                aria-describedby={keyboardHintId}
                aria-activedescendant={
                  dropdownOpen && activeIndex >= 0
                    ? suggestionOptionId(suggestionListId, activeIndex)
                    : undefined
                }
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  setActiveSearch(true);
                }}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={handleKeyDown}
              />
              {input.length > 0 && (
                <button
                  type="button"
                  className={styles.clear}
                  aria-label="Clear search"
                  onClick={handleClear}
                >
                  <span className={styles.clearGlyph} aria-hidden="true">
                    ✕
                  </span>
                </button>
              )}
              <button
                type="submit"
                className={styles.submit}
                aria-label="Search"
                disabled={trimmedInput.length < MIN_QUERY_LENGTH}
              >
                <span aria-hidden="true">
                  <SearchGlyph />
                </span>
              </button>
              {dropdownOpen && (
                <SuggestionDropdown
                  id={suggestionListId}
                  suggestions={options}
                  activeIndex={activeIndex}
                  onChoose={handleChoose}
                />
              )}
            </div>
            <p className={skeletonStyles.visuallyHidden} id={keyboardHintId}>
              Type at least two characters to see suggestions. Use the up and down arrow keys to move
              through them, Enter to choose, Escape to dismiss.
            </p>
          </form>
        </div>
      </section>

      <p aria-live="polite" className={skeletonStyles.visuallyHidden}>
        {announcement}
      </p>

      {submittedMatchesInput && (search.isFetching || search.isError) && (
        <div className={styles.searchStatus}>
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
        </div>
      )}

      {showPreSearchBody && (
        <div className={styles.preSearch}>
          {recents.length > 0 && (
            <section className={styles.section} aria-labelledby={recentLabelId}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionLabel} id={recentLabelId}>
                  Recent searches
                </h2>
                <button
                  type="button"
                  className={styles.clearRecents}
                  aria-label="Clear recent searches"
                  onClick={handleClearRecents}
                >
                  Clear
                </button>
              </div>
              <div className={styles.recentRow}>
                {recents.map((recent) => (
                  <button
                    key={`${recent.name}-${recent.latitude}-${recent.longitude}-${recent.locationType}`}
                    type="button"
                    className={styles.recentChip}
                    onClick={() => handleChoose(recent)}
                  >
                    <HistoryGlyph />
                    {recent.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className={styles.section} aria-labelledby={popularLabelId}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionLabel} id={popularLabelId}>
                Popular searches
              </h2>
            </div>
            <div className={styles.rail}>
              {POPULAR_CITIES.map((city, index) => (
                <PopularTile
                  key={city.name}
                  city={city}
                  gradientClass={TILE_GRADIENTS[index % TILE_GRADIENTS.length]}
                  onSelect={() => handleTileSelect(city.name)}
                />
              ))}
            </div>
          </section>

          <ol className={styles.steps} role="list">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step.heading} className={styles.step}>
                <span className={styles.stepNumeral} aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <p className={styles.stepHeading}>{step.heading}</p>
                  <p className={styles.stepBody}>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className={styles.results}>
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
            {!(attractions.isError && loadedAttractions.length === 0) && (
              <AttractionControls
                categories={categories}
                minRate={minRate}
                sort={sort}
                onToggleCategory={handleToggleCategory}
                onMinRateChange={setMinRate}
                onSortChange={setSort}
                onClearFilters={handleClearFilters}
              />
            )}
            {attractions.isLoading && (
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
            {attractions.isError && !attractions.isFetching && loadedAttractions.length === 0 && (
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
            {attractions.isSuccess && loadedAttractions.length === 0 && (
              <div className={stateStyles.state}>
                <span className={stateStyles.emoji} aria-hidden="true">
                  🗺️
                </span>
                <p className={stateStyles.text}>
                  {hasActiveFilters
                    ? 'No attractions match these filters — try clearing them.'
                    : 'No attractions in this area yet — try another city.'}
                </p>
              </div>
            )}
            {loadedAttractions.length > 0 && (
              <>
                <div className={styles.grid}>
                  {sortedAttractions.map((attraction) => (
                    <AttractionCard key={attraction.xid} attraction={attraction} />
                  ))}
                </div>
                <p aria-live="polite" className={skeletonStyles.visuallyHidden}>
                  Showing {loadedAttractions.length} attractions.
                </p>
                {attractions.hasNextPage && (
                  <div className={styles.loadMore}>
                    {(attractions.isFetchNextPageError || attractions.isError) &&
                    !attractions.isFetchingNextPage ? (
                      <>
                        <p className={stateStyles.text} role="alert">
                          Couldn't load more attractions — please try again.
                        </p>
                        <button
                          type="button"
                          className={styles.retry}
                          onClick={() => void attractions.fetchNextPage()}
                        >
                          Try again
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={styles.loadMoreButton}
                        onClick={() => void attractions.fetchNextPage()}
                        disabled={attractions.isFetchingNextPage}
                        aria-busy={attractions.isFetchingNextPage}
                      >
                        {attractions.isFetchingNextPage ? 'Loading…' : 'Load more'}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </section>
  );
}
