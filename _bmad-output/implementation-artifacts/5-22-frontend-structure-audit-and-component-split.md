---
baseline_commit: e128b0a324a164cd7630aaf81b2764c1201c1b13
---

# Story 5.22: Frontend Structure Audit and Component Split

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer maintaining the TripPlanner frontend,
I want the oversized page components split into co-located single-purpose files, genuinely-shared code promoted to `shared/`, and the module-boundary conventions written down and lint-enforced,
so that a change to one surface no longer requires reading a 640-line file, and the next person can tell where a new file belongs without archaeology.

## Context

Story 5-17 moved `FE/src` from a type-based layout to a feature-based one (`app/`, `shared/{api,lib,ui}`, `features/{auth,destinations,trips}`) with a `@/` alias. That story moved files **without changing their contents** — by design. The result is a correct folder skeleton still holding the pre-restructure component shapes: four page files carry 2–4 React components each, and 12 files exceed 200 lines.

This story is the follow-through: same discipline (**behavior frozen**), but the unit of work is *splitting a file*, not *moving one*.

## Acceptance Criteria

### Behavior freeze (the safety net — applies to every AC below)

1. **Zero behavior change.** No route, rendered output, ARIA attribute, **authored CSS class selector name**, API call, query key, or component public prop signature changes. This is a structural refactor only. (Note: AC 12 moves class *definitions* between CSS-module files, which changes the generated hashed names. That is expected and harmless — no test asserts a generated name.)
2. **Test suite holds.** `npm test` passes with **≥ 341 tests** (the measured baseline; see Dev Notes). No test is deleted, skipped, or `.only`'d. A test file may change **only** its import statements and its `describe`/file organization — **if a test's assertions or setup need editing to pass, STOP**: that signals an unintended behavior change.
3. **`npm run build` (`tsc -b && vite build`) is clean.** `tsconfig.app.json` has `noUnusedLocals` and `noUnusedParameters` on, so any import or local left dangling by a split is a hard type error, not a warning.

### Lint: close the two long-standing warnings

4. **`npm run lint` reports 0 warnings** (down from the 2 pre-existing ones — the first time this repo has hit zero). Achieved by splitting each provider file so the component and the hook no longer share a module:
   - `features/auth/AuthContext.tsx:99` — `export function useAuth()` co-located with `AuthProvider`
   - `features/trips/AddToTripContext.tsx:57` — `export function useAddToTrip()` co-located with `AddToTripProvider`

   Follow the precedent already in the codebase (5-7's `suggestionOption.ts`, 5-20's `popularCities.ts`): the context object + hook move to a sibling non-component `.ts` module; the `.tsx` keeps only the provider component.

   **Do NOT rename the `.tsx` files.** `AuthContext.tsx` and `AddToTripContext.tsx` keep their names (and so do their test files); the new siblings are `authContext.ts` and `addToTripContext.ts`. Renaming the `.tsx` would additionally invalidate every provider import and every `vi.mock` string below, for no benefit.

   **Exact partition for `AuthContext.tsx`** (it has four exportable things, and getting this wrong either fails `tsc -b` or re-introduces the warning):
   - → new `authContext.ts`: the context object, `AuthContextValue` (currently **not** exported at `AuthContext.tsx:16` — the split forces exporting it, since it is `useAuth`'s declared return type), and `useAuth`.
   - → stays in `AuthContext.tsx`: `AuthProvider`, `AUTH_STORAGE_KEY` (`:8` — a string literal, so `allowConstantExport` covers it; it is read by `readStoredSession` at `:27` *and* imported by `AuthContext.test.tsx:6`), and the `AuthUser` type (`:10` — type exports are ignored by the rule). Apply the same shape to `AddToTripContext.tsx`.

5. **Every reference to a moved symbol is re-pointed — including the `vi.mock` path strings, which TypeScript does NOT check.** This is precisely the 5-17 trap in Dev Notes: the import specifier gets rewritten, the mock string does not, the mock silently stops matching the module under test, the real implementation runs, and `tsc -b` stays green. **Work from a grep of the old module path, not from `import` lines**, and treat the lists below as a checklist to confirm against — not as a guarantee of exhaustiveness.

   **Source — `useAuth` (5):** `auth/LoginPage.tsx:6`, `auth/RequireAuth.tsx:3`, `destinations/DestinationDetailsPage.tsx:6`, `trips/AddToTripContext.tsx:4`, `app/AppLayout.tsx:2`
   **Source — `useAddToTrip` (2):** `destinations/AttractionCard.tsx:4`, `destinations/DestinationDetailsPage.tsx:11`
   **Test import specifiers:** `auth/AuthContext.test.tsx` (imports `useAuth` **and** `AUTH_STORAGE_KEY`, which stay in different modules after the split — see AC 4's partition), `trips/AddToTripContext.test.tsx:25`, `destinations/AttractionCard.test.tsx:11`, `destinations/DestinationDetailsPage.test.tsx:35`
   **`vi.mock` path strings — 4 files:** `destinations/AttractionCard.test.tsx:7`, `destinations/DestinationDetailsPage.test.tsx:15,24`, `destinations/SearchPage.test.tsx:18`, `trips/AddToTripContext.test.tsx:20`

   ⚠️ **`destinations/SearchPage.test.tsx:18` mocks `AddToTripContext` and is the easiest to miss** — a 1298-line file whose subject is unrelated to auth or trips.
   ⚠️ **These factories replace the WHOLE module.** `DestinationDetailsPage.test.tsx:24` mocks `AuthContext` down to just `useAuth`, while the same file renders the *real* `AddToTripProvider`, whose internal `useAuth` call (`AddToTripContext.tsx:16`) resolves through that mock. Move `useAuth` without re-pointing that string and the real hook runs → `useAuth must be used within an AuthProvider`.

   **Leave these alone — they import *providers*, not hooks**, and must keep pointing at the `.tsx`: `app/routes.tsx:3` (`AuthProvider`), `app/routes.tsx:14` (`AddToTripProvider`), `destinations/DestinationDetailsPage.test.tsx:36` (`AddToTripProvider`).

### Component extraction — one component per file

6. **`features/trips/TripPlannerPage.tsx` (640 lines) is split.** The three inline sub-components move to their own co-located files, each keeping its current props and markup verbatim:
   - `DestinationRow` (currently L46–158) → `DestinationRow.tsx`
   - `SavedPlaceCard` (L160–232) → `SavedPlaceCard.tsx`
   - `DaySegment` (L234–324) → `DaySegment.tsx` (imports `DestinationRow`)

   Resulting `TripPlannerPage.tsx` is **≤ 360 lines**. (Arithmetic, so you can check yourself rather than guess: head L1–45 + tail L326–640 = 360, minus 12 import lines that become unused — the whole `@dnd-kit/sortable` block, `useDraggable`/`useDroppable`, `CSS`, `StarRating`, `formatSegmentDate`, `formatCategory` — plus 2 new imports = **350**. The AC allows 360 so that a formatting choice on the multi-line import blocks cannot decide pass/fail; there is no Prettier config in `FE/`.)
7. **`features/destinations/SearchPage.tsx` (534 lines) is split.** At minimum:
   - `SearchGlyph` (L56–63) and `HistoryGlyph` (L65–81) → a `searchIcons.tsx` module, mirroring the existing `features/auth/authIcons.tsx` convention.
   - The non-literal data constants `TILE_GRADIENTS` (L28–35) and `HOW_IT_WORKS` (L37–47) → a plain `.ts` data module. **This is mandatory, not stylistic** — see the oxlint constraint in Dev Notes. Note this module **must import `./SearchPage.module.css`**, because `TILE_GRADIENTS` holds `styles.tileA … styles.tileF` references. That is legal here (`allowArbitraryExtensions: true` + `types: ["vite/client"]`) and is the one sanctioned exception to "`.ts` siblings hold data and logic only".
   - `errorMessage` (L49–54) → a sibling `.ts` helper.

   **There is no line-count target for `SearchPage.tsx`, deliberately.** The four extractions above are the contiguous block L28–82 — 55 lines out, ~3 import lines in, leaving **≈ 482**. No further import becomes unused (`styles` and `ApiError` are both still needed), so extraction alone cannot go lower. The only remaining mass is the combobox block at L142–252, and extracting that is **explicitly Out of Scope** (it is the deferred `useLocationCombobox` story). Do not invent additional JSX sub-components to chase a number — ~482 is the correct, expected outcome of this story.
8. **`features/destinations/DestinationDetailsPage.tsx` (293 lines) is split.** `OpenNowBadge` (L17–31) and `InfoRow` (L33–66) move to their own files. Both keep importing `./DestinationDetailsPage.module.css` for their `styles` — do not split that stylesheet (same co-ownership rationale as Task 4).
9. **`features/trips/DateField.tsx` (204 lines) sheds its non-component helpers.** The two ISO↔Date converters — `isoToDate` (L18–24) and `dateToISO` (L26–31) — move to `shared/lib/dates.ts`, which is their natural home and today has no such converters. `CalendarIcon` (L33–41) moves to an icon module.

    **`clamp` (L11–16) stays put.** Despite sitting immediately above the two converters, it is a generic numeric clamp used only for popover viewport math (`DateField.tsx:82`, `:91`) — it has nothing to do with dates, and filing it in `dates.ts` would mis-classify it permanently. Leave it in `DateField.tsx` (or `shared/lib/math.ts` if you prefer, but not in `dates.ts`). Of the three helpers occupying L11–31, take **only** the latter two.

### Shared-layer correctness

10. **`features/destinations/StarRating.tsx` + `StarRating.module.css` move to `shared/ui/`.** It is 13 lines of pure presentation consumed by two features (`destinations/AttractionCard.tsx:5` and `trips/TripPlannerPage.tsx:25`), so it currently forces a `trips → destinations` import. Moving it removes that leg of the bidirectional feature dependency (see AC 13).
11. **The duplicated image-load guard is de-duplicated into one `shared/lib` hook — across exactly TWO sites.** The `imgRef.current?.complete` + `useEffect` cache-hit shape appears in precisely two places (`grep -rn "\.complete" src/` returns exactly these two hits): `destinations/AttractionCard.tsx:23` and `destinations/PopularTile.tsx:20`. Extract to a single `useImageLoaded`-style hook in `shared/lib/` (with its own test) and route both through it.

    🚫 **Do NOT touch `AttractionHero.tsx`.** It contains no `useRef`, no `useEffect`, and no `.complete` check. Being a multi-image carousel, it uses a structurally different model — per-URL `loadedImages`/`failedImages` arrays (`AttractionHero.tsx:23-24`) with `isLoading` derived at `:30` — and there is no single `imgRef` to check. Converting it to this hook would be a **behavior change, violating AC 1**.

    **Behavior must be byte-identical** at both sites: this guard exists because 5-14's review found a cached image strands the shimmer at `opacity: 0`, and 5-20 had to re-add it. The two regression tests that must pass **unedited** are identified by their `it` strings, not their file paths (Task 8 relocates one of them): `AttractionCard.test.tsx:165`, and **`"shows a cache-hit photograph without waiting for a load event"`** (currently `SearchPage.test.tsx:593` — there is no `PopularTile.test.tsx`).
12. **`PopularTile.tsx` stops importing its parent's stylesheet.** `PopularTile.tsx:3` currently reaches into `SearchPage.module.css` (573 lines) for its classes. Give `PopularTile` its own co-located `.module.css` holding the five classes it actually consumes — `tile`, `tileImage`, `tileImageHidden`, `tileScrim`, `tileName` — removed from `SearchPage.module.css`.

    ⚠️ **`tileA`–`tileF` (`SearchPage.module.css:385-437`) must STAY in `SearchPage.module.css`.** They are the gradient classes referenced by `TILE_GRADIENTS` and reach `PopularTile` as the `gradientClass` **prop**, not via its own stylesheet. Moving them breaks AC 7's data module.
    Safe to proceed: PopularTile's classes live at `SearchPage.module.css:313-437` while the uncommitted working-tree edit is confined to `.heroSurface` (~L17–23), so **there is no hunk overlap** with the file you were told not to disturb. Verified: no compound `.tile.tileA` selectors exist, so the cascade will not break.

### Boundaries, conventions, and documentation

13. **No new cross-feature imports are introduced, and the count goes down by exactly one.** Baseline measured with `grep -rn "@/features/" FE/src/features/` is **10**: 5 source import specifiers + 5 test-file references (the test 5 are a mix of import specifiers and `vi.mock` path strings — see AC 5). AC 10 must remove the `trips → destinations/StarRating` edge, so the after-count is **9**. Use that exact grep in Task 10, and report import-specifier and `vi.mock`-string counts separately, because Task 8 replicates mock strings across the new test files and a naive total will look like it went *up*. The remaining `destinations → trips/AddToTripContext` and `destinations → auth/AuthContext` edges are **accepted and left in place** — see Out of Scope.
14. **No barrel (`index.ts`) files are introduced.** The codebase has zero today, and adding them would create a genuine import cycle: a `destinations` barrel re-exports `AttractionCard` → `trips/AddToTripContext`, while a `trips` barrel re-exports `TripPlannerPage` → `destinations/StarRating`. The absence of barrels is load-bearing. If a future story wants them, AC 10 must land first.
15. **`FE/README.md`'s `## Structure` section is updated and made accurate.** It is currently stale: it omits `shared/lib/formatCategory.ts`, still says `features/trips` holds "trip forms" (5-21 deleted `CreateTripForm.tsx`), and — most importantly — does not document the plain-`.ts` data/logic module convention that the codebase has actually converged on (`popularCities`, `recentSearches`, `attractionFilters`, `searchState`, `suggestionOption`, `openNow`, `dragActions`, `tripFormValidation`, `formatCategory`). Document: the `@/` vs `./` import rule, one-component-per-file, the `.ts`-sibling rule for data/logic, where a new file belongs, and the no-barrels decision with its cycle rationale.

### Test-file organization

16. **`features/destinations/SearchPage.test.tsx` (1298 lines) is split into focused sibling test files** along its **7** existing top-level `describe` seams: `typed submit` (L130), `dropdown dismissal` (L272), `auto-suggest` (L368), `landing body` (L519), `chosen city` (L806), `filters and sort` (L934), `pagination / load more` (L1128). Group them into 4–5 files as you see fit. Every `it` block keeps its assertions **verbatim** and the total test count must not drop.

    **This split is NOT a pure line-for-line relocation, and the story does not pretend otherwise.** `SearchPage.test.tsx:1-128` is a 128-line preamble: imports, **two `vi.mock` factories** (L13 and L18), fixtures, five helpers (`renderPage`, `typeInput`, `findDropdown`, `chooseSuggestion`, `sleep`), and a `beforeEach`. Required handling:
    - **`vi.mock` is per-file and cannot be shared via import.** Both factories must be **replicated verbatim** in every new file that needs them. Same for `beforeEach`.
    - **The five helpers go into one shared `searchPageTestUtils.tsx`** imported by each new file — do not duplicate them.
    - Consequence: **total line count across the new files will rise by roughly 300–500.** That is correct and expected; the win is that no single file is 1298 lines. Do not treat the increase as a failure.

## Tasks / Subtasks

- [x] **Task 1 — Pin the baseline** (AC: 1, 2, 3, 4)
  - [x] Run `npm test`, `npm run lint`, `npm run build` in `FE/` and record exact numbers in the Debug Log **before touching any file**. Expected: 341 tests / 29 files, 2 lint warnings, build clean.
  - [x] Confirm the only uncommitted change is `features/destinations/SearchPage.module.css` (an unrelated local hero-banner experiment). **Do not stage, revert, or include it in the File List.**

- [x] **Task 2 — Close the two lint warnings** (AC: 4, 5, 1, 2, 3)
  - [x] Split `features/auth/AuthContext.tsx` → new `authContext.ts` per AC 4's exact partition. Do **not** rename the `.tsx`.
  - [x] Split `features/trips/AddToTripContext.tsx` → new `addToTripContext.ts` the same way.
  - [x] Re-point every reference in AC 5's checklist — including the **`vi.mock` path strings in 4 files**, which `tsc -b` cannot catch. Drive this from `grep -rn "AuthContext\|AddToTripContext" FE/src/`, not from `import` lines, and confirm zero stale hits when done.
  - [x] Leave the 3 provider-import sites pointing at the `.tsx` (AC 5).
  - [x] Verify `npm run lint` reports **0** warnings and the suite is still green.

- [x] **Task 3 — Promote `StarRating` to `shared/ui`** (AC: 10, 13, 1, 2, 3)
  - [x] `git mv` both files; update the two consumer imports to `@/shared/ui/StarRating`.
  - [x] Re-grep for cross-feature imports and confirm the `trips → destinations` edge is gone.

- [x] **Task 4 — Split `TripPlannerPage.tsx`** (AC: 6, 1, 2, 3)
  - [x] Extract `DestinationRow`, `SavedPlaceCard`, `DaySegment` to co-located files, markup and props verbatim.
  - [x] Keep `./TripPlannerPage.module.css` as the style source for all three (do **not** split the CSS in this task — see Dev Notes on CSS-module co-ownership).
  - [x] Use `export default` for each extracted component — that is the existing repo convention (all three are currently non-exported locals, as are `OpenNowBadge`/`InfoRow`/`CalendarIcon` in Task 6; do not mix export styles).
  - [x] Confirm `TripPlannerPage.tsx` ≤ 360 lines and both `TripPlannerPage.test.tsx` and `TripPlannerPage.dnd.test.tsx` pass with import-only edits.

- [x] **Task 5 — Split `SearchPage.tsx`** (AC: 7, 12, 1, 2, 3)
  - [x] Extract `SearchGlyph` + `HistoryGlyph` → `searchIcons.tsx`.
  - [x] Extract `TILE_GRADIENTS` + `HOW_IT_WORKS` → a data `.ts`; extract `errorMessage` → a helper `.ts`.
  - [x] Give `PopularTile` its own `.module.css`, moving only its five classes out of `SearchPage.module.css` and **leaving `tileA`–`tileF` behind** (AC 12). Leave the uncommitted `.heroSurface` hunk intact (Task 1) — it does not overlap.
  - [x] Confirm lint is still 0. **`SearchPage.tsx` will be ≈ 482 lines — that is the expected result, not a failure** (AC 7). Do not extract the combobox block to shrink it further.

- [x] **Task 6 — Split `DestinationDetailsPage.tsx` and `DateField.tsx`** (AC: 8, 9, 1, 2, 3)
  - [x] Extract `OpenNowBadge` and `InfoRow` to their own files, both still importing `./DestinationDetailsPage.module.css`.
  - [x] Move **only** `isoToDate` and `dateToISO` into `shared/lib/dates.ts`; add unit tests for the two of them in the existing `dates.test.ts`. **Leave `clamp` out of `dates.ts`** (AC 9).
  - [x] Extract `CalendarIcon`.

- [x] **Task 7 — De-duplicate the image-load guard** (AC: 11, 1, 2, 3)
  - [x] **Must run BEFORE Task 8**, because one of its two regression tests currently lives in `SearchPage.test.tsx` and Task 8 relocates it.
  - [x] Add the hook to `shared/lib/` with its own test file.
  - [x] Route **only** `AttractionCard` and `PopularTile` through it. **Do not touch `AttractionHero.tsx`** (AC 11).
  - [x] Confirm both regression tests pass **unedited**: `AttractionCard.test.tsx:165` and the `it` titled "shows a cache-hit photograph without waiting for a load event". They are the net for the 5-14 defect.

- [x] **Task 8 — Split `SearchPage.test.tsx`** (AC: 16, 2)
  - [x] Runs **after** Task 7.
  - [x] Split along the 7 enumerated `describe` seams; move `it` blocks verbatim.
  - [x] Replicate both `vi.mock` factories and the `beforeEach` in each new file; put the five helpers in one shared `searchPageTestUtils.tsx`.
  - [x] Confirm the total test count did not drop. Expect total lines to **rise** by ~300–500 — that is correct.

- [x] **Task 9 — Document the conventions** (AC: 15, 14)
  - [x] Rewrite `FE/README.md` `## Structure`, including the no-barrels decision + cycle rationale and the `.ts`-sibling rule.
  - [x] Record the final structure snapshot (file counts, largest-file table) in the Completion Notes so the next audit has a baseline.

- [x] **Task 10 — Final validation** (AC: 1, 2, 3, 4, 13)
  - [x] `npm test` ≥ 341 passing; `npm run lint` **0** warnings; `npm run build` clean.
  - [x] Re-run the cross-feature grep with **exactly** `grep -rn "@/features/" FE/src/features/` and record before/after. Baseline is 10 (5 import specifiers + 5 `vi.mock` strings); AC 10 removes the `StarRating` one, so expect **9**. Counting only `import` lines will make the number look like it went *up* once Task 8 replicates mock strings across files — use the grep above, and report import-specifier and `vi.mock`-string counts separately.
  - [x] Confirm the only non-test files over 400 lines are the two deliberate, documented exceptions: **`SearchPage.tsx` (≈482, awaiting the deferred `useLocationCombobox` story)** and the three CSS modules (`SearchPage.module.css`, `TripPlannerPage.module.css`, `DestinationDetailsPage.module.css`), which this story does not split.

## Dev Notes

### Measured baseline (verified in this session, not inherited from story notes)

| Check | Value |
|---|---|
| Tests | **341 passing / 29 files** (note: story 5-21 and later notes cite 335/28 — that number is stale) |
| Lint | **exactly 2 warnings**, both `react(only-export-components)` |
| Build | clean; 1125 modules; **single 670 kB JS chunk** (no code-splitting) |
| `FE/src` | 101 files |
| Working tree | one unrelated uncommitted edit: `features/destinations/SearchPage.module.css` |

### THE critical constraint: oxlint's `only-export-components` is narrower than it looks

`FE/.oxlintrc.json` sets `react/only-export-components: ["warn", { "allowConstantExport": true }]`. The rule's actual behavior, empirically confirmed:

| exported alongside a component in a `.tsx` | warns? |
|---|---|
| `export const X = 'literal'` (string/number) | **no** — `allowConstantExport` covers it |
| `export const X = [{...}]` (array/object) | **YES** — `allowConstantExport` does *not* extend to non-literal initializers |
| a second component | no |
| a hook or helper function | **YES** |

**Consequence:** any recommendation of the form "just co-locate this small constant next to its only consumer" is *invalid* when the consumer is a `.tsx` exporting a component and the value is not a literal. This is exactly why 5-20 was forced to split `POPULAR_CITIES` (an array of records) into `popularCities.ts`. It is also why AC 7's data-module extraction is mandatory rather than cosmetic.

The repo's de-facto rule — enforced by a linter, never written down until now (AC 15) — is: **data and logic live in plain `.ts` siblings; `.tsx` files export components (and literal constants) only.** Existing examples to imitate: `popularCities.ts`, `recentSearches.ts`, `attractionFilters.ts`, `searchState.ts`, `suggestionOption.ts`, `openNow.ts`, `dragActions.ts`, `tripFormValidation.ts`, `formatCategory.ts`.

Also: `react/rules-of-hooks` is at **error**. Extracting hook-bearing logic into a custom hook is safe only if the new function is named `use*`.

**Every story since 5-8 has reported against "exactly 2 warnings" as a hard regression gate.** This story is the one that moves the gate to 0 — so say so explicitly in the Completion Notes, or the next story will read 0 as a measurement error.

### Cross-feature import baseline (grep-verified)

Source (5):
- `destinations/AttractionCard.tsx:4` → `@/features/trips/AddToTripContext`
- `destinations/DestinationDetailsPage.tsx:6` → `@/features/auth/AuthContext`
- `destinations/DestinationDetailsPage.tsx:11` → `@/features/trips/AddToTripContext`
- `trips/AddToTripContext.tsx:4` → `@/features/auth/AuthContext`
- `trips/TripPlannerPage.tsx:25` → `@/features/destinations/StarRating` ← **AC 10 removes this one**

Tests (5): `AttractionCard.test.tsx:11`, `DestinationDetailsPage.test.tsx:34,35,36`, `AddToTripContext.test.tsx:25`.

`app/ → features/` imports are the composition root and are architecturally correct — leave them.

### Files being modified — current state and what must be preserved

**`features/trips/TripPlannerPage.tsx` (640)** — 4 components, 19 hook call sites. `DestinationRow` L46–158 uses `useSortable`; `SavedPlaceCard` L160–232 uses `useDraggable`; `DaySegment` L234–324 uses `useDroppable`. All three are `@dnd-kit` primitives — **the drag-and-drop wiring is the fragile part**. `TripPlannerPage.dnd.test.tsx` captures `DndContext.onDragEnd` and is the only guard on the move-vs-reorder branch; it must pass unedited. Preserve `key={...}` props exactly (5-15's review found an unkeyed component reused an instance across navigation).

**`features/destinations/SearchPage.tsx` (534)** — 3 components, 18 hook call sites (10 × `useState`). 5-19 called this file "the centre of the whole change." It carries a full combobox ARIA contract that 5-19 was required to preserve **attribute-for-attribute**, including a known deferred gap (`role="combobox"` is never declared even though the rest of the set is present) and a load-bearing quirk (suggestion options activate on `onMouseDown` only, because `onClick` would lose the blur race). **Do not "fix" either while splitting** — both are tracked in `deferred-work.md` and changing them is a behavior change.

**`features/destinations/DestinationDetailsPage.tsx` (293)** — `InfoRow`'s empty-state branch fires only on `value === null` (not `undefined`); this is a known pre-existing quirk shared by all three call sites. Preserve it. Open/closed rendering is repeated three times: two-way (`open` vs `closed`, under an `openNow !== null` guard) at L228–241 and L257–273, and three-way inside `OpenNowBadge`. Extracting `OpenNowBadge` does **not** license unifying the other two.

**`features/trips/DateField.tsx` (204)** — the `useLayoutEffect` at L67–100 is 34 lines of viewport math added by 5-21's reopened Task 7. Read the split precisely, because it is easy to "fix" the working half: the popover's **dimensions** come from `offsetWidth`/`offsetHeight` with `getBoundingClientRect()` only as a fallback (`:80-81`), because the popover is measured mid-entry-animation and its rect is the *transformed* box (`scale(0.98)` ate 7 of an 8px gutter). The **control's position** legitimately uses `getBoundingClientRect()` (`:78-79`). A unit test pins the animated-vs-layout distinction. **Change neither.**

**`shared/ui/Modal.tsx` (75)** — uses `createPortal(document.body)` (5-21, D6) so the fixed overlay escapes `AppLayout`'s animated `transform` containing block. Its Escape handler calls `stopPropagation()`. Both are load-bearing; `Modal.tsx` has **no direct test file**, so it is only covered indirectly via dialog tests.

### Lessons from prior FE stories that apply directly

- **5-17's trap, which will recur here:** its mechanical import rewrite updated `import`/`from` specifiers but **not `vi.mock('…')` path strings**, so 118 tests failed with mocks silently pointing at the wrong module and the real implementations running. Any file you move or rename in Tasks 2/3/6 must have its `vi.mock`, `vi.doMock`, and `vi.importActual` path strings checked too. Grep for the old path, not just the old import.
- **Do not add `baseUrl` to `tsconfig.app.json`** — it emits a TS 6 deprecation error that fails `tsc -b`. `paths` resolves relative to the config file already.
- **jsdom has twice missed defects the real browser caught** in this codebase (5-21, both times). Green tests are necessary, not sufficient. Since this story claims zero behavior change, a live smoke pass over the four touched pages at 1440×900 and 390×844 is strongly recommended at review; state plainly in the Completion Notes whether it was performed.
- **Keep the diff reviewable.** 5-19's 98 KB diff exhausted all four adversarial review layers' budget; only one layer could be re-run against a split payload. **Commit each task separately** so review can proceed task-by-task.
- **Hazard:** 5-19's reverted implementation attempt survives only as `spec-5-19-attempted-implementation.patch` (95 KB) against commit `c44def9`, with a recorded note that it "will need rebasing if `FE/src/features/destinations/` moves on." Tasks 5 and 8 will invalidate it. That patch is dead weight, not a deliverable — note the invalidation in the Completion Notes rather than trying to preserve applicability.

### CSS-module co-ownership: a deliberate asymmetry between Task 4 and Task 5

Five `.module.css` files are already shared by multiple components (`AuthForm`, `SearchPage`, `TripForm`, `Dialog`, `PageState`, `Skeleton`). Sharing a stylesheet across a parent and its extracted children is **an accepted pattern here**, not a defect — so Task 4 extracts three components from `TripPlannerPage.tsx` while leaving all of them importing `./TripPlannerPage.module.css`. Splitting a 531-line stylesheet by hand is high-risk, low-reward, and would inflate the diff.

Task 5's `PopularTile` case is different and *is* a defect: `PopularTile` is not a child of `SearchPage`'s render tree in any structural sense — it is an independent 44-line component that reaches sideways into a 573-line stylesheet it does not own (`PopularTile.tsx:3`). Fixing that one is bounded and worth it.

### Testing standards

- Vitest 4 + jsdom, `@testing-library/react`, tests **co-located** with their subject (`Foo.tsx` / `Foo.test.tsx`). No `__tests__/` folder — do not introduce one.
- One config serves build and test: `vite.config.ts` imports `defineConfig` from `vitest/config`, so the `@/` alias is shared. `setupFiles: ['./src/test/setup.ts']`. No `globals: true` — import `describe`/`it`/`expect` explicitly.
- New tests are required only for genuinely new modules (the `shared/lib` image-load hook in Task 7, the date converters in Task 6). Extracted components are already covered by their parent's tests; adding duplicate coverage is not required by any AC.
- Coverage gaps worth knowing but **not in scope to fix**: `Modal.tsx`, `ConfirmDialog.tsx`, `AttractionControls.tsx`, `CreateTripDialog.tsx`, `EditTripForm.tsx`, and `destinations/hooks.ts` have no dedicated test files.

### Out of Scope — do NOT do these

These are real findings from the audit, deliberately excluded to keep this story reviewable and behavior-frozen. Several already have a home.

- **Collapsing `searchState.ts`'s three independently-settable fields** (`input`/`submittedQuery`/`selected`). This is the most explicitly-nominated FE refactor in the repo (`deferred-work.md` #1, from 5-19) but it is a **behavior change** and belongs in its own story.
- **Promoting `AuthContext` to `shared/`.** It is consumed by 2 features + `app/`, so there is a case for it — but session state is not a UI primitive, and the call deserves its own decision. The `destinations → auth` and `destinations → trips` import edges stay.
- **Code-splitting the 670 kB single-chunk bundle.** Real finding, pure performance, own story.
- **Adding a lint rule to enforce file size or detect import cycles.** Nothing currently enforces either; oxlint's rule availability for this needs investigation. Worth a follow-up story — note it, don't attempt it.
- **Extracting the larger custom hooks** the audit identified (`useLocationCombobox` from `SearchPage` L142–252, `useTripPlannerMutations` from `TripPlannerPage`, `useAttractionFilters`, `usePopoverPosition`, a shared `useDismissable` unifying the three outside-click implementations in `SearchPage`/`DateField`/`Modal`). These are the highest-value *next* step but they move stateful logic across module boundaries, which is where behavior breaks. Do the component splits first; hooks earn their own story. **`useLocationCombobox` is the reason `SearchPage.tsx` has no line target in AC 7.** This exclusion does **not** cover the 4-line stateless `useImageLoaded` guard that AC 11 mandates.
- **Unifying the four duplicated error-derivation ladders** in `TripPlannerPage.tsx` L416–444 and the matching one in `AddToTripDialog.tsx:54-61`.
- **Any item in `deferred-work.md`** — the `openNow` timezone/parsing gaps, `AttractionHero` image robustness, the login-401-destroys-session bug, the hidden-filter-controls-on-error bug, missing `aria-live` on reorder, `getNextPageParam` pagination gap. All out.
- **`VerifyEmailPage`'s 321-line standalone CSS module** duplicating the auth-card shell that `LoginPage`/`RegisterPage` share via `AuthForm.module.css`. Genuine duplication; a restyle, not a refactor.
- **The uncommitted `SearchPage.module.css` hero-banner edit.** Leave it exactly as found. It also contradicts `epic-5-context.md` ("Photography has not shipped — a committed gradient recipe stands in") and is covered by no story; surface it at review, do not adopt or revert it.
- **Backend, `epic/epic-5-frontend-web-app.md`, and `package.json`.** No new dependencies. If you think you need one, STOP and ask.

### Project Structure Notes

Target layout after this story — additions marked `+`, moves marked `→`:

```
src/
  app/            (unchanged)
  shared/
    api/          client.ts, types.ts
    lib/          dates.ts (+ isoToDate/dateToISO), formatCategory.ts,
                  useDebouncedValue.ts, + useImageLoaded hook (+ test)
    ui/           Modal, ConfirmDialog, Dialog/Skeleton/PageState styles,
                  → StarRating.tsx + StarRating.module.css
  features/
    auth/         AuthContext.tsx (provider only) + authContext.ts (context
                  + AuthContextValue + useAuth)   [filenames unchanged]
    destinations/ SearchPage (≈482, deliberate) + searchIcons + gradients/
                  data module + errorMessage helper,
                  DestinationDetailsPage + OpenNowBadge + InfoRow,
                  PopularTile + own .module.css,
                  SearchPage tests split by describe + searchPageTestUtils
    trips/        TripPlannerPage (≤360) + DestinationRow + SavedPlaceCard
                  + DaySegment, AddToTripContext.tsx (provider only) +
                  addToTripContext.ts, DateField (converters moved out,
                  clamp retained)
  test/           setup.ts
```

Conventions to hold (and to write into the README per AC 15): cross-boundary imports use `@/`; same-folder imports stay `./`; one component per `.tsx`; data and logic in plain `.ts` siblings; no barrel files.

Known variance accepted: `shared/lib/dates.ts`, `shared/lib/useDebouncedValue.ts`, and the `shared/ui` dialog cluster (`Modal`, `ConfirmDialog`, `Dialog.module.css`) each currently have **exactly one** consuming feature. 5-17 placed them there deliberately as generic infrastructure with no feature-specific coupling. **Do not demote them back into features** — that churn is explicitly unwanted, and Task 6 adds a second reason for `dates.ts` to be shared anyway.

### References

- [Source: `_bmad-output/implementation-artifacts/5-17-frontend-feature-based-restructure.md`] — the predecessor restructure: the layout it established, its "pure structural refactor / behavior frozen" discipline, its `vi.mock` rewrite trap, the `baseUrl` deprecation, its placement rationale, and its explicit deferral of barrel files.
- [Source: `_bmad-output/implementation-artifacts/5-20-popular-search-tile-images.md#Debug Log, D3] — the forced split of `POPULAR_CITIES`/`PopularTile` out of `SearchPage.tsx`, and the nomination of `SearchPage.test.tsx` for splitting.
- [Source: `_bmad-output/implementation-artifacts/5-21-create-trip-dialog.md`] — `Modal`'s `createPortal` fix, `DateField`'s `offsetWidth` measurement rationale, `CreateTripForm.tsx` deletion, and the "live browser caught what jsdom could not" learning (twice).
- [Source: `_bmad-output/implementation-artifacts/5-19-...` / `spec-5-19-landing-page-framed-editorial.md`] — `SearchPage` as the god-component, the preserved combobox ARIA contract, the review-budget blowout on a 98 KB diff, and the patch-file rebasing hazard.
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md`] — `searchState.ts` collapse (#1), the `onMouseDown`-only suggestion activation, the `role="combobox"` gap, `InfoRow`'s `null`-only branch, and the optimistic-rollback systemic pattern.
- [Source: `_bmad-output/implementation-artifacts/epic-5-context.md`] — the only normative statement on FE organization: "Code organization is feature-based under `FE/src/features/*` with shared concerns separate; keep new work inside that structure."
- [Source: `FE/.oxlintrc.json`] — `react/rules-of-hooks: error`; `react/only-export-components: ["warn", { allowConstantExport: true }]`.
- [Source: `FE/tsconfig.app.json`] — `paths: { "@/*": ["./src/*"] }`, no `baseUrl`, `noUnusedLocals`/`noUnusedParameters` on.
- [Source: `FE/vite.config.ts`] — one config for build + test; `@` alias; `setupFiles`.
- [Source: `CLAUDE.md#Repository Layout`, `#Commands`] — FE commands run from `FE/`; `npm test` is Vitest, `npm run lint` is oxlint.
- Note: no `prd.md`, `architecture.md`, or `epics.md` exists under `_bmad-output/planning-artifacts/` — epics live in `epic/` at the repo root, and `epic/epic-5-frontend-web-app.md` documents only stories 5-1…5-5 and says nothing about project structure. UX specs under `planning-artifacts/ux-designs/` are visual-design sources and carry no structural requirements, so none constrains this story.

## Dev Agent Record

### Agent Model Used

claude-opus-5[1m] (Claude Code, bmad-dev-story workflow)

### Debug Log References

**Baseline pinned at `e128b0a` before any file was touched** (Task 1):

| Check | Baseline | Final |
|---|---|---|
| Tests | 341 passing / 29 files | **350 passing / 34 files** |
| Lint (oxlint) | **2** warnings | **0** warnings |
| Build (`tsc -b && vite build`) | clean, 1125 modules, 670.47 kB JS | clean, 1138 modules, 670.55 kB JS |
| Cross-feature imports (source) | 5 | **4** |
| Cross-feature refs (test files) | 10 | 14 |
| Barrel files | 0 | 0 |

Working tree at start carried one unrelated uncommitted edit (`SearchPage.module.css` hero-banner experiment). It was left exactly as found — see File List.

**D1 — AC 4's sibling filenames are unusable on this platform; renamed to `useAuth.ts` / `useAddToTrip.ts`.**
The story mandated `authContext.ts` beside `AuthContext.tsx` (and `addToTripContext.ts` beside `AddToTripContext.tsx`). Implemented exactly as written, this produced **46 failures across 7 test files** — "Element type is invalid … got: undefined" wherever `AuthProvider`/`AddToTripProvider` was imported. Cause: Windows (and macOS) filesystems are case-insensitive, and Vite's resolver tries `.ts` before `.tsx`, so every surviving `from './AuthContext'` resolved to `authContext.ts`, a module that does not export the provider. The two names differ only by case and therefore cannot coexist. Renaming the siblings to `useAuth.ts` / `useAddToTrip.ts` fixed all 46 with no other change. Everything else in AC 4 was honoured: the `.tsx` files and their test files keep their names, and the partition is exactly as specified (context object + `AuthContextValue` + `useAuth` moved out; `AuthProvider`, `AUTH_STORAGE_KEY`, and the `AuthUser` type stayed). Recorded as a convention in `FE/README.md` so it is not re-attempted.

**D2 — AC 13's baseline of 10 cross-feature references is a miscount; the true figure is 15.**
`git grep "@/features/" -- FE/src/features` at `e128b0a` returns **15** lines: 5 source + 10 test. The story's list of "Tests (5)" omitted `AttractionCard.test.tsx:7`, `SearchPage.test.tsx:18`, `DestinationDetailsPage.test.tsx:15` and `:34`. The AC's *substance* is met and was measured the way it asks — separately per category:
- **Source import specifiers: 5 → 4.** Down by exactly one, and it is the intended one (`trips → destinations/StarRating`). The three survivors are the accepted `destinations → trips/useAddToTrip` (×2) and `destinations → auth/useAuth`, plus `trips/AddToTripContext.tsx → auth/useAuth`.
- **Test-file references: 10 → 14.** The entire +4 is Task 8 replicating the `vi.mock('@/features/trips/useAddToTrip')` factory into the 5 split files (1 → 5), which AC 16 mandates and AC 13 explicitly predicts. No new *kind* of cross-feature edge exists.

**D3 — three imports the story expected to survive became dangling and were removed.** `noUnusedLocals` caught each as a hard error, exactly as AC 3 anticipated: `Link` in `TripPlannerPage.tsx`, `ApiError` in `SearchPage.tsx` (AC 7 predicted it would still be needed — in fact `errorMessage` was its only consumer), and `ReactNode` in `DestinationDetailsPage.tsx`. `parseOpenNow` was *retained* in `DestinationDetailsPage.tsx`: besides `OpenNowBadge` it has a second, independent call site in the page body.

**D4 — one assertion in a NEW test file was corrected during authoring (no existing test was edited).** The first draft of `useImageLoaded.test.tsx` asserted "stays pending when there is no image url" and failed: in jsdom an `<img>` with no `src` reports `complete === true`. That is a probe artifact, not hook behavior — both real call sites gate the `<img>` behind a `showImage` guard. The probe was changed to mirror the call sites and the case renamed. AC 2's "STOP if an assertion needs editing" applies to pre-existing tests; **zero pre-existing assertions or `beforeEach` bodies were modified anywhere in this story.**

### Completion Notes List

**The 2-warning lint gate is now a 0-warning gate.** Every story since 5-8 has reported against "exactly 2 pre-existing warnings" as its regression bar. That bar is now **0**, achieved by the two provider splits in Task 2. The next story should treat any warning at all as a regression — a reading of 0 is correct, not a measurement error.

**Behavior freeze held.** No route, rendered output, ARIA attribute, authored CSS class name, API call, query key, or prop signature changed. The evidence, in order of strength:
- All 341 baseline tests still pass, and **not one pre-existing assertion or setup block was edited** — test files changed only their import statements and their file organization, which is the AC 2 contract.
- `TripPlannerPage.test.tsx` and `TripPlannerPage.dnd.test.tsx` (the only guard on the drag move-vs-reorder branch) passed with **zero edits of any kind**, because the three extracted components were file-local.
- AC 11's two 5-14 regression tests passed **unedited**: `AttractionCard.test.tsx:165` and `"shows a cache-hit photograph without waiting for a load event"` (relocated by Task 8 to `SearchPage.landing.test.tsx:115`).
- The `useImageLoaded` hook is a literal relocation of the guard — same `imgRef.current?.complete` check, same `[imageUrl]` dependency, and deliberately **no reset of `loaded` to `false`** on url change, matching both original sites. `grep -rn "\.complete" src/` now returns exactly one hit, in the hook. `AttractionHero.tsx` was not touched.

**Structure snapshot for the next audit** (`FE/src`, 118 files, up from 101):

| File | Before | After |
|---|---|---|
| `SearchPage.test.tsx` | 1298 | **split into 5** (largest 399) + `searchPageTestUtils.tsx` (100) |
| `TripPlannerPage.tsx` | 640 | **344** (AC 6 allowed ≤ 360) |
| `SearchPage.tsx` | 534 | **480** (AC 7's expected ≈ 482) |
| `DestinationDetailsPage.tsx` | 293 | **243** |
| `DateField.tsx` | 204 | **182** |
| `SearchPage.module.css` | 573 | **501** |

Only non-test files over 400 lines are the two documented exceptions: **`SearchPage.tsx` (480)**, awaiting the deferred `useLocationCombobox` story, and three CSS modules (`TripPlannerPage.module.css` 531, `SearchPage.module.css` 501, `DestinationDetailsPage.module.css` 418) that this story does not split. Test-file lines rose 1298 → 1462 across 6 files (+164, below the predicted +300–500, because helper duplication was avoided and per-file imports were compiler-trimmed).

**Live browser smoke pass was NOT performed.** Dev Notes strongly recommend one over the four touched pages at 1440×900 and 390×844, on the record that jsdom has twice missed defects the real browser caught in this codebase (5-21). It is stated plainly here rather than implied: this run verified through the test suite, `tsc -b`, oxlint and a production build only. The highest-risk surfaces for a reviewer's eyes are (a) the **`PopularTile` stylesheet split** — the only change in this story that alters generated CSS class hashes and could in principle break a cascade, though it was verified that no compound `.tile.tileA` selectors exist and `tileA`–`tileF` correctly stayed in `SearchPage.module.css`; and (b) the trip planner's drag-and-drop, now spread across three files.

**`spec-5-19-attempted-implementation.patch` is now definitively dead.** It was already flagged as needing a rebase if `features/destinations/` moved on. Tasks 5 and 8 deleted `SearchPage.test.tsx` outright and reshaped `SearchPage.tsx`; the patch can no longer apply and should be treated as an artifact, not a deliverable.

**Nothing outside `FE/src` and `FE/README.md` was touched** — no backend, no `package.json`, no new dependency, no epic file. The uncommitted `SearchPage.module.css` hero-banner edit was neither adopted nor reverted; it still contradicts `epic-5-context.md` and belongs to no story — surface it at review.

**Follow-ups worth a story, noted not attempted:** the deferred `useLocationCombobox` extraction (the sole reason `SearchPage.tsx` is still 480), a lint rule for file size / import cycles (nothing enforces either today, so the no-barrels decision rests on documentation alone), and the three CSS modules over 400 lines.

### File List

**New**
- `FE/src/features/auth/useAuth.ts`
- `FE/src/features/trips/useAddToTrip.ts`
- `FE/src/features/trips/DestinationRow.tsx`
- `FE/src/features/trips/SavedPlaceCard.tsx`
- `FE/src/features/trips/DaySegment.tsx`
- `FE/src/features/trips/CalendarIcon.tsx`
- `FE/src/features/destinations/OpenNowBadge.tsx`
- `FE/src/features/destinations/InfoRow.tsx`
- `FE/src/features/destinations/searchIcons.tsx`
- `FE/src/features/destinations/landingContent.ts`
- `FE/src/features/destinations/errorMessage.ts`
- `FE/src/features/destinations/PopularTile.module.css`
- `FE/src/features/destinations/searchPageTestUtils.tsx`
- `FE/src/features/destinations/SearchPage.submit.test.tsx`
- `FE/src/features/destinations/SearchPage.suggest.test.tsx`
- `FE/src/features/destinations/SearchPage.landing.test.tsx`
- `FE/src/features/destinations/SearchPage.city.test.tsx`
- `FE/src/features/destinations/SearchPage.filters.test.tsx`
- `FE/src/shared/lib/useImageLoaded.ts`
- `FE/src/shared/lib/useImageLoaded.test.tsx`

**Moved**
- `FE/src/features/destinations/StarRating.tsx` → `FE/src/shared/ui/StarRating.tsx`
- `FE/src/features/destinations/StarRating.module.css` → `FE/src/shared/ui/StarRating.module.css`

**Deleted**
- `FE/src/features/destinations/SearchPage.test.tsx` (split into the 5 files above; all 67 `it` blocks preserved verbatim)

**Modified**
- `FE/README.md`
- `FE/src/app/AppLayout.tsx`
- `FE/src/features/auth/AuthContext.tsx`
- `FE/src/features/auth/AuthContext.test.tsx`
- `FE/src/features/auth/LoginPage.tsx`
- `FE/src/features/auth/RequireAuth.tsx`
- `FE/src/features/trips/AddToTripContext.tsx`
- `FE/src/features/trips/AddToTripContext.test.tsx`
- `FE/src/features/trips/TripPlannerPage.tsx`
- `FE/src/features/trips/DateField.tsx`
- `FE/src/features/destinations/SearchPage.tsx`
- `FE/src/features/destinations/DestinationDetailsPage.tsx`
- `FE/src/features/destinations/DestinationDetailsPage.test.tsx`
- `FE/src/features/destinations/AttractionCard.tsx`
- `FE/src/features/destinations/AttractionCard.test.tsx`
- `FE/src/features/destinations/PopularTile.tsx`
- `FE/src/shared/lib/dates.ts`
- `FE/src/shared/lib/dates.test.ts`
- `FE/src/features/destinations/SearchPage.module.css` — ⚠️ **contains a pre-existing uncommitted edit that is NOT part of this story.** This story's only change to the file is the removal of `PopularTile`'s five classes (former L313–384) per AC 12; the `.heroSurface` hero-banner hunk (~L17–23) was present before work started and was left untouched. The hunks do not overlap.

## Change Log

| Date | Change |
|---|---|
| 2026-07-28 | Structural refactor, behavior frozen. Split `AuthContext`/`AddToTripContext` providers from their hooks (lint 2 → **0** warnings); promoted `StarRating` to `shared/ui`; extracted `DestinationRow`/`SavedPlaceCard`/`DaySegment` from `TripPlannerPage` (640 → 344), `searchIcons`/`landingContent`/`errorMessage` from `SearchPage` (534 → 480), `OpenNowBadge`/`InfoRow` from `DestinationDetailsPage`, and `CalendarIcon` + the ISO↔`Date` converters from `DateField`; gave `PopularTile` its own stylesheet; de-duplicated the image-load guard into `shared/lib/useImageLoaded`; split the 1298-line `SearchPage.test.tsx` into 5 files + shared utils; documented the module-boundary conventions in `FE/README.md`. Tests 341 → 350, lint 2 → 0 warnings, build clean. |
