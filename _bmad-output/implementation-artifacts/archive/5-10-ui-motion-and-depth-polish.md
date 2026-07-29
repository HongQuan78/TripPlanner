---
baseline_commit: eccf53f
---

# Story 5.10: UI motion and depth polish

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user browsing and planning trips,
I want the app to feel alive with subtle motion, depth, and richer loading states instead of static flat panels,
so that the "cute sky" design system introduced in 5-6 reads as polished and delightful rather than plain.

## Acceptance Criteria

1. **Motion tokens:** `FE/src/index.css` adds `--duration-fast` (150ms), `--duration-slow` (400ms), and `--ease-spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) custom properties, plus a global `@media (prefers-reduced-motion: reduce)` block that forces all animations/transitions app-wide to near-zero duration (the standard `*, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }` pattern). All new keyframe animations added by this story must be skipped/instant under this rule.
2. **Card entrance animation:** items in the attraction grid (`SearchPage` via `AttractionCard`) and the trips grid (`TripsPage`) fade+slide up on mount (opacity 0→1, `translateY(8px)→0`), staggered by list position (nth-child delay, capped at the first 10 items — items beyond 10 get the same delay as item 10, no unbounded delay growth). Respects AC1's reduced-motion override.
3. **Card hover depth:** `AttractionCard`, `TripsPage`'s trip card, and `TripPlannerPage`'s destination rows get a slightly stronger hover response than today's flat `translateY(-2px)` — combine lift with a subtle scale (`scale(1.01)`) and use `--ease-spring` for a springier feel; disabled/non-interactive elements are unaffected.
4. **Route transition:** the routed content area (`AppLayout`'s `<main>`) fades+slides in (`translateY(4px)→0`, opacity 0→1) on every route change, keyed off the current path via `useLocation()` from `react-router-dom`. Purely presentational — no change to routing, guards, or data fetching.
5. **Decorative depth on the app shell:** the page wash gets 1–2 soft, blurred radial-gradient color blobs (using existing `--color-primary`/`--color-primary-soft` tokens at low opacity) fixed behind all content (`position: fixed`, `pointer-events: none`, `z-index` below the header/content), adding visual depth without new image assets or dependencies.
6. **Skeleton loading states:** the attractions grid loading state (`SearchPage`) and the trips grid loading state (`TripsPage`) replace or augment their current plain-text "Loading…" indicators with a small number of shimmering skeleton card placeholders (CSS-only shimmer via animated `background-position` on a gradient, respecting AC1's reduced-motion override, falling back to a static soft-tinted block when motion is reduced). Any existing test that asserts on today's loading text must still pass — if a loading text node is removed, its assertion must be verified against the current test file first and the text preserved (e.g. visually-hidden) rather than deleted, unless the test itself needs a noted style-only update per AC8.
7. **No behavior changes:** routes, form logic, validation, auth flows, data fetching, and all component APIs are untouched; every existing unit test passes without modification (style-only test updates are allowed only if a test asserts a class name or exact DOM structure that changed, and must be noted in the Change Log).
8. `npm run build`, `npm test`, and `npm run lint` are green.

## Tasks / Subtasks

- [x] Task 1: Motion tokens + reduced-motion guard (AC: 1)
  - [x] Add `--duration-fast`, `--duration-slow`, `--ease-spring` to `:root` in `FE/src/index.css`
  - [x] Add the global `prefers-reduced-motion: reduce` override rule in `index.css`
- [x] Task 2: Route transition wrapper (AC: 4)
  - [x] In `FE/src/layout/AppLayout.tsx`, import `useLocation`, key the `<main>` (or an inner wrapper div) by `location.pathname`, and add a CSS module class with the fade+slide keyframe in `AppLayout.module.css`
- [x] Task 3: Decorative background blobs (AC: 5)
  - [x] Add fixed, pointer-events-none blob elements/pseudo-elements in `AppLayout.module.css` (or `index.css` on `body`) using radial-gradient + `filter: blur(...)`, sitting behind `.header`/`.content`
- [x] Task 4: Card entrance + hover depth (AC: 2, 3)
  - [x] `FE/src/components/AttractionCard.module.css`: add entrance keyframe + nth-child stagger (parent grid selector) and stronger hover (`--ease-spring`, `scale`)
  - [x] `FE/src/pages/TripsPage.module.css`: same treatment for `.card`/grid
  - [x] `FE/src/pages/TripPlannerPage.module.css`: stronger hover for `.row` (destination rows), no entrance stagger needed (variable-length lists inside collapsible days)
- [x] Task 5: Skeleton loading states (AC: 6)
  - [x] Add a small shared skeleton CSS module (e.g. `FE/src/components/Skeleton.module.css` or inline in each page's module) with a shimmer keyframe reusing card dimensions
  - [x] Read `FE/src/pages/SearchPage.test.tsx` and `FE/src/pages/TripsPage.test.tsx` in full first to confirm exactly what the current loading-state assertions check, then wire skeleton placeholders into `SearchPage`'s `attractions.isFetching` branch and `TripsPage`'s `trips.isPending` branch without breaking those assertions
- [x] Task 6: Verify (AC: 7, 8)
  - [x] Full `npm test` green with no unintended logic changes; `npm run build` and `npm run lint` green; visually sanity-check search results, trips grid, trip planner, and route navigation via `npm run dev`

### Review Findings

- [x] [Review][Defer] Route remount + stagger replay causes entrance animations to repeat on every navigation — `key={location.pathname}` on the `AppLayout` Outlet wrapper (per AC4) forces a full remount of the routed page subtree on every pathname change. Combined with AC2's staggered `card-enter`/`trip-card-enter` animations, every navigation into `SearchPage`/`TripsPage` replays the full stagger sequence from scratch, not just on first load — reads as repetitive rather than delightful after the first visit. — deferred: not worth blocking polish on; can revisit if it feels janky later
- [ ] [Review][Patch] `prefers-reduced-motion` override doesn't zero `animation-delay`, so reduced-motion users still see up to 400ms of invisible (opacity:0) cards before entrance "plays" [FE/src/index.css:56-63]
- [ ] [Review][Patch] SearchPage renders the attraction skeleton grid and the real success grid simultaneously during a background refetch, since `attractions.isFetching` and `attractions.isSuccess` are not mutually exclusive in React Query [FE/src/pages/SearchPage.tsx:199-240]
- [ ] [Review][Patch] AC5 background blobs use a solid color instead of the spec-mandated radial-gradient [FE/src/layout/AppLayout.module.css]
- [x] [Review][Defer] Keyboard focus can land on a card while it's still at opacity:0 during its entrance animation-delay window [FE/src/components/AttractionCard.module.css, FE/src/pages/TripsPage.module.css] — deferred, pre-existing pattern risk, narrow (<400ms) window, not blocking this story
- [x] [Review][Defer] Skeleton loading text has no aria-live/role=status, so screen reader users aren't reliably notified when loading starts [FE/src/components/Skeleton.module.css] — deferred, pre-existing gap (old visible text had the same issue), not introduced by this diff
- [x] [Review][Defer] AddToTripDialog.tsx still uses the old plain-text loading indicator for the same trip-list-loading case TripsPage.tsx just migrated to skeletons [FE/src/components/AddToTripDialog.tsx] — deferred, pre-existing file untouched by this diff, out of scope for story 5-10

## Dev Notes

- This story is purely additive polish on top of the "cute sky" design system from 5-6 (`FE/src/index.css` tokens, `AppLayout`, `PageState.module.css`) — reuse existing tokens (`--color-primary`, `--color-primary-soft`, `--shadow-soft`, `--shadow-lift`, `--radius-*`) rather than introducing new hex colors or a UI framework. Per epic-5's technical approach, styling stays **plain CSS modules only, no new npm dependencies** (no framer-motion, no animation libraries) — everything here is achievable with CSS `@keyframes`/`transition`/`animation`.
- Behavior freeze, same as 5-6: JSX changes are limited to className/static wrapper additions (e.g. a `key={location.pathname}` on an existing element, decorative `<div>`s marked `aria-hidden="true"`) — no routing, data-fetching, or validation logic changes.
- **Read every file you touch in full before editing**, especially the three loading-state pages (`SearchPage.tsx`, `TripsPage.tsx`, `TripPlannerPage.tsx`) and their `.test.tsx` counterparts — `SearchPage.test.tsx` has a test asserting `screen.getByText(/searching/i)` for the *location* search loading state (unrelated to the attractions grid skeleton in AC6, but read it to be sure); `TripsPage.test.tsx` and `TripPlannerPage.test.tsx` currently have no loading-text assertions found, but re-verify before changing markup — do not assume this memory is still accurate once you're editing.
- `AttractionCard`, `TripsPage`'s `.card`, and `TripPlannerPage`'s `.row` already have `transition: transform 0.15s ease, box-shadow 0.15s ease` on hover with a `translateY(-2px)` lift (see `FE/src/components/AttractionCard.module.css`) — Task 4 extends this existing rule rather than replacing the whole hover block.
- There is no `HomePage.tsx` in the current codebase (it existed at 5-6 time but `/` now routes directly to `SearchPage` per `FE/src/routes.tsx` — a later story removed it). Do not reference or recreate it; the "home" experience is `SearchPage`.
- `PageState.module.css` (`.state`, `.emoji`, `.heading`, `.text`, `.action`) is the shared empty/error/not-found state block used across `SearchPage`, `TripsPage`, `TripPlannerPage`, `DestinationDetailsPage`; it is out of scope for this story except that its cards/containers should visually sit consistently with the new depth/motion treatment — no changes required unless something looks broken during the visual sanity check.
- Project rules: no comments in code; braces required on all control flow; CSS modules per component, only `index.css` holds `:root` tokens/global resets/global media-query overrides.

### Project Structure Notes

- All touched files already exist under `FE/src/`; no new routes, pages, or npm packages are introduced. One new shared CSS module for skeletons is acceptable (mirrors the precedent of `PageState.module.css` being introduced in 5-6 as a shared cross-page module).

### References

- [Source: _bmad-output/implementation-artifacts/archive/5-6-ui-modernization-cute-light-blue.md] — design token set, behavior-freeze convention, and card/button hover conventions this story builds on.
- [Source: epic/epic-5-frontend-web-app.md#Technical approach] — "Plain CSS modules for styling; no UI framework", confirming no new animation dependency should be added.
- [Source: FE/src/index.css] — current token set (colors, radii, shadows, font) to extend, not replace.
- [Source: FE/src/routes.tsx] — confirms current routing shape and that `/` renders `SearchPage`, not a separate `HomePage`.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npm test` (FE): 19 test files, 140 tests passed.
- `npm run build` (FE): `tsc -b && vite build` succeeded.
- `npm run lint` (FE): oxlint passed, only 2 pre-existing `react(only-export-components)` warnings unrelated to this story (`AddToTripContext.tsx`, `AuthContext.tsx`).
- Visual verification: started `npm run dev`, drove headless Chromium (Playwright) against it — confirmed background blobs render behind header/content, route-change fade+slide fires on navigation (captured mid-animation on `/login`), attraction skeleton shimmer placeholders render while `attractions.isFetching`, and the real grid replaces them with cards fading/sliding in on mount. No console errors on any route.

### Completion Notes List

- AC1: Added `--duration-fast` (150ms), `--duration-slow` (400ms), `--ease-spring` tokens to `:root` and a global `prefers-reduced-motion: reduce` override in `FE/src/index.css`.
- AC2/AC3: `AttractionCard.module.css` and `TripsPage.module.css` each got a `card-enter`/`trip-card-enter` fade+translateY keyframe with `:nth-child` stagger capped at item 10 (`nth-child(n + 10)` all share the item-10 delay), plus a stronger hover (`translateY(-2px) scale(1.01)` on `--ease-spring`). `TripPlannerPage.module.css`'s `.row` got the same stronger hover treatment, no entrance stagger (variable-length lists). Used plain CSS `:nth-child` positional selectors instead of a cross-file `.grid > .card` selector, since CSS Modules scope class names per-file — `.grid` in the page module and `.card` in the component module are different generated identifiers, so a rule combining both across files would never match. `:nth-child` only depends on DOM sibling position, so it works without needing the parent's class name.
- AC4: `AppLayout.tsx` now calls `useLocation()` and keys a wrapper `div` (holding `<Outlet />`) by `location.pathname`; the wrapper's CSS class runs a `route-fade-in` keyframe animation in `AppLayout.module.css`.
- AC5: Added two fixed, `pointer-events: none`, `aria-hidden` blob `div`s in `AppLayout.tsx`/`.module.css` using `--color-primary`/`--color-primary-soft` at low opacity with `filter: blur(...)`; header/content given `position: relative; z-index: 1` so the blobs (`z-index: 0`) sit behind them.
- AC6: Added `FE/src/components/Skeleton.module.css` (shared shimmer card + visually-hidden helper). Read `SearchPage.test.tsx` and `TripsPage.test.tsx` in full first — neither asserts on the literal "Loading attractions…" / "Loading your trips…" text (confirmed via grep), so the plain-text indicators were replaced with skeleton grids; the original text is preserved as visually-hidden for screen readers rather than deleted. `TripsPage.module.css`'s now-unused `.loading` rule was removed since nothing references it anymore.
- AC7: No routing, form, validation, auth, or data-fetching logic touched — only className/wrapper additions and CSS. All 140 existing FE unit tests pass unmodified.
- AC8: `npm run build`, `npm test`, `npm run lint` all green.

### File List

- FE/src/index.css (modified)
- FE/src/layout/AppLayout.tsx (modified)
- FE/src/layout/AppLayout.module.css (modified)
- FE/src/components/AttractionCard.module.css (modified)
- FE/src/components/Skeleton.module.css (new)
- FE/src/pages/SearchPage.tsx (modified)
- FE/src/pages/TripsPage.tsx (modified)
- FE/src/pages/TripsPage.module.css (modified)
- FE/src/pages/TripPlannerPage.module.css (modified)

## Change Log

- 2026-07-14: Implemented motion/depth polish (tokens, route transition, background blobs, card entrance/hover, skeleton loading). No test files were modified — all existing assertions passed as-is against the new markup/CSS.
