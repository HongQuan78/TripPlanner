---
baseline_commit: e128b0a324a164cd7630aaf81b2764c1201c1b13
---

# Story 5.23: Frontend Model Files and Explicit Service Layer

Status: review

## Story

As a developer maintaining the TripPlanner frontend,
I want each backend DTO in its own model file and every API call behind an explicit, injectable service class,
so that the data contract is readable one type at a time and the HTTP boundary is a real seam that can be tested without module mocking.

## Context

Story 5-22 fixed *component* structure but deliberately left the data layer alone. That left two things the user identified as still not good enough:

- **All 22 backend DTOs lived in one `shared/api/types.ts`** (112 lines) — a grab-bag with no per-model boundary.
- **There was no service layer at all.** Each feature had an `api.ts` of loose functions calling a module-level `request()` free function. "Service" existed only as a naming convention nobody had written down, and the transport (`client.ts`) kept its token provider and base URL in module-level mutable state — which is why three tests had to resort to `vi.resetModules()` + dynamic `import()` just to observe a different base URL.

User decisions taken before implementation (see Debug Log D1):
1. Models are **interfaces, one per file** — not runtime classes.
2. Services are **classes with an injected `HttpClient`**, each exporting a singleton.
3. Tracked as this new story rather than reopening 5-22.

## Acceptance Criteria

1. **One model per file, grouped by domain.** Every DTO in the former `shared/api/types.ts` becomes its own file under `shared/api/models/`, named after the type in camelCase, filed under a domain folder — `auth/` (4), `destination/` (5), `trip/` (9), `common/` (1). Requests and responses sit together inside a domain rather than being split by direction. `types.ts` is deleted. Models stay `interface`/`type` only — no runtime code, so the compiled bundle gains nothing.
2. **`HttpClient` is a class and the only caller of `fetch`.** It owns base URL, headers, bearer token, ProblemDetails→`ApiError` parsing, and the 204/empty-body handling. Base URL is constructor-injectable, defaulting to `VITE_API_BASE_URL`. The token provider and 401 handler become instance state instead of module state.
3. **`ApiError` moves to its own module** (`shared/api/apiError.ts`) so importing the error type does not pull in the transport.
4. **One service class per feature**, each taking `HttpClient` via constructor and exporting a singleton bound to the shared client: `AuthService`/`authService`, `DestinationService`/`destinationService`, `TripService`/`tripService`. The three `api.ts` files are deleted.
5. **Layering is strict.** `component → hooks.ts → service → HttpClient → fetch`. No component calls `fetch` or a service directly where a hook exists; no service imports TanStack Query.
6. **Service tests use dependency injection, not module mocking.** Each service has a test that constructs `new XService(new HttpClient(''))` against a stubbed `fetch` and asserts the real URL and verb. `AuthService`, previously untested, gains one.
7. **The same-origin contract survives and is tested more directly.** The `VITE_API_BASE_URL` empty/undefined → relative-path behavior documented in `FE/README.md` keeps its coverage; the `vi.resetModules()` + dynamic-import workaround is replaced by direct constructor assertions.
8. **Zero behavior change.** No route, rendered output, ARIA attribute, CSS class, HTTP URL, verb, request body, or query key changes. Every pre-existing test assertion stays byte-identical; only import specifiers, `vi.mock` factories, and the derivation of mock variables may change.
9. **`npm test` ≥ 352, `npm run lint` 0 warnings, `npm run build` clean.**
10. **`FE/README.md` documents the three-tier API layer**, the one-model-per-file rule, the DI-vs-module-mocking test split, and the `erasableSyntaxOnly` constraint that forbids parameter properties.

## Tasks / Subtasks

- [x] **Task 1 — Split the models** (AC: 1)
  - [x] Create 19 files under `shared/api/models/`, one per DTO, preserving each shape verbatim.
  - [x] Delete `shared/api/types.ts`; expand all 37 consumers' barrel imports to per-model specifiers.
  - [x] Group the 19 files into `auth/`, `destination/`, `trip/`, `common/` and re-point all 37 consumers again (see D7).
- [x] **Task 2 — Extract `ApiError` and build `HttpClient`** (AC: 2, 3, 7)
  - [x] Move `ApiError` to `shared/api/apiError.ts` and re-point every consumer.
  - [x] Convert `request()` + module state into the `HttpClient` class; export the `httpClient` singleton; delete `client.ts`.
  - [x] Port `client.test.ts` → `httpClient.test.ts`, replacing the `resetModules` base-URL tests with constructor-based ones plus an env-default group.
  - [x] Point `AuthProvider` at `httpClient.setTokenProvider`/`setOnUnauthorized`.
- [x] **Task 3 — Create the three services** (AC: 4, 5)
  - [x] `authService.ts`, `destinationService.ts`, `tripService.ts` — class + injected client + singleton.
  - [x] Re-point `hooks.ts` in both features and the four auth pages; delete all three `api.ts`.
- [x] **Task 4 — Migrate the mocks** (AC: 8)
  - [x] Rewrite 19 `vi.mock` factories from loose-function shape to the service-singleton shape.
  - [x] Keep every local mock **variable name** unchanged so no test body or assertion is edited.
- [x] **Task 5 — Service tests via DI** (AC: 6)
  - [x] Port `api.test.ts` → `destinationService.test.ts` / `tripService.test.ts`, constructing the service with a real `HttpClient('')`.
  - [x] Add `authService.test.ts` (7 cases) for the previously untested service.
- [x] **Task 6 — Document and validate** (AC: 9, 10)
  - [x] Add the "The API layer" section to `FE/README.md`; update the structure list.
  - [x] `npm test` / `npm run lint` / `npm run build`.

## Dev Agent Record

### Agent Model Used

claude-opus-5[1m] (Claude Code)

### Debug Log References

| Check | Before (5-22 exit) | After |
|---|---|---|
| Tests | 350 / 34 files | **359 / 35 files** |
| Lint | 0 warnings | **0 warnings** |
| Build | clean, 1138 modules | clean, 1139 modules |
| Files in `shared/api/` | 3 (`client`, `types`, `client.test`) | 23 (`apiError`, `httpClient`, `httpClient.test`, `models/{auth,destination,trip,common}/` × 19) |
| Feature API modules | 3 × `api.ts` (loose functions) | 3 × `<name>Service.ts` (class + singleton) |
| `fetch` call sites | 1 (`client.ts`) | 1 (`httpClient.ts`) |

**D1 — three design decisions were put to the user before any file was written.** Runtime model classes were costed and **rejected by the user**: they would require mapping every JSON response into an instance, and TanStack Query would then cache instances rather than plain data — a behavior change, against AC 8. Services as "renamed function modules" were also offered and rejected in favour of injectable classes. The DI choice is the load-bearing one; see D3.

**D2 — `erasableSyntaxOnly: true` forbids parameter properties.** `constructor(private readonly http: HttpClient)` is a compile error under this repo's `tsconfig.app.json`. Every service declares the field and assigns it in the constructor body instead. Found by reading the config before writing the services, not by a failed build.

**D3 — the injected client removed a test workaround rather than adding one.** The old `client.ts` held `baseUrl` in module scope, so the three base-URL tests could only observe a change through `vi.stubEnv` + `vi.resetModules()` + a dynamic `import()`. With the base URL as a constructor parameter these become plain `new HttpClient('http://api.example.com/')` assertions. The env-default path is **still covered** — a separate `HttpClient default base URL` group stubs the env and constructs with no argument, preserving the empty/undefined → relative-path contract that `FE/README.md` calls load-bearing for the container's same-origin model. Net +2 tests, and the same three behaviors are pinned.

**D4 — mock migration was designed to leave assertions untouched.** The factories changed shape (`{ getTrip: vi.fn() }` → `{ tripService: { getById: vi.fn() } }`) and four trip methods were renamed (`getTrips`→`getAll`, `getTrip`→`getById`, `createTrip`→`create`, `updateTrip`→`update`), but each file's local mock **variable** kept its old name by re-deriving it: `const getTripMock = vi.mocked(tripService.getById)`. Consequence: across 19 test files, **not one `expect(...)` inside a test body was rewritten** for the shape change. The only assertion-line edits were 8 `expect(bareFn)` → `expect(tripService.method)` references in `hooks.test.tsx`, which were unavoidable — the identifier itself ceased to exist — and they assert the same call with the same arguments.

**D5 — two pre-existing `api.test.ts` files were discovered mid-task and became the DI showcase.** They stubbed global `fetch` and asserted exact URLs. Ported to `destinationService.test.ts` / `tripService.test.ts` by constructing `new XService(new HttpClient(''))`; **every URL and body assertion in them is byte-identical to before**, which is the strongest single piece of evidence that the wire contract did not move.

**D6 — mechanical sweeps were scripted, and one script bug is worth recording.** The type-import expansion across 37 files and the 19 mock-factory rewrites were done with Node scripts rather than by hand. The first attempt silently processed only 10 files because `git ls-files` returns paths that did not match the working directory; the second used a directory walk. A later `file.split(sep)` bug surfaced only as a thrown error naming the file — it failed loudly rather than writing something wrong. Both scripts are throwaway; the diff is the deliverable.

**D7 — models were regrouped into domain folders on user feedback, and the top-level-layers alternative was declined by the user.** A first pass left the 19 model files flat in `models/`. The user asked for clearer folder division. Three layouts were costed: (a) domain sub-folders inside `models/`, keeping the feature-based layout; (b) top-level `src/models/` + `src/services/` with `features/` reduced to UI; (c) a full return to type-based folders (`models/`, `services/`, `pages/`, `components/`, `hooks/`). Options (b) and (c) were presented **with the conflict stated**: `epic-5-context.md` is the only normative statement on FE organization and requires feature-based layout under `features/*`, and (c) would reverse story 5-17 outright. **The user chose (a)**, so the feature-based structure stands and only `models/` gained internal structure. Requests and responses were also deliberately **not** split into `requests/`/`responses/` — a model is looked up by the domain it belongs to. One placement worth recording: `destination.ts` sits in `destination/` even though `trip/` consumes it (`trip.ts` and `tripDay.ts` import `../destination/destination`), because a model is filed where it is defined, not where it is used. Both consumer sweeps were scripted and verified by grep for leftover flat paths returning empty.

### Completion Notes List

**The HTTP boundary is now a real seam.** Before, "mock the API" meant `vi.mock('./api')` — replacing a module and hoping the replacement matched. Now a service can be handed a different `HttpClient` and tested against a stubbed `fetch` with no module machinery, which is exactly what the three service tests do. The singleton is still there for production wiring, so no component or hook needed a container or provider.

**Layering is enforced by structure, not convention.** `fetch` appears in exactly one file (`httpClient.ts`). No service imports TanStack Query; no component imports a service where a hook exists. The four auth pages call `authService` directly, as they did before with the loose functions — those flows have no query cache.

**Zero behavior change, with the URL assertions as proof.** The ported service tests assert every endpoint URL, verb, and serialized body exactly as the old `api.test.ts` did, unedited. All 350 tests carried over from 5-22 still pass. `tsc -b` was clean at every checkpoint, and `noUnusedLocals` again did useful work by flagging leftovers the sweep created.

**Model files are types only — verified, not assumed.** The production bundle went 1138 → 1139 modules and its size did not move (670 kB), consistent with 19 type-only modules emitting no JavaScript. Had these been runtime classes the bundle and every fetch path would have changed.

**A tension with 5-22's no-barrels rule, resolved in favour of the rule.** 19 model files mean a consumer needing five DTOs now writes five import lines. A `models/index.ts` barrel would collapse that and, being type-only, carries none of the cycle risk that made barrels load-bearing to avoid for features. It was **not** added: 5-22 documented "there are none, and their absence is load-bearing", and quietly carving out an exception days later would make the rule advisory. If barrels are wanted, that should be a deliberate decision with the type-only carve-out written into `FE/README.md` — not a side effect of this story. Flagging it explicitly as the most arguable call here.

**Live browser smoke pass NOT performed** — same as 5-22, and stated plainly for the same reason (jsdom has twice missed defects in this repo). Every HTTP call in the app now flows through rewritten code, so despite the green suite this is the story that most deserves a manual pass: log in, search a city, open a destination, add to a trip, and drag within the planner. The 401 path deserves particular attention because the unauthorized handler moved from module state to instance state on the singleton.

**Not touched:** backend, `package.json` (no new dependency), any component's rendered output, and the uncommitted `SearchPage.module.css` hero-banner edit.

### File List

**New — models (19, all type-only, grouped by domain)**
- `FE/src/shared/api/models/auth/{authResponse,loginRequest,registerRequest,resendVerificationRequest}.ts`
- `FE/src/shared/api/models/destination/{attraction,attractionFilters,destination,destinationDetails,locationSearchResult}.ts`
- `FE/src/shared/api/models/trip/{trip,tripDay,createTripRequest,updateTripRequest,addDestinationToDayRequest,addSavedPlaceRequest,scheduleSavedPlaceRequest,reorderDayDestinationsRequest,moveDestinationRequest}.ts`
- `FE/src/shared/api/models/common/messageResponse.ts`

**New — transport and services**
- `FE/src/shared/api/apiError.ts`
- `FE/src/shared/api/httpClient.ts`
- `FE/src/features/auth/authService.ts`
- `FE/src/features/auth/authService.test.ts`
- `FE/src/features/destinations/destinationService.ts`
- `FE/src/features/trips/tripService.ts`

**Renamed**
- `FE/src/shared/api/client.test.ts` → `FE/src/shared/api/httpClient.test.ts`
- `FE/src/features/destinations/api.test.ts` → `FE/src/features/destinations/destinationService.test.ts`
- `FE/src/features/trips/api.test.ts` → `FE/src/features/trips/tripService.test.ts`

**Deleted**
- `FE/src/shared/api/types.ts`
- `FE/src/shared/api/client.ts`
- `FE/src/features/auth/api.ts`
- `FE/src/features/destinations/api.ts`
- `FE/src/features/trips/api.ts`

**Modified** — 37 files had type imports expanded and/or `ApiError` re-pointed; 19 test files had `vi.mock` factories migrated. Notably: `FE/README.md`, `features/auth/AuthContext.tsx`, `features/auth/{LoginPage,RegisterPage,VerifyEmailPage}.tsx`, `features/destinations/hooks.ts`, `features/trips/hooks.ts`, `features/auth/AuthContext.test.tsx`, `features/trips/hooks.test.tsx`, `app/{AppLayout,routes}.test.tsx`.

## Change Log

| Date | Change |
|---|---|
| 2026-07-28 | Split `shared/api/types.ts` into 19 one-per-file type modules under `shared/api/models/`; extracted `ApiError`; replaced the `request()` free function and its module state with an injectable `HttpClient` class + shared singleton; replaced the three `api.ts` function modules with `AuthService`/`DestinationService`/`TripService` classes taking the client via constructor; migrated 19 `vi.mock` factories without editing any test assertion; ported the two `api.test.ts` files to DI-based service tests and added `authService.test.ts`; documented the three-tier API layer in `FE/README.md`. Tests 350 → 359, lint 0, build clean. |
