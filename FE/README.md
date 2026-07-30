# TripPlanner Frontend

React + TypeScript + Vite single-page app for TripPlanner, consuming the ASP.NET Core API in `BE/`.

## Prerequisites

- Node.js 20+
- The backend API running locally (`dotnet run --project BE/TripPlanner.API` from the repo root)

## Commands

Run all commands from the `FE/` directory:

```bash
npm install        # install dependencies
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # type-check and build for production
npm test           # run unit tests (Vitest)
npm run lint       # run Oxlint
npm run preview    # preview the production build
```

## Configuration

The API base URL comes from `VITE_API_BASE_URL`, set in `.env.development` (defaults to `http://localhost:5000`, matching the API's launch profile).

For email verification links to open the SPA's `/verify-email` page, set `EmailSettings__VerificationUrlBase=http://localhost:5173/verify-email` in `BE/.env` (no backend code change required).

In the Docker/production image (`FE/Dockerfile`), the app is built with `VITE_API_BASE_URL` **empty** on purpose: with no base URL the API client (`src/shared/api/httpClient.ts`) issues relative, same-origin requests, which nginx reverse-proxies to the backend (see `FE/nginx.conf` and the Docker section in the root `CLAUDE.md`). Vite bakes this value at build time, so it is a build argument, not a runtime setting. Two tests in `src/shared/api/httpClient.test.ts` pin this contract by asserting that an empty or undefined `VITE_API_BASE_URL` produces a relative `fetch` path — without them, adding a fallback base URL would silently break the container's same-origin model while the suite stayed green. The runtime image is `nginxinc/nginx-unprivileged` listening on **8080** (non-root), published to the host as `8080:8080`.

## Structure

The source is organized **by feature**. Imports that cross a folder boundary use the `@/` alias (resolving to `src/`, configured in `vite.config.ts` and `tsconfig.app.json`); imports between files in the same folder stay relative (`./`).

- `src/app/` — application shell and wiring: entry point (`main.tsx`, `index.css`), route table (`routes.tsx`), the `AppLayout` header/content shell, and `NotFoundPage`
- `src/shared/` — code used across features
  - `shared/api/` — the transport layer: `ApiError` (`apiError.ts`), the `HttpClient` class plus its shared `httpClient` instance (`httpClient.ts`), and `models/` holding **one backend DTO per file**, grouped into `auth/`, `destination/`, `trip/` and `common/`
  - `shared/lib/` — framework-agnostic utilities (`dates.ts` including the ISO↔`Date` converters, `formatCategory.ts`, `useDebouncedValue.ts`, `useImageLoaded.ts`)
  - `shared/ui/` — generic presentational primitives (`Modal`, `ConfirmDialog`, `StarRating`, `Dialog`/`Skeleton`/`PageState` styles)
- `src/features/` — one folder per feature domain, each co-locating its pages, components, hooks (`hooks.ts`), its API service (`<name>Service.ts`), and styles/tests
  - `features/auth/` — `AuthProvider` session state (persisted in `localStorage`) with its context and `useAuth` hook in `useAuth.ts`, the `RequireAuth` guard, `AuthShell`, and the Login/Register/Verify-Email pages
  - `features/destinations/` — search and destination-detail pages plus their attraction components (cards, hero, map, nearby rail, suggestions, popular tiles)
  - `features/trips/` — trips list, trip planner and its day/row/saved-place components, the add-to-trip flow, and the trip edit form
- `src/test/` — test setup

Server state is managed with TanStack Query; routing with React Router; styling with CSS modules.

### Conventions

These are enforced by Oxlint (`.oxlintrc.json`) and `tsc` (`noUnusedLocals`/`noUnusedParameters`), so breaking one is a failed build rather than a review comment.

**Imports.** Crossing a folder boundary uses `@/`; same-folder imports stay `./`. Features may import from `app/` never, and from `shared/` freely; `app/` composing features is the composition root and is correct.

**One component per `.tsx`.** A file exports exactly one component (plus, at most, string/number literal constants). A page that grows sub-components splits them into co-located sibling files, each `export default`.

**Data and logic live in plain `.ts` siblings.** This is not stylistic. `react/only-export-components` warns when a `.tsx` exports anything alongside a component *except* a literal constant — so an exported array, object, helper function, or hook must move to a `.ts` file. Existing examples: `popularCities.ts`, `landingContent.ts`, `errorMessage.ts`, `recentSearches.ts`, `attractionFilters.ts`, `searchState.ts`, `suggestionOption.ts`, `openNow.ts`, `dragActions.ts`, `tripFormValidation.ts`, `formatCategory.ts`, `useAuth.ts`, `useAddToTrip.ts`. The one sanctioned exception to "`.ts` siblings hold no styling" is a data module whose values *are* CSS-module class references (`landingContent.ts` imports `SearchPage.module.css` for the tile gradients).

A React context provider is the common case: the `.tsx` keeps only the provider component, while the context object and its `use*` hook move to a `.ts` sibling. Note the sibling must not differ from the `.tsx` by case alone (`authContext.ts` next to `AuthContext.tsx`) — on case-insensitive filesystems, Windows and macOS included, Vite resolves `./AuthContext` to the `.ts` file and the provider import silently breaks. Name the sibling after its hook instead.

**Where a new file belongs.** Used by one feature → that feature's folder. Used by two or more features → `shared/` (`ui/` if it renders, `lib/` if it does not). A component reaching into another feature's folder is the signal to promote it, not to add an import: `StarRating` moved to `shared/ui/` for exactly this reason.

**CSS modules** are co-located and may be shared by a parent and the children extracted from it (`TripPlannerPage.module.css` serves four components). What is *not* accepted is an independent component reaching sideways into a stylesheet it does not own — that is what gave `PopularTile` its own `.module.css`.

**No barrel (`index.ts`) files.** There are none, and their absence is load-bearing rather than an oversight: a `destinations` barrel would re-export `AttractionCard` → `trips/useAddToTrip`, while a `trips` barrel would re-export `TripPlannerPage` → `destinations/…`, forming a genuine import cycle. Import the specific module.

**Tests** are co-located (`Foo.tsx` / `Foo.test.tsx`); there is no `__tests__/` folder. Note that `vi.mock('…')` path strings are **not** type-checked — when moving or renaming a module, grep for its old path rather than relying on `tsc`, or a mock will silently stop matching and the real implementation will run under a green build.

**Opening hours are parsed by the `opening_hours` library, not by hand.** `features/destinations/openNow.ts` wraps it; do not reintroduce a bespoke parser, because real OSM `opening_hours` values include lunch-break ranges (`Mo-Fr 09:00-12:00,13:00-17:00`), `off` clauses, later-rule-overrides-earlier semantics, extended hours past midnight (`10:00-26:00`) and public holidays, and a hand-rolled subset silently hides the badge on all of them. Three non-obvious constraints: the package's shipped types declare a **named** export while the runtime CJS module *is* the class, so the working import is `import OpeningHours from 'opening_hours'` plus the local augmentation in `src/types/opening_hours.d.ts` — the named import type-checks and is `undefined` at runtime. Evaluation is always done against the **destination's** timezone via `zonedNow()` (the API supplies `timeZone`), never the browser clock. And `PH` rules need a `country_code`; without one the library ignores the holiday clause rather than throwing, so hours still evaluate but holidays are not detected.

**Time-dependent UI needs a ticking clock, not a render-time `new Date()`.** `useOpenNow` owns the interval so the Open/Closed status re-evaluates while the page sits open, and it is computed **once** per render and passed down — `OpenNowBadge` takes an `OpenNowResult`, not an hours string. Parsing the same value independently in two components lets the badge and the sidebar disagree.

### The API layer

Three tiers, each with one job. Nothing skips a tier: a component never calls `fetch`, and a service never touches TanStack Query.

```
component  →  hooks.ts (TanStack Query)  →  <name>Service  →  HttpClient  →  fetch
```

**Models** (`shared/api/models/`) are one interface per file, named after the type in camelCase (`Trip` → `trip.ts`), grouped into a folder per backend domain:

```
shared/api/models/
  auth/         authResponse, loginRequest, registerRequest, resendVerificationRequest
  destination/  attraction, attractionFilters, destination, destinationDetails, locationSearchResult
  trip/         trip, tripDay, createTripRequest, updateTripRequest, addDestinationToDayRequest,
                addSavedPlaceRequest, scheduleSavedPlaceRequest, reorderDayDestinationsRequest,
                moveDestinationRequest
  common/       messageResponse
```

Requests and responses sit **together** inside a domain rather than being split into `requests/`/`responses/` — you look a model up by the feature it belongs to, not by which direction it travels. A DTO used by more than one domain goes in `common/`; note `destination.ts` lives in `destination/` even though `trip/` consumes it, because that is where it is defined, not merely where it is used.

They are types only — after compilation these files emit no JavaScript, so a model may import another across domains (`trip/trip.ts` imports `../destination/destination`) with no runtime cost and no cycle risk. Do not add methods or classes here: the API returns plain JSON, TanStack Query caches exactly what it receives, and introducing a runtime class would mean deserializing every response.

**Services** own the URL, the HTTP verb, and the request/response types for one feature — and nothing else. Each is a class taking an `HttpClient` through its constructor, exported alongside a ready-made singleton wired to the shared client:

```ts
export class TripService {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getAll(): Promise<Trip[]> {
    return this.http.request<Trip[]>('/api/trips');
  }
}

export const tripService = new TripService(httpClient);
```

Note the explicit field assignment: `tsconfig.app.json` sets `erasableSyntaxOnly`, so TypeScript **parameter properties** (`constructor(private http: HttpClient)`) are a compile error.

That constructor is the point of the class. A service test builds its own instance — `new TripService(new HttpClient(''))` — and asserts against a stubbed `fetch`, so it verifies the real URL and verb with **no module mocking at all** (`tripService.test.ts`, `destinationService.test.ts`, `authService.test.ts`). Component and hook tests still mock the singleton's module, because that is what `hooks.ts` imports:

```ts
vi.mock('./tripService', () => ({ tripService: { getAll: vi.fn() } }));
```

**`HttpClient`** (`shared/api/httpClient.ts`) is the only place `fetch` is called. It owns the base URL, the `Accept`/`Content-Type` headers, bearer-token injection, ProblemDetails error parsing into `ApiError`, and the 204/empty-body cases. Its base URL defaults to `VITE_API_BASE_URL` but is constructor-injectable, which is how the same-origin contract is tested directly rather than through `vi.resetModules()`. The token provider and 401 handler are instance state, set once by `AuthProvider` via `httpClient.setTokenProvider(…)`.
