---
baseline_commit: 62a5407f690a3b565a46c1d87e68bda2693ef8e4
---

# Story 3.5: Reorder Destinations Within a Day (Drag & Drop)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **logged-in TripPlanner user**,
I want **to drag a destination up or down within a day to change its order**,
so that **my itinerary reflects the sequence I actually intend to visit places in that day**.

## Context & Problem Statement

This is **Feature 3 / US5** from `requirement/Sheet1.html`, marked **High** and deliberately deferred in the epic because of a **data-model prerequisite**:

> *"US5 — Reorder destinations within a day (High): blocked on a data-model prerequisite — destinations on a day are an unordered many-to-many (`trip_day_destinations` join table with no position column). Adding ordering means promoting the implicit join to an explicit entity with a sort index; deliberately deferred with the story."* [Source: epic/epic-3-trip-planner.md#Out-of-scope]

Today `TripDay._destinations` is a **skip navigation** (`IReadOnlyList<Destination>`) backed by the `trip_day_destinations` join, which has a composite PK `(trip_day_id, destination_id)` and **no ordering column**. The order EF returns is whatever Postgres yields — effectively arbitrary and non-durable. There is no way to persist "this place comes before that one" within a day, so US5 cannot be built on the current model.

Story **3-4** (done) added the `@dnd-kit`-based drag *from the Saved Places pool onto a day* (`useScheduleSavedPlace`, optimistic move + rollback). This story is the **next drag capability**: reordering destinations that are **already scheduled** in a single day. It reuses the same `DndContext`, sensors, and optimistic-cache conventions 3-4 established.

### Scope decisions

1. **Reorder within one day only.** Moving a destination from one day to another (**US6**) stays deferred — it "composes remove + add once US4/US5 land" [Source: epic/epic-3-trip-planner.md#Out-of-scope]. A drag that leaves the origin day is a no-op/rollback in this story.
2. **Data-model approach (epic-sanctioned):** promote `trip_day_destinations` from an implicit skip-nav join to an **explicit join entity `TripDayDestination`** carrying an integer `Position`. `TripDay` internally holds an ordered `_items` collection but **keeps its public surface `IReadOnlyList<Destination> Destinations`** (now returned in position order), so the mapper, `TripDayResponse`, both day-add use cases, and their tests need no signature changes.
3. **DnD library:** reuse 3-4's `@dnd-kit/core` + `@dnd-kit/utilities`, adding **`@dnd-kit/sortable`** (the sortable-list companion, same author/version line — approved as the natural extension of the already-approved `@dnd-kit` choice). No other new dependency.
4. **Accessibility floor (as in 3-4):** drag alone is not accessible. Each destination row gets keyboard/screen-reader-reachable **"Move up" / "Move down"** controls that hit the same reorder flow; the `KeyboardSensor` is already wired.
5. **Persistence + NFR4:** the new order persists across reloads (US10 — "find trips exactly as they left them"). The UI updates **optimistically** (≤100 ms, NFR4) and rolls back on server rejection, mirroring `useScheduleSavedPlace`.

### Data-model approach (detail)

Add a `position` (int, NOT NULL) payload column to the existing `trip_day_destinations` table — **purely additive**, the composite PK `(trip_day_id, destination_id)` is unchanged. In the domain the implicit skip navigation becomes an explicit dependent entity `TripDayDestination { TripDayId, DestinationId, Destination, Position }`, owned one-to-many by `TripDay` via the private field `_items`. `TripDay.Destinations` becomes a computed read-only projection ordered by `Position`, preserving every existing call site (`tripDay.Destinations.Any(...)`, the mapper's `src.Destinations`, FE `day.destinations`). Destinations remain global, `ExternalId`-deduped rows shared via the join — **no new destination rows**. [Source: BE/TripPlanner.Infrastructure/Data/Configurations/TripDayConfiguration.cs; BE/TripPlanner.Domain/Models/TripDay.cs]

## Acceptance Criteria

1. **Ordered day model persisted.** `trip_day_destinations` gains a `position` (int, NOT NULL) column via a purely-additive migration (no change to its composite PK or FKs; existing rows backfilled to a deterministic per-day order). The domain models a day's destinations as an ordered collection so that `GET /api/trips/{id}` and `GET /api/trips` return each day's `destinations` in the stored order, and the order survives a reload (US10). A trip the caller does not own is never loaded (NotFound), preserving NFR6.
2. **Public domain surface unchanged.** `TripDay.Destinations` still exposes `IReadOnlyList<Destination>` (now in position order). `AddDestination` appends the destination at the **end** of the day's order; `RemoveDestination` removes it and **renumbers** the remaining positions to stay gap-free. Both day-add paths (`AddDestinationToTripDayUseCase`, `ScheduleSavedPlaceUseCase`) and their existing tests keep working without signature changes.
3. **Reorder endpoint.** `PUT /api/trips/{id}/days/{date}/destinations/order` with body `{ destinationIds: number[] }` sets the day's destination order to exactly that sequence and returns the updated `TripResponse`. Resolves the caller via `httpContext.User.GetUserId()`.
4. **Reorder validation & guards.** The submitted `destinationIds` must be a **permutation of the destinations currently in that day** — same set, same count, no extras, no omissions, no duplicates. A mismatch → `400 BadRequest` "Destination order must list exactly the destinations currently in this day." and the stored order is left unchanged. Empty/absent list, non-positive ids, or duplicate ids → `400 BadRequest` (validator). Day (date) not in the trip → `404 NotFound`; unowned/missing trip → `404 NotFound`.
5. **Frontend — drag to reorder.** Within each day, destination rows are rendered inside a `@dnd-kit/sortable` `SortableContext` (`verticalListSortingStrategy`); each row is a `useSortable` item. Dragging a row to a new position within the **same** day calls the reorder endpoint and updates the UI **optimistically** (the row moves immediately, NFR4). A drag that ends outside the origin day (e.g. over another day) is a **no-op** and the order is unchanged (US6 out of scope). The existing pool→day scheduling drag (3-4) continues to work in the same `DndContext`.
6. **Frontend — optimistic reorder + rollback.** A `useReorderDayDestinations` hook mirrors `useScheduleSavedPlace`: `onMutate` cancels `['trip', id]`, snapshots, and reorders the target day's `destinations` in the cache; `onError` rolls back to the snapshot and surfaces the message in a `role="alert"` region; `onSettled` invalidates `['trips']` + `['trip', id]`.
7. **Frontend — accessible non-drag path.** Each destination row offers keyboard/screen-reader-reachable **"Move up"** and **"Move down"** controls that reorder via the same hook/endpoint. "Move up" is disabled/absent on the first row and "Move down" on the last. Buttons have descriptive `aria-label`s (e.g. `Move {name} up`).
8. **No regressions & green build.** All existing BE and FE tests still pass (updated only where a signature or fixture legitimately changes — e.g. tests asserting day-destination order — never weakened). New unit tests cover the new domain ordering (append/remove-renumber/reorder/position-order projection), the reorder use case (success + all guard/error cases), the new API client function, the optimistic reorder hook (reorder + rollback), and the `TripPlannerPage` move-up/move-down behavior. `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build` all pass.

## Tasks / Subtasks

- [x] **Task 1 — Domain: explicit ordered join entity (AC: #1, #2)**
  - [x] Add `BE/TripPlanner.Domain/Models/TripDayDestination.cs`: `int TripDayId`, `int DestinationId`, `Destination Destination`, `int Position` (all private-set); private parameterless ctor for EF; public `TripDayDestination(Destination destination, int position)`; `void SetPosition(int position)`.
  - [x] Refactor `TripDay`: replace `private readonly List<Destination> _destinations = []` with `private readonly List<TripDayDestination> _items = []`. Keep `public IReadOnlyList<Destination> Destinations => _items.OrderBy(item => item.Position).Select(item => item.Destination).ToList();`.
  - [x] `AddDestination(Destination)` → `_items.Add(new TripDayDestination(destination, _items.Count))` (append at end).
  - [x] `RemoveDestination(Destination)` → find the item by reference-or-`Id` match, remove it, then renumber remaining items to gap-free `0..n-1` by current position order.
  - [x] New `ReorderDestinations(IReadOnlyList<int> orderedDestinationIds)` → for each index, find the item whose `Destination.Id` matches `orderedDestinationIds[index]` and `SetPosition(index)`. (Validation that the set matches lives in the use case, AC #4; the mutator assumes a valid permutation.)
  - [x] Unit tests in `TripTests`: `AddDestination` appends in call order (positions 0,1,2 → `Destinations` in that order); `RemoveDestination` drops the item and renumbers (no gaps); `ReorderDestinations` yields the requested order via `Destinations`.

- [x] **Task 2 — EF config: explicit join entity (AC: #1)**
  - [x] In `TripDayConfiguration`, replace the `HasMany(d => d.Destinations).WithMany().UsingEntity<Dictionary<string,object>>("trip_day_destinations", …)` skip-nav block with: (a) a `HasMany<TripDayDestination>("_items").WithOne().HasForeignKey(item => item.TripDayId).OnDelete(DeleteBehavior.Cascade)` field-navigation (set `Metadata.FindNavigation("_items")!.SetPropertyAccessMode(PropertyAccessMode.Field)`); remove the old `Navigation(d => d.Destinations)` field mapping (Destinations is no longer a navigation).
  - [x] Add a `TripDayDestination` entity configuration (new `TripDayDestinationConfiguration.cs`, or inline): `ToTable("trip_day_destinations")`; `HasKey("TripDayId", "DestinationId")` mapped to columns `trip_day_id` / `destination_id`; `Property(Position)` column `position`, required; `HasOne(item => item.Destination).WithMany().HasForeignKey(item => item.DestinationId).OnDelete(DeleteBehavior.Cascade)`. Ensure the FK/column names match the existing table exactly so the migration is additive.
  - [x] Confirm `TripPlannerDbContext` picks up the new configuration (it applies configurations from the assembly — verify the registration mechanism and add if configs are registered explicitly).

- [x] **Task 3 — Migration: add `position` + backfill (AC: #1)**
  - [x] `dotnet ef migrations add AddTripDayDestinationOrder --project BE/TripPlanner.Infrastructure --startup-project BE/TripPlanner.API`.
  - [x] Verify the generated `Up` only **adds** the `position` column to `trip_day_destinations` (int NOT NULL, temporary default 0) — no drop/recreate of the table, PK, or FKs. Add a `migrationBuilder.Sql(...)` backfill that assigns a deterministic per-day order to existing rows, e.g. Postgres `UPDATE trip_day_destinations t SET position = s.rn - 1 FROM (SELECT trip_day_id, destination_id, ROW_NUMBER() OVER (PARTITION BY trip_day_id ORDER BY destination_id) AS rn FROM trip_day_destinations) s WHERE t.trip_day_id = s.trip_day_id AND t.destination_id = s.destination_id;`. `Down` drops the column.
  - [x] `dotnet ef database update` to apply to the dev DB; confirm the column exists and existing rows are backfilled.

- [x] **Task 4 — Repository eager-load update (AC: #1)**
  - [x] In `TripRepository`, both queries currently do `.Include(t => t.Days).ThenInclude(d => d.Destinations)`. Because `Destinations` is no longer a navigation, replace the `.ThenInclude(d => d.Destinations)` with a **string include of the item chain**: `.Include("Days._items.Destination")` (keep `.Include(t => t.SavedPlaces)`). Verify the trip still loads days → items → destinations in one round trip.

- [x] **Task 5 — Use case: reorder day destinations (AC: #3, #4)**
  - [x] `BE/TripPlanner.Application/UseCases/TripDay/IReorderDayDestinationsUseCase.cs` + impl `ReorderDayDestinationsUseCase`: `ExecuteAsync(int tripId, DateOnly date, IReadOnlyList<int> orderedDestinationIds, int userId, CancellationToken)`. Load trip user-scoped (NotFound "Trip Not Found"); find `tripDay` by date (NotFound "Day Not Found"); validate `orderedDestinationIds` is a permutation of the day's current destination ids (same count + same set, no dups) → else `BadRequest` "Destination order must list exactly the destinations currently in this day."; `tripDay.ReorderDestinations(orderedDestinationIds)`; `unitOfWork.SaveChangesAsync`; return `Result<TripResponse>.Success(mapper.MapToTripResponse(trip))`.
  - [x] Register `IReorderDayDestinationsUseCase → ReorderDayDestinationsUseCase` in `AppServicesExtension`.
  - [x] Tests (`TripDayServiceTests` or a new `ReorderDayDestinationsServiceTests`): success reorders + returns mapped trip; trip missing → NotFound; other user's trip → NotFound; day missing → NotFound; id set mismatch (missing/extra/duplicate) → BadRequest with order unchanged.

- [x] **Task 6 — API endpoint, DTO, validators (AC: #3, #4)**
  - [x] Request DTO `BE/TripPlanner.Application/DTOs/Requests/ReorderDayDestinationsRequest.cs` → `{ List<int>? DestinationIds }`.
  - [x] `[AsParameters]` parameter record `BE/TripPlanner.API/Parameters/ReorderDayDestinationsParameter.cs` → `{ int Id; string? Date; ReorderDayDestinationsRequest? ReorderDayDestinationsRequest }` (mirror `AddDestinationToDayParameter`/`ScheduleSavedPlaceParameter`).
  - [x] Validators (auto-scanned): `ReorderDayDestinationsValidator` (DestinationIds NotNull/NotEmpty, each `> 0`, all distinct) and `ReorderDayDestinationsParameterValidator` (Id NotEmpty, Date valid via `DateHelper`, nested request NotNull) — mirror the `*ScheduleSavedPlace*` validators.
  - [x] In `TripEndpoints`: `group.MapPut("/{id:int}/days/{date}/destinations/order", ReorderDayDestinations)`; handler parses the date via `DateOnly.ParseExact(parameter.Date!, DateHelper.DateFormat, null)`, calls the use case with `parameter.ReorderDayDestinationsRequest!.DestinationIds!`, and maps with `result.ToResponse(onSuccess => Results.Ok(result.Data))`.

- [x] **Task 7 — Frontend types + API client (AC: #3, #5)**
  - [x] `FE/src/shared/api/types.ts`: add `export interface ReorderDayDestinationsRequest { destinationIds: number[] }`.
  - [x] `FE/src/features/trips/api.ts`: `reorderDayDestinations(tripId: number, date: string, body: ReorderDayDestinationsRequest): Promise<Trip>` → `PUT /api/trips/${tripId}/days/${date}/destinations/order`.

- [x] **Task 8 — Frontend optimistic reorder hook (AC: #6)**
  - [x] `FE/src/features/trips/hooks.ts`: `useReorderDayDestinations` modeled on `useScheduleSavedPlace` — `mutationFn` calls `reorderDayDestinations`; `onMutate` cancels `['trip', tripId]`, snapshots `previousTrip`, and rewrites the target day's `destinations` into the new order (map `destinationIds` → the day's existing destination objects); `onError` restores `previousTrip`; `onSettled` invalidates `['trips']` + `['trip', tripId]`.

- [x] **Task 9 — Frontend TripPlannerPage: sortable within day + a11y (AC: #5, #6, #7)**
  - [x] Add `@dnd-kit/sortable` to `FE/package.json` and install.
  - [x] Wrap each `DaySegment`'s destination `<ul>` in a `SortableContext` (`items` = the day's destination sortable ids, `strategy: verticalListSortingStrategy`). Make `DestinationRow` a `useSortable` item with a drag handle; sortable id encodes the day to prevent cross-day mixing, e.g. `dest-${day.day}-${destination.id}`.
  - [x] Extend `handleDragEnd`: keep the existing `place-*` over `day-*` → schedule branch; add a branch where `active`/`over` are both `dest-<sameDay>-*` → compute the new id order (dnd-kit `arrayMove`) and call `useReorderDayDestinations`. If the drag ends over a different day or a non-sortable target → no-op (US6 out of scope).
  - [x] Accessible fallback: add "Move up" / "Move down" buttons to each `DestinationRow` (keyboard-reachable, descriptive `aria-label`s), disabled at the ends; clicking calls the reorder hook with the destination moved one slot.
  - [x] Reorder errors shown in a `role="alert"` region (`reorderError`, derived like `scheduleError`). Add any needed styles to `TripPlannerPage.module.css`.

- [x] **Task 10 — Tests + full validation (AC: #8)**
  - [x] FE: extend `api.test.ts` (reorder endpoint), `hooks.test.tsx` (reorder optimistic + rollback), `TripPlannerPage.test.tsx` (move-up/move-down reorders via accessible controls; buttons disabled at ends; reorder-error alert). Update any fixture/tests that now assert day-destination order.
  - [x] BE: run and fix any existing tests affected by the model change (e.g. tests that add multiple destinations to a day and assert their order/count).
  - [x] Run `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build`; fix regressions. Live browser/drag QA may be deferred if no browser tooling is available this session (consistent with 3-4) — if so, exercise the accessible move-up/down path + the optimistic hook directly and recommend a Playwright drag pass at review.

### Review Findings

_Senior code review (2026-07-18). 2 patch (both applied), 5 deferred, 8 dismissed as noise. (1 decision-needed resolved → patch, applied. 1 patch reclassified → defer once implementation showed an in-memory test cannot verify it.)_

- [x] [Review][Patch] Pool→day scheduling drag no-ops when dropping onto a **populated** day (AC#5 regression) [FE/src/features/trips/TripPlannerPage.tsx] — The single `DndContext` sets no `collisionDetection` prop, so dnd-kit's default `rectIntersection` resolves `over.id` to a `dest-<date>-<id>` sortable row (now a droppable via `useSortable`) rather than the enclosing `day-<date>` droppable whenever the target day already has rows. `handleDragEnd` only scheduled on `place-`→`day-`, so the drop silently did nothing; empty days and the accessible `<select>` still worked, which is why the jsdom suite missed it. **Applied:** extracted the drag-resolution logic into a pure `resolveDragAction` in the new `FE/src/features/trips/dragActions.ts` and added a `place-` active + `dest-` over branch that derives the day from the row id via `parseDestId` and schedules. Still needs a manual/Playwright drag pass to confirm the real pointer path.

- [x] [Review][Patch] Drag path had zero executing test coverage [FE/src/features/trips/dragActions.ts] — Reorder tests exercised only the Move up/down buttons and scheduling only via the `<select>`; no test dispatched a drag, so the same-day guard, `parseDestId` slicing, and schedule-on-drop branch never ran. An inverted guard or broken id-parsing would have shipped green. **Applied:** added a `resolveDragAction` unit-test block (6 cases: place→day, place→dest on a populated day, same-day reorder, cross-day no-op, drop-over-self no-op, unhandled ids) in `TripPlannerPage.test.tsx`.

- [x] [Review][Defer] `RemoveDestination` renumber has no cheap unit-level verification [BE/TripPlanner.Domain/Models/TripDay.cs:52; BE/TripPlanner.Tests/TripTests.cs] — deferred (folded into the DB round-trip gap below): originally slated as a patch, but implementation revealed an in-memory add-after-remove test would be a **placebo**. `Destinations` is `_items.OrderBy(Position)` (a *stable* sort) and `_items` is always kept in insertion order (`Renumber` reassigns positions but never reorders `_items`), so colliding positions from a missing renumber tie-break back to the intended order in memory. The bug is only observable after an EF reload where the backing load order differs — i.e. it needs the persistence round-trip harness below, not a domain unit test.

- [x] [Review][Defer] No EF/DB integration coverage for the migration backfill SQL and the `"Days._items.Destination"` string include [BE/.../20260717205332_AddTripDayDestinationOrder.cs; BE/.../TripRepository.cs] — deferred, pre-existing: the test project mocks every repository call (no `DbContext`/Sqlite/Testcontainers harness exists at all), so the raw backfill `UPDATE` and the compiler-unchecked `"_items"` include string are unverified; a broken include would silently return empty destinations. Standing up a DB integration harness is broader than this story.

- [x] [Review][Defer] `TripDay.ReorderDestinations` enforces no aggregate invariant [BE/TripPlanner.Domain/Models/TripDay.cs:39] — deferred, pre-existing pattern: a non-permutation list would leave unmatched items at their old positions and produce duplicate positions; today it is protected only by `ReorderDayDestinationsUseCase.IsPermutation` at the sole call site. Defense-in-depth only.

- [x] [Review][Defer] Reorder controls not disabled while a mutation is in flight [FE/src/features/trips/TripPlannerPage.tsx:235] — deferred: `reorderDay.isPending` is used only to derive the error string, never to gate the Move buttons/drag; rapid double-clicks compute `arrayMove` on the closed-over (stale) `day` prop and the `onSettled` invalidation can flicker. Eventually consistent; low likelihood at real click cadence.

- [x] [Review][Defer] No `aria-live` announcement after Move up/down or keyboard drag [FE/src/features/trips/TripPlannerPage.tsx] — deferred: AC#7 (accessible buttons with descriptive `aria-label`s) is satisfied; a live-region confirming the new position is an enhancement beyond the AC.

_Dismissed as noise: (1) AddDestination duplicate-id → PK violation — both add paths already guard with "Destination already exists in this day."; (2) cross-day / empty-zone dest drag no-op with no feedback — no-op is by design per AC#5/US6; (3) stray `react-day-picker` in package.json — not from 3-5 (committed HEAD has neither it nor @dnd-kit; the FE package.json is diverged by the parallel uncommitted restructure); (4) no optimistic-concurrency token on Position — acceptable for a planner, matches codebase convention; (5) differing validator vs use-case error strings — distinct conditions, both correct 400s; (6) `Destinations` getter re-sorts/allocates per access — negligible at itinerary scale; (7) endpoints ignore the `onSuccess` arg — matches existing pattern; (8) backfill orders by `destination_id` redefining legacy order — spec-sanctioned (AC#1) and the join had no prior order column to preserve._

## Dev Notes

### The central change — ordered day destinations
- **Why:** `trip_day_destinations` has no ordering column, so day order is arbitrary and non-durable. US5 requires a stored sort index. [Source: epic/epic-3-trip-planner.md#Out-of-scope — US5]
- **How (epic-sanctioned):** promote the implicit skip-nav join to an **explicit join entity** `TripDayDestination` with a `Position` column. Keep `TripDay.Destinations` as a computed `IReadOnlyList<Destination>` ordered by `Position` so the blast radius stays contained — the mapper, `TripDayResponse`, and both day-add use cases are untouched. [Source: BE/TripPlanner.Domain/Models/TripDay.cs; BE/TripPlanner.Infrastructure/Data/Configurations/TripDayConfiguration.cs]
- **EF field navigation:** `TripDay` has no public property for `_items`; configure the collection by field name (`HasMany<TripDayDestination>("_items")` + `PropertyAccessMode.Field`), exactly like `TripConfiguration` does for `_days`/`_savedPlaces`. [Source: BE/TripPlanner.Infrastructure/Data/Configurations/TripConfiguration.cs:32-34, 56-58]
- **Repository include:** the lambda `.ThenInclude(d => d.Destinations)` must become the string include `"Days._items.Destination"` because `Destinations` is no longer a navigation. Both `GetWithDaysAndDestinationsAsync` and `GetAllWithDaysAndDestinationsAsync` need this. [Source: BE/TripPlanner.Infrastructure/Repositories/TripRepository.cs:10-23]

### Backend precedents to mirror
- **User-scoped load = ownership:** never add `Forbidden`; an unowned trip returns null → NotFound (NFR6). [Source: epic/epic-3-trip-planner.md#Technical-approach; BE/TripPlanner.Infrastructure/Repositories/TripRepository.cs]
- **Endpoint pattern:** `[AsParameters]` parameter records, `DateOnly.ParseExact(date, DateHelper.DateFormat, null)`, `httpContext.User.GetUserId()`, `result.ToResponse(...)`. The `ScheduleSavedPlace` endpoint (returns `Ok(TripResponse)`) is the closest template. [Source: BE/TripPlanner.API/Endpoints/TripEndpoints.cs:93-102]
- **Result → HTTP mapping:** `ResultExtension.ToResponse()` already maps BadRequest/NotFound/Conflict/ServiceUnavailable — no new `ErrorType` needed.
- **Use case shape:** `ScheduleSavedPlaceUseCase` is the reference — load trip (NotFound), find day (NotFound), guard, mutate, `SaveChangesAsync`, return `MapToTripResponse`. [Source: BE/TripPlanner.Application/UseCases/SavedPlaces/ScheduleSavedPlaceUseCase.cs]
- **Mapper stays put:** `MappingProfile` `TripDay → TripDayResponse` maps `Destinations ← src.Destinations`; because `Destinations` still returns an ordered `IReadOnlyList<Destination>`, no mapper change is needed. AutoMapper stays in Infrastructure behind `IApplicationMapper`. [Source: BE/TripPlanner.Infrastructure/Mappings/MappingProfile.cs:20-23]
- **Validators auto-scan:** `AddValidatorsFromAssembly` already registers new validators automatically (SharpGrip AutoValidation). Mirror the `*ScheduleSavedPlace*` validator pair. [Source: CLAUDE.md#Validation; 3-4 File List]

### Migration caveat
`position` is added to an existing, possibly-populated table. The generated migration must only `AddColumn` (int NOT NULL, temporary default 0) — never drop/recreate `trip_day_destinations` or its PK/FKs. Backfill existing rows deterministically (`ROW_NUMBER() OVER (PARTITION BY trip_day_id ORDER BY destination_id)`), otherwise every existing day's rows collide at position 0 and initial order is undefined. Migrations apply automatically on API startup (`RunMigrationsOnStartup`, default true). [Source: CLAUDE.md#Docker; 3-4 migration precedent — `AddTripSavedPlaces`]

### Frontend precedents to mirror
- **Optimistic move + rollback:** `useScheduleSavedPlace` (3-4) is the exact template — `onMutate` cancel+snapshot+`setQueryData`, `onError` rollback, `onSettled` invalidate, keys `['trips']` / `['trip', id]`. Model `useReorderDayDestinations` on it. [Source: FE/src/features/trips/hooks.ts:122-165]
- **Existing DnD wiring:** `TripPlannerPage` already has one `DndContext` (PointerSensor distance-5 + KeyboardSensor) wrapping Saved Places + days, with `SavedPlaceCard` = `useDraggable('place-<id>')` and `DaySegment` = `useDroppable('day-<date>')`, and `handleDragEnd` routing `place-*`→`day-*` to schedule. Add sortable-within-day inside the **same** context; extend `handleDragEnd` with a `dest-<date>-<id>` branch. [Source: FE/src/features/trips/TripPlannerPage.tsx:36-70, 146-209, 319-330]
- **`@dnd-kit/sortable`:** use `SortableContext` + `verticalListSortingStrategy` per day, `useSortable` per row, `arrayMove` to compute the new order, `CSS.Transform.toString(transform)` for the row style (already using `@dnd-kit/utilities` `CSS`). Encode the day in the sortable id so two days' lists never intermix.
- **Row rendering:** `DestinationRow` links to `/attractions/{xid}` when xid present else plain text, with a `Remove` sibling control. Add the drag handle + Move up/down as siblings, keeping the link/plain-text rule. [Source: FE/src/features/trips/TripPlannerPage.tsx:36-70]
- **`request<T>` client:** attaches Bearer token, throws `ApiError(status, message)`, returns `undefined` for 204 (reorder returns a `Trip`, not 204). [Source: FE/src/shared/api/client.ts]
- **Types:** `TripDay.destinations: Destination[]`, `Trip.tripDays: TripDay[]`; `TripDay.day` is the ISO date string used as React key and API path segment. [Source: FE/src/shared/api/types.ts:54-66]

### @dnd-kit notes
- React 19 project; `@dnd-kit/core` + `@dnd-kit/utilities` already installed (3-4). Add `@dnd-kit/sortable` (same ecosystem/version line). One `DndContext` can host both the cross-container pool→day drag (draggable/droppable) and the within-day sortable lists; `handleDragEnd` disambiguates by id prefix (`place-` / `day-` / `dest-`).
- **NFR4 (≤100 ms):** satisfied by the optimistic cache reorder — the DOM reflects the new order before the server responds; rollback covers rejection.
- **Accessibility:** dnd-kit's `KeyboardSensor` gives keyboard dragging, but the robust, testable a11y path is the explicit **Move up / Move down** buttons (as 3-4 used an explicit "Add to day" `<select>` beside the drag). Provide both.

### Testing standards summary
- **BE:** xUnit + NSubstitute, `Method_Scenario_ExpectedResult` naming, following `TripTests.cs` / `TripDayServiceTests.cs` / `SavedPlacesServiceTests.cs`. Mock `ITripRepository`, `IUnitOfWork`, `IApplicationMapper`. Domain ordering is tested directly on `TripDay` (no mocks).
- **FE:** Vitest + Testing Library, co-located `*.test.tsx`, `vi.mock('./api', …)`, `QueryClientProvider` (retry off) + `MemoryRouter`. Query by role/label/text, never CSS class. For DnD, prefer the accessible Move-up/down path + a direct optimistic-hook test (raw pointer drag in jsdom is brittle) — assert optimistic reorder + rollback via the hook test, exactly as 3-4 did for scheduling. [Source: FE/src/features/trips/*.test.tsx; 3-4 Dev Notes]

### Project Structure Notes
- Feature-based FE layout (post 5-17): trips under `FE/src/features/trips/`, `@/` → `src` alias; shared types in `FE/src/shared/api/types.ts`. New code co-locates there.
- Clean Architecture dependency direction preserved: new `TripDayDestination` in Domain; `IReorderDayDestinationsUseCase` + impl in Application; EF config/migration in Infrastructure; endpoint/validators in API. AutoMapper stays in Infrastructure behind `IApplicationMapper`. Nothing in Application/Domain references API/Infrastructure.

### References
- [Source: requirement/Sheet1.html — Feature 3 US5 (Reorder destinations within a day, High), NFR4]
- [Source: epic/epic-3-trip-planner.md#Out-of-scope (US5 deferral + data-model prerequisite), #Technical-approach (ownership pattern)]
- [Source: _bmad-output/implementation-artifacts/archive/3-4-schedule-destinations-into-day.md (Saved Places pool, @dnd-kit setup, optimistic move + rollback, accessible fallback conventions)]
- [Source: BE/TripPlanner.Domain/Models/TripDay.cs, Trip.cs, Destination.cs]
- [Source: BE/TripPlanner.Infrastructure/Data/Configurations/TripDayConfiguration.cs, TripConfiguration.cs]
- [Source: BE/TripPlanner.Infrastructure/Repositories/TripRepository.cs]
- [Source: BE/TripPlanner.Infrastructure/Mappings/MappingProfile.cs]
- [Source: BE/TripPlanner.Application/UseCases/SavedPlaces/ScheduleSavedPlaceUseCase.cs, UseCases/TripDay/AddDestinationToTripDayUseCase.cs]
- [Source: BE/TripPlanner.API/Endpoints/TripEndpoints.cs, Extensions/ResultExtension.cs, Extensions/AppServicesExtension.cs]
- [Source: BE/TripPlanner.Application/DTOs/Responses/TripResponse.cs, TripDayResponse.cs]
- [Source: FE/src/features/trips/TripPlannerPage.tsx, hooks.ts, api.ts]
- [Source: FE/src/shared/api/types.ts, shared/api/client.ts]
- [Source: CLAUDE.md (patterns: use case/result/repository/validation/mapper; code style — braces required, no comments)]

### Code style reminders (from CLAUDE.md)
- No comments in code (no XML docs, inline, or block) — FE and BE.
- Curly braces required for all control-flow statements (BE C#), even single-statement bodies.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- Backend build initially failed with `MSB3021` file-lock errors — a stale `TripPlanner.API.exe` (PID 37980) was holding the output DLLs. Stopped the process; rebuild then succeeded.
- Python unavailable in the environment, so the workflow-customization resolver was applied manually (base `customize.toml`; no team/user overrides for `bmad-dev-story` exist).
- FE `TripPlannerPage` reorder test first asserted the mock synchronously right after the click; the mutation's `mutationFn` fires on a later microtask, so the assertion was wrapped in `waitFor`.

### Completion Notes List

- **Data model (AC #1, #2):** promoted the implicit `trip_day_destinations` skip-nav join to an explicit `TripDayDestination { TripDayId, DestinationId, Destination, Position }` entity owned one-to-many by `TripDay._items`. `TripDay.Destinations` remains `IReadOnlyList<Destination>`, now projected in `Position` order — mapper, `TripDayResponse`, and both day-add use cases were untouched. `AddDestination` appends at the end; `RemoveDestination` removes and renumbers gap-free; new `ReorderDestinations(orderedIds)` sets positions by destination-id match.
- **EF (AC #1):** `TripDayConfiguration` now maps the `_items` collection by field navigation (`PropertyAccessMode.Field`) and `Ignore`s the computed `Destinations` projection; new `TripDayDestinationConfiguration` maps the join table to its existing `trip_day_id`/`destination_id` columns plus the new `position` column, keeping the composite PK and FKs unchanged.
- **Migration (AC #1):** `AddTripDayDestinationOrder` is purely additive — `AddColumn position` (int NOT NULL, default 0) plus a deterministic backfill (`ROW_NUMBER() OVER (PARTITION BY trip_day_id ORDER BY destination_id)`). Applied to the dev DB successfully. `Down` drops the column.
- **Repository (AC #1):** both trip queries switched `.ThenInclude(d => d.Destinations)` to the string include `"Days._items.Destination"` since `Destinations` is no longer a navigation.
- **Reorder use case + API (AC #3, #4):** `ReorderDayDestinationsUseCase` loads the trip user-scoped (NotFound), finds the day (NotFound), validates the submitted ids are an exact permutation of the day's current ids (count + set + no duplicates → else BadRequest with the stored order untouched and no save), reorders, saves, returns the mapped trip. `PUT /api/trips/{id}/days/{date}/destinations/order` wired in `TripEndpoints`; DTO + `[AsParameters]` record + the two auto-scanned validators added; use case registered in `AppServicesExtension`.
- **Frontend (AC #5, #6, #7):** `@dnd-kit/sortable` added. Each day's rows render inside a `SortableContext` (`verticalListSortingStrategy`); `DestinationRow` is a `useSortable` item with a drag handle and keyboard-reachable **Move up/Move down** buttons (disabled at the ends, descriptive `aria-label`s). `handleDragEnd` keeps the existing pool→day schedule branch and adds a same-day `dest-*` reorder branch (`arrayMove`); a drag ending on a different day is a no-op (US6 out of scope). `useReorderDayDestinations` mirrors `useScheduleSavedPlace` — optimistic cache reorder, rollback on error into a `role="alert"` region, `onSettled` invalidation.
- **Tests (AC #8):** domain ordering (`TripTests`), reorder use case success + all guard/error cases (`TripDayServiceTests`), FE api client, optimistic reorder hook (reorder + rollback), and `TripPlannerPage` move-up/down + disabled-at-ends + reorder-error alert. Full suites green: `dotnet build BE`, `dotnet test BE` (212 passed), `npm test` (248 passed), `npm run lint` (only pre-existing warnings), `npm run build`.
- Live browser drag QA was not exercised this session (no browser tooling) — consistent with 3-4; the accessible Move up/down path and the optimistic hook are covered by tests. A Playwright pointer-drag pass is recommended at review.

### File List

**Backend — new**
- `BE/TripPlanner.Domain/Models/TripDayDestination.cs`
- `BE/TripPlanner.Infrastructure/Data/Configurations/TripDayDestinationConfiguration.cs`
- `BE/TripPlanner.Infrastructure/Migrations/20260717205332_AddTripDayDestinationOrder.cs`
- `BE/TripPlanner.Infrastructure/Migrations/20260717205332_AddTripDayDestinationOrder.Designer.cs`
- `BE/TripPlanner.Application/UseCases/TripDay/IReorderDayDestinationsUseCase.cs`
- `BE/TripPlanner.Application/UseCases/TripDay/ReorderDayDestinationsUseCase.cs`
- `BE/TripPlanner.Application/DTOs/Requests/ReorderDayDestinationsRequest.cs`
- `BE/TripPlanner.API/Parameters/ReorderDayDestinationsParameter.cs`
- `BE/TripPlanner.API/Validators/ReorderDayDestinationsValidator.cs`
- `BE/TripPlanner.API/Validators/ReorderDayDestinationsParameterValidator.cs`

**Backend — modified**
- `BE/TripPlanner.Domain/Models/TripDay.cs`
- `BE/TripPlanner.Infrastructure/Data/Configurations/TripDayConfiguration.cs`
- `BE/TripPlanner.Infrastructure/Repositories/TripRepository.cs`
- `BE/TripPlanner.Infrastructure/Migrations/TripPlannerDbContextModelSnapshot.cs`
- `BE/TripPlanner.API/Endpoints/TripEndpoints.cs`
- `BE/TripPlanner.API/Extensions/AppServicesExtension.cs`
- `BE/TripPlanner.Tests/TripTests.cs`
- `BE/TripPlanner.Tests/TripDayServiceTests.cs`

**Frontend — new (code review 2026-07-18)**
- `FE/src/features/trips/dragActions.ts`

**Frontend — modified**
- `FE/src/shared/api/types.ts`
- `FE/src/features/trips/api.ts`
- `FE/src/features/trips/hooks.ts`
- `FE/src/features/trips/TripPlannerPage.tsx`
- `FE/src/features/trips/TripPlannerPage.module.css`
- `FE/src/features/trips/api.test.ts`
- `FE/src/features/trips/hooks.test.tsx`
- `FE/src/features/trips/TripPlannerPage.test.tsx`
- `FE/package.json`
- `FE/package-lock.json`

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-17 | 0.1 | Story drafted for Feature 3 US5 (reorder destinations within a day). Resolves the deferred data-model prerequisite by promoting `trip_day_destinations` to an explicit `TripDayDestination` join entity with a `position` column; reorder endpoint + optimistic `@dnd-kit/sortable` UI with accessible Move up/down fallback. Scope held to within-day only (US6 deferred). | Quanhvo |
| 2026-07-18 | 1.0 | Implemented all 10 tasks. Explicit ordered join entity + additive `position` migration with deterministic backfill; user-scoped reorder use case with permutation guard; `PUT .../destinations/order` endpoint + validators; `@dnd-kit/sortable` within-day reorder with optimistic hook + rollback and accessible Move up/down controls. BE 212 tests, FE 248 tests, lint + both builds green. Status → review. | Amelia (Dev Agent) |
| 2026-07-18 | 1.1 | Senior code review. Fixed AC#5 pool→day drag regression on populated days (extracted pure `resolveDragAction` into `dragActions.ts` + added `place→dest` scheduling branch) and closed the drag-path test gap (6 `resolveDragAction` unit tests). 5 findings deferred (DB round-trip harness, aggregate invariant, in-flight gating, aria-live, renumber round-trip verification), 8 dismissed. FE 254 tests, lint (2 pre-existing warnings) + build green. Status → done. | Code Review (AI) |
