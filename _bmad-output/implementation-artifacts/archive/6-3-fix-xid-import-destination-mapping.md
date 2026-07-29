---
baseline_commit: f00b40f4c8dcc65b031ea66b055918d806f36eb7
---

# Story 6.3: Fix xid-import destination mapping (category, rating)

Status: review

## Story

As the project owner,
I want a destination imported into a trip by its provider xid to be persisted with its real category and rating instead of being silently miscategorized and zero-rated,
so that trips built from the "add from details page" flow (Epic 2 / Epic 3 US3 AC2) show correct data instead of every imported place looking like an unrated landmark.

Origin: code-level finding from [[6-2-backend-code-review-epics-1-4]] (see `_bmad-output/implementation-artifacts/backend-code-review-report.md`, Epic 2 section, findings #1 and #2). Distinct from [[6-1-backend-requirements-verification]] and 6-2 themselves — this story fixes the confirmed defect rather than documenting it.

## Scope

- **Bug (High):** `AddDestinationToTripDayUseCase.ResolveDestinationAsync` (`BE/TripPlanner.Application/UseCases/TripDay/AddDestinationToTripDayUseCase.cs:97`) unconditionally does `new Landmark(details.Name, 0, details.OpeningHours ?? string.Empty, details.Xid)` when importing an unseen xid — every imported destination becomes a `Landmark` with `Rating = 0`, regardless of its real OpenTripMap category or rating.
- **Test gap (Medium):** the covering test (`TripDayServiceTests.cs`, `AddDestinationToTripDayAsync_XidNotImported_CreatesDestinationFromProviderDetails`) only asserts `Name`/`ExternalId`, so it can't catch category/rating regressions. Its `DestinationDetailsResponse` fixture doesn't even set `Category`.
- **In scope:** fix category classification (`Restaurant` vs `Landmark`) and real rating persistence for xid-imported destinations; extend the fixture/assertions so the test actually guards this behavior.
- **Explicitly out of scope (do not implement):** persisting `Description`, `Address`, `Website`, or `ImageUrls` on the `Destination` entity. `DestinationResponse` (`BE/TripPlanner.Application/DTOs/Responses/DestinationResponse.cs`) — what `GetTrip`/`AddDestinationToTripDay` actually return to clients — exposes only `Id, Name, Rating, Category, OpeningHours, CuisineType, IsHalalFriendly`; there is no current consumer of image/description/address/website for a *persisted* trip destination (that data is only ever shown live from `GET /api/locations/{xid}/details`, which is unaffected by this bug). Adding those fields would require new `Destination` columns and a migration with no corresponding read path — out of scope per CLAUDE.md's guidance against speculative work. If a future story needs to surface them on trip destinations, it should extend `DestinationResponse`/`ApplicationMapper` and add the columns then.

## Acceptance Criteria

1. When importing an unseen xid whose OpenTripMap `Category` (from `DestinationDetailsResponse.Category`, e.g. `"kinds"` values like `"restaurants"`, `"foods"`) indicates a food/restaurant place, the created `Destination` is a `Restaurant`, not a `Landmark`. All other categories (including `null`/unrecognized) continue to create a `Landmark` — preserving current behavior as the default.
2. `Restaurant`'s constructor gains an optional `externalId` parameter (mirroring `Landmark`'s) so an imported restaurant is round-trippable by xid via `IDestinationRepository.GetByExternalIdAsync`, exactly like `Landmark` already is.
3. The imported destination's `Rating` reflects the provider's real rating when available, not a hardcoded `0`. `DestinationDetailsResponse` gains a `Rating` (nullable `double`) field, populated by `OpenTripMapDestinationDetailsService` from the same `OpenTripMapPlaceModel.Rate` string already used elsewhere in the codebase for the `rate` taxonomy (`"1"`–`"3"`, `"h"`-suffixed cultural-heritage variants — reuse or mirror whatever parsing convention `AttractionResponse.Rating`/its mapping already uses, do not invent a new one). When the provider gives no parseable rating, persist `0` exactly as today (documented as the "no data" sentinel — do not add a nullable `Rating` column to `Destination`, that's a larger schema change outside this story's scope).
4. The reuse-by-xid path (`existing is not null` branch) is unchanged — this story only touches the create branch.
5. No other `AddDestinationToTripDayUseCase` behavior (duplicate-on-day rejection, not-found/service-unavailable mapping, ownership checks) changes.
6. `TripDayServiceTests.cs`'s `AddDestinationToTripDayAsync_XidNotImported_CreatesDestinationFromProviderDetails` test (or a split-out replacement) is extended/added so it: (a) sets `Category` and a parseable `Rate`-equivalent in its fixture for a restaurant-like xid and asserts the created destination is a `Restaurant` with the expected `CuisineType`/rating; (b) keeps or adds a landmark-path case asserting `Landmark` is still created for non-restaurant categories, with the real (non-zero, when available) rating asserted, not just `Name`/`ExternalId`.
7. `dotnet build BE` succeeds with 0 warnings/errors and `dotnet test BE` passes 100% (all existing tests plus the new/extended ones).

## Tasks / Subtasks

- [x] Task 1: Add rating to the provider details pipeline (AC: 3)
  - [x] Confirm how `AttractionResponse.Rating`/its mapping parses `OpenTripMapPlaceModel.Rate` (or the equivalent model used for `/radius`+`/xid` enrichment) today — reuse that exact parsing logic or a shared helper, do not duplicate slightly-different logic
  - [x] Add `Rating` (nullable `double`) to `DestinationDetailsResponse` (`BE/TripPlanner.Application/DTOs/Responses/DestinationDetailsResponse.cs`)
  - [x] Populate it in `OpenTripMapDestinationDetailsService.GetDetailsAsync` from `place.Rate` using the confirmed parsing convention
- [x] Task 2: Add category-aware construction to `Restaurant` (AC: 2)
  - [x] Add an optional `externalId` constructor parameter to `Restaurant` (`BE/TripPlanner.Domain/Models/Restaurant.cs`), mirroring `Landmark`'s signature, defaulting to `null`
  - [x] Confirm `Restaurant`/`Destination` EF configuration (`Infrastructure/Data/Configurations/`) doesn't need changes for the new optional ctor param (it maps to the existing `ExternalId` column already used by `Landmark`) — if it does, make the minimal config change, no migration should be needed since the column already exists on the shared `Destination` base
- [x] Task 3: Fix the import branch in `AddDestinationToTripDayUseCase` (AC: 1, 3, 4, 5)
  - [x] Determine which `details.Category` values map to `Restaurant` (OpenTripMap `kinds` taxonomy — e.g. values under `foods`/`restaurants`; check `epic/epic-1-destination-suggestion.md`'s taxonomy reference and any existing category-classification helper before writing new logic — reuse if one exists, otherwise add a small, narrowly-scoped helper)
  - [x] Replace the hardcoded `new Landmark(details.Name, 0, ...)` at `AddDestinationToTripDayUseCase.cs:97` with a branch: `Restaurant` (with parsed `CuisineType` from category, `IsHalalFriendly` defaulted appropriately, `details.Rating ?? 0`, xid) vs `Landmark` (unchanged shape, but `details.Rating ?? 0` instead of literal `0`)
  - [x] Verify the reuse-by-xid branch and all other error paths are untouched
- [x] Task 4: Close the test gap (AC: 6, 7)
  - [x] Extend `AddDestinationToTripDayAsync_XidNotImported_CreatesDestinationFromProviderDetails`'s fixture with a restaurant-category `DestinationDetailsResponse` and a parseable rating; assert the created destination is a `Restaurant` with the expected fields
  - [x] Add/keep a landmark-path assertion covering a non-restaurant category with a real rating asserted (not just `Name`/`ExternalId`)
  - [x] Run `dotnet build BE` and `dotnet test BE`; fix any failures; confirm 100% pass

## Dev Notes

- Read [[6-2-backend-code-review-epics-1-4]] and `_bmad-output/implementation-artifacts/backend-code-review-report.md` (Epic 2 section) first — they contain the exact file:line evidence this story is fixing.
- This is a production-code fix story (unlike 6-1/6-2, which were review-only). Repo conventions from `CLAUDE.md` apply in full: braces required on every control-flow statement, no comments (XML/inline/block) anywhere, xUnit + NSubstitute with `Method_Scenario_ExpectedResult` naming for any new/modified test.
- Do not touch `Description`/`Address`/`Website`/`ImageUrls` persistence — see the Scope section's explicit exclusion and rationale. Resist the temptation to "finish the job" beyond what AC 1-7 state; that's a separate future story if a real consumer needs it.
- `Restaurant.CuisineType`/`IsHalalFriendly` have no OpenTripMap-provided equivalent — pick simple, defensible defaults (e.g. `CuisineType = "Unknown"` or the raw provider category string, `IsHalalFriendly = false`) and state the choice in Completion Notes; do not over-engineer a cuisine-inference system.
- Before writing the category→type classification logic, grep the codebase for any existing kinds/category helper (e.g. anything analogous to `CountryNameHelper` for locations) — reuse conventions already established rather than inventing a new taxonomy mapping style.
- No EF Core migration is expected: `Destination.Rating` and `Destination.ExternalId` are existing columns on the shared base table; `Restaurant` gaining an optional ctor param that sets the already-mapped `ExternalId` should not require a schema change. If your investigation finds otherwise, HALT and confirm with the user before adding a migration — that would expand scope.

### Project Structure Notes

- Touches: `BE/TripPlanner.Application/DTOs/Responses/DestinationDetailsResponse.cs`, `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs`, `BE/TripPlanner.Domain/Models/Restaurant.cs`, `BE/TripPlanner.Application/UseCases/TripDay/AddDestinationToTripDayUseCase.cs`, `BE/TripPlanner.Tests/TripDayServiceTests.cs`. No new files expected unless a small category-classification helper is warranted (place it under `Application/Helpers/` alongside `CountryNameHelper.cs` if so).
- No conflicts with the unified Clean Architecture layout — all changes stay within their existing layers (Domain entity, Infrastructure adapter, Application DTO/use case, Tests).

### References

- [Source: _bmad-output/implementation-artifacts/backend-code-review-report.md#Epic 2 — Destination Details]
- [Source: _bmad-output/implementation-artifacts/archive/6-2-backend-code-review-epics-1-4.md]
- [Source: epic/epic-2-destination-details.md#Technical approach]
- [Source: epic/epic-1-destination-suggestion.md#Technical approach] (OpenTripMap `kinds`/`rate` taxonomy reference)
- [Source: CLAUDE.md#Code Style]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `dotnet build BE` — 0 Warning(s), 0 Error(s)
- `dotnet test BE` — Passed: 120, Failed: 0, Skipped: 0

### Completion Notes List

- Confirmed no existing numeric-rating parsing convention exists in the codebase: `AttractionResponse.Rating` is a raw passthrough of `OpenTripMapPlaceModel.Rate` (`string?`, e.g. `"1"`–`"3"`/`"1h"`–`"3h"`), never converted to a number anywhere. Added a small `ParseRating` helper in `OpenTripMapDestinationDetailsService` that takes the leading digit run of `Rate` (ignoring the `h` cultural-heritage suffix) and parses it to `double?`, returning `null` when nothing parseable is present — mirrors the existing "same field, same taxonomy" convention rather than inventing a new one.
- Added `DestinationCategoryHelper.IsRestaurantCategory` (`Application/Helpers/`) — no existing kinds/category classification helper was found (grepped for one per Dev Notes). Classifies via case-insensitive substring match on `"food"`/`"restaurant"` against `DestinationDetailsResponse.Category` (the primary OpenTripMap `kinds` value); everything else (including `null`) defaults to `Landmark`, preserving prior behavior.
- For xid-imported `Restaurant`s with no OpenTripMap-provided cuisine/halal signal: `CuisineType` is set to the raw provider category string (e.g. `"foods"`) falling back to `"Unknown"` if absent; `IsHalalFriendly` defaults to `false`. No cuisine-inference system was built, per Dev Notes guidance.
- `Restaurant`'s new `externalId` ctor param is optional/trailing and defaults to `null`, so all existing call sites (`DestinationServiceTests`, `TripDayTests`, EF seed data) are unaffected — verified via grep and confirmed by the full test run.
- No EF Core migration needed: `Rating`/`ExternalId` are existing columns on the shared `Destination` base table; verified `DestinationConfiguration`/`RestaurantConfiguration`/`LandmarkConfiguration` require no changes.
- Split the single covering test into two: a landmark-path case (non-restaurant category, real non-zero rating) and a new restaurant-path case (restaurant category, real rating, `CuisineType`/`IsHalalFriendly` asserted), both now asserting concrete `Landmark`/`Restaurant` types via `Assert.IsType`, not just `Name`/`ExternalId`.
- Left `Description`/`Address`/`Website`/`ImageUrls` persistence untouched, per the Scope section's explicit exclusion.

### File List

- `BE/TripPlanner.Application/DTOs/Responses/DestinationDetailsResponse.cs` (modified)
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs` (modified)
- `BE/TripPlanner.Domain/Models/Restaurant.cs` (modified)
- `BE/TripPlanner.Application/Helpers/DestinationCategoryHelper.cs` (new)
- `BE/TripPlanner.Application/UseCases/TripDay/AddDestinationToTripDayUseCase.cs` (modified)
- `BE/TripPlanner.Tests/TripDayServiceTests.cs` (modified)

## Change Log

- 2026-07-13: Fixed xid-import destination mapping — imported destinations now classify as `Restaurant` vs `Landmark` based on OpenTripMap category and persist the provider's real rating instead of a hardcoded `Landmark`/`0`. Extended `TripDayServiceTests` to cover both paths with real assertions on type, category, and rating.
