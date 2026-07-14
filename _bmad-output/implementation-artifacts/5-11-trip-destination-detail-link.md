---
baseline_commit: eccf53f15baf3f1ec05f085ec04ea4e10a6d9cc1
---

# Story 5.11: Link trip destinations to their detail view

Status: done

## Story

As a logged-in user viewing a trip's itinerary at `/trips/:id`,
I want to click a destination in a day to open its full detail view (photos, description, address, opening hours, website),
so that I can revisit or double-check a place I've already added without having to re-search for it.

## Acceptance Criteria

1. **Trip destination is clickable:** on `/trips/:id`, each destination row in a day section is a link to `/attractions/{xid}` (the existing `DestinationDetailsPage` from story 5-4), when the destination has a resolvable external id (`xid`). Clicking navigates to the details page and it renders that destination's full detail (name, category, description, photos, address, opening hours, website) exactly as it does when reached from search.
2. **Graceful fallback for un-linkable destinations:** if a destination in the trip has no `xid` (e.g. legacy/seed data added before external ids were tracked, or added via the internal `destinationId` path with no external id on record), the row renders as plain (non-clickable) text exactly as today — no dead link, no error.
3. **Remove control still works:** the existing "Remove" button inside each destination row remains a distinct interactive control — wrapping the row (or the name) in a link must not make Remove part of the link's click target or produce nested-interactive-element markup (no `<button>` inside an `<a>`).
4. **Backend exposes the external id:** `GET /api/trips/{id}` (and by extension `GET /api/trips`) includes each destination's external id in the JSON response so the frontend can build the link, without changing any other field already returned.
5. Unit tests cover: BE mapping test asserting `DestinationResponse` carries the external id when the domain `Destination.ExternalId` is set and `null` when it is not; FE test that a trip destination row with an `xid` renders a link to `/attractions/{xid}`; FE test that a destination without an `xid` renders as non-clickable text with no link; FE test that clicking Remove does not trigger navigation.

## Tasks / Subtasks

- [x] Task 1: Expose external id on the backend response (AC: 4, 5)
  - [x] Add `string? Xid` to `DestinationResponse` (`BE/TripPlanner.Application/DTOs/Responses/DestinationResponse.cs`), naming it `Xid` (not `ExternalId`) to match the existing `Xid` naming already used on `AttractionResponse`/`DestinationDetailsResponse`/`AddDestinationToDayRequest` for frontend consistency.
  - [x] Map it in `BE/TripPlanner.Infrastructure/Mappings/MappingProfile.cs`'s existing `CreateMap<Destination, DestinationResponse>()` with `.ForMember(dest => dest.Xid, opt => opt.MapFrom(src => src.ExternalId))`.
  - [x] Add/extend a mapping test (see `BE/TripPlanner.Tests/DestinationServiceTests.cs` for existing `DestinationResponse` mapping test patterns) asserting `Xid` is populated when `ExternalId` is set and `null` when it is not (covers Task 1's AC 4/5).
- [x] Task 2: Add `xid` to the frontend `Destination` type and API layer (AC: 4)
  - [x] Add `xid: string | null` to the `Destination` interface in `FE/src/api/types.ts` (alongside `id`, `name`, `rating`, `category`, ...).
  - [x] No other API client change needed — `getTrip`/`getTrips` in `FE/src/api/trips.ts` already pass the JSON straight through; confirm no explicit field allowlist strips it.
- [x] Task 3: Make trip destination rows link to their detail page (AC: 1, 2, 3)
  - [x] In `FE/src/pages/TripPlannerPage.tsx`'s `DestinationRow`, when `destination.xid` is non-null, wrap the name (and category/rating) in a `Link to={`/attractions/${destination.xid}`}` from `react-router-dom`; when `destination.xid` is null, render the same content as plain text (current behavior unchanged).
  - [x] Keep the "Remove" `<button>` as a sibling of the link, not nested inside it (mirror the sibling-not-nested pattern `AttractionCard.tsx` already uses for its card `Link` + "Add to trip" button, called out in 5-5's review findings as the correct fix for the inverse bug).
  - [x] Add/adjust `TripPlannerPage.module.css` styling for the new link (e.g. a `.rowLink` class covering name + category + rating so hover/visited states read naturally inside the existing `.row` hover-lift; no unrelated visual changes).
- [x] Task 4: Tests (AC: 5)
  - [x] FE: extend `TripPlannerPage.test.tsx` (or equivalent) with cases — destination with `xid` renders a link to `/attractions/{xid}`; destination with `xid: null` renders plain text with no link; clicking "Remove" does not navigate (e.g. assert `onRemove`/mutation fires and location/route stays on `/trips/:id`).
  - [x] BE: the mapping test from Task 1.
- [x] Task 5: Verify — `dotnet test BE` and `npm run build && npm test` (FE) green, no regressions.

## Dev Notes

- **Root cause:** `DestinationDetailsPage` (`/attractions/:xid`) already exists and works (story 5-4) and `AttractionCard` already links to it from search results. The gap is specifically that trip-day destinations returned by `GET /api/trips/{id}` never carried the external id needed to build that link — `Destination.ExternalId` exists on the domain entity (`BE/TripPlanner.Domain/Models/Destination.cs:8`, added by migration `20260705153336_AddDestinationExternalId`) but `DestinationResponse` (`BE/TripPlanner.Application/DTOs/Responses/DestinationResponse.cs`) never exposed it, and `MappingProfile.cs`'s `CreateMap<Destination, DestinationResponse>()` never mapped it. This is a full-stack story, not FE-only.
- **Why `ExternalId` may be null:** destinations added to a trip via `{xid}` in `AddDestinationToTripDayUseCase.ResolveDestinationAsync` (`BE/TripPlanner.Application/UseCases/TripDay/AddDestinationToTripDayUseCase.cs:76-105`) always get `ExternalId` set (either from an existing `GetByExternalIdAsync` match or from an imported `Landmark`/`Restaurant` built with `details.Xid`). Destinations added via the legacy `{destinationId}` path (`AddDestinationToTripDayUseCase.cs:64-74`, looked up straight off `destinationRepository.GetByIdAsync`) could in principle reference a destination row with no `ExternalId` — this is the case AC2's fallback protects against. Do not assume `xid` is always present.
- **Naming:** use `Xid` (not `ExternalId`) on the DTO to match the existing FE-facing naming convention already used everywhere else this concept appears (`AttractionResponse.Xid`, `DestinationDetailsResponse.Xid`, `AddDestinationToDayRequest.Xid`). This keeps the frontend `Destination.xid` field name consistent with `Attraction.xid` and `DestinationDetails.xid` in `FE/src/api/types.ts`.
- **No route changes needed:** the target route `/attractions/:xid` and its page already exist and are fully built (story 5-4); this story only wires trip-day destinations into using it. Do not create a new route or duplicate the details page.
- **Reference pattern to follow:** `FE/src/components/AttractionCard.tsx:18,48-55` already demonstrates the correct card-`Link` + sibling-action-button structure this story needs to replicate in `TripPlannerPage.tsx`'s `DestinationRow` — story 5-5's own review findings previously flagged the *inverse* mistake (nesting a `<button>` inside the `<Link>`) as invalid HTML with unreliable keyboard/screen-reader behavior, so AC3 exists specifically to avoid repeating that mistake here.
- **Visual style:** follow the existing "cute sky" design tokens already used throughout `TripPlannerPage.module.css` (`var(--color-primary-dark)`, `var(--radius-*)`, the `.row` hover-lift transition) — don't introduce new design tokens for the link styling.
- Project rules: no comments in code; braces required on all control flow; CSS modules; run `dotnet test BE` and the FE `npm test`/`npm run build`/`npm run lint` before marking done.

### Project Structure Notes

- Backend change is additive only (`Xid` on an existing DTO) — no new migration, no new endpoint, no change to `TripResponse`/`TripDayResponse` shape beyond the new field.
- Frontend change touches only `types.ts` (type), `TripPlannerPage.tsx` + its `.module.css` (rendering), and their tests — no new files, no new routes, no changes to `DestinationDetailsPage` itself.

### References

- [Source: BE/TripPlanner.Domain/Models/Destination.cs] — `ExternalId` property
- [Source: BE/TripPlanner.Application/DTOs/Responses/DestinationResponse.cs] — DTO to extend
- [Source: BE/TripPlanner.Infrastructure/Mappings/MappingProfile.cs] — mapping profile to extend
- [Source: BE/TripPlanner.Application/UseCases/TripDay/AddDestinationToTripDayUseCase.cs] — why `ExternalId`/`xid` can be null
- [Source: FE/src/components/AttractionCard.tsx] — existing correct Link+button sibling pattern
- [Source: FE/src/pages/TripPlannerPage.tsx] — `DestinationRow` to modify
- [Source: _bmad-output/implementation-artifacts/5-4-destination-details.md] — `/attractions/:xid` route/page this story links into
- [Source: _bmad-output/implementation-artifacts/5-5-trip-planner-ui.md] — prior review finding on the inverse nested-interactive-element bug in `AttractionCard.tsx`

## Change Log

- 2026-07-14: Implemented story — exposed `Xid` on `DestinationResponse` (BE), added `xid` to the FE `Destination` type, linked trip destination rows to `/attractions/{xid}` with a plain-text fallback and a sibling (non-nested) Remove button, and added BE/FE test coverage. All tasks complete; full BE/FE suites green.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- A running `TripPlanner.API` dev-server process (PID 39324) held a file lock on its own build output, which blocked `dotnet test BE`/`dotnet build BE` with MSB3027 copy errors. Stopped the process (with user confirmation) to unblock the build; no code issue.
- `MapperConfiguration(Action<IMapperConfigurationExpression>)` single-arg constructor no longer exists on AutoMapper 16.1.1 (used by this repo); the test-only `MapperConfiguration` call needed the `ILoggerFactory` overload (`NullLoggerFactory.Instance`) to compile.

### Completion Notes List

- Backend: added `Xid` to `DestinationResponse`, mapped from `Destination.ExternalId` in `MappingProfile`. Added a new `MappingProfileTests.cs` that builds a real AutoMapper `MapperConfiguration` (not the mocked `IApplicationMapper` used elsewhere in the test suite) to assert `Xid` is populated/null based on `ExternalId`, since no existing test exercised the actual AutoMapper profile.
- Frontend: added `xid: string | null` to the `Destination` type; confirmed `getTrip`/`getTrips` pass the API response through unmodified so no further API-layer change was needed.
- Frontend: `DestinationRow` in `TripPlannerPage.tsx` now wraps name/category/rating in a `Link` to `/attractions/{xid}` when `xid` is present, or a plain `<span>` with identical layout when it is `null`; the "Remove" button remains a sibling (never nested inside the link), mirroring `AttractionCard.tsx`'s existing card-Link + sibling-button pattern. Added `.rowLink`/`.rowContent` styles reusing existing design tokens (no new tokens).
- Tests added: 2 BE (`MappingProfileTests`: `Xid` populated vs. null), 3 FE (`TripPlannerPage.test.tsx`: renders a link for an `xid` destination with the correct `href`; renders plain non-clickable text when `xid` is `null`; clicking "Remove" does not navigate away from the page).
- Full verification: `dotnet test BE` — 149/149 passed (was 147; +2 new). `npm run build` (FE) — type-checks and builds clean. `npm test` (FE) — 143/143 passed (was 140; +3 new). `npm run lint` (FE) — no new warnings (2 pre-existing `only-export-components` warnings unrelated to this change).

### File List

- BE/TripPlanner.Application/DTOs/Responses/DestinationResponse.cs (modified)
- BE/TripPlanner.Infrastructure/Mappings/MappingProfile.cs (modified)
- BE/TripPlanner.Tests/MappingProfileTests.cs (added)
- FE/src/api/types.ts (modified)
- FE/src/pages/TripPlannerPage.tsx (modified)
- FE/src/pages/TripPlannerPage.module.css (modified)
- FE/src/pages/TripPlannerPage.test.tsx (modified)

### Review Findings

- [x] [Review][Decision] `.row` hover-lift/transition in `TripPlannerPage.module.css` was unrelated visual scope creep bled in from the uncommitted `5-10-ui-motion-and-depth-polish` story — introduced design tokens (`--duration-fast`, `--ease-spring`) not defined anywhere in the committed codebase, violating this story's own Dev Notes ("no new design tokens," "no unrelated visual changes"). Resolved: removed from `FE/src/pages/TripPlannerPage.module.css` — belongs to 5-10, not 5-11.
