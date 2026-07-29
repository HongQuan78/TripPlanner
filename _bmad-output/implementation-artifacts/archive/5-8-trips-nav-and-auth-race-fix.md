---
baseline_commit: a8ccd6413b7838c7be1b63966f394df500ec2aeb
---

# Story 5.8: Trips nav link and cold-load auth race fix

Status: review

## Story

As a logged-in user,
I want a visible "My Trips" link in the header and to land on `/trips` without being bounced back to login when I type the URL directly,
so that I can navigate to and reliably view my trips.

## Acceptance Criteria

1. **"My Trips" nav link:** when authenticated, the header (`AppLayout`) shows a "My Trips" link to `/trips`, styled like the existing `navLink` pill (same hover treatment as Login/Register), positioned before the user email. It is not rendered when logged out.
2. **Cold-load `/trips` no longer forces re-login:** typing `/trips` (or `/trips/:id`) directly into the browser address bar (a full page load, not an in-app `Link` navigation) while a valid, unexpired session exists in `localStorage` renders the trips page — it must not redirect to `/login`. The regression is a race: on a cold mount, `TripsPage`'s/`TripPlannerPage`'s TanStack Query fetch effect can run and call `request()` (which reads `getToken()` at call time) before `AuthProvider`'s effect calls `setTokenProvider`, so the very first request goes out with no `Authorization` header, the API correctly returns 401, and the client's `onUnauthorized` handler (registered in that same `AuthProvider` effect, so it *is* set by the time the 401 response arrives) wipes the still-valid session and redirects to `/login?returnTo=/trips`. Fix by removing the race — e.g. seed `getToken`/`onUnauthorized` synchronously during `AuthProvider`'s render (module-level call, not inside `useEffect`) so every request, including the first one fired by a child's mount effect, is guaranteed to already have the current token provider wired before any fetch can be dispatched.
3. **No regressions to existing auth behavior:** an actually-expired/invalid token (i.e., the backend genuinely returns 401 because the token itself is bad, not because it was missing) still clears the session and redirects to `/login?returnTo=<path>` — this is the existing, correct 401-recovery behavior from story 5-2 and must be preserved. Logging out, logging in, and the `returnTo` redirect flow are untouched.
4. All existing unit tests pass unmodified except where a test must change to reflect the new nav link (e.g. `AppLayout.test.tsx`'s logged-out assertions must still find no "My Trips" link); new tests are added for both fixes (see Tasks).
5. `npm run build`, `npm test`, and `npm run lint` are green.

## Tasks / Subtasks

- [x] Task 1: Add "My Trips" header nav link (AC: 1, 4)
  - [x] In `FE/src/layout/AppLayout.tsx`, add a `<Link to="/trips" className={styles.navLink}>My Trips</Link>` inside the `isAuthenticated` branch, before the `userEmail` span
  - [x] No new CSS needed — reuse the existing `.navLink` class from `AppLayout.module.css` (already styled for Login/Register)
  - [x] Update `FE/src/layout/AppLayout.test.tsx`: the logged-out test should assert `My Trips` is absent (`queryByRole('link', { name: 'My Trips' })` not in document); add a new assertion in the logged-in test that the `My Trips` link is present and points to `/trips`
- [x] Task 2: Fix the cold-load token-provider race (AC: 2, 3)
  - [x] In `FE/src/auth/AuthContext.tsx`, call `setTokenProvider(() => sessionRef.current?.token ?? null)` and `setOnUnauthorized(...)` synchronously in the component body (on every render, or via a one-time module-scope/ref-guarded call before the first child effect can run) instead of inside the mount `useEffect` — the goal is that by the time `AuthProvider`'s own subtree (including `RequireAuth`-gated pages and their query hooks) is mounted and its effects fire, the client already has the correct token provider registered, regardless of React's child-before-parent effect ordering
  - [x] Keep the existing `useEffect` cleanup (`setTokenProvider(() => null)` / `setOnUnauthorized(null)` on unmount) so the module-level state is still reset when `AuthProvider` unmounts (tests render/unmount it repeatedly)
  - [x] Do not change `onUnauthorized`'s behavior for a genuinely-invalid token — only close the window where a *missing* (not-yet-wired) token on the first request is misinterpreted as an expired session
- [x] Task 3: Regression test for the race (AC: 2, 3)
  - [x] Add a test (e.g. in `FE/src/auth/AuthContext.test.tsx` or a new test alongside `TripsPage`) that mounts `AuthProvider` with a valid stored session and immediately (synchronously, same tick) invokes the api client's `request()` — simulating a child's mount-effect firing before `AuthProvider`'s own effect would have — and asserts the request carries the `Authorization` header and the session is not cleared
  - [x] Add/verify a test that a real 401 from the client (e.g. mock `fetch` to return 401 regardless of headers) still clears the session and navigates to `/login?returnTo=...` — proving Task 2 did not remove genuine expiry handling
- [x] Task 4: Verify (AC: 5)
  - [x] `npm run build`, `npm test`, `npm run lint` all green; manually verify via `npm run dev`: log in, copy the `/trips` URL, paste it into a fresh browser tab (or hard-refresh on `/trips`) — the trips list loads without bouncing to `/login`

## Dev Notes

### Root cause (confirmed by reading source, not guessed)

- `FE/src/auth/AuthContext.tsx:53-70`: `setTokenProvider`/`setOnUnauthorized` are only wired inside a `useEffect(() => {...}, [])` — this runs *after* the initial commit, and React fires mount effects child-before-parent. `AuthProvider` wraps `AppLayout` wraps the routed page (`TripsPage`/`TripPlannerPage` via `RequireAuth`), so on a cold full-page load of `/trips`, the page's own `useQuery` (`FE/src/hooks/trips.ts` `useTrips`/`useTrip`) fires its fetch in its own mount effect *before* `AuthProvider`'s effect has registered the real token provider.
- `FE/src/api/client.ts:11,59-62`: `getToken` defaults to `() => null` at module scope until `setTokenProvider` is called. The first `request()` call reads `getToken()` synchronously to build headers — if that happens before `AuthProvider`'s effect runs, no `Authorization` header is attached, so `/api/trips` (which requires Bearer auth per `TripEndpoints` `RequireAuthorization()`) correctly returns 401.
- `FE/src/api/client.ts:74-77`: on any 401, if `onUnauthorized` is set, it fires. By the time the *response* for that headerless request arrives (a real network round-trip, always slower than the synchronous effect-registration phase), `AuthProvider`'s effect has already run and registered `onUnauthorized` — so it fires, and `AuthContext.tsx:55-65` treats this as session expiry: clears the still-valid session from `localStorage` and redirects to `/login?returnTo=/trips`.
- This only reproduces on a **cold mount of a route with an immediate authenticated query** (matches the user's report of typing `/trips` in the URL bar / hard refresh). In-app `<Link>` navigation to `/trips` after the app has been running for a while doesn't reproduce it, because `AuthProvider`'s effect already ran long ago on initial app load.
- `RequireAuth` (`FE/src/auth/RequireAuth.tsx`) itself is correct and not the source of the bug — `session` is read synchronously from `localStorage` in `AuthProvider`'s `useState` initializer (`AuthContext.tsx:43`), so `isAuthenticated` is already true on first render; the redirect comes from the client's 401 handler, not from the route guard.

### "My Trips" nav link — current state

- `FE/src/layout/AppLayout.tsx:16-22`: the authenticated branch renders only the user's email and a Logout button — no link to `/trips` anywhere in the app shell. `FE/src/pages/TripsPage.tsx` is only reachable today by manually typing the URL or via the post-login `/trips` default redirect (`LoginPage`) — this is the "no button to navigate to trips" the user reported.
- Reuse the existing `.navLink` class (`AppLayout.module.css:37-48`) — it already matches the "cute sky" design system (pill hover, `--color-primary-dark`) established in story 5-6; no new CSS.

### Testing standards

- Vitest + React Testing Library, component tests query by role/label/text (see `AppLayout.test.tsx`, `AuthContext.test.tsx` patterns already in the repo). `localStorage.clear()` in `beforeEach`. Auth API calls are mocked via `vi.mock('../api/auth', ...)`.
- Project rules apply: no comments of any kind; braces on all control flow statements.

### Project Structure Notes

- No new files required. Modified: `FE/src/layout/AppLayout.tsx`, `FE/src/layout/AppLayout.test.tsx`, `FE/src/auth/AuthContext.tsx`, `FE/src/auth/AuthContext.test.tsx` (or a new focused test file if that reads cleaner — developer's call, but keep it colocated with existing auth tests).
- No backend changes; no new dependencies.

### References

- [Source: FE/src/auth/AuthContext.tsx] — session state, token-provider wiring, onUnauthorized handler
- [Source: FE/src/auth/RequireAuth.tsx] — route guard (confirmed not the bug)
- [Source: FE/src/api/client.ts] — `getToken`/`onUnauthorized` module state, 401 handling
- [Source: FE/src/layout/AppLayout.tsx, FE/src/layout/AppLayout.module.css] — header nav, `.navLink` styling
- [Source: FE/src/routes.tsx] — `/trips`, `/trips/:id` under `RequireAuth`
- [Source: FE/src/hooks/trips.ts, FE/src/pages/TripsPage.tsx] — the query hook whose mount-effect wins the race
- [Source: _bmad-output/implementation-artifacts/archive/5-2-authentication-ui.md] — original auth/guard/401 design (Dev Notes, Completion Notes)
- [Source: _bmad-output/implementation-artifacts/archive/5-5-trip-planner-ui.md] — `/trips` route wiring, "cute sky" design system reference

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npm test -- --run`: 19 test files, 140 tests passed
- `npm run build`: `tsc -b && vite build` succeeded
- `npm run lint`: oxlint passed (2 pre-existing `only-export-components` warnings, unrelated to this change)

### Completion Notes List

- Added a "My Trips" `navLink`-styled link to `AppLayout`'s authenticated nav branch, before the user email; updated `AppLayout.test.tsx` to assert its absence when logged out and presence/href when logged in.
- Fixed the cold-load token-provider race in `AuthContext.tsx` by moving `setTokenProvider`/`setOnUnauthorized` wiring out of the mount `useEffect` and into the component body, so it runs synchronously on every render — including before any child's mount effect fires, regardless of React's child-before-parent effect ordering. The `useEffect` now only handles unmount cleanup.
- Added a regression test (`AuthContext.test.tsx`) with a `RequestOnMount` child component whose own mount effect fires `request('/api/trips')`; asserts the request already carries the `Authorization` header and the stored session survives, proving the race is closed. The existing 401-clears-session-and-redirects test (unmodified) continues to pass, confirming genuine-expiry handling (AC3) is untouched.
- All ACs verified via `npm run build`, `npm test`, `npm run lint` (all green, per Task 4). Manual browser verification (hard-refresh on `/trips`) was not performed in this headless session; the automated `RequestOnMount` regression test exercises the same effect-ordering race the manual repro would hit.

### File List

- `FE/src/layout/AppLayout.tsx` (modified)
- `FE/src/layout/AppLayout.test.tsx` (modified)
- `FE/src/auth/AuthContext.tsx` (modified)
- `FE/src/auth/AuthContext.test.tsx` (modified)

## Change Log

- 2026-07-13: Implemented Story 5.8 — added "My Trips" header nav link and fixed the cold-load auth token-provider race by wiring `setTokenProvider`/`setOnUnauthorized` synchronously during `AuthProvider` render instead of in a mount effect.
