---
baseline_commit: f00b40f4c8dcc65b031ea66b055918d806f36eb7
---

# Story 5-7: Search auto-suggest

Status: review

## Story

As a user, I want location suggestions to appear automatically while I type in the destination search box, so I can pick a place without having to press the Search button.

Origin: user report — "auto suggest not work" on the search page. Investigation (2026-07-12) found auto-suggest was never implemented: story 5-3 built a submit-only search (`SearchPage` fires `GET /api/locations/search` only on form submit). This story adds the missing typeahead behavior.

## Acceptance Criteria

1. **Debounced suggestions:** typing 2+ characters (trimmed) in the search input triggers `GET /api/locations/search?query=` after a 300 ms debounce; typing fewer than 2 characters shows no suggestions and fires no request.
2. **Suggestion dropdown:** results render in a dropdown listbox under the input showing name, country code, and City/Country label (up to 5 items). The dropdown does not render when the request errors, returns empty, or after a suggestion was chosen / the form was submitted with the same text.
3. **Choosing a suggestion** (mouse click or keyboard) fills the input with the suggestion's name, closes the dropdown, and behaves like a submitted search with that location selected — a City loads attractions, a Country shows the narrow-to-city prompt.
4. **Keyboard support:** ArrowDown/ArrowUp move the active suggestion (wrapping), Enter chooses the active suggestion (or submits the form when none is active), Escape closes the dropdown without changing the input.
5. **Non-interference:** explicit submit, Clear, result list, attraction loading, and error/empty states from story 5-3 keep working unchanged; suggestion fetch errors are silent (no error UI while typing).
6. Unit tests cover: debounce (no request before 300 ms, one request after), min-length gate, dropdown rendering with City/Country labels, mouse selection of City → attractions fetch, keyboard navigation + Enter selection, Escape dismissal, silent error, and no regression of the existing submit flow.

## Tasks / Subtasks

- [x] Task 1: Debounce hook (AC: 1)
  - [x] `useDebouncedValue<T>(value, delayMs)` in `FE/src/hooks/useDebouncedValue.ts` + unit tests with fake timers
- [x] Task 2: Suggestions query hook (AC: 1, 5)
  - [x] `useLocationSuggestions(query)` in `FE/src/hooks/locations.ts` — same `['locationSearch', query]` key (shares cache with submit search), enabled only for trimmed length ≥ 2, `retry: false`
- [x] Task 3: Suggestion dropdown UI (AC: 2, 3, 4)
  - [x] `SuggestionDropdown` component (listbox/option roles, active-option highlight) + CSS module
  - [x] Wire into `SearchPage`: debounced input, open/close state, keyboard handling on the input, selection applies query + selected location
- [x] Task 4: Tests (AC: 6)
  - [x] Extend `SearchPage.test.tsx` with suggestion scenarios; keep existing tests green
- [x] Task 5: Verify — full `npm test`, `npm run lint`, `npm run build` green

## Dev Notes

- Backend `GET /api/locations/search` proxies OpenTripMap `/geoname`, which resolves partial queries (e.g. "par" → Paris, `isPartialMatch: true`) but returns a single best match — the dropdown must look right with one item.
- Reuse the `['locationSearch', query]` query key so a chosen suggestion's result is already cached when it becomes the submitted query (no duplicate request).
- Suggestions must not fetch for the exact text of an already-chosen suggestion/submitted query (avoid the dropdown reopening over the results list). Track a `suppressedQuery` (last chosen/submitted text) and keep the dropdown closed while `input.trim()` equals it.
- Endpoint is anonymous and rate-limited upstream: keep `staleTime` tuning from story 5-3 (`locationStaleTime`), debounce at 300 ms, min 2 chars.
- Follow the "cute sky" design tokens (no hard-coded hex), CSS modules, no comments, braces everywhere.
- ARIA: input gets `role="combobox"`, `aria-expanded`, `aria-controls`; list gets `role="listbox"` with `role="option"` children and `aria-selected` on the active one.

## Dev Agent Record

### Debug Log

- Investigation confirmed no auto-suggest existed: `SearchPage` only called the search endpoint on form submit; nothing was broken server-side, the feature was simply absent.
- TDD red-green per task: `useDebouncedValue.test.tsx` (fake timers) written before the hook; the 8 auto-suggest `SearchPage` tests written before wiring, run red, then implementation fixed to green.
- First green run exposed a real bug the tests caught: after choosing a suggestion, the still-debounced previous query (e.g. "pa") was not suppressed, so the dropdown stayed open over the results. Fixed by also dismissing the consumed debounced query in `handleChoose` and `handleSubmit`.
- Kept the input's native `searchbox` role (existing tests query it) instead of `role="combobox"`; combobox behaviors are conveyed via `aria-autocomplete`, `aria-expanded`, `aria-controls`, and `aria-activedescendant`.
- `suggestionOptionId` moved to its own module (`suggestionOption.ts`) to avoid the oxlint fast-refresh warning on `SuggestionDropdown.tsx`.
- Dropdown options use `onMouseDown` with `preventDefault` so selection wins over input blur.

### Completion Notes

- `useDebouncedValue` hook (300 ms) drives `useLocationSuggestions`, which reuses the `['locationSearch', query]` query key so a chosen suggestion's results are served from cache when they become the submitted search — verified by a test asserting exactly one network call for type-then-choose.
- Suggestions fetch only for trimmed input ≥ 2 chars; fetch errors are silent (no error UI while typing); the last chosen/submitted text is suppressed so the dropdown never reopens over results.
- `SuggestionDropdown` renders up to 5 options (name + country-code and City/Country pills) styled with the story 5-6 design tokens; keyboard support: ArrowDown/ArrowUp with wrap, Enter to choose the active option, Escape to dismiss.
- Choosing a City suggestion fills the input, selects the location, and loads attractions; a Country shows the existing narrow-to-city prompt. Submit, Clear, and all story 5-3 states are unchanged (all 17 pre-existing SearchPage tests still pass unmodified).
- Verified: full suite 134/134 green (12 new tests), `npm run lint` clean for new files (3 pre-existing warnings), `npm run build` succeeds.

## File List

- FE/src/hooks/useDebouncedValue.ts (new)
- FE/src/hooks/useDebouncedValue.test.tsx (new)
- FE/src/hooks/locations.ts (modified)
- FE/src/components/SuggestionDropdown.tsx (new)
- FE/src/components/SuggestionDropdown.module.css (new)
- FE/src/components/suggestionOption.ts (new)
- FE/src/pages/SearchPage.tsx (modified)
- FE/src/pages/SearchPage.module.css (modified)
- FE/src/pages/SearchPage.test.tsx (modified)

## Change Log

- 2026-07-12: Investigated "auto suggest not work" report — feature was never implemented (story 5-3 shipped submit-only search). Implemented debounced typeahead suggestions on the destination search: 300 ms debounce, min 2 chars, dropdown with keyboard navigation and ARIA wiring, cache-sharing with the submit search, silent suggestion errors. 12 new unit tests; full suite 134/134 green.
