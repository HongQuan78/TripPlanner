---
baseline_commit: 22d4621a162ba47d6f2761079ea63254de5a68eb
---

# Story 5-5: Trip planner UI

Status: review

## Story

As a logged-in user, I want to create trips, edit their dates, and build a day-by-day itinerary by adding and removing destinations, and find everything as I left it when I return (Feature 3 US1, US2, US3, US7, US10).

## Acceptance Criteria

1. **Trip list (`/trips`, auth-guarded):** shows my trips (name, date range, day count) from `GET /api/trips`; an empty state with a create prompt when I have none; each trip links to `/trips/:id`.
2. **Create trip:** a form (name required, start date, end date with client check start ≤ end) posting to `POST /api/trips`; on success the app navigates into the new trip's planner (`/trips/:id`).
3. **Trip planner (`/trips/:id`):** renders one section per itinerary day (date heading) with that day's destinations (name, category, rating); unknown/foreign trip id → not-found state.
4. **Edit trip dates/name:** an edit form pre-filled with current values submitting `PUT /api/trips/{id}` with `confirmed=false`; on **409**, a confirmation dialog shows the backend's message and re-submits with `confirmed=true` on confirm (cancel keeps everything unchanged); on success the day sections update to the new range.
5. **Add destination to a day:** the flow started from an attraction card or the details page (story 5-4 integration point) asks the user to pick one of my trips and then one of its days, then calls `POST /api/trips/{id}/days/{date}/destinations` with `{xid}`; the day's list updates on success; adding the same destination to the same day twice surfaces the backend error message. When logged out, the entry points prompt login and complete the pending add after login (F3 US8 AC4–5: preserve the intended `xid` across the login redirect and reopen the picker).
6. **Remove destination:** each destination row on a day has a remove control with a confirm dialog; on confirm, `DELETE /api/trips/{id}/days/{date}/destinations/{destinationId}` (204) removes it from the UI.
7. All trip mutations invalidate/refresh the affected trip queries so the UI always reflects server state.
8. Unit tests cover: trip list render + empty state; create-trip validation and success navigation; planner renders a section per day; 409 → confirm dialog → confirmed resubmit; add-to-day picker calls the endpoint with `{xid}` and the chosen date; duplicate-add error surfaced; remove confirm flow; pending-add replay after login.

## Tasks / Subtasks

- [x] Task 1: Trip API + hooks (AC: 1, 2, 3, 7)
  - [x] `getTrips`, `getTrip`, `createTrip`, `updateTrip`, `addDestinationToDay`, `removeDestinationFromDay`; query hooks + mutations with invalidation of `['trips']` / `['trip', id]`
- [x] Task 2: Trip list + create (AC: 1, 2)
  - [x] `TripsPage` under `RequireAuth`; `CreateTripForm` (inline or modal) with date validation
- [x] Task 3: Trip planner page (AC: 3, 6, 7)
  - [x] `TripPlannerPage` with `DaySection` and `DestinationRow` (+ remove confirm dialog)
- [x] Task 4: Edit dates with confirm flow (AC: 4)
  - [x] `EditTripForm`; on `ApiError.status === 409` open `ConfirmDialog` with the server message; confirm → resubmit `confirmed: true`
- [x] Task 5: Add-to-trip picker (AC: 5)
  - [x] `AddToTripDialog` (pick trip → pick day → submit `{xid}`); wire into 5-4's `onAddToTrip` integration point and 5-3's attraction cards
  - [x] Pending-action replay: stash `{xid}` (e.g. sessionStorage) before the login redirect; after login, reopen the dialog for that xid
- [x] Task 6: Tests (AC: 8)
- [x] Task 7: Verify — `npm run build` and full `npm test` green

## Dev Notes

- **DTOs:** `TripResponse { id, name, startDate, endDate, tripDays: [{ day, destinations: DestinationResponse[] }] }`; `DestinationResponse { id, name, rating, category, openingHours, cuisineType, isHalalFriendly }`. Dates are `"yyyy-MM-dd"` strings.
- **Day route segment** is the date string `yyyy-MM-dd` exactly (`POST /api/trips/{id}/days/2026-08-01/destinations`).
- **Add request body:** `{ xid }` for provider attractions (server upserts the Destination) or `{ destinationId }` for persisted ones — this UI always sends `xid` from discovery/details.
- **409 contract (US2 AC5):** shrinking the range over days that have planned destinations with `confirmed=false` returns 409 ProblemDetails whose message explains what would be removed — show it verbatim in the dialog. `PUT` is whole-resource: always send name + both dates, even for a name-only change.
- **Ownership:** foreign trip ids return **404**, never 403 — the not-found state covers both.
- **Duplicate add** on the same day returns a 4xx with a message — surface `ApiError.message`, don't crash the dialog.
- **All `/api/trips` calls require the bearer token**; 401 handling (session expiry → login redirect) already exists from 5-2 and must keep `returnTo` pointing at the trip page.
- Empty trip list is HTTP 200 `[]` (US10 AC3).
- Depends on 5-2 (auth/guard), 5-3 and 5-4 (add-to-trip entry points).
- **Visual style:** follow the "cute sky" design system defined in story 5-6 (`5-6-ui-modernization-cute-light-blue.md` → Dev Notes) — trip cards and day sections as rounded soft-shadow surfaces, day date headings in `--color-primary-dark`, destination rows with pill category chips, pill primary buttons for create/save/add, soft secondary buttons for cancel, dialogs (confirm, add-to-trip picker) as rounded-`--radius-lg` cards with `--shadow-lift` over a translucent sky overlay, and the 🧳 emoji empty state for the trip list with a pill "Create your first trip" button.
- Project rules: no comments; braces everywhere; CSS modules.

## Dev Agent Record

### Debug Log

- Red-green per task: each test file was written first and confirmed failing before implementation.
- react-query passes a mutation context object as the second argument to `mutationFn`; call-argument assertions use `mock.calls[0][0]` where needed.
- Day/trip picker buttons carry both a name and a meta line in their accessible name, so tests match them with regexes instead of exact strings.
- Final verification: `npm test` 122/122 green (18 files), `npm run build` green, `npm run lint` shows only `react(only-export-components)` fast-refresh warnings (`CreateTripForm.tsx`, `AddToTripContext.tsx`) matching the pre-existing accepted warning in `AuthContext.tsx`.

### Completion Notes

- Task 1: `api/trips.ts` (getTrips/getTrip/createTrip/updateTrip/addDestinationToDay/removeDestinationFromDay) and `hooks/trips.ts` query/mutation hooks; every mutation invalidates `['trips']` and `['trip', id]` (AC7).
- Task 2: `TripsPage` at `/trips` behind `RequireAuth` — trip cards (name, formatted date range, day-count chip) linking to `/trips/:id`, 🧳 empty state with a pill "Create your first trip" button, loading/error states; `CreateTripForm` validates required name and start ≤ end client-side and navigates to the new trip's planner on success.
- Task 3: `TripPlannerPage` at `/trips/:id` behind `RequireAuth` — `DaySection` per itinerary day (date heading in primary-dark) with `DestinationRow`s (name, category pill chip, star rating), 🙈 not-found state for 404 (covers foreign trip ids), remove control with `ConfirmDialog` issuing the DELETE.
- Task 4: `EditTripForm` pre-filled from the trip, whole-resource PUT with `confirmed=false`; a 409 opens `ConfirmDialog` showing the backend message verbatim, confirm resubmits `confirmed=true`, cancel leaves everything unchanged.
- Task 5: `AddToTripDialog` (pick trip → pick day → POST `{xid}`), duplicate-add surfaces `ApiError.message` inside the dialog; `AddToTripProvider` (`trips/AddToTripContext.tsx`, mounted in routes) exposes `requestAdd(xid)` — when logged out it stashes the xid in sessionStorage (`tripplanner.pendingAdd`) and redirects to login with `returnTo`, and reopens the picker for that xid once authenticated. Wired into `DestinationDetailsPage` (context fallback for the 5-4 `onAddToTrip` integration point) and a new "＋ Add to trip" button on 5-3's `AttractionCard`.
- Behavior change to 5-4's details page required by AC5: the Add to Trip button is no longer disabled when logged out — it starts the login-then-replay flow; the hint copy changed accordingly and the two affected 5-4 tests were updated (see Change Log).
- All new UI follows the 5-6 "cute sky" design system via CSS-module tokens (rounded soft-shadow cards/day sections, pill buttons, pill category chips, dialogs as `--radius-lg` cards with `--shadow-lift` over a translucent sky overlay, 🧳 empty state).

## File List

- FE/src/api/trips.ts (new)
- FE/src/api/trips.test.ts (new)
- FE/src/hooks/trips.ts (new)
- FE/src/hooks/trips.test.tsx (new)
- FE/src/pages/dates.ts (new)
- FE/src/pages/TripsPage.tsx (new)
- FE/src/pages/TripsPage.module.css (new)
- FE/src/pages/TripsPage.test.tsx (new)
- FE/src/pages/TripPlannerPage.tsx (new)
- FE/src/pages/TripPlannerPage.module.css (new)
- FE/src/pages/TripPlannerPage.test.tsx (new)
- FE/src/components/CreateTripForm.tsx (new)
- FE/src/components/EditTripForm.tsx (new)
- FE/src/components/TripForm.module.css (new)
- FE/src/components/ConfirmDialog.tsx (new)
- FE/src/components/Dialog.module.css (new)
- FE/src/components/AddToTripDialog.tsx (new)
- FE/src/components/AddToTripDialog.module.css (new)
- FE/src/components/AddToTripDialog.test.tsx (new)
- FE/src/trips/AddToTripContext.tsx (new)
- FE/src/trips/AddToTripContext.test.tsx (new)
- FE/src/components/AttractionCard.tsx (modified — add-to-trip button)
- FE/src/components/AttractionCard.module.css (modified)
- FE/src/components/AttractionCard.test.tsx (new)
- FE/src/pages/DestinationDetailsPage.tsx (modified — context fallback, logged-out add flow)
- FE/src/pages/DestinationDetailsPage.test.tsx (modified — two tests updated to the new logged-out behavior)
- FE/src/routes.tsx (modified — /trips and /trips/:id under RequireAuth, AddToTripProvider)
- FE/src/routes.test.tsx (modified — /trips guard redirect test added)

## Change Log

- 2026-07-12: Implemented story 5-5 — trip list/create, day-by-day planner with remove-confirm, edit-dates 409 confirm flow, add-to-trip picker with pending-add replay after login. 32 new unit tests; full suite 122/122 green, build and lint green. Updated two 5-4 `DestinationDetailsPage` tests because AC5 changes the logged-out Add to Trip behavior from disabled-button to prompt-login-and-replay.
