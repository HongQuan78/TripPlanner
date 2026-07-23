---
baseline_commit: 698215edd82bf9fe4c3a9acfad629b4acce3be5e
---

# Story 1.6: Lock In Exact-Match-First Location Ordering & "No attractions found" Copy (US2)

Status: ready-for-dev

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

- [ ] **Task 1 — Verify the shipped implementation (AC: #1, #3, #4)**
  - [ ] Read `SearchLocationsUseCase.cs` and confirm `.OrderBy(location => location.IsPartialMatch)` sits after `DistinctBy` and before `Take(5)`; confirm `.OrderBy` is a stable sort (LINQ `OrderBy` is documented stable).
  - [ ] Read the two `SearchPage` empty-state branches and confirm "No attractions found." is on the zero-search-results branch; note any conflation.
- [ ] **Task 2 — Backend regression tests (AC: #1, #2)**
  - [ ] In `LocationServiceTests.cs`, add: mixed exact/partial input → exact first; equal-relevance input → provider order preserved (stability); ensure dedupe + cap-at-5 still hold with ordering applied.
- [ ] **Task 3 — Frontend regression test (AC: #3, #4)**
  - [ ] In `SearchPage.test.tsx`, add/adjust a test asserting the exact "No attractions found." string on the zero-results branch (and that the city-no-attractions branch keeps its own copy).
- [ ] **Task 4 — Commit + full validation (AC: #5, #6)**
  - [ ] Stage the working-tree edits to `SearchLocationsUseCase.cs` and `SearchPage.tsx` together with the new tests.
  - [ ] Run `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build`; fix regressions.

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

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-21 | 0.1 | Story drafted to lock in + regression-test the already-shipped (uncommitted, untested) US2 fixes: exact-match-first ordering (`SearchLocationsUseCase.OrderBy(IsPartialMatch)`) and the AC6 literal "No attractions found." copy. Verify → test → commit; production code changes only if verification finds a defect. Created via dev-story analysis; ready-for-dev. | Quanhvo |
