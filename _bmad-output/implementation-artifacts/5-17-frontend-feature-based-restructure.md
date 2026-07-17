---
baseline_commit: 62a5407f690a3b565a46c1d87e68bda2693ef8e4
---

# Story 5.17: Restructure the frontend into a feature-based project layout

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer maintaining the TripPlanner frontend,
I want the `FE/src` tree reorganized from a type-based layout (`api/`, `components/`, `hooks/`, `pages/`, `auth/`, `trips/`, `layout/`, `lib/`, `utils/`) into a feature-based layout (`app/`, `shared/`, `features/{auth,destinations,trips}/`) with a `@/` path alias,
so that related code lives together, generic UI is separated from feature code, imports are stable and readable, and the codebase is easier to navigate and maintain — with zero behavior change and every existing test still passing.

## Acceptance Criteria

1. A `@/` path alias resolving to `FE/src` is configured in both `FE/vite.config.ts` (`resolve.alias`) and `FE/tsconfig.app.json` (`compilerOptions.baseUrl` + `paths`), so `@/x` resolves to `src/x` at both build/dev time (Vite) and type-check time (tsc). The alias also resolves inside Vitest (which reads `vite.config.ts`).
2. The `FE/src` tree is reorganized into exactly these top-level groups, with files moved (preserving git history via `git mv` where possible) — no file's contents change except its import statements:
   - `src/app/` — application shell and wiring: `main.tsx`, `index.css`, `routes.tsx`, `routes.test.tsx`, `AppLayout.tsx`, `AppLayout.module.css`, `AppLayout.test.tsx`, `NotFoundPage.tsx`.
   - `src/shared/api/` — transport-agnostic API core: `client.ts`, `client.test.ts`, `types.ts`.
   - `src/shared/lib/` — cross-feature utilities: `dates.ts`, `dates.test.ts`, `useDebouncedValue.ts`, `useDebouncedValue.test.tsx`.
   - `src/shared/ui/` — generic presentational primitives used across features: `Modal.tsx`, `Dialog.module.css`, `ConfirmDialog.tsx`, `Skeleton.module.css`, `PageState.module.css`.
   - `src/features/auth/` — `AuthContext.tsx(+test)`, `RequireAuth.tsx(+test)`, `api.ts` (from `api/auth.ts`), `LoginPage.tsx(+test)`, `RegisterPage.tsx(+test)`, `VerifyEmailPage.tsx(+test)`, `PasswordField.tsx`, `authIcons.tsx`, `AuthForm.module.css`, `AuthShell.tsx`, `AuthShell.module.css`.
   - `src/features/destinations/` — `SearchPage.tsx(+test)`, `SearchPage.module.css`, `searchState.ts`, `DestinationDetailsPage.tsx(+test)`, `DestinationDetailsPage.module.css`, `AttractionCard.tsx(+test+css)`, `AttractionHero.tsx(+test+css)`, `AttractionMap.tsx(+test+css)`, `NearbyRail.tsx(+test+css)`, `LocationResultList.tsx(+css)`, `SuggestionDropdown.tsx(+css)`, `suggestionOption.ts`, `StarRating.tsx(+css)`, `hooks.ts` (from `hooks/locations.ts`), `api.ts` (from `api/locations.ts`), `openNow.ts(+test)`.
   - `src/features/trips/` — `TripsPage.tsx(+test+css)`, `TripPlannerPage.tsx(+test+css)`, `AddToTripContext.tsx(+test)`, `AddToTripDialog.tsx(+test+css)`, `CreateTripForm.tsx`, `EditTripForm.tsx`, `tripFormValidation.ts`, `TripForm.module.css`, `hooks.ts` (from `hooks/trips.ts`), `api.ts` (from `api/trips.ts`).
   - `src/test/` — unchanged (`setup.ts` stays; `vite.config.ts`'s `setupFiles` path still resolves).
   - After the move, the old top-level folders `api/`, `components/`, `hooks/`, `lib/`, `utils/`, `auth/`, `trips/`, `layout/`, and `pages/` no longer exist under `src/`.
3. All imports are updated so the project compiles and runs: every import that crosses a feature/shared/app boundary uses the `@/` alias (e.g. `@/shared/api/client`, `@/features/trips/hooks`); imports between files that remain in the same folder stay relative (`./`). No import points at a non-existent old path, and there are no unused imports.
4. `FE/index.html`'s module entry `<script src="/src/main.tsx">` is updated to the new `main.tsx` location (`/src/app/main.tsx`), and `main.tsx`'s `./routes` / `./index.css` imports resolve to their new co-located paths.
5. `npm test` (Vitest) passes with the same test count as the baseline (224 tests across 24 files) — no test is deleted, skipped, or rewritten beyond its import lines, and no new behavior is introduced. Test-file moves keep each test co-located with its subject.
6. `npm run build` (`tsc -b && vite build`) succeeds with no type errors (the alias resolves under `tsc`), and `npm run lint` (oxlint) reports no new errors versus baseline.
7. The `## Structure` section of `FE/README.md` is updated to describe the new `app/` / `shared/` / `features/` layout and the `@/` alias, replacing the old `src/api`, `src/auth`, `src/layout`, `src/pages` descriptions.
8. No runtime behavior, styling, routing, or API contract changes: the app renders the same routes (`/`, `/search`, `/attractions/:xid`, `/trips`, `/trips/:id`, `/register`, `/login`, `/verify-email`, `*`) with the same components and the same behavior. This is a pure structural refactor.

## Tasks / Subtasks

- [x] Task 1: Configure the `@/` path alias (AC: #1)
  - [x] Add `resolve.alias` mapping `@` → `<rootDir>/src` in `FE/vite.config.ts` (using `fileURLToPath(new URL('./src', import.meta.url))` or `path.resolve`)
  - [x] Add `"paths": { "@/*": ["./src/*"] }` to `compilerOptions` in `FE/tsconfig.app.json` (dropped `baseUrl` — deprecated in TS 6+; `paths` resolves relative to the tsconfig)
  - [x] Confirm `tsc -b` and `vitest` both still start (alias wired before any files move)
- [x] Task 2: Create the new folder tree and move files (AC: #2)
  - [x] Create `src/app/`, `src/shared/api/`, `src/shared/lib/`, `src/shared/ui/`, `src/features/auth/`, `src/features/destinations/`, `src/features/trips/`
  - [x] `git mv` each file to its destination per AC #2, renaming `api/auth.ts`→`features/auth/api.ts`, `api/locations.ts`→`features/destinations/api.ts`, `api/trips.ts`→`features/trips/api.ts`, `hooks/locations.ts`→`features/destinations/hooks.ts`, `hooks/trips.ts`→`features/trips/hooks.ts` (and their `.test` siblings; `api/locations.test.ts`→`features/destinations/api.test.ts`, `api/trips.test.ts`→`features/trips/api.test.ts`)
  - [x] Verify the old `api/ components/ hooks/ lib/ utils/ auth/ trips/ layout/ pages/` directories are gone
- [x] Task 3: Rewrite imports (AC: #3, #4)
  - [x] Update `FE/index.html` entry to `/src/app/main.tsx`
  - [x] Rewrite every cross-folder import to its `@/` alias target; keep same-folder imports relative
  - [x] Update renamed-module imports (`../api/auth`→`@/features/auth/api`, `../api/trips`→`@/features/trips/api`, `../api/locations`→`@/features/destinations/api`, `../hooks/trips`→`@/features/trips/hooks`, `../hooks/locations`→`@/features/destinations/hooks`) and the matching `vi.mock(...)` paths in tests
  - [x] Grep for any remaining `from '\.\./(api|components|hooks|lib|utils|auth|trips|layout|pages)/` — must be zero (confirmed zero)
- [x] Task 4: Verify green (AC: #5, #6)
  - [x] `npm test` → 224 passing, 24 files
  - [x] `npm run build` → succeeds, no type errors
  - [x] `npm run lint` → no new errors vs baseline (2 pre-existing fast-refresh warnings only)
- [x] Task 5: Update docs (AC: #7)
  - [x] Rewrite the `## Structure` section of `FE/README.md` for the new layout + `@/` alias

## Dev Notes

- **Pure structural refactor — behavior frozen.** The safety net is the existing 224-test suite: it must stay green with only import lines changed. Do not "improve" any component while moving it; do not merge or split modules beyond the file moves listed. If a test needs any change beyond its import statements, stop — that signals an unintended behavior change.
- **Alias first, then move.** Configure `@/` (Task 1) before moving files so that as imports are rewritten they resolve immediately. Vitest reads `vite.config.ts`, so the single Vite alias covers dev, build, and test; `tsc` needs its own `paths` entry (Task 1's tsconfig change).
- **Import convention:** cross-boundary → `@/` absolute; same-folder siblings (a component and its `.module.css`, its `.test`, a co-located helper) → keep `./`. This keeps co-located groups portable and makes cross-feature dependencies visually obvious. Example: `features/destinations/AttractionCard.tsx` keeps `import styles from './AttractionCard.module.css'` and `import StarRating from './StarRating'` (both moved to the same folder), but `SearchPage.tsx` changes `../components/Skeleton.module.css` → `@/shared/ui/Skeleton.module.css` and `../hooks/useDebouncedValue` → `@/shared/lib/useDebouncedValue`.
- **Renamed modules:** the three `api/*.ts` files that are feature-specific become each feature's `api.ts`; the two feature hook files become each feature's `hooks.ts`. The generic `api/client.ts` + `api/types.ts` stay together in `shared/api/`; `hooks/useDebouncedValue` is generic → `shared/lib/`.
- **Placement rationale for judgment calls:**
  - `ConfirmDialog` and `Modal` are generic dialogs → `shared/ui/` (even though only trips currently uses `ConfirmDialog`). `ConfirmDialog` imports `Modal` + `Dialog.module.css`, all in `shared/ui/`, so its imports stay `./`.
  - `StarRating` currently has a single consumer (`AttractionCard`) → keep in `features/destinations/` (avoid premature promotion to `shared/ui`).
  - `PageState.module.css` is shared by several pages across features → `shared/ui/`.
  - `openNow` has one consumer (`DestinationDetailsPage`) → `features/destinations/`.
  - `NotFoundPage` + `AppLayout` are app-shell concerns → `app/`.
  - `AuthShell` is auth-only layout → `features/auth/` (not `app/`).
- **Entry point moves to `app/`.** `main.tsx` → `src/app/main.tsx`; update `index.html`'s `<script src>` accordingly. `index.css` moves next to it so `main.tsx`'s `import './index.css'` stays relative.
- **No new dependencies, no config beyond the alias.** `package.json` deps unchanged. `@types/node` is already a devDependency, so `fileURLToPath`/`path` in `vite.config.ts` is available.
- **Testing standards:** Vitest + Testing Library (existing convention). No new tests are required — this story's correctness is proven by the unchanged suite passing, plus `tsc` build and lint. Keep every test file co-located with the module it tests.
- **Not in scope:** adding features, changing component APIs, restyling, introducing barrel `index.ts` files (not requested; can be a follow-up), touching the backend, or altering routes.

### Project Structure Notes

- Target tree:
  ```
  src/
    app/         main.tsx, index.css, routes(.test).tsx, AppLayout(.module.css/.test), NotFoundPage.tsx
    shared/
      api/       client(.test).ts, types.ts
      lib/       dates(.test).ts, useDebouncedValue(.test).tsx
      ui/        Modal.tsx, Dialog.module.css, ConfirmDialog.tsx, Skeleton.module.css, PageState.module.css
    features/
      auth/          AuthContext, RequireAuth, api.ts, Login/Register/VerifyEmail pages, PasswordField, authIcons, AuthForm.module.css, AuthShell(.module.css)
      destinations/  Search/DestinationDetails pages, Attraction* + NearbyRail + LocationResultList + SuggestionDropdown + StarRating, suggestionOption, searchState, hooks.ts, api.ts, openNow(.test)
      trips/         Trips/TripPlanner pages, AddToTripContext, AddToTripDialog, Create/EditTripForm, tripFormValidation, TripForm.module.css, hooks.ts, api.ts
    test/        setup.ts
  ```
- Config touched: `vite.config.ts`, `tsconfig.app.json`, `index.html`, `README.md`. No `package.json` change.

### References

- [Source: FE/vite.config.ts] — where the Vite alias is added; Vitest inherits it
- [Source: FE/tsconfig.app.json] — where `baseUrl` + `paths` are added for tsc
- [Source: FE/src/routes.tsx] — the route table that must render identically after the move
- [Source: FE/README.md] — `## Structure` section to update

## Dev Agent Record

### Context Reference

- Baseline: 224 FE tests across 24 files passing, build + lint green, before any change.

### Implementation Plan

1. Wire the `@/` → `src` alias in Vite + tsconfig first, so imports resolve as they are rewritten.
2. `git mv` every file into `app/ shared/{api,lib,ui} features/{auth,destinations,trips}` (history preserved).
3. Rewrite imports mechanically with a Node script that resolves each relative specifier against the file's *original* location, looks up its new location, and emits `./name` for same-folder targets or `@/…` for cross-boundary ones. A second pass extended the same script to `vi.mock`/`vi.doMock`/`vi.importActual` path strings.
4. Verify with the existing suite (must stay 224/224), `tsc -b && vite build`, and oxlint.

### Debug Log

- First `npm test` after the move failed 118 tests with `getTripsMock.mockReset is not a function`: the mechanical rewrite had updated `import`/`from` specifiers but not the `vi.mock('…')` path strings, so mocks no longer matched the (now re-pathed) modules under test and the real implementations were used. Fixed by extending the rewrite regex to `vi.mock(`/`vi.doMock(`/`vi.importActual(` and re-running (idempotent for already-rewritten `@/` and same-folder `./` specifiers). Re-run: 224/224 green.
- `baseUrl` in `tsconfig.app.json` emitted a TS 6 deprecation error (would fail `tsc -b`); removed it and pointed `paths` at `./src/*`, which modern TS resolves relative to the config file.

### Completion Notes

- Pure structural refactor: no component, hook, style, route, or API-contract logic changed — only file locations, import specifiers, the Vite/tsconfig alias, `index.html`'s entry, and docs. The unchanged 224-test suite passing (same count, same files) is the behavior-frozen proof, alongside a green type-checked production build.
- Convention applied: cross-boundary imports use `@/…`; same-folder siblings (component ↔ its `.module.css`/`.test`/co-located helper) stay `./`. Feature-specific `api/*.ts` became each feature's `api.ts`; the two feature hook files became each feature's `hooks.ts`; generic `client.ts`/`types.ts` live in `shared/api`, `useDebouncedValue` in `shared/lib`.
- Judgment calls: `Modal`+`ConfirmDialog`+shared CSS → `shared/ui`; `StarRating`/`openNow` kept in `features/destinations` (single consumers); `AppLayout`+`NotFoundPage` → `app/`; `AuthShell` → `features/auth`.
- Verification: `npm test` 224/224 (24 files); `npm run build` (tsc + vite) clean; `npm run lint` clean apart from 2 pre-existing `only-export-components` fast-refresh warnings (`AuthContext`, `AddToTripContext`) that predate this story. Browser/Playwright visual QA not run this session (no browser tooling); low risk for a location-only refactor since routing is exercised by `app/routes.test.tsx` and the build resolves the real `index.html` entry graph.

### File List

- Config/entry (modified): `FE/vite.config.ts`, `FE/tsconfig.app.json`, `FE/index.html`, `FE/README.md`
- Moved to `src/app/`: `main.tsx`, `index.css`, `routes.tsx`, `routes.test.tsx`, `AppLayout.tsx`, `AppLayout.module.css`, `AppLayout.test.tsx`, `NotFoundPage.tsx`
- Moved to `src/shared/api/`: `client.ts`, `client.test.ts`, `types.ts`
- Moved to `src/shared/lib/`: `dates.ts`, `dates.test.ts`, `useDebouncedValue.ts`, `useDebouncedValue.test.tsx`
- Moved to `src/shared/ui/`: `Modal.tsx`, `Dialog.module.css`, `ConfirmDialog.tsx`, `Skeleton.module.css`, `PageState.module.css`
- Moved to `src/features/auth/`: `AuthContext.tsx(+test)`, `RequireAuth.tsx(+test)`, `api.ts` (was `api/auth.ts`), `LoginPage.tsx(+test)`, `RegisterPage.tsx(+test)`, `VerifyEmailPage.tsx(+test)`, `PasswordField.tsx`, `authIcons.tsx`, `AuthForm.module.css`, `AuthShell.tsx`, `AuthShell.module.css`
- Moved to `src/features/destinations/`: `SearchPage.tsx(+test+css)`, `searchState.ts`, `DestinationDetailsPage.tsx(+test+css)`, `AttractionCard.tsx(+test+css)`, `AttractionHero.tsx(+test+css)`, `AttractionMap.tsx(+test+css)`, `NearbyRail.tsx(+test+css)`, `LocationResultList.tsx(+css)`, `SuggestionDropdown.tsx(+css)`, `suggestionOption.ts`, `StarRating.tsx(+css)`, `hooks.ts` (was `hooks/locations.ts`), `api.ts` (was `api/locations.ts`), `api.test.ts` (was `api/locations.test.ts`), `openNow.ts(+test)`
- Moved to `src/features/trips/`: `TripsPage.tsx(+test+css)`, `TripPlannerPage.tsx(+test+css)`, `AddToTripContext.tsx(+test)`, `AddToTripDialog.tsx(+test+css)`, `CreateTripForm.tsx`, `EditTripForm.tsx`, `tripFormValidation.ts`, `TripForm.module.css`, `hooks.ts(+test)` (was `hooks/trips.ts(+test)`), `api.ts` (was `api/trips.ts`), `api.test.ts` (was `api/trips.test.ts`)
- Removed (now-empty) dirs: `src/api`, `src/components`, `src/hooks`, `src/lib`, `src/utils`, `src/auth`, `src/trips`, `src/layout`, `src/pages`
- All moved `.ts/.tsx` files had import specifiers (and, in tests, `vi.mock` paths) rewritten to the `@/` alias / same-folder relative convention.

## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-07-17 | 0.1 | Story drafted for feature-based frontend restructure | Quanhvo |
| 2026-07-17 | 1.0 | Implemented: `@/` alias + files moved into `app/`/`shared/`/`features/`; imports rewritten; 224/224 tests, build & lint green; README updated. Status → review | Amelia (dev) |
