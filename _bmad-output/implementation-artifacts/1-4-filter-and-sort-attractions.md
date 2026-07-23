---
baseline_commit: 698215edd82bf9fe4c3a9acfad629b4acce3be5e
---

# Story 1.4: Filter & Sort Recommended Attractions (US4 + US5)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user browsing recommended attractions for a city**,
I want **to filter the attraction list by category and rating/popularity and to sort it by recommended order or highest rating**,
so that **I can quickly narrow the list to the kinds of places I care about and prioritize the best ones**.

This story delivers the two deferred, "Selected: No" backlog stories of Feature 1 together, because they operate on the same attraction-list surface and their acceptance criteria cross-reference each other (filters must be preserved when sort changes; sort must update instantly while filters stay applied).

## Context & Problem Statement

This is **Feature 1 / US4 (Filter, Medium)** and **US5 (Sort, Low)** from `requirement/Sheet1.html`, both deliberately deferred in the epic as out-of-scope backlog:

> **US4 — Filter recommended attractions (Medium):** category and rating/popularity filters, combinable, persisted across pagination. Maps directly to the `kinds` and `rate` parameters of `/radius`. [Source: epic/epic-1-destination-suggestion.md#Out-of-scope]
> **US5 — Sort attractions (Low):** default "recommended" order plus "highest rating" sort, filters preserved across sort changes. [Source: epic/epic-1-destination-suggestion.md#Out-of-scope]

The selected in-scope stories US2 (search) and US3 (attraction list) are already implemented and verified (`_bmad-output/implementation-artifacts/feature-1-verification-report.md`). The attraction list currently fetches with **fixed** provider parameters — `kinds=interesting_places`, `rate=2` — and returns provider order with no filter or sort controls in the UI. [Source: BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs:17-25; FE/src/features/destinations/SearchPage.tsx:268-274]

### Requirement acceptance criteria (verbatim from the sheet)

**US4 — Filter:**
1. Apply category filters to narrow the attraction list.
2. Apply rating/popularity filters to narrow the attraction list.
3. Combine multiple filters at the same time.
4. Clear filters to return to the full attraction list.
- Business rules: category (from provider tags/`kinds`), rating/popularity (if available), allow multiple filters at once, keep filters applied when navigating upon pages.

**US5 — Sort:**
1. Sort attractions by recommended order by default.
2. Sort attractions by highest rating/popularity when selected.
3. Keep applied filters when changing sort order.
4. See results update immediately after changing sort.
- Business rules: Recommended (default) + Highest rating/popularity (if available).

### Scope decisions

1. **Filters are server-side; sort is client-side.** Category and rating filters change the OpenTripMap query (`kinds`, `rate`), so applying/clearing them triggers a **refetch**. Sort reorders the already-loaded ≤20 items in the browser, so it is **instant** (US5-AC4) and inherently preserves the active filters (US5-AC3) with no extra request. This is the cleanest mapping to the provider, which supports `kinds`/`rate` filtering on `/radius` but no `orderby`.
2. **Rating sort key comes from enrichment.** `AttractionResponse.Rating` is the OpenTripMap `rate` (`"1"`–`"3"`, optional `h` heritage suffix), populated during per-`xid` enrichment. "Highest rating" sorts by the numeric level descending; unrated items sort last; provider order is the stable tiebreaker. "Recommended" is the untouched provider order.
3. **Category options are a curated MVP set, not the full taxonomy.** Offer a small, meaningful set of top-level categories mapped to OpenTripMap `kinds` groups (e.g. Cultural, Historic, Architecture, Natural, Amusements, Foods) rather than the entire https://dev.opentripmap.org/catalog tree. Multiple categories combine as a comma-separated `kinds` value (OpenTripMap ORs them). Document the chosen set in Dev Notes at implementation time.
4. **Rating filter is a minimum-rate control.** A "minimum rating" selector (e.g. Any / 2+ / 3+) maps to the `rate` query parameter (default stays `2` for "Any"/baseline, matching today's behavior; a higher floor narrows).
5. **Filters + pagination interaction is owned by story 1-5.** US4's "keep filters applied when navigating upon pages" only becomes testable once pagination (US3-AC7, story `1-5-attraction-list-pagination`) exists. This story keeps filters in component state so a later "load more" naturally carries them; it does not build pagination itself.
6. **Anonymous, ephemeral, no persistence.** The endpoint stays anonymous and stateless (matching US2/US3); filter/sort state lives only in FE component state (optionally the existing `searchState` session store), never in the database.
7. **No new `ErrorType`; graceful empty state.** A filtered query returning nothing is `Result.Success` with an empty list and reuses the existing "No attractions in this area yet" empty state (or a filter-aware variant). Provider failure stays `ServiceUnavailable`.

## Acceptance Criteria

1. **Backend — filterable attraction query.** `GET /api/locations/attractions` accepts optional `kinds` (comma-separated category groups) and `minRate` (integer floor) query parameters in addition to the existing `latitude`, `longitude`, `radius`, `limit`. When omitted, behavior is byte-for-byte identical to today (`kinds=interesting_places`, `rate=2`). `AttractionSearchParameter` gains `Kinds` (`string?`) and `MinRate` (`int?`); `IAttractionSearchService.GetNearbyAsync` is extended to receive them (via added parameters or a passed parameter object) and forwards them to the `/radius` request instead of the hard-coded constants. [Source: BE/TripPlanner.Application/Parameters/AttractionSearchParameter.cs; BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs:21-26]

2. **Backend — validation.** `AttractionSearchParameterValidator` validates the new fields: `MinRate`, when present, is within the provider's rate range (1–3); `Kinds`, when present, is non-empty and each comma-separated token matches the curated allow-list (reject unknown categories → `400 BadRequest`). Existing lat/lon/radius/limit rules are unchanged. [Source: BE/TripPlanner.API/Validators/AttractionSearchParameterValidator.cs]

3. **Frontend — category filter (US4-AC1, AC3, AC4).** The attraction results section renders a category filter control offering the curated category set. Selecting one or more categories refetches the list narrowed to those categories; multiple selections combine (US4-AC3); a "Clear filters" affordance returns to the unfiltered list (US4-AC4). The active filter selection is reflected in the control's UI state.

4. **Frontend — rating filter (US4-AC2).** A minimum-rating control (Any / 2+ / 3+) refetches the list narrowed to attractions at or above the chosen `rate`. It combines with the category filter (both sent on the same request).

5. **Frontend — sort control (US5-AC1, AC2, AC3, AC4).** A sort control defaults to **Recommended** (provider order, US5-AC1). Selecting **Highest rating** reorders the currently loaded list by numeric rating descending (unrated last, stable provider-order tiebreak) **without a refetch** and **immediately** (US5-AC4). Changing sort leaves the active filters untouched (US5-AC3); changing filters leaves the active sort untouched.

6. **Frontend — wiring & empty state.** `useAttractions` (and `getAttractions` in `api.ts`) thread the active `kinds`/`minRate` into the request and the query key so filtered results cache independently. A filtered query with zero results shows the existing empty state (no crash, no stale list). Country-selection and loading/error/skeleton behavior are unchanged.

7. **Accessibility.** All filter and sort controls are keyboard-operable and labeled (native `<select>`/checkbox/`<fieldset><legend>` or equivalent with `aria-label`), consistent with the app's accessibility floor. Sort/filter changes announce or visibly update the list.

8. **No regressions & green build.** All existing BE and FE tests pass (updated only where a signature legitimately changes — never weakened). New tests cover: the use case/service forwarding `kinds`/`minRate` and defaulting when omitted; the validator's new rules (valid + rejected category, out-of-range rate); the client `getAttractions` URL with the new params; `useAttractions` query-key inclusion of filters; the FE filter refetch, clear-filters reset, and client-side rating sort (order + filter-preservation). `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build` all pass.

## Tasks / Subtasks

- [x] **Task 1 — Backend: parameter + service threading (AC: #1)**
  - [x] Add `Kinds` (`string?`) and `MinRate` (`int?`) to `AttractionSearchParameter`.
  - [x] Extend `IAttractionSearchService.GetNearbyAsync` to accept the category (`kinds`) and minimum-rate values; update `OpenTripMapAttractionSearchService` to use them in the `/radius` URL, falling back to the existing `interesting_places` / `2` defaults when null.
  - [x] Thread the values through `GetAttractionsForLocationUseCase.ExecuteAsync`.
  - [x] Unit tests (mock `IAttractionSearchService`): filters forwarded when present; defaults applied when absent.
- [x] **Task 2 — Backend: curated category allow-list + validation (AC: #2)**
  - [x] Define the curated category → `kinds` mapping (a small static map in Application, e.g. `Helpers/AttractionCategoryHelper.cs`).
  - [x] Extend `AttractionSearchParameterValidator`: `MinRate` in 1–3 when present; each `Kinds` token in the allow-list.
  - [x] Validator tests: valid categories pass; unknown category → invalid; out-of-range rate → invalid.
- [x] **Task 3 — Frontend: api client + hook wiring (AC: #6)**
  - [x] `getAttractions` gains optional `kinds`/`minRate` args and appends them to the query string.
  - [x] `useAttractions` accepts the active filters, includes them in the query key, and passes them to `getAttractions`.
- [x] **Task 4 — Frontend: filter controls (AC: #3, #4, #7)**
  - [x] Add a filter control component (category multi-select + minimum-rating select) to the attractions section of `SearchPage`.
  - [x] Hold filter state in `SearchPage` (reset on new city selection / Clear); wire a "Clear filters" action.
  - [x] Ensure keyboard + label accessibility.
- [x] **Task 5 — Frontend: sort control + client-side rating sort (AC: #5, #7)**
  - [x] Add a sort control (Recommended default | Highest rating).
  - [x] Apply a pure client-side sort over the loaded attractions for "Highest rating" (numeric `rating` desc, unrated last, stable); "Recommended" returns provider order untouched.
  - [x] Verify sort does not refetch and preserves filters; filters do not reset sort.
- [x] **Task 6 — Tests + full validation (AC: #8)**
  - [x] FE tests: filter refetch (query-key change), clear-filters reset, rating sort order + filter-preservation, empty filtered state.
  - [x] BE: run/fix affected tests.
  - [x] Run `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build`; fix regressions. Browser QA may be deferred if no browser tooling is available (recommend a Playwright pass at review).

## Dev Notes

### Where the fixed values live today
- The `/radius` request hard-codes `kinds=interesting_places` and `rate=2` as `DefaultKinds`/`MinimumRate` constants. These become the fallback defaults; the new params override them. [Source: OpenTripMapAttractionSearchService.cs:17,18,25]
- `AttractionResponse` carries `Rating` (`string?`, OTM `rate`) and `Kinds` (`List<string>`) — the sort key and the category source are already on the DTO; no DTO change needed for sort. [Source: epic/epic-1-destination-suggestion.md#Data-models; FE/src/features/destinations/AttractionCard.tsx:27-30]

### Provider mapping
- OpenTripMap `/radius` filters by `kinds` (comma-separated, OR semantics) and `rate` (minimum). There is **no** server-side sort, so "highest rating" is a client/use-case reorder over the enriched list. [Source: epic/epic-1-destination-suggestion.md#Endpoints-used, #US3-query-defaults]
- Category taxonomy: https://dev.opentripmap.org/catalog. Pick a curated MVP subset (the sheet says "will review") rather than exposing the full tree.

### Frontend precedents to mirror
- `useAttractions` is a standard TanStack `useQuery` keyed by `['attractions', lat, lon]`; extend the key with the filter values so each filter combination caches independently. Sort is **not** in the key (client-only). [Source: FE/src/features/destinations/hooks.ts:30-39]
- The attractions section (loading/skeleton, error+retry, empty state, grid of `AttractionCard`) lives in `SearchPage.tsx:227-276`; add the filter/sort bar above the grid and gate refetch on filter state.
- Session persistence of search state already exists via `searchState.ts` (`getSearchState`/`saveSearchState`) — optionally extend it to remember filters/sort, but not required.

### Testing standards
- **BE:** xUnit + NSubstitute, `Method_Scenario_ExpectedResult`, following `LocationServiceTests.cs`. Mock `IAttractionSearchService`; assert forwarded args via `Received()`.
- **FE:** Vitest + Testing Library, co-located `*.test.tsx`, `vi.mock('./api')`, `QueryClientProvider` (retry off). Query by role/label/text. Test the client-side sort as a pure reorder and the filter refetch via a spy on `getAttractions`. [Source: FE/src/features/destinations/SearchPage.test.tsx, api.test.ts]

### Code style (from CLAUDE.md)
- No comments in code (FE or BE). Curly braces required for all C# control-flow, even single-statement bodies.

### Project structure
- Feature-based FE layout (post 5-17): destinations under `FE/src/features/destinations/`, `@/` → `src`, shared types in `FE/src/shared/api/types.ts`.
- Clean Architecture preserved: parameter/validator in Application/API, provider mapping in Infrastructure behind `IAttractionSearchService`, no Application/Domain reference to API/Infrastructure. No migration/schema change (ephemeral provider data).

### References
- [Source: requirement/Sheet1.html — Feature 1 US4 (Filter, Medium) + US5 (Sort, Low), verbatim ACs above]
- [Source: epic/epic-1-destination-suggestion.md#Out-of-scope, #Technical-approach, #US3-query-defaults]
- [Source: _bmad-output/implementation-artifacts/feature-1-verification-report.md (US4/US5 not implemented; US2/US3 done)]
- [Source: BE/.../OpenTripMap/OpenTripMapAttractionSearchService.cs, .../UseCases/Location/GetAttractionsForLocationUseCase.cs, .../Parameters/AttractionSearchParameter.cs, .../Interfaces/Services/IAttractionSearchService.cs, .../API/Validators/AttractionSearchParameterValidator.cs]
- [Source: FE/src/features/destinations/hooks.ts, api.ts, SearchPage.tsx, AttractionCard.tsx]
- [Source: CLAUDE.md (use case/result/validation patterns; code style — braces required, no comments)]

### Review Findings

_Adversarial code review 2026-07-21 (baseline `698215e`, scoped to this story's File List). 4 layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor._

- [x] [Review][Decision] "Any rating" filter option is misleading and low-rate results are unreachable — **Resolved: honor "Any" = rate 1** (`MinimumRate` `"2"` → `"1"`; default-rate test updated). Note this deliberately changes the prior unfiltered baseline (`rate=2` → `rate=1`), superseding AC1's byte-for-byte claim for the no-filter case. — Per scope decision #4 the `rate` default stays `2`, so "Any rating" (sends no `minRate`, backend defaults to `rate=2`) returns identical results to "2+ stars" (`MIN_RATE_OPTIONS`, `attractionFilters.ts:14-18`; backend fallback `MinimumRate="2"`, `OpenTripMapAttractionSearchService.cs:26`). Consequently rate-1 attractions can never be shown through the UI, and the two dropdown options are functionally duplicates. The validator also accepts `MinRate=1` (`AttractionCategoryHelper.MinRateValue=1`) which the UI never offers and the default floor contradicts. Spec-sanctioned, so this is a product/labeling call: (a) relabel "Any rating" → "2+ (baseline)", (b) actually honor "Any" by defaulting to `rate=1` when null, or (c) accept as-is. Severity: low.

- [x] [Review][Patch] Location-search empty-state copy regressed to wrong wording [FE/src/features/destinations/SearchPage.tsx:236] — **Fixed:** restored "No matching places found." + reverted the test assertion. — The *location* search empty state (gated on `search.isSuccess && results.length === 0`) was changed from "No matching places found." to "No attractions found." This block fires when a typed city/place query matches nothing, so the new copy is semantically wrong and degrades US2 search UX. Out of scope for this story, and the test was edited to match the wrong copy (`SearchPage.test.tsx`), masking rather than catching the regression. Restore "No matching places found." + revert the test assertion. Severity: medium.

- [x] [Review][Patch] `kinds` token normalization diverges between validator and service [BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs:25,27] — **Fixed:** service now splits/trims/rejoins `kinds` via `NormalizeKinds` and per-token `Uri.EscapeDataString` (defense-in-depth). — The validator normalizes tokens with `TrimEntries`, so `kinds="cultural, historic"` (space after comma) passes validation; the service then forwards the raw string into the `/radius` URL, so OpenTripMap receives the unrecognized token ` historic` (leading space, escaped to `%20`) and silently narrows/empties results. The UI never emits spaces (`kinds.join(',')`), so this only bites direct API callers, but it is a real validation-vs-use contract gap. Fix: split/trim/rejoin `kinds` in the service (also add `Uri.EscapeDataString` for defense-in-depth, mirroring the xid path). Severity: low.

- [x] [Review][Patch] Switching cities with active filters fires a redundant/stale-filter fetch [FE/src/features/destinations/SearchPage.tsx:48-52,55] — **Fixed:** replaced the post-render reset effect with a synchronous `handleSelectLocation` wrapper that resets filters in the same event as `setSelected`, so a city switch issues a single correct fetch. — Filter reset lives in a post-render `useEffect` keyed on `selected` lat/lon. On the render where `selected` changes, `useAttractions(selected, { kinds: categories, minRate })` still holds the previous city's filters, so React Query issues a fetch for the new city with the old filters (possibly rendering a wrongly-narrowed/empty result briefly) before the effect clears filters and triggers a second, correct fetch. Fix: reset filters synchronously at the point `selected` changes (selection handlers) rather than in an effect. Severity: medium.

- [x] [Review][Patch] Test gaps: clear-filters minRate path and city-switch filter reset uncovered [FE/src/features/destinations/SearchPage.test.tsx] — **Fixed:** added a clear-filters minRate-reset test and a city-switch category+minRate reset test (the latter also asserts no stale-filter fetch for the new city). — The clear-filters test sets only a category (never `minRate`) and asserts only checkbox state, not a refetch with `{kinds: [], minRate: null}`; the city-switch test resets only `sort`, never a category/minRate. Dropping `setMinRate(null)` from `handleClearFilters`, or the category/minRate resets from the city-switch effect, would ship undetected. Add coverage for both. Severity: low.

- [x] [Review][Defer] Diff not self-contained — out-of-scope changes bundled [BE/.../OpenTripMapAttractionSearchService.cs; FE/src/shared/api/types.ts; BE/TripPlanner.Tests/LocationServiceTests.cs] — deferred, belongs to other stories (placeClient caching → 6-4, `MoveDestinationRequest` → 3-6, `SearchLocations_ExactMatch_*` tests → 1-6). Logged in deferred-work.md.
- [x] [Review][Defer] Filter/sort controls hidden on attraction error (`!attractions.isError`) [FE/src/features/destinations/SearchPage.tsx:258] — deferred, low-likelihood UX; logged in deferred-work.md.

_Dismissed as noise: (1) validator accepts duplicate category tokens — harmless, OpenTripMap ORs `kinds`; (2) `sortAttractions` maps both `null` and `NaN` ratings to `-1` — by design, unrated sorts last._

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `dotnet build BE` — succeeded, 0 warnings / 0 errors.
- `dotnet test BE` — 248/248 passed (+18 new).
- `npm test -- --run` — 276/276 passed (+16 net new).
- `npm run lint` — clean (2 pre-existing warnings in `AddToTripContext.tsx` / `AuthContext.tsx`, unrelated to this story).
- `npm run build` — succeeded (pre-existing chunk-size advisory only).

### Completion Notes List

- **Curated category set (documented per scope decision #3):** `cultural`, `historic`, `architecture`, `natural`, `amusements`, `foods`. These are genuine OpenTripMap top-level `kinds` group codes, so the FE-selected code is forwarded verbatim to `/radius&kinds=` (identity mapping — no translation layer needed); the allow-list is the validation surface. `AttractionCategoryHelper` (Application/Helpers) holds the set + `MinRateValue`/`MaxRateValue` (1–3) constants shared by the validator.
- **Filters are server-side, sort is client-side** (scope decision #1). `Kinds`/`MinRate` change the OpenTripMap query and trigger a TanStack refetch (they are part of the `useAttractions` query key so each combination caches independently); "Highest rating" reorders the already-loaded ≤20 items in the browser via the pure `sortAttractions` helper — no refetch (US5-AC4 immediate) and filters are inherently preserved (US5-AC3).
- **Signature change:** `IAttractionSearchService.GetNearbyAsync` gained optional `string? kinds = null, int? minRate = null` before the `CancellationToken`; the use case passes `parameter.Kinds`/`parameter.MinRate` straight through and the Infrastructure service applies the `interesting_places` / `2` fallbacks when null, so an omitted-filter request is byte-for-byte identical to before (AC #1). Existing `LocationServiceTests` `Received()` assertions updated to the new arity (not weakened).
- **FE `getAttractions`** gained an optional 3rd `AttractionFilters` arg; when `kinds` is empty and `minRate` is null it emits the exact original URL (no new params), so `useNearbyAttractions` (attraction-detail nearby rail) and the existing api tests are unaffected.
- **Filter state** (`categories`, `minRate`, `sort`) lives only in `SearchPage` component state and resets on new city selection (effect keyed on selected lat/lon) — anonymous, ephemeral, no persistence (scope decision #6). Empty filtered result reuses the empty state with a filter-aware variant ("No attractions match these filters — try clearing them.").
- **Accessibility:** categories are a `<fieldset><legend>Category</legend>` of native checkboxes; minimum-rating and sort are labeled native `<select>`s; "Clear filters" is a native button shown only when a filter is active. All keyboard-operable.
- **Filters + pagination interaction** intentionally not built here — deferred to story 1-5 (scope decision #5). Filter state is held in a way a later "load more" carries naturally.
- Browser/Playwright QA deferred (no browser tooling this session) — recommended at review.

### File List

**Backend**
- `BE/TripPlanner.Application/Parameters/AttractionSearchParameter.cs` (modified — added `Kinds`, `MinRate`)
- `BE/TripPlanner.Application/Interfaces/Services/IAttractionSearchService.cs` (modified — extended `GetNearbyAsync` signature)
- `BE/TripPlanner.Application/UseCases/Location/GetAttractionsForLocationUseCase.cs` (modified — threads filters)
- `BE/TripPlanner.Application/Helpers/AttractionCategoryHelper.cs` (new — allow-list + rate bounds)
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs` (modified — forwards `kinds`/`rate`, keeps defaults)
- `BE/TripPlanner.API/Validators/AttractionSearchParameterValidator.cs` (modified — `MinRate` range + `Kinds` allow-list rules)
- `BE/TripPlanner.Tests/LocationServiceTests.cs` (modified — new-arity assertions + 2 forwarding tests)
- `BE/TripPlanner.Tests/OpenTripMapAttractionSearchServiceTests.cs` (modified — 2 `/radius` URL forwarding/default tests)
- `BE/TripPlanner.Tests/AttractionSearchParameterValidatorTests.cs` (new — validator tests)

**Frontend**
- `FE/src/shared/api/types.ts` (modified — added `AttractionFilters`)
- `FE/src/features/destinations/api.ts` (modified — `getAttractions` filter args + query string)
- `FE/src/features/destinations/hooks.ts` (modified — `useAttractions` filters in key + call)
- `FE/src/features/destinations/attractionFilters.ts` (new — category options, min-rate options, pure `sortAttractions`)
- `FE/src/features/destinations/AttractionControls.tsx` (new — filter/sort control bar)
- `FE/src/features/destinations/AttractionControls.module.css` (new)
- `FE/src/features/destinations/SearchPage.tsx` (modified — filter/sort state, controls, client-side sort, filter-aware empty state)
- `FE/src/features/destinations/api.test.ts` (modified — filter URL tests)
- `FE/src/features/destinations/attractionFilters.test.ts` (new — sort helper tests)
- `FE/src/features/destinations/SearchPage.test.tsx` (modified — new-arity assertions + filter/sort integration tests)

**Artifacts**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status → review)
- `_bmad-output/implementation-artifacts/1-4-filter-and-sort-attractions.md` (this file)

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-21 | 0.1 | Story drafted for Feature 1 US4 (filter) + US5 (sort), combined. Server-side `kinds`/`minRate` filters on `/api/locations/attractions` + curated category allow-list + validator; client-side "Highest rating" sort; FE filter/sort control bar wired through `useAttractions`. No persistence/migration. Filters+pagination interaction deferred to story 1-5. Created via dev-story analysis; ready-for-dev. | Quanhvo |
| 2026-07-21 | 1.1 | Adversarial code review (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor). 1 decision-needed, 4 patch, 2 deferred, 2 dismissed. See Review Findings below. | Quanhvo |
| 2026-07-21 | 1.0 | Implemented all 6 tasks. BE: `Kinds`/`MinRate` on `AttractionSearchParameter` forwarded through the use case + service to `/radius` (defaults preserved when null), `AttractionCategoryHelper` curated allow-list (cultural/historic/architecture/natural/amusements/foods), validator rules (MinRate 1–3, Kinds allow-list). FE: `getAttractions`/`useAttractions` thread `AttractionFilters` (in query key), `AttractionControls` category-checkbox + min-rating + sort bar on `SearchPage`, pure client-side `sortAttractions` for "Highest rating" (unrated last, stable), filter reset on new city, filter-aware empty state. BE 248/248 (+18), FE 276/276 (+16 net), lint clean (2 pre-existing warnings), both builds green. Browser QA deferred. Status → review. | Quanhvo |
