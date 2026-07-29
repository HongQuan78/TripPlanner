---
baseline_commit: 22d4621a162ba47d6f2761079ea63254de5a68eb
---

# Story 5-2: Authentication UI

Status: review

## Story

As a user, I want to sign up, verify my email, log in, and log out from the web app, so I can access my own trips securely (Feature 4 US1–US4; Feature 3 US8 AC2–5).

## Acceptance Criteria

1. **Register (`/register`):** email + password form; client-side checks (valid email format, password ≥8 chars) with inline messages; on submit success the form is replaced by the backend's generic "check your inbox" message — the user is NOT signed in and no token is stored. A duplicate email shows the exact same success state.
2. **Verify email (`/verify-email?token=...`):** on load, calls `GET /api/auth/verify-email?token=`; shows the success message on 200, or the error message from ProblemDetails on 400 with a "resend verification" form (email input → `POST /api/auth/resend-verification`) that always shows the generic success message.
3. **Login (`/login`):** email + password form; on 200 stores the `AuthResponse` and navigates to `returnTo` query param if present, else `/trips`; on 401 shows the backend's generic message. Login state survives a full page refresh (session persisted in `localStorage`).
4. **Logout:** a header button visible only when logged in; calls `POST /api/auth/logout` with the bearer token, then clears the session and navigates to `/` regardless of the call's outcome. Header shows the logged-in email when authenticated, and Login/Register links when not.
5. **Auth context:** an `AuthProvider` exposes `{ user, token, login(), logout(), isAuthenticated }`; the API client's `getToken` is wired to it so all subsequent requests carry `Authorization: Bearer <token>`.
6. **Route guard + 401 recovery:** a `RequireAuth` wrapper redirects unauthenticated users to `/login?returnTo=<current-path>`; any API response with status 401 while logged in clears the session and performs the same redirect (token expiry recovery).
7. Unit tests cover: register success shows check-inbox state; register validation messages; login stores session and redirects to `returnTo`; login 401 shows generic error; logout clears session; `RequireAuth` redirects when logged out; 401 interceptor clears session; session restore from `localStorage` on mount.

## Tasks / Subtasks

- [x] Task 1: Auth state (AC: 3, 5, 6)
  - [x] `AuthProvider` + `useAuth()` hook; persist/restore `{id, email, role, token}` under one `localStorage` key
  - [x] Wire `client.getToken` to the provider; add a 401 handler in the client that invokes a registered `onUnauthorized` callback
- [x] Task 2: Register page (AC: 1)
  - [x] Form with inline validation (email format, password ≥8); disable submit while pending
  - [x] Success state renders the returned `message` and a link to `/login`
- [x] Task 3: Verify-email page + resend (AC: 2)
  - [x] Read `token` from query string; fire the verify call once on mount; loading/success/error states
  - [x] Resend form shown on error (and when no token param present)
- [x] Task 4: Login page (AC: 3)
  - [x] Form posts to login; store session via `useAuth().login`; honor `returnTo`
- [x] Task 5: Header + logout + guard (AC: 4, 6)
  - [x] Header auth section (email + Logout vs Login/Register links)
  - [x] `RequireAuth` route wrapper capturing the attempted path into `returnTo`
- [x] Task 6: Tests (AC: 7)
  - [x] Component tests with the api module mocked; router wrapped via `MemoryRouter`
- [x] Task 7: Verify — `npm run build` and full `npm test` green

## Dev Notes

- **Endpoints:** `POST /api/auth/register` → 200 `{message}` (generic for duplicates too); `POST /api/auth/login` → 200 `{id, email, role, token}` / 401 ProblemDetails with generic `Invalid email or password.` (**superseded 2026-07-26 by story `4-5-unverified-login-message`:** an unverified account with the *correct* password now returns the distinct `Your email address is not verified. Please check your inbox.` — render whatever `detail` the backend sends, verbatim; still never invent a client-side verify-first message); `POST /api/auth/logout` (Bearer) → 200; `GET /api/auth/verify-email?token=` → 200 `{message}` / 400; `POST /api/auth/resend-verification` `{email}` → always 200 `{message}` (60s server-side cooldown returns the same generic success — no special UI needed).
- **Register must not auto-login** — this is Epic 4's deliberate breaking change; there is no token in the register response.
- **Verification links in emails** point at `EmailSettings.VerificationUrlBase`; to route them through this SPA page, set `EmailSettings__VerificationUrlBase=http://localhost:5173/verify-email` in `BE/.env` (document this in FE README; no backend code change).
- **Token lifetime is 60 minutes, no refresh.** Expiry surfaces as a 401 on the next authorized call — handled by AC 6, not by proactive timers.
- **StrictMode double-mount:** the verify-email effect must be idempotent-safe (tokens are single-use server-side; guard the effect with a ref so the token isn't consumed then re-sent and shown as an error).
- Depends on story 5-1's client hook points (`getToken`, error normalization).
- Project rules: no comments; braces everywhere; CSS modules.

## Dev Agent Record

### Debug Log

- RTL cleanup was not running between tests (vitest `globals` is off, so auto-cleanup never registers); added an explicit `cleanup()` in `src/test/setup.ts`, which fixed "found multiple elements" failures in the AuthContext tests.

### Completion Notes

- Implementation Plan: session state lives in a single `AuthProvider` (`src/auth/AuthContext.tsx`) that reads `localStorage` (`tripplanner.auth`) synchronously in its state initializer for refresh survival, and wires the story 5-1 client hook points in a mount effect: `setTokenProvider` reads the session through a ref, and a new `setOnUnauthorized` client hook clears the session and navigates to `/login?returnTo=<path+search>` only when a session exists (so a failed login's 401 never redirects).
- The client fires `onUnauthorized` on any 401 before throwing `ApiError`; auth endpoint wrappers live in `src/api/auth.ts`.
- `logout()` in the context calls `POST /api/auth/logout` first (token still attached), swallows any failure, then clears the session and navigates to `/` — satisfying AC 4's "regardless of outcome".
- Register validates email format and password ≥8 on submit with inline messages, disables the button while pending, and on success replaces the form with the backend's returned message plus a `/login` link; no token is ever stored (register response has none).
- Verify-email fires the verify call once on mount guarded by a ref (StrictMode double-mount consumes the single-use token only once — covered by a StrictMode test), and shows the resend form on failure or when no `token` param is present; resend always renders the returned generic message.
- Login honors `returnTo` (only same-origin paths starting with `/`), defaults to `/trips`, and surfaces the backend's generic 401 message verbatim.
- `RequireAuth` redirects to `/login?returnTo=<attempted path+search>`; it is exported and tested, and will be wired to trip routes in story 5-5 when those routes exist.
- `AuthProvider` needs router hooks, so it is mounted as a wrapper route around `AppLayout` in `main.tsx`; new routes: `/register`, `/login`, `/verify-email`.
- Documented `EmailSettings__VerificationUrlBase=http://localhost:5173/verify-email` in `FE/README.md` per Dev Notes (no backend change).
- Verification: `npm run build` green, `npm run lint` green (one pre-existing-style fast-refresh warning on AuthContext.tsx, non-blocking), full `npm test` green — 7 files, 46 tests.

## File List

- FE/src/api/client.ts (modified)
- FE/src/api/client.test.ts (modified)
- FE/src/api/auth.ts (new)
- FE/src/auth/AuthContext.tsx (new)
- FE/src/auth/AuthContext.test.tsx (new)
- FE/src/auth/RequireAuth.tsx (new)
- FE/src/auth/RequireAuth.test.tsx (new)
- FE/src/pages/RegisterPage.tsx (new)
- FE/src/pages/RegisterPage.test.tsx (new)
- FE/src/pages/LoginPage.tsx (new)
- FE/src/pages/LoginPage.test.tsx (new)
- FE/src/pages/VerifyEmailPage.tsx (new)
- FE/src/pages/VerifyEmailPage.test.tsx (new)
- FE/src/pages/AuthForm.module.css (new)
- FE/src/layout/AppLayout.tsx (modified)
- FE/src/layout/AppLayout.module.css (modified)
- FE/src/layout/AppLayout.test.tsx (new)
- FE/src/main.tsx (modified)
- FE/src/test/setup.ts (modified)
- FE/README.md (modified)

## Change Log

- 2026-07-12: Implemented story 5-2 Authentication UI — auth context with localStorage persistence, client 401 hook, register/login/verify-email pages, header auth section with logout, RequireAuth guard, and 25 new component/unit tests. Status → review.
