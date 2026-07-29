---
baseline_commit: 22d4621a162ba47d6f2761079ea63254de5a68eb
---

# Story 5-3: Destination discovery (search + attractions)

Status: done

## Story

As a user, I want to search for a city or country and see a recommended list of attractions, so I can discover places worth visiting (Feature 1 US2 + US3). Browsing works without logging in.

## Acceptance Criteria

1. **Search page (`/search`, also the home `/` experience):** a search input (min 1 char to submit) with a clear button; submitting calls `GET /api/locations/search?query=` and renders up to 5 results, each showing the name, country code, and a City/Country label; a partial match is visually indicated.
2. Selecting a **City** result shows it as the active location and loads attractions via `GET /api/locations/attractions?latitude=&longitude=` (backend defaults: radius 20 km, limit 20).
3. Selecting a **Country** result shows it as active with a prompt to search for a specific city instead — no attraction fetch (backend MVP limitation).
4. **Attraction list:** each card shows name, kinds/category tags when present, rating indicator when present, thumbnail image when present; a placeholder is rendered for missing image and missing rating. Each card links to the details view (route `/attractions/:xid`, built in story 5-4 — the link may 404 until then).
5. **Empty and error states:** no matching locations → "No matching places found." message; empty attraction list → a clear empty state; 503 from either endpoint → a "service unavailable, try again" state with a retry action; clearing the search resets to the initial state.
6. Loading indicators are shown while search or attraction requests are in flight.
7. Unit tests cover: submit renders results with City/Country labels; city selection triggers attraction fetch with the location's coordinates; country selection shows the narrow-to-city prompt and fetches nothing; missing image/rating render placeholders; no-results message; 503 → error state with retry.

## Tasks / Subtasks

- [x] Task 1: API functions + query hooks (AC: 1, 2)
  - [x] `searchLocations(query)`, `getAttractions(lat, lon)` in the api module; TanStack Query hooks (`useLocationSearch` enabled on submit, `useAttractions` enabled only for a selected City)
- [x] Task 2: Search UI (AC: 1, 3, 5, 6)
  - [x] `SearchPage` with controlled input, submit + clear; results list component with type labels and partial-match hint
  - [x] Country-selected prompt state
- [x] Task 3: Attraction list (AC: 4, 5, 6)
  - [x] `AttractionCard` (name, tags, rating badge, image with `onError`/absent fallback to placeholder); grid list; empty state
  - [x] Error state with retry (Query `refetch`)
- [x] Task 4: Routing (AC: 1)
  - [x] Make `/` render the search experience (replace home placeholder); keep `/search` as an alias or redirect
- [x] Task 5: Tests (AC: 7)
- [x] Task 6: Verify — `npm run build` and full `npm test` green

### Review Findings

- [x] [Review][Patch] Empty-search copy reads "No attractions found." when zero *locations* matched — change copy to reflect that no places matched, amend AC5, and update the pinning test (resolved from Decision: fix the copy) [FE/src/pages/SearchPage.tsx:76]
- [x] [Review][Patch] Selected result compared by reference — highlight and `aria-pressed` silently drop after any search refetch (e.g. window refocus) while the attractions panel stays on the stale selection [FE/src/components/LocationResultList.tsx:18]
- [x] [Review][Patch] Result list unmounts during any in-flight fetch — gated on `isFetching` instead of `isPending`, so background refetches blank already-displayed results [FE/src/pages/SearchPage.tsx:80]
- [x] [Review][Patch] No `staleTime` / `refetchOnWindowFocus` tuning — every tab refocus re-hits the rate-limited OpenTripMap-backed endpoints [FE/src/hooks/locations.ts:5]
- [x] [Review][Patch] Loading and error states render simultaneously during a retry (`isFetching` and `isError` both true until the refetch settles) [FE/src/pages/SearchPage.tsx:57]
- [x] [Review][Patch] All failures (network, 500) presented as "Service unavailable" — only 503/unreachable warrant that copy; fall back to the parsed `ApiError` message otherwise [FE/src/pages/SearchPage.tsx:64]
- [x] [Review][Patch] List key `name-lat-lon` can collide on duplicate geocoder rows — include the index [FE/src/components/LocationResultList.tsx:20]
- [x] [Review][Patch] Retry buttons missing `type="button"` — every other button in the diff sets it [FE/src/pages/SearchPage.tsx:65]
- [x] [Review][Patch] Vacuous test: "does not submit an empty query" clicks a disabled button, so the whitespace-trim guard in `handleSubmit` is never exercised — submit the form directly [FE/src/pages/SearchPage.test.tsx:327]
- [x] [Review][Patch] Missing test: submitting a new search clears the previous selection (`setSelected(null)` in `handleSubmit` has no coverage — deleting it passes the suite) [FE/src/pages/SearchPage.tsx:24]
- [x] [Review][Patch] Route registration (`/` and `/search` → SearchPage) unverified — no test mounts the real route table, so removing an entry ships green [FE/src/main.tsx:27]
- [x] [Review][Defer] `locationType` typed as `string` instead of `"City" | "Country"` union, so typos in the `=== 'City'` comparisons can't be caught [FE/src/api/types.ts:15] — deferred, pre-existing (story 5-1)
- [x] [Review][Defer] No `aria-live` regions for async loading/error/result announcements [FE/src/pages/SearchPage.tsx:57] — deferred, a11y enhancement beyond story ACs, pattern absent app-wide
- [x] [Review][Defer] API tests assert paths assuming `VITE_API_BASE_URL` is unset in the test env [FE/src/api/locations.test.ts:54] — deferred, pre-existing pattern from story 5-1 (`client.test.ts`)

## Dev Notes

- **DTOs:** `LocationSearchResultResponse { name, countryCode, locationType ("City"|"Country"), latitude, longitude, isPartialMatch }`; `AttractionResponse { xid, name, kinds: string[], rating: string|null, imageUrl: string|null, distanceMeters: number|null }`.
- **Search realistically returns 1 result** (OpenTripMap `/geoname` limitation) — the UI renders a list but must look right with a single item.
- **Rating semantics:** OpenTripMap `rate` is `"1"`–`"3"` plus `h` suffix variants (e.g. `"3h"` = top cultural heritage). Render as a simple 1–3 indicator (e.g. stars or dots); any value ending in `h` can additionally show a "heritage" tag. Null → placeholder text.
- **`kinds`** are comma-split taxonomy slugs like `interesting_places`, `museums` — display underscores as spaces; cap visible tags (~3) to keep cards tidy.
- **Empty list is HTTP 200 `[]`**, not an error. 503 is `ErrorType.ServiceUnavailable` (provider outage/timeout) — distinct UI from empty.
- Both endpoints are **anonymous** — no auth dependency; this story only needs 5-1.
- Query params: search requires `query` ≥1 char (validator rejects empty with 400 — prevent client-side instead); attractions validates lat −90…90, lon −180…180.
- **Visual style:** follow the "cute sky" design system defined in story 5-6 (`5-6-ui-modernization-cute-light-blue.md` → Dev Notes) — use the `:root` tokens (no new hard-coded hex), attraction cards as rounded soft-shadow surfaces with hover lift, kinds/rating/City-Country labels as light-blue pill chips, pill-shaped primary buttons, and the friendly emoji empty/error states (🔍 no search results, 🗺️ empty attractions, ⛅ 503 with a pill retry button). Story 5-6 should be implemented first; if it isn't yet, implement its token set as part of Task 2.
- Project rules: no comments; braces everywhere; CSS modules.

## Dev Agent Record

### Debug Log

- TDD red-green per task: `locations.test.ts` written first (failed on missing module), then API module implemented; `SearchPage.test.tsx` (15 tests) written before the page/components.
- `AttractionCard` uses `alt={attraction.name}` (not empty alt) so the image is queryable via the img role and the card keeps an accessible name.
- Query hooks set `retry: false` so a 503 surfaces the error state immediately instead of after TanStack Query's default 3 retries.

### Completion Notes

- `searchLocations` / `getAttractions` added in `FE/src/api/locations.ts`; `useLocationSearch` (enabled only for a non-empty submitted query) and `useAttractions` (enabled only for a selected City) in `FE/src/hooks/locations.ts`.
- `SearchPage` is the home (`/`) and `/search` experience: controlled search input with pill submit/clear buttons, results capped at 5 with name + country-code and City/Country pill labels plus a "Partial match" hint, country selection shows the narrow-to-city prompt without fetching, city selection loads an attraction grid.
- `AttractionCard` renders name, up to 3 kinds tags (underscores shown as spaces), a 1–3 star rating with a "heritage" tag for `h`-suffixed ratings, image with `onError` fallback, and placeholders for missing image ("🏞️") and rating ("Not rated"); each card links to `/attractions/:xid`.
- Empty/error states follow the story 5-6 design system tokens: 🔍 "No matching places found." for empty search, 🗺️ empty-attractions state, ⛅ service-unavailable state with a pill "Try again" button wired to Query `refetch`; loading indicators shown for both requests; Clear resets to the initial state.
- Replaced the `HomePage` placeholder; `/search` is an alias route to the same page.
- Verified: full suite 65/65 tests green, `npm run lint` clean for new files (one pre-existing warning in `AuthContext.tsx`), `npm run build` succeeds.
- Code review (2026-07-12): applied 11 patches — value-based selection comparison, stale-while-refetch result list, `staleTime`/`refetchOnWindowFocus` tuning, mutually exclusive loading/error states, status-aware error copy, index-suffixed list keys, `type="button"` on retry buttons, empty-search copy fix ("No matching places found."), fixed the vacuous empty-submit test, added a clears-selection-on-new-search test, and extracted the route table to `FE/src/routes.tsx` with route registration tests. Suite now 69/69 green; build and lint re-verified.

## File List

- FE/src/api/locations.ts (new)
- FE/src/api/locations.test.ts (new)
- FE/src/hooks/locations.ts (new)
- FE/src/components/LocationResultList.tsx (new)
- FE/src/components/LocationResultList.module.css (new)
- FE/src/components/AttractionCard.tsx (new)
- FE/src/components/AttractionCard.module.css (new)
- FE/src/pages/SearchPage.tsx (new)
- FE/src/pages/SearchPage.module.css (new)
- FE/src/pages/SearchPage.test.tsx (new)
- FE/src/main.tsx (modified)
- FE/src/routes.tsx (new)
- FE/src/routes.test.tsx (new)
- FE/src/pages/HomePage.tsx (deleted)

## Change Log

- 2026-07-12: Implemented destination discovery — location search UI, attraction list with placeholders and error/empty states, query hooks, and routing (`/` + `/search`). 19 new unit tests; full suite 65/65 green.
- 2026-07-12: Code review — 11 patches applied (see Review Findings), 3 items deferred to deferred-work.md. Route table extracted to `routes.tsx` with tests; suite 69/69 green. Status → done.
