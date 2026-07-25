---
baseline_commit: 698215edd82bf9fe4c3a9acfad629b4acce3be5e
---

# Story 3.6: Move a Destination From One Day to Another (Cross-Day Drag & Drop)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **logged-in TripPlanner user**,
I want **to drag a scheduled destination from one day and drop it onto a different day**,
so that **I can reschedule a place to the day I actually intend to visit it without removing and re-adding it**.

Concrete example (from the request): day **2026-07-18** has destination **A** and day **2026-07-17** has destination **B**. I drag **B** off day 17 and drop it on day 18, so day 18 now holds **A** and **B** and day 17 becomes empty.

## Context & Problem Statement

This is **Feature 3 / US6** from `requirement/Sheet1.html`, marked **High** and deliberately deferred in the epic:

> *"US6 — Drag a destination from one day to another (High): composes remove + add once US4/US5 land."* [Source: epic/epic-3-trip-planner.md#Out-of-scope]

US4/US5 have now landed:
- Story **3-4** (done) added the Saved Places pool and the `@dnd-kit` drag *from the pool onto a day* (`useScheduleSavedPlace`, optimistic move + rollback, `resolveDragAction` seam).
- Story **3-5** (done) added *within-a-day* reorder: promoted `trip_day_destinations` to an explicit **`TripDayDestination { Position }`** join entity, and made every day-drag flow through the pure `resolveDragAction` in `FE/src/features/trips/dragActions.ts`.

Both stories **explicitly excluded** the cross-day move. In today's code a drag that leaves the origin day is a deliberate no-op: `resolveDragAction` returns `null` when a `dest-` row is dropped over a **different** day's row (`activeDest.date !== overDest.date`), and a `dest-` row dropped over a `day-` droppable isn't handled at all. [Source: FE/src/features/trips/dragActions.ts:33-52]

This story turns that no-op into a real move. The epic's prediction holds exactly: the operation **composes remove + add** on primitives that already exist — `TripDay.RemoveDestination` (removes and renumbers the source day gap-free) and `TripDay.AddDestination` (appends at the end of the target day) — surfaced through one aggregate-level mutator on `Trip`, mirroring the existing `Trip.ScheduleFromSavedPlaces`. **No migration, no schema change, no mapper change** — the `position` column and the ordered projection from 3-5 already carry everything needed. [Source: BE/TripPlanner.Domain/Models/TripDay.cs:20-37; BE/TripPlanner.Domain/Models/Trip.cs:41-45]

### Scope decisions

1. **Move to the *end* of the target day.** The destination is appended as the last item of the target day (next `Position`), exactly like `AddDestination`/`ScheduleFromSavedPlaces`. Fine-grained placement *within* the target day is US5's job — the user reorders after moving (3-5). Dropping onto a specific row in the target day still moves-to-that-day (append); it does **not** insert at that row's slot. This keeps US6 a pure day↔day move and avoids re-implementing reorder semantics across days.
2. **Different days only.** A same-day drag continues to route to **reorder** (3-5), never to move. The backend rejects a `toDate == fromDate` move with `400 BadRequest` as a defensive guard; the frontend never emits one (its accessible "Move to day…" control lists only *other* days, and same-day drags resolve to `reorder`).
3. **Reuse the existing DnD, hook, and drag-resolution conventions.** One `DndContext`, `resolveDragAction` gains a third action kind (`move`), and a new `useMoveDestinationBetweenDays` hook mirrors `useScheduleSavedPlace` (optimistic move + rollback). **No new dependency** — `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` are all already installed.
4. **Accessibility floor (as in 3-4 / 3-5):** drag alone is not accessible. Each scheduled destination row gains a keyboard/screen-reader-reachable **"Move to day…"** control (a `<select>` of the trip's *other* days, mirroring `SavedPlaceCard`'s "Add to day…" select) that hits the same hook/endpoint.
5. **Persistence + NFR4:** the move persists across reloads (US10). The UI updates **optimistically** (≤100 ms, NFR4) and rolls back on server rejection, mirroring `useScheduleSavedPlace`/`useReorderDayDestinations`.
6. **Ownership (NFR6):** the move endpoint loads the trip user-scoped; a foreign or missing trip is `NotFound`, never `Forbidden` — the established pattern. No `ErrorType` additions.

## Acceptance Criteria

1. **Move endpoint.** `PUT /api/trips/{id}/days/{date}/destinations/{destinationId}/move` with body `{ toDate: string }` moves destination `{destinationId}` from the source day (`{date}` route segment) to the **end** of the target day (`toDate`) and returns the updated `TripResponse`. The caller is resolved via `httpContext.User.GetUserId()`; an unowned or missing trip is `404 NotFound` (NFR6), so no cross-user move is possible.

2. **Move validation & guards.** In the use case: source day (`date`) not in the trip → `404 NotFound` "Day Not Found"; target day (`toDate`) not in the trip → `404 NotFound` "Day Not Found"; the destination not present in the **source** day → `404 NotFound` "Destination is not in this day."; the destination already present in the **target** day → `400 BadRequest` "Destination already exists in this day." (mirrors `ScheduleSavedPlaceUseCase`); `toDate == date` → `400 BadRequest` "Source and target day must be different." On any failure the stored data is left unchanged and no save occurs. In the validator (auto-run): missing/absent/malformed `toDate` → `400 BadRequest`; non-positive `destinationId` or `id`, or malformed source `date` → `400 BadRequest`.

3. **Domain move mutator + persisted ordering.** A `Trip.MoveDestinationBetweenDays(Destination destination, TripDay fromDay, TripDay toDay)` mutator removes the destination from `fromDay` (renumbering the remaining items gap-free `0..n-1`) and appends it to `toDay` (next `Position`), mirroring `Trip.ScheduleFromSavedPlaces`. After a move, `GET /api/trips/{id}` and `GET /api/trips` return the source day **without** the destination and the target day **with** it at the end, in `Position` order, and the change survives a reload (US10). The public surface `TripDay.Destinations` (`IReadOnlyList<Destination>`) is unchanged, so the mapper, `TripDayResponse`, and both day-add use cases need no changes.

4. **Frontend — drag across days.** Dragging a scheduled destination row (`dest-<fromDate>-<id>`) and dropping it on a **different** day — whether over that day's droppable (`day-<toDate>`, **including an empty day**, as in the day-17-empty example) or over one of that day's destination rows (`dest-<toDate>-<id>`) — calls the move endpoint and updates the UI **optimistically** (the row disappears from the source day and appears at the end of the target day, NFR4). A same-day drag still **reorders** (3-5). The pool→day scheduling drag (3-4) still works. All three behaviors live in the **same** single `DndContext`.

5. **Frontend — optimistic move + rollback.** A `useMoveDestinationBetweenDays` hook mirrors `useScheduleSavedPlace`: `mutationFn` calls the new API client function; `onMutate` cancels `['trip', tripId]`, snapshots `previousTrip`, removes the destination from the source day's `destinations` and appends it to the target day's `destinations` in the cache (skipping if the target already has it); `onError` restores `previousTrip` and the message surfaces in a `role="alert"` region; `onSettled` invalidates `['trips']` + `['trip', tripId]`.

6. **Frontend — accessible non-drag path.** Each scheduled destination row offers a keyboard/screen-reader-reachable **"Move to day…"** control (a `<select>` listing the trip's days **other than the row's own day**, mirroring `SavedPlaceCard`'s "Add to day…" select) that moves the destination to the chosen day via the same hook/endpoint. When the trip has no other day, the control is absent or disabled. The control has a descriptive `aria-label` (e.g. `Move {name} to another day`).

7. **`resolveDragAction` extended and pure.** `resolveDragAction` returns a new action `{ kind: 'move'; destinationId: number; fromDate: string; toDate: string }` when a `dest-<fromDate>-*` active item is dropped over a **different-day** `day-<toDate>` droppable or `dest-<toDate>-*` row; it keeps returning `reorder` for a same-day `dest-`→`dest-` drop and `schedule` for a `place-`→`day-`/`dest-` drop; and it returns `null` for a drop over self or any unhandled id pairing. The function stays pure and side-effect-free.

8. **No regressions & green build.** All existing BE and FE tests still pass (updated only where a signature or fixture legitimately changes — never weakened). New unit tests cover: the domain move (source loses the destination and renumbers; target appends it; `Destinations` order reflects both) in `TripTests`; the move use case (success + every guard/error branch: trip missing, other user's trip, source day missing, target day missing, destination not in source day, destination already in target day, same-day) in a new `MoveDestinationBetweenDaysServiceTests` (or `TripDayServiceTests`); the new API client function; the optimistic move hook (move + rollback); the new `resolveDragAction` `move` cases (dest→other-day droppable, dest→other-day row, same-day still reorder, self/unhandled → null); and the `TripPlannerPage` accessible "Move to day…" behavior (moves via the select; option list excludes the row's own day). `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build` all pass.

## Tasks / Subtasks

- [x] **Task 1 — Domain: cross-day move mutator (AC: #3)**
  - [x] Add `public void MoveDestinationBetweenDays(Destination destination, TripDay fromDay, TripDay toDay)` to `BE/TripPlanner.Domain/Models/Trip.cs`, mirroring `ScheduleFromSavedPlaces`: `fromDay.RemoveDestination(destination); toDay.AddDestination(destination);`. `RemoveDestination` already renumbers the source day; `AddDestination` already appends at `_items.Count`. Do not add position math here — reuse the existing `TripDay` mutators.
  - [x] Unit tests in `TripTests`: after moving a destination from a populated source day to a populated target day, (a) the source day's `Destinations` no longer contains it and the remaining items are gap-free in order; (b) the target day's `Destinations` contains it as the **last** item; (c) moving the only destination out of a day leaves that day's `Destinations` empty.

- [x] **Task 2 — Application: move use case (AC: #1, #2)**
  - [x] `BE/TripPlanner.Application/UseCases/TripDay/IMoveDestinationBetweenDaysUseCase.cs` + impl `MoveDestinationBetweenDaysUseCase`: `ExecuteAsync(int tripId, DateOnly fromDate, int destinationId, DateOnly toDate, int userId, CancellationToken)`. Load trip user-scoped via `tripRepository.GetWithDaysAndDestinationsAsync(tripId, userId, ct)` (null → `NotFound` "Trip Not Found"). Guard order: `toDate == fromDate` → `BadRequest` "Source and target day must be different."; find `fromDay` by `Day == fromDate` (null → `NotFound` "Day Not Found"); find `toDay` by `Day == toDate` (null → `NotFound` "Day Not Found"); find the destination in `fromDay.Destinations` by id (null → `NotFound` "Destination is not in this day."); if `toDay.Destinations.Any(x => x.Id == destinationId)` → `BadRequest` "Destination already exists in this day."; else `trip.MoveDestinationBetweenDays(destination, fromDay, toDay)`, `await unitOfWork.SaveChangesAsync(ct)`, return `Result<TripResponse>.Success(mapper.MapToTripResponse(trip))`. Model the shape on `ScheduleSavedPlaceUseCase`.
  - [x] Register `IMoveDestinationBetweenDaysUseCase → MoveDestinationBetweenDaysUseCase` in `BE/TripPlanner.API/Extensions/AppServicesExtension.cs` (next to `IReorderDayDestinationsUseCase`).
  - [x] Tests (`MoveDestinationBetweenDaysServiceTests`, or extend `TripDayServiceTests`): success moves + returns the mapped trip and saves once; trip missing → NotFound; other user's trip (repo returns null) → NotFound; source day missing → NotFound; target day missing → NotFound; destination not in source day → NotFound; destination already in target day → BadRequest (no save); `toDate == fromDate` → BadRequest (no save). Mock `ITripRepository`, `IUnitOfWork`, `IApplicationMapper` per house convention.

- [x] **Task 3 — API: endpoint, DTO, parameter, validators (AC: #1, #2)**
  - [x] Request DTO `BE/TripPlanner.Application/DTOs/Requests/MoveDestinationRequest.cs` → `public sealed record MoveDestinationRequest { public string? ToDate { get; init; } }`.
  - [x] `[AsParameters]` record `BE/TripPlanner.API/Parameters/MoveDestinationParameter.cs` → `{ [FromRoute(Name="id")] int Id; [FromRoute(Name="date")] string? Date; [FromRoute(Name="destinationId")] int DestinationId; [FromBody] MoveDestinationRequest? MoveDestinationRequest }` (mirror `ReorderDayDestinationsParameter` + the `destinationId` route binding from `RemoveDestinationFromDayParameter`).
  - [x] Validators (auto-scanned by `AddValidatorsFromAssembly`): `MoveDestinationRequestValidator` (`ToDate` NotNull/NotEmpty + `Must(DateHelper.IsValidDateOnly!)` "Date must be formatted as YYYY-MM-DD.") and `MoveDestinationParameterValidator` (Id NotEmpty; DestinationId `GreaterThan(0)`; `Date` `Must(DateHelper.IsValidDateOnly!)`; nested `MoveDestinationRequest` NotNull + `SetValidator(requestValidator)`), mirroring the `ReorderDayDestinations*` validator pair.
  - [x] In `BE/TripPlanner.API/Endpoints/TripEndpoints.cs`: register `group.MapPut("/{id:int}/days/{date}/destinations/{destinationId:int}/move", MoveDestination);` and add a handler that parses `fromDate = DateOnly.ParseExact(parameter.Date!, DateHelper.DateFormat, null)` and `toDate = DateOnly.ParseExact(parameter.MoveDestinationRequest!.ToDate!, DateHelper.DateFormat, null)`, calls the use case with `httpContext.User.GetUserId()`, and returns `result.ToResponse(onSuccess => Results.Ok(result.Data))` — mirroring `ReorderDayDestinations`.

- [x] **Task 4 — Frontend types + API client (AC: #1, #4, #5)**
  - [x] `FE/src/shared/api/types.ts`: add `export interface MoveDestinationRequest { toDate: string }`.
  - [x] `FE/src/features/trips/api.ts`: `moveDestinationBetweenDays(tripId: number, fromDate: string, destinationId: number, body: MoveDestinationRequest): Promise<Trip>` → `PUT /api/trips/${tripId}/days/${fromDate}/destinations/${destinationId}/move`, mirroring `reorderDayDestinations`.

- [x] **Task 5 — Frontend: `resolveDragAction` move branch (AC: #7)**
  - [x] In `FE/src/features/trips/dragActions.ts`, add `{ kind: 'move'; destinationId: number; fromDate: string; toDate: string }` to the `DragAction` union.
  - [x] Change the `dest-` active branch: when `activeId.startsWith('dest-')`, compute `activeDest = parseDestId(activeId)`. If `overId.startsWith('dest-')`: if same date → existing reorder path; if different date → return `{ kind: 'move', destinationId: activeDest.destinationId, fromDate: activeDest.date, toDate: parseDestId(overId).date }`. If `overId.startsWith('day-')`: let `toDate = overId.slice('day-'.length)`; if `toDate !== activeDest.date` → return the `move` action; if same date → `null` (dropping onto own day header is a no-op; reorder handles row-over-row). Keep the `place-` branch unchanged. Preserve purity.

- [x] **Task 6 — Frontend: optimistic move hook (AC: #5)**
  - [x] `FE/src/features/trips/hooks.ts`: `useMoveDestinationBetweenDays` modeled on `useScheduleSavedPlace` — `mutationFn: ({ tripId, fromDate, destinationId, toDate }) => moveDestinationBetweenDays(tripId, fromDate, destinationId, { toDate })`; `onMutate` cancels `['trip', tripId]`, snapshots `previousTrip`, finds the moving destination in the source day, and rewrites `tripDays` so the source day drops it and the target day appends it (skip if the target day already contains it, mirroring the scheduling hook's dedupe); `onError` restores `previousTrip`; `onSettled` invalidates `['trips']` + `['trip', tripId]`.

- [x] **Task 7 — Frontend: wire drag + accessible "Move to day" control (AC: #4, #5, #6)**
  - [x] In `TripPlannerPage.tsx`, instantiate `const moveDestination = useMoveDestinationBetweenDays();` and derive a `moveError` string (mirror `reorderError`), rendered in a `role="alert"` region.
  - [x] Extend `handleDragEnd`: after `resolveDragAction`, add an `action.kind === 'move'` branch that calls `moveDestination.mutate({ tripId, fromDate: action.fromDate, destinationId: action.destinationId, toDate: action.toDate })`. Keep the existing `schedule` and `reorder` branches.
  - [x] Add a **"Move to day…"** `<select>` to `DestinationRow` (a new prop `otherDays: TripDay[]` + `onMoveToDay: (destination, toDate) => void`), mirroring `SavedPlaceCard`'s "Add to day…" select: options are the trip's days **excluding the row's own day**, `aria-label={`Move ${destination.name} to another day`}`, value resets to `''`, `onChange` fires `onMoveToDay` with the chosen date. Render nothing (or a disabled control) when `otherDays` is empty. `DaySegment` passes `otherDays = tripDays.filter(d => d.day !== day.day)` and an `onMoveToDay` that calls the page-level move handler.
  - [x] Update the drag-handle `aria-label` on a scheduled row from `Reorder {name}` to something that reflects both capabilities (e.g. `Reorder or move {name}`), since the same handle now also drags across days.
  - [x] Add any needed styles to `TripPlannerPage.module.css` (reuse the existing `.assign` select styles from `SavedPlaceCard` where possible).

- [x] **Task 8 — Tests + full validation (AC: #8)**
  - [x] FE: extend `api.test.ts` (move endpoint URL + method + body), `hooks.test.tsx` (move optimistic reorder across days + rollback on error), `dragActions` tests in `TripPlannerPage.test.tsx` (or the dedicated `resolveDragAction` block) for the new `move` cases (dest→other-day droppable, dest→other-day row, same-day still `reorder`, drop-over-own-day-header → null), and `TripPlannerPage.test.tsx` (accessible "Move to day…" moves the destination; the select excludes the row's own day; move-error alert). Update any fixture asserting day membership/order.
  - [x] BE: run and fix any existing tests affected (none expected — the public domain surface and DTOs are unchanged; this is purely additive).
  - [x] Run `dotnet build BE`, `dotnet test BE`, `npm test`, `npm run lint`, `npm run build`; fix regressions. Live browser/drag QA may be deferred if no browser tooling is available this session (consistent with 3-4/3-5) — if so, exercise the accessible "Move to day…" path + the optimistic hook directly and recommend a Playwright cross-day-drag pass at review.

## Dev Notes

### The central change — a cross-day move that composes existing primitives
- **Why it's small:** 3-5 already made a day's destinations an ordered collection (`TripDayDestination { Position }`) with `AddDestination` (append) and `RemoveDestination` (remove + gap-free `Renumber`). A cross-day move is exactly `RemoveDestination` on the source + `AddDestination` on the target — no new position logic. [Source: BE/TripPlanner.Domain/Models/TripDay.cs:20-60]
- **Where the mutator lives:** on the `Trip` aggregate, because the move spans two `TripDay` children the aggregate owns — identical reasoning to `Trip.ScheduleFromSavedPlaces(destination, tripDay)` which spans the saved-places pool and a day. Add `Trip.MoveDestinationBetweenDays(destination, fromDay, toDay)`. [Source: BE/TripPlanner.Domain/Models/Trip.cs:41-45]
- **No migration / no mapper change:** the `position` column exists (3-5's `AddTripDayDestinationOrder`), `TripDay.Destinations` still returns `IReadOnlyList<Destination>` in `Position` order, and `MappingProfile` maps `TripDayResponse.Destinations ← src.Destinations` — all untouched. The repository already string-includes `"Days._items.Destination"`. [Source: 3-5 story File List; BE/TripPlanner.Infrastructure/Repositories/TripRepository.cs]

### Backend precedents to mirror
- **Use case shape:** `ScheduleSavedPlaceUseCase` is the closest template — load trip user-scoped (NotFound), find the day (NotFound), find the destination (NotFound), duplicate-on-target guard (BadRequest "Destination already exists in this day."), mutate via the aggregate, `SaveChangesAsync`, return `MapToTripResponse`. `ReorderDayDestinationsUseCase` shows the same load/guard/save/map spine with a second date-scoped lookup. [Source: BE/TripPlanner.Application/UseCases/SavedPlaces/ScheduleSavedPlaceUseCase.cs; BE/TripPlanner.Application/UseCases/TripDay/ReorderDayDestinationsUseCase.cs]
- **User-scoped load = ownership:** never add `Forbidden`; an unowned trip returns null → NotFound (NFR6). [Source: epic/epic-3-trip-planner.md#Technical-approach]
- **Endpoint pattern:** `[AsParameters]` parameter record, `DateOnly.ParseExact(x, DateHelper.DateFormat, null)`, `httpContext.User.GetUserId()`, `result.ToResponse(onSuccess => Results.Ok(result.Data))`. The `ReorderDayDestinations` handler is the exact template; the `destinationId:int` route segment comes from `RemoveDestinationFromTripDay`. [Source: BE/TripPlanner.API/Endpoints/TripEndpoints.cs:105-114, 63-72]
- **Validators auto-scan:** `AddValidatorsFromAssembly` registers new validators automatically (SharpGrip AutoValidation). Mirror the `ReorderDayDestinations*` validator pair; validate `ToDate` with `DateHelper.IsValidDateOnly`. [Source: BE/TripPlanner.API/Validators/ReorderDayDestinations*.cs; CLAUDE.md#Validation]
- **Result → HTTP mapping:** `ResultExtension.ToResponse()` already maps NotFound/BadRequest — no new `ErrorType`. [Source: BE/TripPlanner.API/Extensions/ResultExtension.cs]

### Frontend precedents to mirror
- **Drag resolution is a pure seam:** every day-drag flows through `resolveDragAction(activeId, overId, tripDays)`; extend it with the `move` kind rather than adding logic in `handleDragEnd`. The 3-5 review specifically extracted this to make the drag path unit-testable — keep new logic there and unit-test it. [Source: FE/src/features/trips/dragActions.ts; 3-5 Review Findings]
- **Optimistic move + rollback:** `useScheduleSavedPlace` is the exact template for a cross-collection move (remove from one list, append to another, dedupe, rollback). `useReorderDayDestinations` shows the same `onMutate`/`onError`/`onSettled` shape for a day mutation. Keys are `['trips']` and `['trip', tripId]`. [Source: FE/src/features/trips/hooks.ts:123-166, 168-214]
- **Accessible non-drag control:** `SavedPlaceCard` already renders an "Add to day…" `<select>` (`aria-label`, `value=''` reset, `onChange` guard). The row's "Move to day…" select is the same control, filtered to *other* days. `DestinationRow` already has the Move up/down a11y precedent from 3-5. [Source: FE/src/features/trips/TripPlannerPage.tsx:178-194, 101-120]
- **Sortable id encoding:** rows are `dest-<date>-<id>`, days are `day-<date>`, saved-place cards are `place-<id>`; `parseDestId` splits on the **last** dash so ISO dates (which contain dashes) parse correctly. Reuse `parseDestId` for both active and over ids. [Source: FE/src/features/trips/dragActions.ts:4-11; TripPlannerPage.tsx:225, 269]
- **Cross-container dnd-kit behavior:** a `useSortable` row dragged over another day resolves `over.id` to that day's `day-` droppable when the day is empty, or to one of its `dest-` rows when populated — `resolveDragAction` must handle **both** over-id shapes for the move (mirrors how the 3-5 review had to handle `place-`→`dest-` on a populated day). [Source: 3-5 Review Findings — "populated day" over-id resolution]
- **Types:** `TripDay.destinations: Destination[]`, `Trip.tripDays: TripDay[]`, `TripDay.day` is the ISO date string used as React key + API path segment. [Source: FE/src/shared/api/types.ts:54-66]

### Testing standards summary
- **BE:** xUnit + NSubstitute, `Method_Scenario_ExpectedResult` naming, following `TripTests.cs` / `TripDayServiceTests.cs` / `SavedPlacesServiceTests.cs`. Domain move tested directly on `Trip`/`TripDay` (no mocks); the use case mocks `ITripRepository`/`IUnitOfWork`/`IApplicationMapper`. Assert "no save on guard failure" via `unitOfWork.DidNotReceive().SaveChangesAsync(...)`.
- **FE:** Vitest + Testing Library, co-located `*.test.tsx`, `vi.mock('./api', …)`, `QueryClientProvider` (retry off) + `MemoryRouter`. Query by role/label/text, never CSS class. For DnD, prefer testing `resolveDragAction` as a pure function + the accessible "Move to day…" `<select>` path + a direct optimistic-hook test (raw pointer drag in jsdom is brittle), exactly as 3-4/3-5 did. [Source: FE/src/features/trips/*.test.tsx; 3-5 Dev Notes]

### Known edge cases to cover
- **Target day already has the destination** → BadRequest; the optimistic hook must also skip the append so a rejected move + rollback is consistent.
- **Empty target day** (the day-17-empty example, reversed): the over-id is `day-<toDate>`, not a `dest-` row — the `move` branch must fire on the `day-` over-id too (AC #4).
- **Source day becomes empty** after the move → its `Destinations` is `[]`, the `SortableContext`/rows unmount and the empty-day placeholder renders; the source day heading/droppable remain.
- **Same-day** drag or select → never a move (reorder / excluded from options); backend BadRequest is defensive only.

### Project Structure Notes
- Feature-based FE layout (post 5-17): trips under `FE/src/features/trips/`, `@/` → `src` alias; shared types in `FE/src/shared/api/types.ts`. New code co-locates there.
- Clean Architecture dependency direction preserved: mutator in Domain (`Trip`); `IMoveDestinationBetweenDaysUseCase` + impl in Application; endpoint/DTO/parameter/validators in API. AutoMapper stays in Infrastructure behind `IApplicationMapper`. Nothing in Application/Domain references API/Infrastructure. **No Infrastructure change at all** (no migration, no repository/config edit).

### Code style reminders (from CLAUDE.md)
- No comments in code (no XML docs, inline, or block) — FE and BE.
- Curly braces required for all control-flow statements (BE C#), even single-statement bodies.

### References
- [Source: requirement/Sheet1.html — Feature 3 US6 (Drag a destination from one day to another, High), NFR4, NFR6]
- [Source: epic/epic-3-trip-planner.md#Out-of-scope (US6 "composes remove + add once US4/US5 land"), #Technical-approach (ownership → NotFound pattern)]
- [Source: _bmad-output/implementation-artifacts/3-4-schedule-destinations-into-day.md (Saved Places, @dnd-kit setup, optimistic move + rollback, accessible fallback, resolveDragAction seam origin)]
- [Source: _bmad-output/implementation-artifacts/3-5-reorder-destinations-within-day.md (TripDayDestination { Position } ordered join, AddDestination/RemoveDestination/Renumber, resolveDragAction extraction + populated-day over-id finding)]
- [Source: BE/TripPlanner.Domain/Models/Trip.cs (ScheduleFromSavedPlaces mutator template), TripDay.cs (AddDestination/RemoveDestination/Renumber)]
- [Source: BE/TripPlanner.Application/UseCases/SavedPlaces/ScheduleSavedPlaceUseCase.cs, UseCases/TripDay/ReorderDayDestinationsUseCase.cs]
- [Source: BE/TripPlanner.API/Endpoints/TripEndpoints.cs, Parameters/ReorderDayDestinationsParameter.cs, Validators/ReorderDayDestinations*.cs, DTOs/Requests/ReorderDayDestinationsRequest.cs, Extensions/AppServicesExtension.cs, Extensions/ResultExtension.cs, Helpers/DateHelper]
- [Source: FE/src/features/trips/dragActions.ts, hooks.ts, api.ts, TripPlannerPage.tsx; FE/src/shared/api/types.ts, shared/api/client.ts]
- [Source: CLAUDE.md (patterns: use case/result/repository/validation/mapper; code style — braces required, no comments)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `dotnet build BE` first failed with `MSB3021`/`MSB3027` file-lock errors — a running `TripPlanner.API` (PID 26504) held the output DLLs (same class of issue noted in 3-5's Debug Log). Stopped the process (`taskkill /PID 26504 /F`); rebuild then succeeded cleanly.
- Python is unavailable in this environment, so the create-story and dev-story workflow-customization resolvers were applied manually (base `customize.toml`; no team/user overrides exist for either skill).
- Two pre-existing `resolveDragAction` unit tests asserted the old US6-out-of-scope no-ops (cross-day `dest`→`dest` and `dest`→other-day `day-` both returned `null`). These are exactly the behaviors this story changes, so they were rewritten to assert the new `move` action (not weakened), and a genuine no-op case (`dest`→own-day droppable) plus a `dest`→unknown-target null case were added.

### Completion Notes List

- **Domain (AC #3):** added `Trip.MoveDestinationBetweenDays(destination, fromDay, toDay)` = `fromDay.RemoveDestination(destination)` (renumbers gap-free) + `toDay.AddDestination(destination)` (appends), mirroring `ScheduleFromSavedPlaces`. No new position logic — reuses the 3-5 `TripDayDestination { Position }` primitives. Public `TripDay.Destinations` surface unchanged.
- **Application (AC #1, #2):** `MoveDestinationBetweenDaysUseCase` (+ interface) loads the trip user-scoped (NotFound), guards `fromDate == toDate` → BadRequest, source/target day missing → NotFound "Day Not Found", destination not in source day → NotFound "Destination is not in this day.", destination already in target day → BadRequest "Destination already exists in this day.", then mutates via the aggregate, saves, and returns the mapped trip. Registered in `AppServicesExtension`.
- **API (AC #1, #2):** `PUT /api/trips/{id}/days/{date}/destinations/{destinationId}/move` (body `{ toDate }`) wired in `TripEndpoints`; `MoveDestinationRequest` DTO + `MoveDestinationParameter` `[AsParameters]` record + two auto-scanned validators (`MoveDestinationRequestValidator`, `MoveDestinationParameterValidator`) mirror the `ReorderDayDestinations*` pair; both dates parsed via `DateOnly.ParseExact(x, DateHelper.DateFormat, null)`.
- **No migration / schema / mapper change** — confirmed. Purely additive on top of 3-5's ordered join model. No Infrastructure edits at all.
- **Frontend (AC #4–#7):** `resolveDragAction` gains a `move` action for a `dest-` active over a different-day `day-`/`dest-` target (same-day still `reorder`, `place-` still `schedule`, self/unknown → `null`); `useMoveDestinationBetweenDays` mirrors `useScheduleSavedPlace` (optimistic remove-from-source + append-to-target with dedupe, rollback on error, invalidate on settle); `TripPlannerPage` wires the drag `move` branch and adds an accessible **"Move to day…"** `<select>` per scheduled row (lists only *other* days, descriptive `aria-label`, absent when there are no other days) plus a `moveError` `role="alert"` region. Drag handle `aria-label` updated to "Reorder or move {name}". No new dependency; the `.assign` select style is reused.
- **Tests (AC #8):** domain move (source loses it + renumbers, target appends, only-destination leaves source empty) in `TripTests`; the move use case's 8 branches (success + trip missing + foreign trip + same-day + source-day missing + target-day missing + dest-not-in-source + dest-already-in-target, asserting `DidNotReceive().SaveChangesAsync` on every guard failure) in `TripDayServiceTests`; the API client fn; the optimistic move hook (move + rollback); the new/updated `resolveDragAction` `move`/no-op cases; and `TripPlannerPage` accessible "Move to day…" (moves via select, option list excludes own day, rollback + alert on failure).
- **Validation:** `dotnet build BE` clean; `dotnet test BE` **223 passed** (+11); `npm test` **262 passed** (+20); `npm run lint` clean (2 pre-existing warnings in `AuthContext.tsx`/`AddToTripContext.tsx`, unrelated); `npm run build` green.
- Live browser/drag QA was not exercised this session (no browser tooling) — consistent with 3-4/3-5. The accessible "Move to day…" path and the optimistic hook are covered by tests; a Playwright cross-day pointer-drag pass is recommended at review (drop onto a populated day, drop onto an empty day, and confirm the source day empties).

### File List

**Backend — new**
- `BE/TripPlanner.Application/UseCases/TripDay/IMoveDestinationBetweenDaysUseCase.cs`
- `BE/TripPlanner.Application/UseCases/TripDay/MoveDestinationBetweenDaysUseCase.cs`
- `BE/TripPlanner.Application/DTOs/Requests/MoveDestinationRequest.cs`
- `BE/TripPlanner.API/Parameters/MoveDestinationParameter.cs`
- `BE/TripPlanner.API/Validators/MoveDestinationRequestValidator.cs`
- `BE/TripPlanner.API/Validators/MoveDestinationParameterValidator.cs`

**Backend — modified**
- `BE/TripPlanner.Domain/Models/Trip.cs`
- `BE/TripPlanner.API/Endpoints/TripEndpoints.cs`
- `BE/TripPlanner.API/Extensions/AppServicesExtension.cs`
- `BE/TripPlanner.Tests/TripTests.cs`
- `BE/TripPlanner.Tests/TripDayServiceTests.cs`

**Frontend — modified**
- `FE/src/shared/api/types.ts`
- `FE/src/features/trips/api.ts`
- `FE/src/features/trips/dragActions.ts`
- `FE/src/features/trips/hooks.ts`
- `FE/src/features/trips/TripPlannerPage.tsx`
- `FE/src/features/trips/api.test.ts`
- `FE/src/features/trips/hooks.test.tsx`
- `FE/src/features/trips/TripPlannerPage.test.tsx`

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-19 | 0.1 | Story drafted for Feature 3 US6 (move a destination from one day to another). Composes on 3-4/3-5: new `Trip.MoveDestinationBetweenDays` mutator (remove-from-source + append-to-target), `PUT .../days/{date}/destinations/{destinationId}/move` endpoint + validators, `resolveDragAction` `move` branch, optimistic `useMoveDestinationBetweenDays` hook + rollback, and an accessible "Move to day…" select. No migration/schema/mapper change. Scope: day↔day move only (append to target end; within-target ordering stays US5). | Quanhvo |
| 2026-07-19 | 1.1 | **Code review fix — cross-day move now idempotent.** A `Destination` is one row keyed uniquely by `ExternalId` (`DestinationResolver` reuses it), so the same place can legitimately sit in two days; dragging it onto a day that already held it hit AC #2's `400 "Destination already exists in this day."` and the FE (whose optimistic `onMutate` already dedupes the append) rolled the removal back and flashed the error. Fix: `Trip.MoveDestinationBetweenDays` now appends to the target only when it does not already contain the destination, and `MoveDestinationBetweenDaysUseCase` drops the BadRequest guard — a move onto a day that already has the place now just removes it from the source day and succeeds (net dedupe), matching the FE optimistic behavior. **Deliberate deviation from AC #2** (target-already-present is no longer a 400). Tests updated: BE `..._DestinationAlreadyInTargetDay_...` now asserts success + no duplicate; new `TripTests` domain dedupe case; new FE hook dedupe test. BE 224, FE 263, lint clean, build green. | Quanhvo |
| 2026-07-19 | 1.0 | Implemented all 8 tasks. `Trip.MoveDestinationBetweenDays` aggregate mutator; user-scoped `MoveDestinationBetweenDaysUseCase` with same-day/day-missing/dest-missing/dup guards; `PUT .../destinations/{destinationId}/move` endpoint + DTO + parameter + validators. FE: `resolveDragAction` `move` action, optimistic `useMoveDestinationBetweenDays` + rollback, cross-day drag branch, and an accessible per-row "Move to day…" select (other days only) with a move-error alert. No migration/schema/mapper/Infrastructure change. BE 223 tests (+11), FE 262 tests (+20), lint clean (2 pre-existing warnings), both builds green. Status → review. | Amelia (Dev Agent) |

### Review Findings

Adversarial code review 2026-07-24 (4 layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor). 0 decision-needed, 3 patch, 2 deferred, 12 dismissed as noise/by-design.

- [x] [Review][Patch] Move endpoint validators (`MoveDestinationParameterValidator`, `MoveDestinationRequestValidator`) have zero test coverage [BE/TripPlanner.API/Validators/MoveDestinationParameterValidator.cs:1] — the repo convention (`AttractionSearchParameterValidatorTests`) is to unit-test validators; these are the only guard turning a malformed `Date`/`ToDate`, null body, or `DestinationId <= 0` into a 400 instead of an unhandled `FormatException`/500 in the handler. **FIXED:** added `BE/TripPlanner.Tests/MoveDestinationValidatorTests.cs` (14 cases — valid + each-invalid for both validators, mirroring `AttractionSearchParameterValidatorTests`).
- [x] [Review][Patch] Cross-day-move rollback test asserts a backend message the API no longer emits [FE/src/features/trips/TripPlannerPage.test.tsx:660] — after the v1.1 idempotency deviation the move endpoint never returns `400 "Destination already exists in this day."`; the "rolls back and shows an alert" test still exercises rollback correctly but its chosen error string is now dead/misleading. **FIXED:** swapped the mock to `ApiError(404, 'Day Not Found')` — a message the backend can still produce.
- [x] [Review][Patch] The drag-driven `move` branch of `handleDragEnd` is never executed by a test [FE/src/features/trips/TripPlannerPage.tsx:468] — `resolveDragAction` (pure) and the "Move to day…" select path are tested, but no test fires a `DndContext` `onDragEnd` for a cross-day drag, so a transposition of `action.fromDate`/`action.toDate`/`destinationId` in the `moveDestination.mutate({...})` passthrough, or a fall-through to the reorder branch, would ship undetected. **FIXED:** added `FE/src/features/trips/TripPlannerPage.dnd.test.tsx` — captures `DndContext.onDragEnd` (dnd hooks stubbed so the page renders in jsdom) and drives the real `handleDragEnd`: a cross-day drag onto an empty day calls `moveDestinationBetweenDays(7,'2026-08-01',42,{toDate:'2026-08-02'})` and NOT reorder; a same-day drag routes to reorder and NOT move.
- [x] [Review][Defer] Overlapping/concurrent optimistic moves can restore a polluted rollback baseline [FE/src/features/trips/hooks.ts:183] — deferred, pre-existing systemic pattern shared by `useScheduleSavedPlace`/`useReorderDayDestinations` (`cancelQueries` does not serialize mutations); not introduced by this change.
- [x] [Review][Defer] Endpoint route/body → use-case argument mapping is unverified [BE/TripPlanner.API/Endpoints/TripEndpoints.cs:36] — deferred, pre-existing systemic gap (no endpoint/integration tests exist anywhere in the suite by convention); the use case is fully covered but receives `fromDate`/`toDate` already separated.
