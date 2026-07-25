# Epic 3: Trip Planner

Source: `requirement/Sheet1.html` — Feature 3: Trip Planner

## Summary

Let logged-in users create trips, set start/end dates that generate one itinerary day per date, collect destinations into specific days, and return later to find their trips exactly as they left them. This epic covers the MVP slice of Feature 3: the six "Selected = Yes" user stories (US1, US2, US3, US7, US8, US10) plus NFR6 (users can only view/modify their own trips). Drag-and-drop scheduling (US4), reordering within a day (US5), moving between days (US6), and auto-save (US9) are deferred.

Unlike Epics 1 and 2, most of this feature's backend already exists — `Trip`/`TripDay` entities, create/get/add/remove use cases, and an authorized `/api/trips` route group are implemented. The epic's real work is two things: **trip ownership** (today every authenticated user can see and modify every trip in the system — US10/NFR6 are unenforced) and the **update-dates flow** (US2), which has no backend at all.

**Dependency:** US3's "add a destination from the details page" relies on Epic 2's committed change to `AddDestinationToTripDayUseCase` (accept a provider xid and upsert-by-xid — see `epic-2-destination-details.md`). That change is referenced here as a dependency, not re-planned.

## In-scope user stories

### US1 — Create a trip (High)

> As a user, I want to create a trip so I can start planning an itinerary.

**Acceptance criteria**
1. Create a new trip by entering a trip name.
2. View the new trip in my trip list.
3. Open the trip planner after creating the trip.

**Business rules**
- Trip name is required.

**Status:** Already implemented (`CreateTripUseCase`, `POST /api/trips`, `CreateTripValidator` enforces required name). Only change in this epic: stamp the creating user's id on the trip. Trip-list display and open-after-create navigation are frontend concerns.

### US2 — Set trip start and end dates (High)

> As a user, I want to set trip dates so the planner creates the correct number of days.

**Acceptance criteria**
1. Set a trip start date.
2. Set a trip end date.
3. View one itinerary day created for each date in the selected range.
4. See itinerary days update when changing trip dates.
5. Confirm date changes when reducing days would remove planned items.

**Business rules**
- Require start date ≤ end date.

**Status:** AC 1–3 exist at creation time (the `Trip` constructor generates one `TripDay` per date; the validator enforces start ≤ end). AC 4–5 — changing dates after creation — have no backend and are the only fully new vertical slice in this epic.

### US3 — Add a destination to a trip (High)

> As a user, I want to add one or more destinations to a selected trip so I can collect places for that trip before scheduling them by day.

**Acceptance criteria**
1. Add a destination to a trip from the attraction list.
2. Add a destination to a trip from the destination details page.
3. Select a day in the trip.
4. See the destination appear immediately under the selected trip.

**Note (from sheet):** Since drag-and-drop scheduling (US4) is not selected, the user must select a day in the trip when adding — the existing day-addressed endpoint (`POST /api/trips/{id}/days/{date}/destinations`) already models exactly this.

**Status:** Already implemented (`AddDestinationToTripDayUseCase` with duplicate-on-day rejection). The "from details page" path is Epic 2's xid-upsert change. This epic adds only the ownership guard. The day-picker UI is a frontend concern.

### US7 — Remove a destination from the itinerary (High)

> As a user, I want to remove a destination so I can keep my itinerary accurate.

**Acceptance criteria**
1. Remove a destination from a trip day.
2. See the destination removed immediately after confirmation.

**Status:** Already implemented (`RemoveDestinationFromTripDayUseCase`, `DELETE /api/trips/{id}/days/{date}/destinations/{destinationId}`). The confirmation dialog is a frontend concern. This epic adds only the ownership guard.

### US8 — Require login to save trips and destinations (Medium)

> As a user, I want to be prompted to log in when saving trips so my destinations are stored in my account.

**Acceptance criteria**
1. Browse destinations without logging in.
2. Prompt me to log in when I try to create a trip while logged out.
3. Prompt me to log in when I try to add a destination to a trip while logged out.
4. Return me to the same trip/destination after logging in.
5. Complete the original save action after successful login.

**Status:** Backend done — the `/api/trips` group already carries `.RequireAuthorization()` (401 when logged out) while `/api/destinations` is anonymous. AC 4–5 (login redirect, replaying the pending action) are entirely frontend concerns.

### US10 — Load my saved trips and destinations when I return (Medium)

> As a user, I want the app to load my saved trips and destinations when I return so I can continue where I left off.

**Acceptance criteria**
1. Log in and see my previously created trips.
2. Open a trip and see previously saved destinations and itinerary days.
3. See an empty state when I have no saved trips.

**Status:** Persistence and eager-loading of days/destinations exist, and an empty trip list already returns gracefully. What's missing is "**my**": trips have no owner, and `GetAllTripsUseCase` returns every trip in the system. Together with NFR6 ("Users can only view and modify their own trips"), this drives the ownership work below.

## Out of scope / backlog (not part of this epic)

- **US4 — Schedule destinations into a day via drag-and-drop** (Medium): Saved-Places-to-day drag-drop. The sheet's fallback applies instead: users select a day when adding (US3). Note there is also no "Saved Places" (trip-level unscheduled pool) concept in the backend — destinations attach directly to days.
- **US5 — Reorder destinations within a day** (High): blocked on a data-model prerequisite — destinations on a day are an unordered many-to-many (`trip_day_destinations` join table with no position column). Adding ordering means promoting the implicit join to an explicit entity with a sort index; deliberately deferred with the story.
- **US6 — Drag a destination from one day to another** (High): composes remove + add once US4/US5 land.
- **US9 — Save automatically with saving indicator** (Medium): every existing mutation already persists synchronously via `IUnitOfWork.SaveChangesAsync`; the indicator/retry UX is frontend work deferred with the story.
- **NFR4** (drag-drop responds ≤100 ms) applies only to the deferred drag-drop stories.

## Technical approach

**Trip ownership (US10 / NFR6):**
- Add `int UserId` to the `Trip` entity via a new constructor parameter. No `Trips` navigation on `User` — nothing in the codebase loads users with children, and it keeps the aggregate boundary clean.
- EF: FK to `users` + index in `TripConfiguration`; new migration `AddTripOwnership`. **Migration caveat:** existing dev-stage `trips` rows have no owner — the migration must delete orphan trips (or backfill to a seed user) before adding a non-nullable `user_id`.
- Current-user flow: endpoint handlers read the JWT `sub` claim via a small `ClaimsPrincipalExtension.GetUserId()` helper in the API layer and pass `userId` as a plain use-case parameter — the same pattern Logout already uses (`jti` claim → `ILogoutUseCase.ExecuteAsync(jti)`). No new `ICurrentUserService` ambient abstraction.
- Enforcement at the repository: `ITripRepository.GetWithDaysAndDestinationsAsync(id, userId)` and `GetAllWithDaysAndDestinationsAsync(userId)`. A trip the caller doesn't own is simply never loaded, so every existing "Trip Not Found" failure path works unchanged, and it is structurally impossible for a use case to forget the check. Violations therefore surface as **NotFound** — no `ErrorType.Forbidden` is added, which also avoids leaking trip existence through sequential int ids.
- All five trip/trip-day use cases (`CreateTrip`, `GetTrip`, `GetAllTrips`, `AddDestinationToTripDay`, `RemoveDestinationFromTripDay`) gain the `userId` parameter; `CreateTripUseCase` stamps it on the new trip. `TripResponse` does not expose `UserId` — callers only ever see their own trips.

**Update-dates flow (US2):**
- Domain: new `Trip.Update(name, startDate, endDate)` mutator that reconciles `_days` — keep existing `TripDay`s whose date falls in the new range (their destinations untouched, satisfying "days update" without losing planned items), add days for new dates, remove out-of-range days (EF cascade cleans the join rows). One mutator covers name + dates together.
- Endpoint: `PUT /api/trips/{id:int}` in the existing authorized group, body `UpdateTripRequest { Name, StartDate, EndDate, Confirmed = false }`.
- Confirmation contract (AC 5): `UpdateTripUseCase` computes which days the new range would drop; if any dropped day has planned destinations and `Confirmed == false`, it returns `Result.Failure(ErrorType.Conflict, "Reducing the date range removes N day(s) with M planned destination(s). Resend with confirmed=true to proceed.")` → HTTP 409 ProblemDetails. The client re-sends with `Confirmed = true` after the user confirms. A confirm-flag on the write was chosen over a dry-run GET: one round trip, and no race window between preview and commit.
- Requires adding `ErrorType.Conflict` to the enum and a 409 arm in `ResultExtension` — a two-line, pattern-consistent extension.
- New `UpdateTripValidator` mirroring `CreateTripValidator` (name required, dates required, end ≥ start); auto-applied by the existing FluentValidation endpoint wiring. Register `IUpdateTripUseCase` in `AppServicesExtension`.

## Known risks / open questions

1. **Migration on existing data:** the `AddTripOwnership` migration must decide what to do with pre-existing ownerless trips (delete vs backfill to a seed user). Dev-stage data makes deletion acceptable, but this must be explicit in the migration, not left to fail on the non-nullable constraint.
2. **Epic 2 dependency for US3 AC2:** adding from the details page needs the xid-upsert change to `AddDestinationToTripDayUseCase`. If Epic 2 hasn't landed, US3 is still satisfiable from the attraction list via persisted destination ids; the details-page path follows Epic 2.
3. **Update semantics are whole-resource PUT:** name and dates always travel together. A client changing only the name must echo the current dates — acceptable for a trip-edit form, worth stating in API docs.
4. **No "Saved Places" pool:** the sheet's US4 language implies a trip-level unscheduled destination list, which the data model doesn't have. Fine for this epic (US3 requires picking a day), but it becomes a modeling decision if US4 is ever pulled in.

## Key new components (reference)

| Layer | Component | Purpose |
|---|---|---|
| Domain | `Trip.UserId`, `Trip.Update(...)` (modified `Trip`) | Ownership + date/name mutation with day reconciliation |
| Application | `IUpdateTripUseCase`, `UpdateTripUseCase` | US2 update flow with confirmation contract |
| Application | `UpdateTripRequest` | Name, StartDate, EndDate, Confirmed flag |
| Application | `ErrorType.Conflict` (modified enum) | 409 signal for unconfirmed destructive date change |
| Application | `ITripRepository` (modified) | User-filtered `GetWithDaysAndDestinationsAsync(id, userId)` / `GetAllWithDaysAndDestinationsAsync(userId)` |
| Application | Five trip/trip-day use cases (modified) | Accept caller `userId`; `CreateTrip` stamps it |
| Infrastructure | `TripConfiguration` (modified), migration `AddTripOwnership` | `user_id` FK + index; orphan-trip handling |
| Infrastructure | `TripRepository` (modified) | User-filtered queries |
| API | `TripEndpoints` (modified) | New `PUT /api/trips/{id}`; extract `sub` claim in all handlers |
| API | `ClaimsPrincipalExtension` | `GetUserId()` helper parsing the `sub` claim |
| API | `UpdateTripValidator`, `ResultExtension` (modified) | Request validation; Conflict → 409 mapping |

## Test approach

Unit tests (xUnit + NSubstitute, `Method_Scenario_ExpectedResult` naming, following existing `TripServiceTests.cs` / `TripDayServiceTests.cs` conventions):

- **Domain (`TripTests`):** `Update` shrinking the range removes out-of-range days; preserves destinations on retained days; extending adds new days; name-only change leaves days untouched.
- **`UpdateTripUseCaseTests`:** trip missing → NotFound; trip owned by another user → NotFound (repo returns null); shrink dropping days with destinations + `Confirmed=false` → Conflict; same + `Confirmed=true` → success with regenerated days; shrink dropping only empty days succeeds without confirmation; extend-only and name-only succeed.
- **Ownership across existing use cases:** `CreateTrip` stamps the caller's `userId`; `GetAllTrips` queries the repository with the caller's `userId`; `GetTrip` / `AddDestinationToTripDay` / `RemoveDestinationFromTripDay` on another user's trip → NotFound.
- Existing trip/trip-day tests updated for the new `userId` parameters.
