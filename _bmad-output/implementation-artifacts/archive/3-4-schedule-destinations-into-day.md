---
baseline_commit: 62a5407f690a3b565a46c1d87e68bda2693ef8e4
---

# Story 3.4: Schedule Destinations Into a Day (Drag & Drop)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **logged-in TripPlanner user**,
I want **to drag a destination from my trip's Saved Places pool and drop it onto a specific day**,
so that **I can quickly build a day-by-day itinerary from the places I've collected**.

## Context & Problem Statement

This is **Feature 3 / US4** from `requirement/Sheet1.html`, deliberately deferred in `epic-3-trip-planner.md` because of a data-model prerequisite:

> *"there is also no 'Saved Places' (trip-level unscheduled pool) concept in the backend — destinations attach directly to days."* [Source: epic/epic-3-trip-planner.md#Out-of-scope]

Today the only way a destination enters a trip is `POST /api/trips/{id}/days/{date}/destinations`, which attaches it **directly to a day**. US4 requires a trip-level **Saved Places** pool of *unscheduled* destinations that the user drags onto days.

The requirement (Sheet1.html, Feature 3 US4):
> **Preconditions:** trip created · dates set (days exist) · at least one destination in Saved Places
> **AC 1.** Drag a destination from Saved Places and drop it into a selected day.
> **AC 2.** See the destination removed from Saved Places after dropping.
> **AC 3.** See the destination appear immediately in the selected day.
> **AC 4.** See a message when dropping a destination into a day where it already exists.
> **AC 5.** See the destination return to Saved Places when the drop action is invalid.
> **Business rules:** remove from Saved Places after a successful drop; prevent the same destination from being scheduled twice in the same day.

### Scope decisions (confirmed with user)

1. **US3 coexistence:** The existing "add straight to a day" path stays. `AddToTripDialog` gains an **additional** "Add to Saved Places" choice — the user may add to a specific day **or** to the pool, their choice. (US3 shipped behavior is not removed.)
2. **DnD library:** `@dnd-kit` (approved new dependency) — chosen for built-in keyboard dragging + ARIA live announcements + touch support, satisfying NFR4 (≤100 ms, no lag) and the project's accessibility floor.
3. **Drag scope:** **Pool → day only.** US5 (reorder within a day) and US6 (day↔day move) remain deferred. Removal from a day (US7) is unchanged (removes the destination from the trip entirely, not "back to pool").
4. **Model:** a destination may live in Saved Places **and/or** on a day simultaneously (per user: "can add to a day and a saved places if user want"). The only invariant enforced server-side is the existing per-day duplicate guard. A successful drag **moves** the place out of Saved Places into the day (Business rule).

### Data-model approach

Mirror the existing `trip_day_destinations` many-to-many exactly with a new `trip_saved_places` join (`trip_id`, `destination_id`). Destinations remain global, `ExternalId`-deduped rows shared via join tables — **no new destination rows** for Saved Places. [Source: BE/TripPlanner.Infrastructure/Data/Configurations/TripDayConfiguration.cs (join precedent)]

## Acceptance Criteria

1. **Saved Places persisted & returned.** `Trip` gains a trip-level Saved Places collection backed by a `trip_saved_places` join table (`trip_id`, `destination_id`, composite PK, cascade delete both sides). `GET /api/trips/{id}` and `GET /api/trips` eager-load it and expose it as `savedPlaces: DestinationResponse[]` on `TripResponse`. A trip the caller does not own is never loaded (NotFound), preserving NFR6.
2. **Add to Saved Places.** `POST /api/trips/{id}/saved-places` with body `{ destinationId }` **or** `{ xid }` adds a destination to the trip's pool and returns the updated `TripResponse`. `xid` resolves an existing destination by external id or imports it from OpenTripMap (same resolution the day-add uses). Adding a destination already in the pool → `400 BadRequest` "Destination already exists in Saved Places." Unowned/missing trip → `404 NotFound`. External failure → `503 ServiceUnavailable`.
3. **Remove from Saved Places (housekeeping).** `DELETE /api/trips/{id}/saved-places/{destinationId}` removes the destination from the pool and returns `204 NoContent`. Not-in-pool → `404 NotFound`; unowned/missing trip → `404 NotFound`.
4. **Schedule (the drag) — atomic move.** `POST /api/trips/{id}/days/{date}/schedule` with body `{ destinationId }` **moves** a destination from Saved Places onto that day in a single transaction: it is removed from `savedPlaces` and added to the day's destinations. Returns the updated `TripResponse` (so both collections reflect the move). (AC 1–3 of the sheet.)
5. **Duplicate-on-day guard.** If the target day already contains the destination, `POST .../schedule` returns `400 BadRequest` "Destination already exists in this day." and the pool/day are left unchanged. (Sheet AC 4 + business rule.)
6. **Schedule error cases.** Destination not in Saved Places → `404 NotFound` "Destination is not in Saved Places."; day (date) not in the trip → `404 NotFound`; unowned/missing trip → `404 NotFound`.
7. **Frontend — Saved Places panel.** `TripPlannerPage` renders a "Saved Places" section listing the trip's `savedPlaces`. Each entry shows the destination name (linking to `/attractions/{xid}` when `xid` is present, else plain text) and a "Remove" control (calls DELETE saved-places). An empty pool shows a helpful empty state.
8. **Frontend — drag to schedule.** Using `@dnd-kit`, each Saved Places entry is draggable and each day is a droppable target. Dropping a place onto a day calls the schedule endpoint; the UI updates **optimistically** (place vanishes from the pool and appears under the day immediately, satisfying NFR4). On server rejection (e.g. duplicate-on-day 400) the optimistic change **rolls back** so the place returns to Saved Places (Sheet AC 5), and a message is shown in a `role="alert"` region (Sheet AC 4).
9. **Frontend — accessible non-drag path.** Because drag-and-drop alone is not accessible, each Saved Places entry also offers a keyboard/screen-reader-reachable way to schedule it onto a day (either `@dnd-kit`'s keyboard sensor with announcements, plus an explicit "Add to day" control listing the trip's days). Scheduling via this path hits the same endpoint/optimistic flow.
10. **Frontend — Add to Saved Places from discovery.** `AddToTripDialog`, after a trip is chosen, offers an "Add to Saved Places" action alongside the existing per-day buttons; choosing it calls `POST .../saved-places` with the pending `{ xid }`. The existing per-day add is unchanged.
11. **No regressions & green build.** All existing BE and FE tests still pass (updated only where a signature legitimately changes, never weakened). New unit tests cover the new domain mutators, the three new use cases, the new API client functions, the optimistic schedule hook (including rollback), and the new `TripPlannerPage`/`AddToTripDialog` behavior. `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build` all pass.

## Tasks / Subtasks

- [x] **Task 1 — Domain: Saved Places on `Trip` (AC: #1, #4)**
  - [x] Add `private readonly List<Destination> _savedPlaces = [];` and `public IReadOnlyList<Destination> SavedPlaces => _savedPlaces;` to `Trip`.
  - [x] Add mutators `AddSavedPlace(Destination)`, `RemoveSavedPlace(Destination)`, and `ScheduleFromSavedPlaces(Destination, TripDay)` (removes from `_savedPlaces`, calls `tripDay.AddDestination`) — keep mutators thin, matching existing `TripDay.AddDestination/RemoveDestination` style.
  - [x] Unit tests in `TripTests`: add/remove saved place; `ScheduleFromSavedPlaces` moves the destination (gone from pool, present on the day).

- [x] **Task 2 — EF config + migration (AC: #1)**
  - [x] In `TripConfiguration`, add a many-to-many `HasMany(t => t.SavedPlaces).WithMany().UsingEntity<Dictionary<string,object>>("trip_saved_places", …)` mirroring `TripDayConfiguration`'s join (FKs `trip_id` / `destination_id`, composite PK, cascade both sides); add field-access metadata for the `_savedPlaces` navigation.
  - [x] Add migration `AddTripSavedPlaces` (`dotnet ef migrations add AddTripSavedPlaces --project BE/TripPlanner.Infrastructure --startup-project BE/TripPlanner.API`); verify the generated up/down only creates/drops `trip_saved_places` (no destructive change to existing tables).

- [x] **Task 3 — Repository eager-load (AC: #1)**
  - [x] Add `.Include(t => t.SavedPlaces)` to both `GetWithDaysAndDestinationsAsync` and `GetAllWithDaysAndDestinationsAsync` in `TripRepository` (keep the existing `.Include(Days).ThenInclude(Destinations)`).

- [x] **Task 4 — Shared destination resolution (refactor) (AC: #2)**
  - [x] Extract the `ResolveDestinationAsync` logic (existing-by-id / by-xid / import-from-OpenTripMap) currently private in `AddDestinationToTripDayUseCase` into a reusable Application service `IDestinationResolver` (impl `DestinationResolver`) returning `Result<Destination>`; register it in `AppServicesExtension`.
  - [x] Refactor `AddDestinationToTripDayUseCase` to use it (behavior identical — existing `TripDayServiceTests` are the safety net).

- [x] **Task 5 — Response + mapper (AC: #1)**
  - [x] Add `List<DestinationResponse> SavedPlaces` to `TripResponse`.
  - [x] Add the `SavedPlaces` mapping to `Trip → TripResponse` in `MappingProfile` (from `src.SavedPlaces`).

- [x] **Task 6 — Use case: Add to Saved Places (AC: #2)**
  - [x] `IAddDestinationToSavedPlacesUseCase` + impl: load trip user-scoped (NotFound); resolve destination via `IDestinationResolver` (ServiceUnavailable on external failure); duplicate-in-pool guard → BadRequest; `trip.AddSavedPlace` + `SaveChangesAsync`; return `MapToTripResponse`.
  - [x] Register in `AppServicesExtension`. Tests: adds; duplicate → BadRequest; xid-import path; other user's trip → NotFound.

- [x] **Task 7 — Use case: Remove from Saved Places (AC: #3)**
  - [x] `IRemoveDestinationFromSavedPlacesUseCase` + impl: load trip user-scoped (NotFound); find destination in `trip.SavedPlaces` by id (NotFound if absent); `trip.RemoveSavedPlace` + save; `Result.Success()`.
  - [x] Register + tests: removes; not-in-pool → NotFound; other user → NotFound.

- [x] **Task 8 — Use case: Schedule saved place onto a day (the drag) (AC: #4, #5, #6)**
  - [x] `IScheduleSavedPlaceUseCase` + impl `ExecuteAsync(int tripId, DateOnly date, int destinationId, int userId, …)`: load trip user-scoped (NotFound); find `tripDay` by date (NotFound); find destination in `trip.SavedPlaces` by id (NotFound "not in Saved Places"); per-day duplicate guard → BadRequest "Destination already exists in this day."; else `trip.ScheduleFromSavedPlaces(destination, tripDay)` + single `SaveChangesAsync`; return `MapToTripResponse`.
  - [x] Register + tests: success moves pool→day; not-in-pool → NotFound; day-missing → NotFound; already-on-day → BadRequest (pool unchanged); other user → NotFound.

- [x] **Task 9 — API endpoints, DTOs, validators (AC: #2, #3, #4, #5, #6)**
  - [x] In `TripEndpoints`: `POST /{id:int}/saved-places` (body `AddSavedPlaceRequest{ int? DestinationId; string? Xid }`) → returns `Ok(TripResponse)`; `DELETE /{id:int}/saved-places/{destinationId:int}` → `NoContent`; `POST /{id:int}/days/{date}/schedule` (body `ScheduleSavedPlaceRequest{ int? DestinationId }`) → `Ok(TripResponse)`. All resolve the caller via `httpContext.User.GetUserId()` and map results with `ToResponse()`.
  - [x] New request DTOs + `[AsParameters]` parameter records + FluentValidation validators mirroring the day-add ones (`AddSavedPlaceRequestValidator`: DestinationId or Xid, id>0; parameter validators: Id NotEmpty, Date valid via `DateHelper`, DestinationId NotEmpty). Register any new validators if not auto-scanned (assembly scan already covers them).

- [x] **Task 10 — Frontend types + API client + hooks (AC: #7, #8, #9, #10)**
  - [x] `shared/api/types.ts`: add `savedPlaces: Destination[]` to `Trip`; add `AddSavedPlaceRequest = { destinationId: number } | { xid: string }` and `ScheduleSavedPlaceRequest = { destinationId: number }`.
  - [x] `features/trips/api.ts`: `addToSavedPlaces(tripId, body)`, `removeFromSavedPlaces(tripId, destinationId)`, `scheduleSavedPlace(tripId, date, body)`.
  - [x] `features/trips/hooks.ts`: `useAddToSavedPlaces`, `useRemoveFromSavedPlaces` (invalidate `['trips']` + `['trip', id]`); `useScheduleSavedPlace` with **optimistic** `onMutate` (cancel `['trip', id]`, snapshot, `setQueryData` moving the destination from `savedPlaces` into the target day), `onError` rollback to snapshot, `onSettled` invalidate.

- [x] **Task 11 — Frontend `TripPlannerPage`: Saved Places panel + DnD (AC: #7, #8, #9)**
  - [x] Add `@dnd-kit/core` (+ `@dnd-kit/utilities` if needed) to `FE/package.json` and install.
  - [x] Render a "Saved Places" section (draggable entries with name link + Remove); wrap days + pool in a `DndContext`; make each `DaySegment` a droppable; on drop → `useScheduleSavedPlace`.
  - [x] Accessible fallback: `KeyboardSensor` + `DndContext` announcements AND an explicit per-entry "Add to day" control listing the trip's days (keyboard reachable) that calls the same schedule flow.
  - [x] Duplicate/invalid feedback in a `role="alert"` region; empty-pool empty state.

- [x] **Task 12 — Frontend `AddToTripDialog`: Add to Saved Places option (AC: #10)**
  - [x] After a trip is selected, render an "Add to Saved Places" action alongside the existing day buttons; wire it to `useAddToSavedPlaces` with the pending `{ xid }`; keep the existing per-day add intact.

- [x] **Task 13 — Tests + full validation (AC: #11)**
  - [x] FE: extend `api.test.ts`, `hooks.test.tsx` (schedule optimistic + rollback), `TripPlannerPage.test.tsx` (renders pool, schedule via accessible control, duplicate 400 message + rollback, remove-from-pool), `AddToTripDialog.test.tsx` (add-to-saved-places path).
  - [x] Run `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build`; fix any regressions.

## Dev Notes

### Backend precedents to mirror
- **Join table:** `TripDayConfiguration.cs` `UsingEntity<Dictionary<string,object>>("trip_day_destinations", …)` — copy verbatim for `trip_saved_places` with FKs `trip_id`/`destination_id`. [Source: BE/TripPlanner.Infrastructure/Data/Configurations/TripDayConfiguration.cs]
- **Field-access nav:** `TripConfiguration` already sets `Metadata.FindNavigation(nameof(Trip.Days))!.SetPropertyAccessMode(PropertyAccessMode.Field)` — add the same for `SavedPlaces`. [Source: BE/TripPlanner.Infrastructure/Data/Configurations/TripConfiguration.cs]
- **User-scoped load = ownership:** never add a `Forbidden`; an unowned trip simply returns null → NotFound (NFR6). [Source: epic/epic-3-trip-planner.md#Technical-approach; BE/TripPlanner.Infrastructure/Repositories/TripRepository.cs]
- **Destination resolution + duplicate guard + import:** currently in `AddDestinationToTripDayUseCase` (`ResolveDestinationAsync`, dup guard lines ~49-52, import via `IDestinationDetailsService` + `DestinationCategoryHelper.IsRestaurantCategory`, Http/timeout → ServiceUnavailable). Extract to `IDestinationResolver`. [Source: BE/TripPlanner.Application/UseCases/TripDay/AddDestinationToTripDayUseCase.cs]
- **Result → HTTP mapping:** `ResultExtension.ToResponse()` already maps BadRequest/NotFound/Conflict/ServiceUnavailable. No new `ErrorType` needed. [Source: BE/TripPlanner.API/Extensions/ResultExtension.cs]
- **Endpoint pattern:** `[AsParameters]` parameter records, `DateOnly.ParseExact(date, DateHelper.DateFormat)`, `httpContext.User.GetUserId()`. [Source: BE/TripPlanner.API/Endpoints/TripEndpoints.cs]
- **Mapper:** `MappingProfile` `Trip → TripResponse` maps `TripDays ← src.Days`; add `SavedPlaces ← src.SavedPlaces`. AutoMapper stays in Infrastructure behind `IApplicationMapper`. [Source: BE/TripPlanner.Infrastructure/Mapping/MappingProfile.cs]

### Migration caveat
`trip_saved_places` is a pure additive table — the generated migration must only `CreateTable`/`DropTable` it (composite PK, two FKs with cascade, index on `destination_id`). No changes to existing tables. Migrations apply automatically on API startup (`RunMigrationsOnStartup`, default true). [Source: CLAUDE.md#Docker; BE/TripPlanner.Infrastructure/Migrations/]

### Frontend precedents to mirror
- **Optimistic move pattern (new here):** no existing trips mutation uses `setQueryData` — model `useScheduleSavedPlace` on the standard TanStack optimistic recipe (`onMutate` cancel+snapshot+setQueryData, `onError` rollback, `onSettled` invalidate). Query keys are `['trips']` and `['trip', id]`. [Source: FE/src/features/trips/hooks.ts]
- **Trip detail render:** `DaySegment`/`DestinationRow` in `TripPlannerPage.tsx`; `DestinationRow` links to `/attractions/{xid}` when xid present else plain text. Saved Places entries follow the same link/plain-text rule. [Source: FE/src/features/trips/TripPlannerPage.tsx]
- **Add flow entry:** `AddToTripContext.requestAdd(xid)` → `AddToTripDialog` (trip list → day buttons). The dialog adds by `{ xid }` today; the saved-places action reuses that pending xid. [Source: FE/src/features/trips/AddToTripDialog.tsx, AddToTripContext.tsx]
- **Types:** `Trip`/`TripDay`/`Destination` in `shared/api/types.ts`; `TripDay.day` is the ISO date string used as both React key and API path segment. `AddDestinationToDayRequest` is a `{destinationId} | {xid}` union — mirror for the saved-places request. [Source: FE/src/shared/api/types.ts]
- **`request<T>` client:** attaches Bearer token, throws `ApiError(status, message)`, returns `undefined` for 204. [Source: FE/src/shared/api/client.ts]

### @dnd-kit notes
- React 19 project; add `@dnd-kit/core` (and `@dnd-kit/utilities` for the CSS transform helper). Use `DndContext` with `PointerSensor` + `KeyboardSensor`; days are `useDroppable({ id: day.day })`, pool entries are `useDraggable({ id: destinationId })`. `onDragEnd` → if `over` is a day and `active` a saved place, call schedule. Provide `announcements`/`screenReaderInstructions` for the a11y floor, PLUS the explicit "Add to day" control so keyboard users are never drag-only.
- NFR4 (≤100 ms, no lag): satisfied by the optimistic cache update — the DOM reflects the move before the server responds; rollback on error covers Sheet AC 5.

### Testing standards summary
- **BE:** xUnit + NSubstitute, `Method_Scenario_ExpectedResult` naming, following `TripServiceTests.cs`/`TripDayServiceTests.cs`. Mock `ITripRepository`, `IDestinationRepository`, `IUnitOfWork`, `IDestinationResolver`/`IDestinationDetailsService`, `IApplicationMapper`.
- **FE:** Vitest + Testing Library, co-located `*.test.tsx`, `vi.mock('./api', …)`, `QueryClientProvider` (retry off) + `MemoryRouter`. Query by role/label/text, never CSS class. For DnD, prefer testing the accessible "Add to day" path + the optimistic hook directly (simulating raw pointer drag in jsdom is brittle); assert optimistic insert + rollback via the hook test. [Source: FE/src/features/trips/*.test.tsx]

### Project Structure Notes
- Feature-based FE layout (post 5-17): trips under `FE/src/features/trips/`, `@/` → `src` alias. New code co-locates there. Shared types in `FE/src/shared/api/types.ts`.
- Clean Architecture dependency direction preserved: new `IDestinationResolver` + use case interfaces live in Application; impls in Application (resolver) / Application (use cases); AutoMapper stays in Infrastructure.

### References
- [Source: requirement/Sheet1.html — Feature 3 US4 (Schedule destinations into a day), business rules + NFR4]
- [Source: epic/epic-3-trip-planner.md#Out-of-scope (US4 deferral, "no Saved Places pool"), #Technical-approach (ownership pattern)]
- [Source: BE/TripPlanner.Domain/Models/Trip.cs, TripDay.cs, Destination.cs]
- [Source: BE/TripPlanner.Infrastructure/Data/Configurations/TripConfiguration.cs, TripDayConfiguration.cs]
- [Source: BE/TripPlanner.Application/UseCases/TripDay/AddDestinationToTripDayUseCase.cs, RemoveDestinationFromTripDayUseCase.cs]
- [Source: BE/TripPlanner.Infrastructure/Repositories/TripRepository.cs]
- [Source: BE/TripPlanner.API/Endpoints/TripEndpoints.cs, Extensions/ResultExtension.cs, Extensions/RouteExtension.cs (GetUserId)]
- [Source: BE/TripPlanner.Application/DTOs (TripResponse, AddDestinationToDayRequest)]
- [Source: FE/src/features/trips/TripPlannerPage.tsx, AddToTripDialog.tsx, AddToTripContext.tsx, api.ts, hooks.ts]
- [Source: FE/src/shared/api/types.ts, shared/api/client.ts]
- [Source: CLAUDE.md (patterns: use case/result/repository/validation/mapper; code style — braces required, no comments)]

### Code style reminders (from CLAUDE.md)
- No comments in code (no XML docs, inline, or block) — FE and BE.
- Curly braces required for all control-flow statements (BE C#).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- `dotnet build BE` → clean (0 warnings, 0 errors) after killing the DLL-locking dev API (PID 39108, per user).
- `dotnet ef migrations add AddTripSavedPlaces` → generated pure-additive `trip_saved_places` table (composite PK, two cascade FKs, index on `destination_id`).
- `dotnet test BE` → 203/203 pass (+19 net new: 15 saved-places use-case + 3 domain + 1 mapping).
- `dotnet ef database update` → migration `20260717142759_AddTripSavedPlaces` applied to the dev database.
- `npx vitest run` (FE) → 25 files / 242 tests pass (+18 net new).
- `npm run lint` → clean; 2 pre-existing warnings only (AuthContext.tsx, AddToTripContext.tsx react-refresh), no new issues.
- `npm run build` → tsc + vite build green (pre-existing >500 kB chunk-size advisory unchanged).

### Completion Notes List

- **New "Saved Places" pool** — the deferred US4 data-model prerequisite. Added `Trip._savedPlaces` (+ `SavedPlaces` read-only nav) with thin mutators `AddSavedPlace`/`RemoveSavedPlace`/`ScheduleFromSavedPlaces`, a `trip_saved_places` join in `TripConfiguration` mirroring `trip_day_destinations` exactly (composite PK, cascade both sides, field-access nav), and migration `AddTripSavedPlaces`. Destinations stay global, `ExternalId`-deduped rows shared via the join — no new destination rows.
- **`savedPlaces` exposed** on `TripResponse`, mapped in `MappingProfile`, eager-loaded in both `TripRepository` queries (ownership scoping intact → NFR6).
- **Extracted `IDestinationResolver`** (existing-by-id / by-xid / OpenTripMap import) out of `AddDestinationToTripDayUseCase` so both the day-add and the new pool-add share one resolution path; the shipped day-add tests were repointed to inject a real `DestinationResolver` (behavior unchanged, coverage preserved).
- **Three use cases + endpoints:** `POST /{id}/saved-places` (add, `{destinationId|xid}`), `DELETE /{id}/saved-places/{destinationId}` (remove), `POST /{id}/days/{date}/schedule` (`{destinationId}` — atomic pool→day move) with the per-day duplicate guard (Sheet AC4) and full parameter/body validators.
- **Frontend:** `@dnd-kit/core` + `@dnd-kit/utilities` drag-from-pool-to-day with **optimistic move + rollback** (`useScheduleSavedPlace`) — satisfies NFR4 (≤100 ms, DOM moves before the server responds) and Sheet AC5 (place returns to the pool on rejection, error shown in `role="alert"`). Each Saved Places entry is draggable AND has an accessible non-drag "Add to a day" `<select>` (keyboard/SR path, AC9). `AddToTripDialog` gained an "Add to Saved Places" action beside the existing per-day buttons (US3 day-add kept, per user).
- **Scope held to pool→day only** — US5 (reorder) and US6 (day↔day) remain deferred; US7 removal unchanged.
- **Live browser/drag QA deferred** — no browser tooling this session (consistent with prior FE stories); the raw pointer-drag path is exercised via the accessible select + a direct optimistic-hook test (insert + rollback). Recommended at review: Playwright pass on the drag interaction. Dev API left stopped (user killed PID 39108 to unlock the build); restart with `dotnet run --project BE/TripPlanner.API`.

### File List

- BE/TripPlanner.Domain/Models/Trip.cs (modified — `_savedPlaces` + mutators)
- BE/TripPlanner.Infrastructure/Data/Configurations/TripConfiguration.cs (modified — `trip_saved_places` join)
- BE/TripPlanner.Infrastructure/Repositories/TripRepository.cs (modified — eager-load SavedPlaces)
- BE/TripPlanner.Infrastructure/Migrations/20260717142759_AddTripSavedPlaces.cs (new)
- BE/TripPlanner.Infrastructure/Migrations/20260717142759_AddTripSavedPlaces.Designer.cs (new)
- BE/TripPlanner.Infrastructure/Migrations/TripPlannerDbContextModelSnapshot.cs (modified — snapshot)
- BE/TripPlanner.Infrastructure/Mappings/MappingProfile.cs (modified — SavedPlaces mapping)
- BE/TripPlanner.Application/Interfaces/Services/IDestinationResolver.cs (new)
- BE/TripPlanner.Application/Services/DestinationResolver.cs (new)
- BE/TripPlanner.Application/UseCases/TripDay/AddDestinationToTripDayUseCase.cs (modified — use IDestinationResolver)
- BE/TripPlanner.Application/DTOs/Responses/TripResponse.cs (modified — SavedPlaces)
- BE/TripPlanner.Application/DTOs/Requests/AddSavedPlaceRequest.cs (new)
- BE/TripPlanner.Application/DTOs/Requests/ScheduleSavedPlaceRequest.cs (new)
- BE/TripPlanner.Application/UseCases/SavedPlaces/IAddDestinationToSavedPlacesUseCase.cs (new)
- BE/TripPlanner.Application/UseCases/SavedPlaces/AddDestinationToSavedPlacesUseCase.cs (new)
- BE/TripPlanner.Application/UseCases/SavedPlaces/IRemoveDestinationFromSavedPlacesUseCase.cs (new)
- BE/TripPlanner.Application/UseCases/SavedPlaces/RemoveDestinationFromSavedPlacesUseCase.cs (new)
- BE/TripPlanner.Application/UseCases/SavedPlaces/IScheduleSavedPlaceUseCase.cs (new)
- BE/TripPlanner.Application/UseCases/SavedPlaces/ScheduleSavedPlaceUseCase.cs (new)
- BE/TripPlanner.API/Endpoints/TripEndpoints.cs (modified — 3 new routes/handlers)
- BE/TripPlanner.API/Parameters/AddSavedPlaceParameter.cs (new)
- BE/TripPlanner.API/Parameters/RemoveSavedPlaceParameter.cs (new)
- BE/TripPlanner.API/Parameters/ScheduleSavedPlaceParameter.cs (new)
- BE/TripPlanner.API/Validators/AddSavedPlaceValidator.cs (new)
- BE/TripPlanner.API/Validators/AddSavedPlaceParameterValidator.cs (new)
- BE/TripPlanner.API/Validators/RemoveSavedPlaceParameterValidator.cs (new)
- BE/TripPlanner.API/Validators/ScheduleSavedPlaceValidator.cs (new)
- BE/TripPlanner.API/Validators/ScheduleSavedPlaceParameterValidator.cs (new)
- BE/TripPlanner.API/Extensions/AppServicesExtension.cs (modified — register resolver + 3 use cases)
- BE/TripPlanner.Tests/TripTests.cs (modified — 3 domain tests)
- BE/TripPlanner.Tests/MappingProfileTests.cs (modified — SavedPlaces mapping test)
- BE/TripPlanner.Tests/TripDayServiceTests.cs (modified — inject real DestinationResolver)
- BE/TripPlanner.Tests/SavedPlacesServiceTests.cs (new — 15 use-case tests)
- FE/package.json / package-lock.json (modified — @dnd-kit/core, @dnd-kit/utilities)
- FE/src/shared/api/types.ts (modified — savedPlaces + request types)
- FE/src/features/trips/api.ts (modified — 3 new client fns)
- FE/src/features/trips/hooks.ts (modified — 3 new hooks incl. optimistic schedule)
- FE/src/features/trips/TripPlannerPage.tsx (modified — Saved Places panel + DnD + a11y select)
- FE/src/features/trips/TripPlannerPage.module.css (modified — saved-places + droppable styles)
- FE/src/features/trips/AddToTripDialog.tsx (modified — Add to Saved Places option)
- FE/src/features/trips/AddToTripDialog.module.css (modified — savedOption style)
- FE/src/features/trips/api.test.ts (modified — 3 new endpoint tests)
- FE/src/features/trips/hooks.test.tsx (modified — 4 new hook tests)
- FE/src/features/trips/TripPlannerPage.test.tsx (modified — 5 new saved-places tests)
- FE/src/features/trips/AddToTripDialog.test.tsx (modified — add-to-saved-places test)
- FE/src/features/trips/TripsPage.test.tsx (modified — savedPlaces in fixtures)
- FE/src/features/trips/AddToTripContext.test.tsx (modified — savedPlaces + api mock)
- _bmad-output/implementation-artifacts/archive/3-4-schedule-destinations-into-day.md (story)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status tracking)

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-17 | 0.1 | Story drafted for Feature 3 US4 (drag-and-drop scheduling via a new Saved Places pool); scope + DnD lib + US3 coexistence confirmed with user | Quanhvo |
| 2026-07-17 | 1.0 | Implemented via dev-story — Saved Places pool (join + migration), 3 use cases/endpoints, extracted IDestinationResolver, @dnd-kit drag-to-day with optimistic move + rollback + accessible select fallback, AddToTripDialog Saved-Places option. BE 203, FE 242, lint+build green, migration applied. Status → review | Amelia (dev) |

## Review Findings

<!-- Adversarial code review 2026-07-17 (bmad-code-review): 4 parallel layers, scoped to story File List. -->

- [x] [Review][Patch] Remove-from-Saved-Places failures are silent — no error UI [FE/src/features/trips/TripPlannerPage.tsx:299] — `removeError` is derived only from `removeDestination` (remove-from-day); a failed `removeSavedPlace` mutation surfaces nothing to the user (no `role="alert"`, no rollback), unlike the scheduling path which has `scheduleError`. MEDIUM.
- [x] [Review][Patch] Optimistic schedule appends without a membership guard → transient duplicate React key [FE/src/features/trips/hooks.ts:146] — `onMutate` does `destinations: [...day.destinations, moving]` unconditionally. Scheduling a place onto a day it is already on (the exact case the server rejects with 400) briefly renders two `<li>` with the same `destination.id` key before rollback. LOW.
- [x] [Review][Defer] Write use cases don't catch `DbUpdateException` → 500 on concurrent races [BE/TripPlanner.Application/UseCases/SavedPlaces/AddDestinationToSavedPlacesUseCase.cs:44, ScheduleSavedPlaceUseCase.cs:47, Services/DestinationResolver.cs:57] — deferred, codebase-wide pre-existing pattern (the shipped `AddDestinationToTripDayUseCase` has the identical gap). Concurrent duplicate add / same-xid import / same-place-same-day schedule surface a unique/PK violation as a raw 500 instead of a graceful Conflict. Fix should be applied codebase-wide, not just here.
- [x] [Review][Defer] `.Include(t => t.SavedPlaces)` eager-load is unverified [BE/TripPlanner.Infrastructure/Repositories/TripRepository.cs] — deferred, consistent with codebase (no repository integration tests exist; all repos are mocked). Removing the Include silently empties the pool on every GET with a green suite. Correct today.
- [x] [Review][Defer] Drag path `handleDragEnd` is untested — only the accessible `<select>` fallback is covered [FE/src/features/trips/TripPlannerPage.tsx:317] — deferred, story already documented deferring live-drag QA and recommended a Playwright pass. The id-parsing (`place-<id>`/`day-<date>`) has no unit or integration test.
- [x] [Review][Defer] New FluentValidation request-validators are untested [BE/TripPlanner.API/Validators/*SavedPlace*.cs] — deferred, consistent with codebase (no request-validator tests exist). The endpoint null-forgiving derefs rely on these running; a dropped rule would 500 instead of 400 undetected.
