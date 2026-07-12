---
baseline_commit: 22d4621a162ba47d6f2761079ea63254de5a68eb
---

# Story 5-4: Destination details view

Status: review

## Story

As a user, I want to open a destination's details — description, photos, address, opening hours, website — so I can decide whether to add it to a trip (Feature 2 US1 + US2).

## Acceptance Criteria

1. **Details route (`/attractions/:xid`):** navigating from an attraction card loads `GET /api/locations/{xid}/details` and renders name, category, and description; the view renders correctly when any optional field is missing.
2. **Photos:** when `imageUrls` is non-empty, a carousel shows one photo at a time with previous/next controls (wrapping) and a position indicator; a single image renders without controls; an empty list renders an image placeholder.
3. **Optional info:** address, opening hours, and website each render their value when present and a "Not available" fallback when absent (this is the common case — the layout must not look broken). Website renders as an external link.
4. **Add to Trip:** a button that is disabled with a "log in to add" hint when unauthenticated, and opens the add-to-trip flow when authenticated. In this story the flow is a stub callback/disabled-enabled behavior only — the real day picker ships in story 5-5; leave a clearly named integration point (e.g. an `onAddToTrip` prop or a shared modal slot).
5. **Navigation:** a back control returns to the previous list preserving prior search state (use `navigate(-1)`; search state must live so it survives the round-trip — keep the selected location/results in a parent route or module-level store rather than resetting on remount).
6. **States:** loading indicator while fetching; 404 → "destination not found" state; 503 → service-unavailable state with retry.
7. Unit tests cover: full render with all fields; render with all optional fields absent shows fallbacks + image placeholder; carousel next/prev wraps across 3 images; button disabled when logged out and enabled when logged in; 404 state.

## Tasks / Subtasks

- [x] Task 1: API + hook (AC: 1, 6)
  - [x] `getDestinationDetails(xid)` + `useDestinationDetails(xid)` query hook
- [x] Task 2: Details page (AC: 1, 3, 5, 6)
  - [x] `DestinationDetailsPage` with header (name, category), description block, info rows with fallbacks, back control
- [x] Task 3: Photo carousel (AC: 2)
  - [x] `PhotoCarousel` component: index state, prev/next with wrap, position dots, placeholder branch
- [x] Task 4: Add-to-Trip gating (AC: 4)
  - [x] Button wired to `useAuth().isAuthenticated`; disabled+hint vs enabled invoking the integration point
- [x] Task 5: Search-state persistence for back navigation (AC: 5)
  - [x] Lift search/selected-location state so returning from details restores the list (verify with a test or manual note)
- [x] Task 6: Tests (AC: 7)
- [x] Task 7: Verify — `npm run build` and full `npm test` green

## Dev Notes

- **DTO:** `DestinationDetailsResponse { xid, name, category, description, imageUrls: string[], address, openingHours, website, latitude, longitude }` — everything but `xid`/`name` is nullable/optional.
- **Sparse data is normal:** OpenTripMap rarely returns openingHours/website; often a single image or none. Design the fallbacks as first-class, not error styling.
- **404 vs 503:** unknown xid → 404 NotFound ProblemDetails; provider outage → 503. Map both via the `ApiError.status` from the 5-1 client.
- **No map** (F2 US3 deferred) even though lat/lon are present.
- **Auth gating is client-side UX only** — the details GET is anonymous; the server enforces auth on the add-to-trip endpoint itself (401).
- Depends on 5-2 (`useAuth`) and 5-3 (navigation source + shared search state).
- NFR3: details should display within ~2s — rely on the query loading state; no extra work needed beyond not blocking render on images.
- **Visual style:** follow the "cute sky" design system defined in story 5-6 (`5-6-ui-modernization-cute-light-blue.md` → Dev Notes) — details content in rounded soft-shadow cards on the sky wash, category as a light-blue pill chip, carousel controls as soft round buttons with pill position dots, "Not available" fallbacks in muted ink (never error styling), Add-to-Trip as a pill primary button (soft muted when disabled), and emoji states (🙈 not found, ⛅ 503 with pill retry).
- Project rules: no comments; braces everywhere; CSS modules.

## Dev Agent Record

### Debug Log

- Baseline before implementation: 69/69 tests green at commit 22d4621. Followed red-green per task (new tests confirmed failing before each implementation). Final run: 83/83 tests green, `npm run build` green, `npm run lint` shows only the pre-existing fast-refresh warning in `AuthContext.tsx` (file untouched).

### Completion Notes

- Added `getDestinationDetails(xid)` to `api/locations.ts` (xid URL-encoded) and `useDestinationDetails(xid)` query hook mirroring the existing location hooks (retry false, 5-min staleTime, no refetch on focus).
- `DestinationDetailsPage` at `/attractions/:xid`: soft-shadow card on the sky wash with name heading, light-blue category pill (omitted when null), description block with muted "No description available." fallback, and Address / Opening hours / Website info rows each falling back to muted italic "Not available" — website renders as an external link (`target="_blank"`, `rel="noopener noreferrer"`). Back is a soft pill button calling `navigate(-1)`.
- `PhotoCarousel`: placeholder branch (🏞️, `data-testid="image-placeholder"`) for an empty list, bare image for a single photo, and soft round prev/next controls with wrapping index plus pill position dots for multiple photos; alt text carries "photo N of M" position.
- Add to Trip is a pill primary button gated on `useAuth().isAuthenticated`: disabled (muted, no lift) with a "Log in to add this destination to a trip." hint when logged out; enabled and invoking the `onAddToTrip` prop (the story-5-5 integration point, receives the full `DestinationDetails`) when logged in. Client-side UX gating only, per Dev Notes.
- States: "Loading destination…" while pending; 404 → 🙈 "Destination not found" (no retry); other errors/503 → ⛅ "Service unavailable" with a pill Try-again button wired to `refetch()`.
- Search-state persistence: new module-level store `pages/searchState.ts` (`getSearchState`/`saveSearchState`/`resetSearchState`); `SearchPage` seeds its `input`/`submittedQuery`/`selected` state from the store and writes back via an effect, so returning from details restores the query, results, and selected city (results themselves also come from the React Query cache). Verified by a dedicated unmount/remount test.
- Tests added (14 new, 83 total): 2 API-function tests (URL encoding, parsing); 10 page tests (full render incl. website link attrs, all-optionals-absent fallbacks + placeholder, single image without controls, 3-image carousel wrap in both directions, disabled+hint logged out, enabled+callback logged in, loading, 404, 503 with retry, back navigation); 1 routes test for `/attractions/:xid`; 1 SearchPage persistence test.

## File List

- FE/src/api/locations.ts
- FE/src/api/locations.test.ts
- FE/src/hooks/locations.ts
- FE/src/components/PhotoCarousel.tsx (new)
- FE/src/components/PhotoCarousel.module.css (new)
- FE/src/pages/DestinationDetailsPage.tsx (new)
- FE/src/pages/DestinationDetailsPage.module.css (new)
- FE/src/pages/DestinationDetailsPage.test.tsx (new)
- FE/src/pages/searchState.ts (new)
- FE/src/pages/SearchPage.tsx
- FE/src/pages/SearchPage.test.tsx
- FE/src/routes.tsx
- FE/src/routes.test.tsx

## Change Log

- 2026-07-12: Implemented the destination details view — details API + hook, `/attractions/:xid` route/page with sparse-data fallbacks, wrapping photo carousel, auth-gated Add-to-Trip stub (`onAddToTrip` integration point for 5-5), and module-level search-state persistence for back navigation. Test updates: the routes test asserting `/attractions/W123` was a 404 now asserts the details page renders there (unknown-path case moved to a different bogus path), and SearchPage tests reset the new search-state store in `beforeEach`. 83/83 tests, build, and lint green.
