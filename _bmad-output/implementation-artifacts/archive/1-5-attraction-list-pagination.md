---
baseline_commit: 698215edd82bf9fe4c3a9acfad629b4acce3be5e
---

# Story 1.5: Paginate / "Load More" Recommended Attractions (US3 AC7)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user viewing the recommended attractions for a city**,
I want **to load more attractions after the first page of results**,
so that **I can keep exploring beyond the initial 20 items instead of being capped at one page**.

## Context & Problem Statement

This is the **optional 7th acceptance criterion of Feature 1 / US3 (View recommended attractions list, High)** from `requirement/Sheet1.html`:

> **US3-AC7:** "See pagination and load more attractions when reaching 20 items. (optional)"
> Business rule: "Return max 20 items per page." [Source: requirement/Sheet1.html — Feature 1 US3]

US3's other six ACs are implemented and verified; AC7 was intentionally left out as optional. Today the attraction list is a single page: the backend caps at `MaxPageSize = 20` (`Math.Min(limit, 20)`) and the FE renders exactly one grid with no "load more" affordance. [Source: BE/TripPlanner.Application/UseCases/Location/GetAttractionsForLocationUseCase.cs:11,16; FE/src/features/destinations/SearchPage.tsx:268-274; hooks.ts:30-39]

### Central technical constraint (must be resolved during implementation)

OpenTripMap's `/radius` endpoint filters by `radius`, `lat`, `lon`, `kinds`, `rate`, `limit` — the current wire call uses no `offset`. **Before building the UI, the dev must confirm whether `/radius` supports an `offset`/paging parameter** (per the OpenTripMap OpenAPI spec at https://dev.opentripmap.org). Two viable approaches, pick based on that check:

- **A — provider offset (preferred if supported):** add `offset` to `/radius`; each "load more" fetches the next window (`offset += pageSize`), appending server-side pages. Keeps the ≤20-per-page rule literal.
- **B — expand-and-slice (fallback):** the `/radius` call already returns features ordered by distance; request a larger feature set, enrich only the current page's `xid`s (enrichment is the expensive 1+N cost — do **not** enrich items not yet shown), and page client-side. Still honors "max 20 per page" as the display page size and avoids re-enriching earlier pages.

The chosen approach and the reason must be recorded in the Dev Notes / Debug Log. Because AC7 is optional, if neither approach is feasible within the provider's constraints, the story may be closed as "not feasible with current provider" with that finding documented rather than shipping a broken pager.

### Scope decisions

1. **"Load more" button, not numbered pages.** A single append-style "Load more" control below the grid (infinite-scroll optional, not required) matches the sheet's "load more attractions when reaching 20 items" wording and the app's existing simple UI conventions.
2. **Page size stays 20.** The per-page cap (`MaxPageSize`) is unchanged; pagination adds pages, it does not raise the page size.
3. **Compose with filters/sort (story 1-4).** If story `1-4-filter-and-sort-attractions` has landed, changing a filter resets pagination to page 1 and the active filters carry into every page fetch (satisfying US4's "keep filters applied when navigating upon pages"). This story must not regress 1-4 if it is already merged; if 1-4 is not yet merged, build the pager filter-agnostic and leave a clear seam.
4. **Anonymous, ephemeral, no persistence** — consistent with US2/US3.
5. **Dedupe on append.** Appended pages must not introduce duplicate `xid`s into the rendered list (guard in the accumulation step).

## Acceptance Criteria

1. **Backend — paged attraction query.** `GET /api/locations/attractions` supports fetching a page beyond the first via the approach chosen above (an `offset`/`page` query parameter, validated). With no paging parameter, behavior is identical to today (first page, ≤20). Per-page size remains capped at 20. `AttractionSearchParameter` and `AttractionSearchParameterValidator` are extended accordingly (e.g. `Offset`/`Page` ≥ 0, sensible upper bound). [Source: GetAttractionsForLocationUseCase.cs; AttractionSearchParameter.cs; AttractionSearchParameterValidator.cs]

2. **Backend — no wasted enrichment.** The per-`xid` enrichment fan-out runs only for the items on the requested page, never for pages the user has not requested (preserves the NFR2 latency posture — the 1+N cost is bounded to one page). [Source: OpenTripMapAttractionSearchService.cs:33-45]

3. **Frontend — load more.** When a full page (20 items) is returned, a "Load more" control appears below the attraction grid. Activating it fetches the next page and **appends** it to the rendered list (existing items stay in place, no full-grid reflow). When a page returns fewer than 20 items (or an empty next page), the control is hidden — there is nothing more to load.

4. **Frontend — loading & error affordances.** While the next page is loading, the control shows a busy/disabled state (and/or a skeleton row consistent with the initial-load skeleton). A failed page fetch surfaces a retry affordance and does not discard already-loaded items.

5. **Frontend — dedupe & reset.** Appended pages are deduped by `xid`. Selecting a new city (or, if 1-4 is present, changing a filter) resets pagination to page 1 and clears accumulated pages.

6. **Accessibility.** The "Load more" control is a labeled, keyboard-operable button; newly appended results are discoverable by assistive tech (e.g. focus management or an `aria-live` count), consistent with the app's accessibility floor.

7. **No regressions & green build.** All existing BE and FE tests pass (updated only where a signature legitimately changes — never weakened). New tests cover: the backend paging parameter (page 2 fetch, default = page 1, validator bounds); enrichment scoped to the requested page; the client `getAttractions` paged URL; the FE append + dedupe, control visibility at exactly 20 vs <20 items, busy/error states, and reset on new city. `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build` all pass.

## Tasks / Subtasks

- [x] **Task 0 — Confirm provider paging capability (blocks approach)**
  - [x] Check the OpenTripMap `/radius` OpenAPI spec for an `offset`/paging parameter; decide approach A (provider offset) or B (expand-and-slice). Record the decision + evidence in the Debug Log.
- [x] **Task 1 — Backend: paged parameter + query (AC: #1, #2)**
  - [x] Extend `AttractionSearchParameter` with the paging field (`Offset` or `Page`).
  - [x] Extend `IAttractionSearchService.GetNearbyAsync` / `OpenTripMapAttractionSearchService` to fetch the requested page per the chosen approach; keep enrichment scoped to that page's items only.
  - [x] Thread through `GetAttractionsForLocationUseCase`; keep the 20-per-page cap.
  - [x] Extend `AttractionSearchParameterValidator` (paging field bounds).
  - [x] BE tests: page-2 fetch, default page-1, enrichment scoped to page, validator bounds.
- [x] **Task 2 — Frontend: paged fetching (AC: #3, #5)**
  - [x] `getAttractions` gains the paging arg and appends it to the query string.
  - [x] Adopt a paged fetch in `useAttractions` — either TanStack `useInfiniteQuery` (preferred for append + `getNextPageParam`) or a page-accumulator in component state; include page in the query key; dedupe accumulated pages by `xid`; reset on new city (and on filter change if 1-4 present).
- [x] **Task 3 — Frontend: load-more UI (AC: #3, #4, #6)**
  - [x] Render a "Load more" button below the grid, visible only when the last page returned a full 20; hide when fewer than 20 / empty next page.
  - [x] Busy/disabled state while fetching; retry affordance on error without discarding loaded items; accessible label + newly-loaded announcement.
- [x] **Task 4 — Tests + full validation (AC: #7)**
  - [x] FE tests: append + dedupe, visibility at 20 vs <20, busy/error, reset on new city.
  - [x] Run `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build`; fix regressions. Browser QA may be deferred (recommend a Playwright pass at review).

## Dev Notes

### Current single-page mechanics
- Backend page cap: `MaxPageSize = 20`, `limit = Math.Min(parameter.Limit ?? 20, 20)`. [Source: GetAttractionsForLocationUseCase.cs:11,16]
- Provider call: `radius?radius=&lat=&lon=&kinds=interesting_places&rate=2&format=json&limit=&apikey=`; features filtered to named+`xid`, `.Take(limit)`, then enriched with a 5-way throttled per-`xid` fan-out (the expensive part). [Source: OpenTripMapAttractionSearchService.cs:25-45]
- FE fetch: `useAttractions` keyed `['attractions', lat, lon]`, enabled only for a selected **City**; `getAttractions(lat, lon)` → `/api/locations/attractions?latitude=&longitude=`. [Source: hooks.ts:30-39; api.ts:10-14]
- FE render: single `styles.grid` mapping `attractions.data` to `AttractionCard`. [Source: SearchPage.tsx:268-274]

### Why enrichment scope matters (NFR2)
- The listing's latency risk is the 1+N per-`xid` detail calls. Paging must enrich only the current page so total upstream cost per "load more" stays ~one page's worth, not cumulative. Story 6-4 added a shared cached place client (`IOpenTripMapPlaceClient`, 24h TTL) that already de-duplicates repeat `xid` fetches across pages. [Source: OpenTripMapAttractionSearchService.cs:14-15,61; sprint-status.yaml 6-4 notes]

### Frontend precedents
- TanStack Query is already the data layer; `useInfiniteQuery` is the idiomatic fit for append-style paging with `getNextPageParam`. Keep the retry-off / `refetchOnWindowFocus:false` / `staleTime` conventions from the other hooks. [Source: hooks.ts]
- Skeleton convention for loading rows: `skeletonStyles` + `ATTRACTION_SKELETON_COUNT`, already used for initial load. [Source: SearchPage.tsx:17,230-241]

### Testing standards
- **BE:** xUnit + NSubstitute, mock `IAttractionSearchService`, assert page/offset forwarded and enrichment scope. Adapter-level `HttpMessageHandler` tests remain out of scope for MVP unless approach A needs one.
- **FE:** Vitest + Testing Library; spy on `getAttractions` to assert page params; test append/dedupe and control visibility by role/text, not CSS class.

### Code style (from CLAUDE.md)
- No comments in code. Curly braces required for all C# control-flow.

### Project structure
- Feature-based FE (`FE/src/features/destinations/`), `@/` → `src`. Clean Architecture preserved; provider paging lives in Infrastructure behind `IAttractionSearchService`; no migration/schema change.

### References
- [Source: requirement/Sheet1.html — Feature 1 US3 AC7 "pagination / load more when reaching 20 items (optional)"; business rule "max 20 per page"]
- [Source: epic/epic-1-destination-suggestion.md#US3 (AC7, business rules), #Enrichment-strategy, #Known-risks (NFR2)]
- [Source: _bmad-output/implementation-artifacts/feature-1-verification-report.md (US3-AC7 not built, optional)]
- [Source: BE/.../UseCases/Location/GetAttractionsForLocationUseCase.cs, .../OpenTripMap/OpenTripMapAttractionSearchService.cs, .../OpenTripMap/IOpenTripMapPlaceClient.cs, .../Parameters/AttractionSearchParameter.cs, .../API/Validators/AttractionSearchParameterValidator.cs]
- [Source: FE/src/features/destinations/hooks.ts, api.ts, SearchPage.tsx]
- [Source: _bmad-output/implementation-artifacts/archive/1-4-filter-and-sort-attractions.md (filter/sort interaction — filters carry across pages; changing a filter resets to page 1)]
- [Source: CLAUDE.md (patterns; code style — braces required, no comments)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Opus 4.8, 1M context)

### Debug Log References

**Task 0 — provider paging decision (Approach B, expand-and-slice).** Attempted to
confirm an `offset` parameter on OpenTripMap `/radius` against the live spec:
`https://dev.opentripmap.org/swagger.json` → 404; `https://dev.opentripmap.org/docs`
and `/product` → JS-rendered shells with no parameter detail;
`https://opentripmap.io/docs` → 302 to a parked domain; the authenticated swagger
(`api.opentripmap.com/.../swagger.json`) → 401 (needs an API key); apis.guru mirror
→ 404. No live, authoritative confirmation of `/radius` offset support was
obtainable, and there is no API key available in this environment to probe the
endpoint directly.

Per the story's Task 0 contingency, chose **Approach B (expand-and-slice)** over the
"preferred if supported" Approach A. Rationale: B depends only on the `limit`
parameter, which is already proven to work by the existing integration, so it
cannot produce the "broken pager" failure mode (had I assumed an unverified
`offset` and OpenTripMap silently ignored it, every page would return window 0 and
the FE would show a perpetual "Load more" that appends only duplicates). The
service requests `/radius` with `limit = offset + pageSize`, filters to
named+xid features, then `.Skip(offset).Take(pageSize)` to isolate the page window
and enriches **only** that window. When `offset = 0` the provider limit is
unchanged, so page-1 behaviour (and the wire URL) is byte-for-byte identical to
before — confirmed by the untouched existing wire tests still passing.

**FE — TanStack v5 next-page error semantics.** Initial FE tests revealed that in
`useInfiniteQuery` (v5.101.2) a rejected `fetchNextPage()` flips the *top-level*
`isError`/`status` to error even though page 1's data is retained. The first cut
routed that into the whole-list error state and discarded the grid (violating
AC #4). Fixed by gating the whole-list error block on `loadedAttractions.length === 0`
and rendering the grid whenever any items are loaded; the inline "load more" error
branch keys off `isFetchNextPageError || isError` (guarded by `!isFetchingNextPage`).
Also switched a synchronous busy-state assertion to `findByRole` since
`isFetchingNextPage` flips on a post-click re-render.

### Completion Notes List

- **Approach B (expand-and-slice), provider-offset-agnostic.** `AttractionSearchParameter.Offset`
  (int?, validated 0–1000) → clamped in `GetAttractionsForLocationUseCase` →
  `IAttractionSearchService.GetNearbyAsync(..., int offset = 0, ct)` →
  `OpenTripMapAttractionSearchService` requests `/radius` with `limit = offset + pageSize`
  and slices `.Skip(offset).Take(limit)`, enriching only the page window. Per-page cap
  (`MaxPageSize = 20`) unchanged; `offset = 0` keeps the wire call identical to before.
- **Enrichment scope (AC #2, NFR2).** The 1+N per-xid fan-out runs only over the sliced
  window; a service test asserts the image provider is invoked exactly once per windowed
  item and never for skipped items. Story 6-4's cached place client still de-dupes repeat
  xids across pages.
- **FE paging via `useInfiniteQuery`.** `getAttractions` gained an optional `offset` arg
  (appended only when > 0). `useAttractions` is now an infinite query: `initialPageParam: 0`,
  `getNextPageParam` returns the next offset only when the last page had a full 20 items,
  else `undefined` (→ `hasNextPage` false → control hidden). Page 1 calls `getAttractions`
  with 3 args (no offset), page N>1 with 4 — so every pre-existing 3-arg call assertion
  stayed green with no churn. Pagination resets automatically on new city / filter change
  because lat/lon/kinds/minRate are in the query key.
- **Load-more UI (AC #3/#4/#6).** A labeled, keyboard-operable "Load more" button below the
  grid; busy state disables it + `aria-busy` + "Loading…" while fetching; a next-page failure
  shows a `role="alert"` message + a retry that re-runs `fetchNextPage()` without discarding
  loaded items; an `aria-live="polite"` visually-hidden region announces the running count.
- **Dedupe (AC #5).** `dedupeAttractions` (by `xid`) is applied to the flattened accumulated
  pages before sort/render, so an overlapping xid across pages renders once. Client-side
  "Highest rating" sort from 1-4 re-sorts the accumulated list without refetching.
- **Validation.** `dotnet build BE` clean; `dotnet test BE` 259/259 (+11); `npm test`
  287/287 (+11); `npm run lint` clean (2 pre-existing warnings only); `npm run build` green.
  Live browser/Playwright QA deferred (no browser tooling this session) — recommended at review.

### File List

**Backend**
- BE/TripPlanner.Application/Parameters/AttractionSearchParameter.cs
- BE/TripPlanner.Application/Interfaces/Services/IAttractionSearchService.cs
- BE/TripPlanner.Application/UseCases/Location/GetAttractionsForLocationUseCase.cs
- BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs
- BE/TripPlanner.API/Validators/AttractionSearchParameterValidator.cs
- BE/TripPlanner.Tests/LocationServiceTests.cs
- BE/TripPlanner.Tests/OpenTripMapAttractionSearchServiceTests.cs
- BE/TripPlanner.Tests/AttractionSearchParameterValidatorTests.cs

**Frontend**
- FE/src/features/destinations/api.ts
- FE/src/features/destinations/hooks.ts
- FE/src/features/destinations/attractionFilters.ts
- FE/src/features/destinations/SearchPage.tsx
- FE/src/features/destinations/SearchPage.module.css
- FE/src/features/destinations/api.test.ts
- FE/src/features/destinations/SearchPage.test.tsx

**Docs**
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/archive/1-5-attraction-list-pagination.md

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-21 | 0.1 | Story drafted for Feature 1 US3-AC7 (optional pagination / load-more). Adds a paged attraction fetch (provider offset if supported, else expand-and-slice), enrichment scoped to the requested page, and a FE "Load more" append control with dedupe + reset. Central open question: OpenTripMap `/radius` offset support — resolve in Task 0. Composes with story 1-4 filters. Created via dev-story analysis; ready-for-dev. | Quanhvo |
| 2026-07-22 | 1.0 | Implemented all tasks. Task 0: live `/radius` offset support unconfirmable (docs parked/JS-rendered, swagger needs a key) → chose Approach B (expand-and-slice: request `limit = offset + pageSize`, slice the window, enrich only that window) — robust regardless of provider offset support, page-1 byte-for-byte identical. Backend `Offset` param (validated 0–1000) threaded through use case → service. FE `useInfiniteQuery` with offset pageParam, dedupe-by-xid, auto-reset via query key, and an accessible busy/error "Load more" control. BE 259/259 (+11), FE 287/287 (+11), lint clean, both builds green. Live browser QA deferred. Status → review. | Amelia (Dev Agent) |

## Review Findings

_Adversarial code review 2026-07-22 (4 layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor). Scoped to story 1-5's File List plus the intermingled uncommitted story 1-4 filter/sort files (both stories sit uncommitted on the same baseline). 3 decision-needed, 3 patch, 1 deferred, 5 dismissed as noise._

- [x] [Review][Defer] Approach B paging can under-return / silently lose items — (a) unnamed/xid-less features inside the expanding provider window make a page return <20 *named* items, so `getNextPageParam` (keyed on `length === 20`) hides "Load more" while deeper attractions still exist; (b) each Load More is an independent `radius` re-fetch with `limit = offset + 20` then `.Skip(offset)`, so if OpenTripMap reorders results between calls, boundary items are dropped — `dedupeAttractions` catches duplicates but never gaps. **Decision (2026-07-22): Accept + document.** Known, tolerable limitation of the sanctioned Approach B for this *optional* AC7; hardening (over-fetch buffer / raw-count has-more signal) deferred to a follow-up. [BE/…/OpenTripMapAttractionSearchService.cs:32-36; FE/src/features/destinations/hooks.ts:49-50]
- [x] [Review][Patch] Restore default attraction quality floor to `rate=2` [BE/…/OpenTripMapAttractionSearchService.cs:18] — **Decision (2026-07-22): restore rate=2.** `MinimumRate` was changed `"2"`→`"1"`, contradicting story 1-4's recorded "preserve interesting_places/rate=2 defaults byte-for-byte" intent. **FIXED:** reverted the constant to `"2"`; updated the default-rate assertion in `OpenTripMapAttractionSearchServiceTests`.
- [x] [Review][Decision-Accepted] Client-side "Highest rating" sort orders loaded pages only + reflows the grid on append — `sortAttractions(loadedAttractions, sort)` sorts the accumulated list, so higher-rated items on not-yet-loaded pages never surface and appending re-interleaves rendered cards (contradicts AC3's literal "no full-grid reflow"). **Decision (2026-07-22): Accept + document.** Reflow-on-append is acceptable once a user opts into a sort; "sorts loaded results only" is a documented limitation, no code change. [FE/src/features/destinations/SearchPage.tsx:1104,1224]
- [x] [Review][Patch] Filter/sort controls vanish on a "Load more" error [FE/src/features/destinations/SearchPage.tsx:267] — `AttractionControls` is gated on `!attractions.isError`; per the Dev Notes, a rejected `fetchNextPage()` flips the top-level `isError` in `useInfiniteQuery` v5 even with page-1 data present, so the whole control bar disappears until retry succeeds. 1-5's switch to `useInfiniteQuery` makes this a common path (any provider hiccup on page 2+); previously deferred from 1-4 only for the rarer filter-error path. **FIXED:** now gated on `!(attractions.isError && loadedAttractions.length === 0)`, mirroring the whole-list error block; added an assertion to the next-page-error test that the controls remain.
- [x] [Review][Patch] Offset ceiling off-by-one-page → permanent retry failure [FE/src/features/destinations/hooks.ts:50; BE/TripPlanner.API/Validators/AttractionSearchParameterValidator.cs:21] — `getNextPageParam` yields offsets …980, 1000, 1020; the validator caps `Offset` at 1000, so the offset=1020 request 400s and "Try again" refires the same failing offset forever. Only reachable on 50+ full pages. **FIXED:** added `ATTRACTIONS_MAX_OFFSET = 1000`; `getNextPageParam` returns `undefined` once the next offset would exceed the ceiling, so pagination stops cleanly instead of 400-looping.
- [x] [Review][Patch] Missing reset-on-new-city tests for the chip and autosuggest selection paths [FE/src/features/destinations/SearchPage.test.tsx] — `handleSelectLocation` resets filters/sort at all five selection sites, but only the result-list path was covered. **FIXED:** added a suggestion-dropdown reset test (sets category+minRate, picks a new city from the suggestion list, asserts defaults refetched + controls cleared). The chip path is not separately testable — popular-search chips are hidden once a query is submitted, and filters require a selected city, so a chip click can never follow an active filter.
- [x] [Review][Defer] O(n²) deep pagination — each page re-fetches and discards all prior features [BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs:28] — deferred, inherent to the sanctioned Approach B and bounded by the offset cap (enrichment is correctly windowed).
