---
baseline_commit: 22d4621a162ba47d6f2761079ea63254de5a68eb
---

# Story 5-1: Frontend scaffold and API client

Status: done

## Story

As a developer, I want a React + TypeScript + Vite app scaffolded in `FE/` with routing, a typed API client, and a test harness, so all subsequent frontend stories build on a consistent foundation.

## Acceptance Criteria

1. `FE/` contains a Vite React-TS app that starts with `npm run dev` and builds with `npm run build` (zero TypeScript errors).
2. React Router is configured with an app shell (header with app name + nav placeholder, `<Outlet/>` content area) and routes: `/` (home placeholder), `*` (not-found page).
3. A typed API client module (`FE/src/api/`) wraps `fetch`: base URL from `VITE_API_BASE_URL`, JSON in/out, and non-2xx responses normalized to a thrown `ApiError { status, message }` parsed from ProblemDetails (`detail` preferred, `title` fallback, generic message otherwise).
4. TypeScript types exist for every backend DTO used by the app: `AuthResponse`, `MessageResponse`, `LocationSearchResult`, `Attraction`, `DestinationDetails`, `Destination`, `TripDay`, `Trip`, plus request types (`RegisterRequest`, `LoginRequest`, `ResendVerificationRequest`, `CreateTripRequest`, `UpdateTripRequest`, `AddDestinationToDayRequest`).
5. TanStack Query is installed and a `QueryClientProvider` wraps the app.
6. Vitest + React Testing Library run via `npm test`; at least the API-client unit tests pass (success parse, ProblemDetails error parse, network failure).
7. `.env.development` sets `VITE_API_BASE_URL` to the local API URL; `FE/README.md` (or a section) documents dev commands. `FE/` build artifacts (`dist/`, `node_modules/`) are gitignored.

## Tasks / Subtasks

- [x] Task 1: Scaffold the app (AC: 1, 7)
  - [x] Run `npm create vite@latest FE -- --template react-ts` from the repo root (or scaffold manually to the same layout)
  - [x] Add `.env.development` with `VITE_API_BASE_URL=http://localhost:5000` (verify actual port from `BE/TripPlanner.API/Properties/launchSettings.json` and use that)
  - [x] Ensure root `.gitignore` (or `FE/.gitignore`) covers `FE/node_modules` and `FE/dist`
  - [x] Remove Vite demo content (logos, counter) and strip all comments from generated files (project rule: no comments)
- [x] Task 2: Routing and app shell (AC: 2)
  - [x] Install `react-router-dom`; create `AppLayout` (header + `<Outlet/>`) and `NotFoundPage`
  - [x] Define the router with `/` and `*` routes
- [x] Task 3: Types and API client (AC: 3, 4)
  - [x] Create `FE/src/api/types.ts` with all DTO/request types (camelCase fields, dates as `string` in `yyyy-MM-dd`)
  - [x] Create `FE/src/api/client.ts`: `request<T>(path, options)` using `fetch`, JSON headers, ProblemDetails-aware `ApiError`
  - [x] Support an optional bearer-token provider hook point (a settable `getToken: () => string | null`) so story 5-2 can plug auth in without rewriting the client
- [x] Task 4: TanStack Query setup (AC: 5)
  - [x] Install `@tanstack/react-query`; create one `QueryClient` and wrap the router in `QueryClientProvider`
- [x] Task 5: Test harness (AC: 6)
  - [x] Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`; wire `npm test`
  - [x] Write API-client tests: 200 JSON → typed result; 400 ProblemDetails → `ApiError` with `detail` message; network reject → `ApiError`; bearer header attached when `getToken` returns a token
- [x] Task 6: Verify (AC: 1, 6)
  - [x] `npm run build` passes with zero TS errors; `npm test` green

### Review Findings

- [x] [Review][Decision→Patch] FE tests/build not in CI — resolved: added a `frontend` job (Node 20, `npm ci`/`build`/`test`) to `.github/workflows/ci.yml`
- [x] [Review][Decision→Patch] FluentValidation 400s show a generic message — resolved: `parseErrorMessage` now flattens the `ValidationProblemDetails` `errors` dictionary before the detail/title fallback, with a test pinning the contract
- [x] [Review][Patch] 2xx response with empty/non-JSON body throws raw SyntaxError instead of returning — breaks `POST /api/auth/logout` (200 with empty body per `AuthEndpoints.cs:54`) and violates the client's ApiError-only contract [FE/src/api/client.ts:61]
- [x] [Review][Patch] Bare catch around fetch swallows AbortError and misreports cancellations as network failures [FE/src/api/client.ts:47]
- [x] [Review][Patch] Content-Type: application/json forced on any body, would clobber FormData/Blob callers [FE/src/api/client.ts:38]
- [x] [Review][Patch] Non-string ProblemDetails detail/title passes truthiness check and renders as "[object Object]" [FE/src/api/client.ts:23]
- [x] [Review][Patch] Trailing slash in VITE_API_BASE_URL produces double-slash URLs (no normalization) [FE/src/api/client.ts:17]
- [x] [Review][Patch] No test asserts the request URL (`${baseUrl}${path}`) passed to fetch — deleting the baseUrl prefix leaves all 9 tests green [FE/src/api/client.test.ts]
- [x] [Review][Patch] AddDestinationToDayRequest allows `{}` and both-fields shapes; should be a discriminated union of destinationId | xid [FE/src/api/types.ts]
- [x] [Review][Patch] tsconfig lib missing DOM.Iterable — first `for...of` over Headers/NodeList fails to compile [FE/tsconfig.app.json:5]
- [x] [Review][Patch] CLAUDE.md repository layout/commands don't mention the new FE/ app [CLAUDE.md]
- [x] [Review][Patch] Completion note "nullable C# members as | null" is inaccurate for request DTOs — CreateTripRequest/UpdateTripRequest fields are deliberately stricter than the nullable C# records; correct the note [_bmad-output/implementation-artifacts/archive/5-1-frontend-scaffold-and-api-client.md]
- [x] [Review][Defer] No router errorElement/error boundary — render errors show React Router's default screen [FE/src/main.tsx:13] — deferred, belongs with the UI stories (5-2+)

## Dev Notes

- **Backend contract:** see `epic/epic-5-frontend-web-app.md` for the full endpoint table. JSON is camelCase; `DateOnly` serializes as `"yyyy-MM-dd"` strings.
- **ProblemDetails shape:** `ExceptionHandlingMiddleware` and `ResultExtension.ToResponse()` return RFC7807 bodies (`title`, `detail`, `status`, correlation id). FluentValidation failures return 400 with validation details. The client should tolerate non-JSON error bodies.
- **CORS:** `BE/TripPlanner.API/Extensions/CorsExtension.cs` allows any loopback origin — no backend change needed for Vite dev.
- **Do not** add axios, a UI framework, or state libraries beyond TanStack Query. Styling is CSS modules.
- **Project rules apply to FE code too:** no comments of any kind; curly braces on all control flow.
- **204 responses** (delete destination) have no body — the client must not attempt `res.json()` on them.
- Empty result lists (search with no matches) are HTTP 200 with `[]`, not errors.

## Dev Agent Record

### Debug Log

- `python3` unavailable on this Windows host; skill customization resolved manually (defaults only, no overrides present).
- Vite scaffold (`npm create vite@latest FE -- --template react-ts`) produced Vite 8 / React 19 / TS 6 with Oxlint instead of ESLint; kept as-is.
- Generated `tsconfig.app.json` lacked `strict`; enabled it — build stays at zero TS errors.
- Verified API port from `launchSettings.json`: `http://localhost:5000`.
- Dev server verified live: `npm run dev` served HTTP 200 on `http://localhost:5173`.

### Completion Notes

- Scaffolded Vite React-TS app in `FE/` with demo content removed and all comments stripped from generated files (including tsconfigs and `.gitignore`).
- `src/api/client.ts` exposes `request<T>(path, options)` over `fetch`: base URL from `VITE_API_BASE_URL`, `Accept`/`Content-Type` JSON headers, 204 handled without body read, non-2xx normalized to thrown `ApiError { status, message }` parsed from ProblemDetails (`detail` → `title` → generic), network failures thrown as `ApiError` with status 0.
- Bearer hook point: `setTokenProvider(() => string | null)` module-level setter; header attached only when a token is returned (story 5-2 plug-in point).
- `src/api/types.ts` mirrors all backend DTOs field-for-field from `BE/TripPlanner.Application/DTOs` (camelCase, `DateOnly` as `string`, nullable response members as `| null`); request types are deliberately stricter than the nullable C# request records (`CreateTripRequest`/`UpdateTripRequest` fields required, `AddDestinationToDayRequest` a `destinationId`/`xid` union) so invalid shapes fail at compile time.
- Router (`createBrowserRouter`) wraps `/` (HomePage) and `*` (NotFoundPage) in `AppLayout` (header with app name link + empty nav placeholder + `<Outlet/>`); one `QueryClient` in `QueryClientProvider` wraps the router in `main.tsx`.
- Test harness: Vitest + jsdom + RTL/jest-dom setup file wired via `vitest/config`; `npm test` = `vitest run`. 9 API-client tests written red-first, all green: 200 parse, 400 detail, 404 title fallback, non-JSON body generic message, network reject, 204 undefined, bearer attached, no header without token, JSON body/content-type.
- Verification: `npm run build` zero TS errors (with `strict` enabled), `npm test` 9/9, `npm run lint` clean, dev server responds 200.

## File List

- FE/.env.development
- FE/.gitignore
- FE/.oxlintrc.json
- FE/README.md
- FE/index.html
- FE/package.json
- FE/package-lock.json
- FE/public/favicon.svg
- FE/src/api/client.ts
- FE/src/api/client.test.ts
- FE/src/api/types.ts
- FE/src/index.css
- FE/src/layout/AppLayout.module.css
- FE/src/layout/AppLayout.tsx
- FE/src/main.tsx
- FE/src/pages/HomePage.tsx
- FE/src/pages/NotFoundPage.tsx
- FE/src/test/setup.ts
- FE/tsconfig.json
- FE/tsconfig.app.json
- FE/tsconfig.node.json
- FE/vite.config.ts
- .github/workflows/ci.yml
- CLAUDE.md

## Change Log

- 2026-07-12: Implemented story 5-1 — scaffolded `FE/` Vite React-TS app, routing shell (`/`, `*`), typed API client with ProblemDetails-aware `ApiError` and bearer-token hook point, backend DTO types, TanStack Query provider, Vitest/RTL harness with 9 passing API-client tests. Status → review.
- 2026-07-12: Addressed code review findings — 12 items resolved (2 decisions resolved as patches, 10 patches), 1 deferred (router errorElement → UI stories). Client now handles 2xx empty/non-JSON bodies, AbortError passthrough, string-only Content-Type, non-string detail/title, base-URL trailing-slash normalization, and FluentValidation `errors` flattening; `AddDestinationToDayRequest` is a discriminated union; `DOM.Iterable` added to tsconfig lib; FE job added to CI; CLAUDE.md updated for `FE/`. Tests 9 → 15, all green; build zero TS errors. Status → done.
