# Epic 5: Frontend Web App

Source: `requirement/Sheet1.html` — UI slices of Features 1–4; backend contract from `BE/` (Epics 1–4, all implemented)

**Status: Planned.** Stories live in `_bmad-output/implementation-artifacts/` (`5-1` … `5-5`), tracked in `sprint-status.yaml`.

## Summary

Build the web frontend for TripPlanner: a React + TypeScript + Vite single-page app in a new `FE/` folder at the repo root, consuming the existing ASP.NET Core API. The backend for all four features is implemented; every AC in Epics 1–4 that was deferred as "a frontend concern" lands here — location search and attraction browsing (Epic 1), destination details with photos and add-to-trip (Epic 2), trip creation/date editing/day-by-day itinerary (Epic 3), and the full auth flow including email verification and the "check your inbox" register UX (Epic 4).

Deferred backend stories stay deferred on the frontend too: no autocomplete-while-typing (F1 US1), no filters/sorting (F1 US4/US5), no map (F2 US3), no drag-and-drop or reordering (F3 US4–US6), no auto-save indicator (F3 US9).

## Stories

| Key | Title | Covers |
|---|---|---|
| 5-1 | Frontend scaffold and API client | Vite + React + TS app in `FE/`, routing shell, typed API client, error handling, test setup |
| 5-2 | Authentication UI | F4 US1–US4: register ("check your inbox"), verify-email page, resend, login, logout, session persistence, route guard + post-login redirect (F3 US8 AC4–5) |
| 5-3 | Destination discovery | F1 US2–US3: location search, attraction list with placeholders and empty states |
| 5-4 | Destination details | F2 US1–US2: details view, photo carousel with placeholder, auth-gated "Add to Trip" |
| 5-5 | Trip planner UI | F3 US1–US3, US7, US10: trip list, create trip, itinerary days, update dates with 409-confirm flow, add/remove destination on a day, empty states |

## Technical approach

**Stack (decided):**
- **Vite + React 19 + TypeScript** in `FE/` (`npm create vite@latest` react-ts template).
- **React Router** for routing (`/`, `/search`, `/login`, `/register`, `/verify-email`, `/trips`, `/trips/:id`).
- **TanStack Query** for server state (queries + mutations, cache invalidation after trip mutations).
- **No axios** — a small typed `fetch` wrapper in `FE/src/api/`.
- **Plain CSS modules** for styling; no UI framework.
- **Vitest + React Testing Library** for tests; API layer mocked at the client-module boundary.

**API contract (implemented backend, JSON camelCase, dates `yyyy-MM-dd`):**

| Endpoint | Auth | Request | Response |
|---|---|---|---|
| `POST /api/auth/register` | — | `{email, password}` | 200 `{message}` (generic, also for duplicates) |
| `POST /api/auth/login` | — | `{email, password}` | 200 `{id, email, role, token}`; 401 generic (also when unverified) |
| `POST /api/auth/logout` | Bearer | — | 200 |
| `GET /api/auth/verify-email?token=` | — | — | 200 `{message}`; 400 ProblemDetails |
| `POST /api/auth/resend-verification` | — | `{email}` | 200 `{message}` (always generic) |
| `GET /api/locations/search?query=` | — | ≥1 char | `LocationSearchResultResponse[]` (≤5) |
| `GET /api/locations/attractions?latitude=&longitude=&radius=&limit=` | — | radius default 20000, limit ≤20 | `AttractionResponse[]` |
| `GET /api/locations/{xid}/details` | — | — | `DestinationDetailsResponse`; 404 |
| `GET /api/trips` | Bearer | — | `TripResponse[]` (own trips only) |
| `GET /api/trips/{id}` | Bearer | — | `TripResponse`; 404 (incl. foreign trips) |
| `POST /api/trips` | Bearer | `{name, startDate, endDate}` | 201 `TripResponse` |
| `PUT /api/trips/{id}` | Bearer | `{name, startDate, endDate, confirmed}` | 200; **409** when shrinking drops planned days and `confirmed=false` |
| `POST /api/trips/{id}/days/{date}/destinations` | Bearer | `{destinationId}` or `{xid}` | 200 `TripResponse` |
| `DELETE /api/trips/{id}/days/{date}/destinations/{destinationId}` | Bearer | — | 204 |

**Auth/session model:** JWT Bearer (60-min expiry, no refresh token). Persist `AuthResponse` in `localStorage` to satisfy "stay signed in after refresh" (F4 US3 AC5). A 401 from any authorized call clears the session and redirects to `/login` with the origin path preserved (`?returnTo=`), satisfying F3 US8 AC2–5. Register does **not** sign the user in — it shows the "check your inbox" state (Epic 4's breaking change).

**Errors:** failures arrive as RFC7807 ProblemDetails (`title`/`detail` + correlation id). The API client normalizes them to a typed `ApiError { status, message }`. 503 (`ServiceUnavailable`) from location endpoints gets a "try again later" UI state.

**CORS/dev:** backend `CorsExtension` already allows any loopback origin — Vite's `http://localhost:5173` works unchanged. API base URL comes from `VITE_API_BASE_URL` (`.env.development` default `http://localhost:5000` — match the API's launch profile port).

## Known risks / open questions

1. **Country search UX (F1):** selecting a Country result must prompt the user to narrow to a city before fetching attractions (backend MVP has no country-wide attraction search).
2. **Sparse provider data (F2):** opening hours/website are usually absent — "not available" fallbacks are the *common* case, and the details view must still render.
3. **Token expiry mid-session:** with a 60-min token and no refresh, the 401-redirect path is the recovery UX; drafts in forms are lost. Accepted for MVP.
4. **Verify-email links** point at `EmailSettings.VerificationUrlBase`; for the SPA flow, that base should be repointed to the frontend route `/verify-email`, which then calls the API. Backend config change only (`.env`), no code change.
