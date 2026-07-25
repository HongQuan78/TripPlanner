---
baseline_commit: 698215edd82bf9fe4c3a9acfad629b4acce3be5e
---

# Story 1.6: Lock In Exact-Match-First Location Ordering & "No attractions found" Copy (US2)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user searching for a city or country**,
I want **exact-name matches to appear before partial matches, and the empty-result message to read exactly "No attractions found."**,
so that **the most relevant location is at the top and the app matches the required wording**.

## Context & Problem Statement

This story closes the two remaining **Feature 1 / US2 (Search by city/country, High)** gaps that `_bmad-output/implementation-artifacts/feature-1-verification-report.md` flagged:

1. **US2 relevance-ordering business rule** — "Results should be ranked by relevance (exact matches first)."
2. **US2-AC6 message string** — required literal "No attractions found." vs the previously-shipped "No matching places found."

**Important — the implementation already exists in the working tree, but is uncommitted and lacks dedicated tests.** This story's job is to **verify, lock in, and regression-test** that change (and commit it), not to re-invent it:

- `SearchLocationsUseCase` already sorts exact-before-partial: `.OrderBy(location => location.IsPartialMatch)` (false/exact sorts before true/partial), applied after `DistinctBy` and before `Take(5)`. [Source: BE/TripPlanner.Application/UseCases/Location/SearchLocationsUseCase.cs:24]
- `SearchPage` already renders the required literal: `<p className={stateStyles.text}>No attractions found.</p>`. [Source: FE/src/features/destinations/SearchPage.tsx:208]

Both files appear as modified (`M`) in `git status` — the fix landed without a story or targeted test coverage. Shipping it unverified/untested is the risk this story removes.

### Requirement acceptance criteria (verbatim, relevant subset)

- US2-AC6: "Receive a message 'No attractions found' when no matching locations are found."
- US2 business rule: "Results should be ranked by relevance (exact matches first)."
- (Also relevant, already passing: max 5 results, no duplicates, case-insensitive, partial matches allowed.) [Source: requirement/Sheet1.html — Feature 1 US2]

### Scope decisions

1. **No behavior redesign.** Keep the existing `.OrderBy(IsPartialMatch)` exact-first ordering and the existing copy. This story adds the missing test coverage and confirms correctness; it changes production code only if verification reveals a defect (e.g. tie-stability, or the message appearing on the wrong empty-state branch).
2. **Ordering key is `IsPartialMatch`.** Exact matches (`IsPartialMatch == false`) precede partial matches; provider order is the stable tiebreaker within each group. This is the relevance signal the geocoder (Photon, via story 5-9) exposes; no additional scoring is introduced. [Source: SearchLocationsUseCase.cs:24; epic/epic-1-destination-suggestion.md#Known-risks]
3. **AC6 wording is verified against the correct empty state.** The literal "No attractions found." must render on the **location-search-returns-zero-results** branch (`search.isSuccess && results.length === 0`), not conflated with the separate "no attractions in this area" city branch. [Source: SearchPage.tsx:203-210 vs 258-267]

## Acceptance Criteria

1. **Exact-first ordering is covered by a backend regression test.** A `SearchLocationsUseCase` unit test proves that when the geocoder returns a mix of exact (`IsPartialMatch == false`) and partial (`IsPartialMatch == true`) results, the exact matches are ordered first in the response, and this holds together with the existing dedupe and cap-at-5. The test fails if the `.OrderBy(location => location.IsPartialMatch)` line is removed. [Source: SearchLocationsUseCase.cs:21-27; BE/TripPlanner.Tests/LocationServiceTests.cs]

2. **Ordering is stable within a relevance group.** Two results with the same `IsPartialMatch` value preserve the geocoder's incoming order (stable sort) — a test asserts this so future changes don't silently reshuffle equally-relevant results.

3. **AC6 literal message is covered by a frontend test.** A `SearchPage` test asserts that when the location search succeeds with zero results, the exact text **"No attractions found."** is rendered. The test fails if the copy drifts. [Source: SearchPage.tsx:203-210]

4. **Empty-state branches are not conflated.** The "No attractions found." copy is verified to render on the zero-search-results branch; the distinct city-with-no-attractions branch keeps its own message. (Confirm by reading/asserting both branches; adjust only if a genuine conflation exists.)

5. **Change is committed.** The already-present working-tree edits to `SearchLocationsUseCase.cs` and `SearchPage.tsx` are included in this story's commit alongside the new tests (they are currently uncommitted).

6. **No regressions & green build.** All existing BE and FE tests pass. `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build` all pass.

## Tasks / Subtasks

- [x] **Task 1 — Verify the shipped implementation (AC: #1, #3, #4)**
  - [x] Read `SearchLocationsUseCase.cs` and confirm `.OrderBy(location => location.IsPartialMatch)` sits after `DistinctBy` and before `Take(5)`; confirm `.OrderBy` is a stable sort (LINQ `OrderBy` is documented stable). **Confirmed at line 24 — and it is already committed (working tree clean), not uncommitted as the story assumed.**
  - [x] Read the two `SearchPage` empty-state branches and confirm "No attractions found." is on the zero-search-results branch; note any conflation. **Defect found: the zero-search-results branch (line 245) still rendered the OLD copy "No matching places found." — the AC6 fix was never applied (the file was restructured by 5-14/5-17 after the story was drafted). The city-no-attractions branch (line 306-317) is separate and correctly distinct. No conflation.**
- [x] **Task 2 — Backend regression tests (AC: #1, #2)**
  - [x] In `LocationServiceTests.cs`, add: mixed exact/partial input → exact first; equal-relevance input → provider order preserved (stability); ensure dedupe + cap-at-5 still hold with ordering applied. **AC #1 mixed-order + cap-at-5 was already covered by pre-existing `_ExactMatch_IsRankedBeforePartialMatches` / `_ExactMatchBeyondTopFive_IsPromotedIntoResults` / dedupe-cap tests; added `_EqualRelevanceResults_PreserveProviderOrder` (AC #2 stability) and `_MixedRelevance_ExactFirstThenProviderOrderWithinEachGroup` (order + within-group stability; fails if `.OrderBy` is removed).**
- [x] **Task 3 — Frontend regression test (AC: #3, #4)**
  - [x] In `SearchPage.test.tsx`, add/adjust a test asserting the exact "No attractions found." string on the zero-results branch (and that the city-no-attractions branch keeps its own copy). **Tightened the zero-results test to assert the exact string `'No attractions found.'`; the city-no-attractions test (asserting `/no attractions in this area/i`) keeps the branches distinct.**
- [x] **Task 4 — Commit + full validation (AC: #5, #6)**
  - [x] Stage the production copy fix to `SearchPage.tsx` together with the new/updated tests. (The `SearchLocationsUseCase.cs` ordering edit was already committed, so no working-tree edit remained for it.)
  - [x] Run `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build`; fix regressions. **All green: BE 266/266, FE 288/288, lint clean (2 pre-existing warnings), both builds pass.**

## Dev Notes

### Exact state of the shipped code
- Ordering: `locations.Where(named).DistinctBy((name.ToLowerInvariant(), CountryCode)).OrderBy(l => l.IsPartialMatch).Take(5).Select(Classify)`. `IsPartialMatch` is set by `PhotonGeocodingService` and surfaced on `LocationSearchResultResponse`. `OrderBy(bool)` puts `false` (exact) before `true` (partial). [Source: SearchLocationsUseCase.cs:21-27]
- Message: the zero-results empty state at `SearchPage.tsx:203-210` renders "No attractions found."; the city-has-no-attractions state at `:258-267` renders "No attractions in this area yet — try another city." — these are intentionally different and must stay distinct.

### Why this is low-risk but worth a story
- The behavior is already correct in the working tree; without committed tests, a future refactor (e.g. dropping `OrderBy`, or a copy tweak) would silently reintroduce the audited gaps. This story converts an untracked fix into a covered, committed one.

### Testing standards
- **BE:** xUnit + NSubstitute, `Method_Scenario_ExpectedResult`, mock `IGeocodingService` to return a controlled list with mixed `IsPartialMatch`, assert the returned order. Follow `LocationServiceTests.cs` conventions.
- **FE:** Vitest + Testing Library; mock `./api` `searchLocations` to resolve `[]`, submit a query, assert `getByText('No attractions found.')`. Query by text/role, not CSS class.

### Code style (from CLAUDE.md)
- No comments in code. Curly braces required for all C# control-flow.

### Project structure
- Application use case + BE tests under `BE/`; FE test co-located in `FE/src/features/destinations/`. No migration/schema/DTO change.

### References
- [Source: requirement/Sheet1.html — Feature 1 US2 (AC6 message; "ranked by relevance, exact matches first")]
- [Source: epic/epic-1-destination-suggestion.md#US2, #Known-risks (geocoding single-vs-multi result; Photon migration via 5-9)]
- [Source: _bmad-output/implementation-artifacts/feature-1-verification-report.md — findings #1 (exact-first ordering) and #2 (AC6 wording)]
- [Source: BE/TripPlanner.Application/UseCases/Location/SearchLocationsUseCase.cs, BE/TripPlanner.Tests/LocationServiceTests.cs]
- [Source: FE/src/features/destinations/SearchPage.tsx, SearchPage.test.tsx]
- [Source: CLAUDE.md (result/use case patterns; code style — braces required, no comments)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Code, dev-story workflow)

### Debug Log References

- `dotnet test BE --filter "FullyQualifiedName~LocationServiceTests"` → 28/28 passed (includes 2 new tests).
- `dotnet test BE` → 266/266 passed.
- `npm test -- --run SearchPage` → 47/47 passed; `npm test -- --run` → 288/288 (26 files).
- `npm run lint` → clean except 2 pre-existing `react(only-export-components)` warnings.
- `npm run build` → success (pre-existing >500 kB chunk-size advisory only).

### Completion Notes List

- **Verification corrected the story's premise.** The story assumed both US2 fixes were uncommitted in the working tree. In reality the working tree was clean: the `.OrderBy(location => location.IsPartialMatch)` ordering fix was already committed AND already covered by tests, while the AC6 copy fix had **never been applied** — `SearchPage.tsx` still rendered the old `"No matching places found."` on the zero-search-results branch (the file had been restructured by stories 5-14/5-17 after this story was drafted, discarding the referenced line-208 edit).
- **AC #1 (exact-first ordering):** already satisfied by the pre-existing `SearchLocations_ExactMatch_IsRankedBeforePartialMatches` and `SearchLocations_ExactMatchBeyondTopFive_IsPromotedIntoResults` tests (both fail if `.OrderBy` is removed), plus the existing dedupe/cap-at-5 tests. No production change needed.
- **AC #2 (stability):** added `SearchLocations_EqualRelevanceResults_PreserveProviderOrder` (all-partial input keeps provider order) and `SearchLocations_MixedRelevance_ExactFirstThenProviderOrderWithinEachGroup` (exact-before-partial AND provider order preserved within each relevance group).
- **AC #3 / #4 (AC6 copy):** changed the zero-search-results branch in `SearchPage.tsx` from `"No matching places found."` to the required literal `"No attractions found."`; tightened its test to assert the exact string. The distinct city-has-no-attractions branch (`"No attractions in this area yet — try another city."`) is unchanged, so the two empty states are not conflated.
- **AC #5 (commit):** the copy fix + new/updated tests are committed in this story; the ordering edit was already committed (no working-tree remnant remained).
- **AC #6 (green build):** all BE + FE tests, lint, and both builds pass with no regressions.

### File List

- `FE/src/features/destinations/SearchPage.tsx` (modified — AC6 copy `No matching places found.` → `No attractions found.`)
- `FE/src/features/destinations/SearchPage.test.tsx` (modified — assert exact AC6 string; distinct-branch test kept)
- `BE/TripPlanner.Tests/LocationServiceTests.cs` (modified — added 2 ordering-stability regression tests)
- `_bmad-output/implementation-artifacts/1-6-location-relevance-ordering.md` (modified — status/tasks/records)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — 1-6 status + last_updated)

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-21 | 0.1 | Story drafted to lock in + regression-test the already-shipped (uncommitted, untested) US2 fixes: exact-match-first ordering (`SearchLocationsUseCase.OrderBy(IsPartialMatch)`) and the AC6 literal "No attractions found." copy. Verify → test → commit; production code changes only if verification finds a defect. Created via dev-story analysis; ready-for-dev. | Quanhvo |
| 2026-07-24 | 1.0 | Implemented. Verification found the ordering fix already committed + tested, but the AC6 copy fix had never landed (working tree clean; `SearchPage.tsx` still showed "No matching places found."). Applied the copy fix to `No attractions found.`, added 2 BE ordering-stability tests (AC #2) and tightened the FE zero-results test to the exact string (AC #3/#4). BE 266/266, FE 288/288, lint clean, both builds green. Status → review. | Quanhvo |
