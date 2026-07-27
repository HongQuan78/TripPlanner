# Backend Audit — Clean Architecture Conformance & Dead Code

**Scope:** the whole `BE/` solution (5 projects, 232 `.cs` files).
**Baseline commit:** `d6ef591a9ee62fe760e0e3d682d52cf614d8e3fd` (working tree clean at audit time).
**Baseline health:** `dotnet build BE` — Build succeeded, **0 warnings / 0 errors**. `dotnet test BE` — **300 passed, 0 failed, 0 skipped**.
**Type:** review-only at authoring time. No production code was changed by the audit pass itself.

**Remediation status (2026-07-27):** **all six follow-ups are resolved** — see §8. #1, #4, #5, #6 by code change; #2 by deleting the offending fields outright (owner decision); #3 by accepting and documenting the coupling. Build **0 warnings / 0 errors**, `dotnet test BE` **308 passed** (300 baseline + 5 DI-registration + 3 include-path), FE **335 passed**, FE lint at its 2 pre-existing warnings, both builds green.

---

## 1. Verdict

| Dimension | Verdict |
| --- | --- |
| Dependency direction (project references) | ✅ PASS — structurally enforced |
| Domain purity | ✅ PASS |
| Application framework independence | ✅ PASS |
| Port/adapter separation | ⚠️ PARTIAL — 1 systemic leak (§3.1) |
| Layer placement of concrete types | ⚠️ MINOR — 2 inconsistencies (§3.3, §3.4) |
| Dead code | ⚠️ 6 confirmed items, all small (§4) |

The solution is a **genuine Clean Architecture implementation**, not a layered app wearing the name. The dependency rule holds at compile time, the domain is dependency-free and properly encapsulated, and every external system sits behind a port owned by Application. The findings below are refinements, not structural failures. Nothing found is High severity.

---

## 2. What is correct (verified, not assumed)

**Dependency direction is enforced by the build, not by convention.** Read from the `.csproj` files:

```
TripPlanner.Domain          → (nothing)
TripPlanner.Application     → Domain            + Microsoft.Extensions.Logging.Abstractions
TripPlanner.Infrastructure  → Application, Domain
TripPlanner.API             → Application, Infrastructure
TripPlanner.Tests           → all four
```

There is no path by which Application or Domain can reference API or Infrastructure types — the compiler rejects it. This is stronger than most codebases that claim Clean Architecture.

**Domain is genuinely pure.** The only `using` directives across all 7 domain files are `System` and `System.Reflection` (the latter appearing solely in generated `obj/` assembly-info, not in source). No EF Core attributes, no `DbContext`, no JSON attributes. Persistence knowledge lives entirely in `Infrastructure/Data/Configurations/`, including the `_items` backing-field mapping (`TripDayConfiguration.cs:21-29`).

**Domain entities are properly encapsulated.** Private setters, private parameterless constructors for EF, and collections exposed as `IReadOnlyList` over private backing lists (`Trip.cs:11-14`, `TripDay.cs:5`). Mutation goes through intention-revealing methods (`Trip.MoveDestinationBetweenDays`, `TripDay.ReorderDestinations`, `User.VerifyEmail`). This is an aggregate, not an anemic bag of properties.

**Application never touches a framework.** Its single package reference is `Microsoft.Extensions.Logging.Abstractions`, and it is actually used (`RegisterUserUseCase.cs:18`, `ResendVerificationEmailUseCase.cs:15`) — so it is not a dead dependency. There is no `IOptions`, no `HttpClient`, no `DbContext`, no `IServiceCollection` anywhere in the layer.

**Every external system is behind an Application-owned port.** `IGeocodingService`, `IAttractionSearchService`, `IDestinationDetailsService`, `IDestinationImageProvider`, `IOpeningHoursProvider`, `IEmailSender`, `ITokenService`, `IPasswordHasher`, `ITokenBlacklist`, `IVerificationTokenService`, `IVerificationEmailContentBuilder` — all declared in `Application/Interfaces/Services/`, all implemented in Infrastructure. **All 11 are wired and consumed; none is dead.**

**AutoMapper is correctly quarantined.** `IMapper` appears in exactly one Application-facing place — `ApplicationMapper` in Infrastructure. Application depends only on `IApplicationMapper`, and all 5 of its methods have a real caller. The CLAUDE.md rule holds in practice.

**`IResponseCache` is correctly placed.** It sits in `Infrastructure/Caching/` and is `internal` — it is an infrastructure implementation detail (adapters caching provider responses), not an application concern, so it does **not** belong in Application. Correct as is.

**API layer holds no business logic.** Endpoint handlers are 2–4 lines: resolve user id, call use case, map `Result` to HTTP. The `ErrorType → status code` translation is where it belongs, in `API/Extensions/ResultExtension.cs`.

---

## 3. Architectural findings

### 3.1 — MEDIUM · HTTP response DTOs double as external-provider port contracts and as a domain-import source

`Application/DTOs/Responses/*` records serve **three** unrelated roles at once:

| Record | Role 1 (HTTP body) | Role 2 (provider port return) | Role 3 (domain import) |
| --- | --- | --- | --- |
| `DestinationDetailsResponse` | `GET /api/locations/{xid}/details` | `IDestinationDetailsService.GetDetailsAsync` | source for `new Landmark(...)` / `new Restaurant(...)` |
| `AttractionResponse` | `GET /api/locations/attractions` | `IAttractionSearchService.GetNearbyAsync` | — |
| `LocationSearchResultResponse` | `GET /api/locations/search` | `IGeocodingService.SearchAsync` | — |

The third role is the sharpest: `DestinationResolver.cs:45-55` builds a **domain entity** out of a **presentation DTO**.

**Consequence:** renaming or reshaping a JSON field for the frontend is not a presentation change. It forces edits in the OpenTripMap adapter *and* in the domain-import path, and can silently change what gets persisted. The port and the wire contract are welded together.

**Canonical shape:** give the ports their own provider-facing models in Application (e.g. `DestinationDetails`, `AttractionResult`, `GeocodedLocation`), and map to the `*Response` records at the use-case boundary. Cost is real (3 ports, 3 adapters, ~10 test files); this is a deliberate trade-off to record, not necessarily one to pay today.

### 3.2 — MEDIUM · `DestinationResolver` writes an OpenTripMap *kind code* into `Restaurant.CuisineType`

`Application/Services/DestinationResolver.cs:54`

```csharp
? new Restaurant(details.Name, rating, details.Category ?? "Unknown", false, details.Xid)
```

`details.Category` is `PrimaryKind(place.Kinds)` — the first OpenTripMap kind token, e.g. `"foods"`, `"restaurants"`. It is not a cuisine. So every restaurant imported by xid is persisted with `CuisineType = "foods"` and `IsHalalFriendly = false` (hardcoded).

This is **pinned by a passing test**: `TripDayServiceTests.cs:223` asserts `Assert.Equal("foods", restaurant.CuisineType)`. The test documents the behavior rather than catching it — a corrected implementation would fail this test, which is exactly the situation worth flagging before someone "fixes" it and reverts under test pressure.

Note the interaction with §4.1: because OpenTripMap supplies no cuisine and no halal signal, `Restaurant`'s two distinguishing fields are effectively unreachable-with-real-data for imported places. The alternative reading is that xid-imported places should not be modelled as `Restaurant` at all. Either way this is a modelling decision that needs an owner.

### 3.3 — LOW · `IUserRepository` breaks the repository convention

`ITripRepository` and `IDestinationRepository` both extend `IRepository<T>`. `IUserRepository` does not — it re-declares `void Add(User user)` standalone, and `UserRepository` does not inherit `Repository<T>`. Functionally fine; inconsistent with the documented pattern, and it means `UserRepository` cannot benefit from any future base-class change.

### 3.4 — LOW · Application services are DI-registered from the API project

Infrastructure owns its own composition root (`AddInfrastructureServices`). Application does not — `API/Extensions/AppServicesExtension.cs` registers all 18 use cases *and* the Application-layer concrete `DestinationResolver` (line 41). The API therefore knows Application's internal class names. An `AddApplicationServices` extension inside the Application project would restore symmetry. Purely a cosmetic/consistency point; the dependency direction is not violated.

### 3.5 — LOW · Magic-string EF `Include` couples the repository to a private domain field name

`Infrastructure/Repositories/TripRepository.cs:14,21`

```csharp
.Include("Days._items.Destination")
```

`_items` is a `private readonly List<TripDayDestination>` in `TripDay`. Renaming that field compiles cleanly and fails **at runtime**, on every trip read. There is no compile-time or test-time guard. (No fix proposed — string-based include is the only way to reach a backing field through EF — but it deserves a comment-free named constant or a regression test that actually loads a trip.)

### 3.6 — INFO · `Program.cs` calls `Database.Migrate()` directly

The API resolves `TripPlannerDbContext` and migrates on startup (`Program.cs:41-79`). This is API code reaching into an Infrastructure EF type. It is deliberate, documented in CLAUDE.md, retry-wrapped, and flag-gated — recorded for completeness, not as a defect.

---

## 4. Dead code

All items below were verified by whole-solution reference count (production + tests), not by intuition.

### 4.1 — `IRepository<T>.Remove` / `Repository<T>.Remove` — zero callers

`Application/Interfaces/Repositories/IRepository.cs:7`, `Infrastructure/Repositories/Repository.cs:15`

Nothing in the solution — production or test — ever calls `Remove` on a repository. Deletion in this app happens through the aggregate (`Trip.RemoveSavedPlace`, `TripDay.RemoveDestination`) plus EF change tracking. The port method is unused surface area on an interface that Application owns.

**Recommendation:** delete both. Re-add if a real delete-an-entity use case appears.

### 4.2 — `CountryNameHelper.IsCountry` — zero callers

`Application/Helpers/CountryNameHelper.cs:9-12`

`SearchLocationsUseCase` uses `GetCountryCode` and `GetCanonicalName` only; it determines country-ness by comparing codes (`SearchLocationsUseCase.cs:38`), not by calling `IsCountry`. Also has no test.

### 4.3 — `AttractionCategoryHelper.AllowedCategories` — zero callers

`Application/Helpers/AttractionCategoryHelper.cs:18`

Public read-only projection of the private `AllowedCategoryCodes` set. `AttractionSearchParameterValidator` uses `IsAllowedCategory`, `MinRateValue` and `MaxRateValue` — never `AllowedCategories`. Nothing exposes the allow-list to the frontend, so this was presumably built for an endpoint that never shipped.

### 4.4 — Dead DI registration: `services.Configure<RedisSettings>`

`Infrastructure/Extensions/InfrastructureServicesExtension.cs:123`

```csharp
var redisSettings = new RedisSettings();                                     // 121 — used at :131
configuration.GetSection(RedisSettings.SectionName).Bind(redisSettings);     // 122 — used at :131
services.Configure<RedisSettings>(options => ...);                           // 123 — DEAD
```

Line 123 registers `IOptions<RedisSettings>` in the container, but **nothing ever injects it** — `RedisResponseCache` takes `IDistributedCache`, not the settings. The only real consumer is the local `redisSettings` variable at line 131. The `RedisSettings` class itself is alive; only the registration is dead.

**Recommendation:** delete line 123.

### 4.5 — Unused private test helper

`Tests/ResendEmailSenderTests.cs:22` — `CreateSettings` is never called. (This is the only `IDE0051` hit in the entire solution.)

### 4.6 — Unnecessary `using` directives (3)

Found by running IDE analyzers (`EnforceCodeStyleInBuild` + `GenerateDocumentationFile`, which IDE0005 requires) against a temporary `.editorconfig`, since the repo ships none. The temp file was removed; the tree is clean.

- `Infrastructure/Data/Configurations/TripDayConfiguration.cs:2` — `Microsoft.EntityFrameworkCore.Metadata`
- `Infrastructure/Migrations/20260706112533_AddEmailVerification.cs:1` — generated file, leave alone
- `Infrastructure/Migrations/20260710054605_AddResendCooldownAndUniqueTokenIndex.cs:1` — generated file, leave alone

---

## 5. Explicitly checked and found NOT dead

Recording these so the next audit does not re-derive them:

- **All 11 Application service ports** — every one has an Infrastructure implementation, a DI registration, and a caller.
- **All 5 `IApplicationMapper` methods** — including `MapToTripDayResponse` (`AddDestinationToTripDayUseCase.cs:54`).
- **All 5 `ErrorType` members** — including `Conflict` (`UpdateTripUseCase.cs:31`).
- **All 6 domain aggregate mutators** — `AddSavedPlace`, `RemoveSavedPlace`, `ScheduleFromSavedPlaces`, `MoveDestinationBetweenDays`, `ReorderDestinations`, `RecordVerificationEmailSent` — each has exactly one production caller.
- **All settings properties across all 9 `*Settings` classes** — each has ≥1 production reference.
- **`AttractionResponse.DistanceMeters`** — set in Infrastructure, never read in the backend; it is consumed by the frontend card distance line. Wire-contract field, not dead.
- **All 27 endpoint/extension/validator/EF-configuration classes** — a naive "referenced by another file?" scan flags every one of them, because they are reached through extension-method syntax (`MapAuthEndpoints()`), `AddValidatorsFromAssembly`, or `ApplyConfigurationsFromAssembly`. All false positives.

---

## 6. Recommended follow-ups

| # | Item | Severity | Effort | Suggested handling | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | §4.1 `IRepository.Remove`, §4.2 `IsCountry`, §4.3 `AllowedCategories`, §4.4 Redis registration, §4.5 test helper, §4.6 `TripDayConfiguration` using | Low | ~30 min | One small cleanup story; tests must stay 300/300 | ✅ **DONE** |
| 2 | §3.2 `CuisineType = "foods"` | Medium | Needs a decision first | Own the modelling question before touching code — the pinning test at `TripDayServiceTests.cs:223` must change deliberately | ✅ **DONE** — owner chose to **delete both fields**; see §8 |
| 3 | §3.1 provider-facing models split from HTTP DTOs | Medium | ~1 day | Only worth it if the API contract and provider contracts start diverging; record as an accepted trade-off otherwise | ✅ **RESOLVED as accepted trade-off** — documented in CLAUDE.md, no code change |
| 4 | §3.3 `IUserRepository` convention, §3.4 `AddApplicationServices` | Low | ~1 h | Bundle with #1 or skip | ✅ **DONE** |
| 5 | §3.5 magic-string `Include` | Low | ~1 h | Add an integration-ish regression test that actually materializes a trip with ordered day destinations | ✅ **DONE** (model/translation guard rather than a live materialization — see §8) |
| 6 | Repo ships no `.editorconfig` | Info | ~15 min | Adding one with `IDE0005`/`IDE0051` as warnings would make findings §4.5–§4.6 impossible to reintroduce, at zero ongoing cost | ✅ **DONE** |

---

## 7. Method

- Whole-solution identifier index (232 files → 12,711 file/identifier pairs) to find zero-reference types and members, with `obj/`, `bin/` and `Migrations/` excluded from the *declaration* side.
- Manual read of every file in Domain, Application, and API, plus all Infrastructure adapters, repositories, mappings and DI wiring.
- `.csproj` graph inspection for the dependency rule.
- `using`-directive scan across Application and Domain to detect framework leakage.
- Roslyn IDE analyzers (`IDE0005`/`IDE0051`/`IDE0052`/`IDE0060`) via a **temporary** `BE/.editorconfig`, removed afterwards — `git status` verified clean.
- `dotnet build BE` and `dotnet test BE` for the baseline.

**Known limits of this audit:** reference counting cannot see reflection-, DI- or EF-mediated use, so §4 items were each confirmed by reading their call sites. Frontend consumption of backend DTO fields was assumed, not verified — that is the one place where a "dead" backend field could still be live end-to-end (and the reason `AttractionResponse.DistanceMeters` is listed in §5, not §4).

---

## 8. Remediation log — 2026-07-27

Final state: `dotnet build BE` **0 warnings / 0 errors**, `dotnet test BE` **308 passed, 0 failed, 0 skipped** (300 → 308: +5 DI-registration, +3 include-path).

### Follow-up #1 — all six dead-code items removed

`IRepository<T>.Remove` and `Repository<T>.Remove`; `CountryNameHelper.IsCountry`; `AttractionCategoryHelper.AllowedCategories`; the `services.Configure<RedisSettings>` line at `InfrastructureServicesExtension.cs:123` (the local bind at `:121-122` still feeds `:131`, so the cache wiring is unchanged); `ResendEmailSenderTests.CreateSettings`; the unnecessary `Microsoft.EntityFrameworkCore.Metadata` using in `TripDayConfiguration.cs`.

### Follow-up #4 — both LOW consistency findings closed

**§3.3:** `IUserRepository` now extends `IRepository<User>` and drops its standalone `void Add(User)`; `UserRepository` derives from `Repository<User>` and reads the inherited `Context` instead of capturing the primary-constructor parameter. It is now the same shape as its two siblings.

**§3.4:** Application owns its composition root. New `Application/Extensions/ApplicationServicesExtension.AddApplicationUseCases()` registers all 18 use cases plus `IDestinationResolver`; `AppServicesExtension` is one call. This required adding `Microsoft.Extensions.DependencyInjection.Abstractions` to the Application project — a **contract-only** package, mirroring the already-present `Logging.Abstractions`, so the layer still references no framework implementation. Five new `ApplicationServicesRegistrationTests` guard it, the load-bearing one reflecting over every public `I*UseCase` interface in the `TripPlanner.Application.UseCases` namespace and failing on any missing registration — so a forgotten line is a red test, not a runtime resolution failure. The others pin the resolver registration, scoped lifetime, and no duplicate service types, plus a non-vacuity assertion so the reflection test cannot pass by discovering nothing.

### Follow-up #5 — the magic-string `Include` now has a guard

The path is a named constant, `TripRepository.DayDestinationsIncludePath`, used by both queries. `TripRepositoryIncludePathTests` (3 tests) walks it segment-by-segment against `DbContext.Model` from `Trip` and asserts it terminates at `Destination`; asserts the full repository query translates to SQL touching `trip_days`, `trip_day_destinations` and `destinations`; and pins that an unresolvable path (`Days._renamedItems.Destination`) throws `InvalidOperationException` naming the bad segment — which is what proves the first two assertions have teeth.

**Deviation from the suggested handling, recorded deliberately.** §6 asked for a test that "actually materializes a trip". That needs a real provider — an in-memory SQLite package the test project does not reference, i.e. a new dependency. Instead the context is built with `UseNpgsql` and only `ToQueryString()` is called, which forces full EF query compilation (where an unresolvable string include fails) without opening a connection. This catches a renamed `_items` at test time, which was the entire point of the finding; it does **not** verify that rows come back in `Position` order. That ordering remains unguarded by a live query.

### Follow-up #6 — analyzers wired in

`BE/.editorconfig` sets IDE0005/IDE0051/IDE0052 to `warning`, with generated `Infrastructure/Migrations/*.cs` exempted. `BE/Directory.Build.props` supplies the two properties that make them fire: `EnforceCodeStyleInBuild` (IDE analyzers do not run at build without it) and `GenerateDocumentationFile` (IDE0005 reports nothing without it) — with `CS1591` suppressed via `NoWarn`, because doc generation otherwise demands XML comments on every public member and the repo's style rule forbids comments entirely.

Two traps worth recording. First, an `.editorconfig` section glob is relative to the file's own directory: `[BE/TripPlanner.Infrastructure/Migrations/*.cs]` matched nothing and left the two generated-file warnings standing; `[TripPlanner.Infrastructure/Migrations/*.cs]` is correct. Second, the config was **RED-verified rather than assumed** — a throwaway `using System.Text;` was prepended to `CountryNameHelper.cs`, the build was confirmed to emit `warning IDE0005` for it, and the file was reverted (`git diff` re-checked). Without that step a silently non-firing analyzer config looks identical to a clean tree.

### Follow-up #2 — `CuisineType` and `IsHalalFriendly` deleted outright

**Owner decision:** both fields predate the OpenTripMap integration. The provider supplies neither a cuisine nor a halal signal, so rather than "fix the mapping" the fields were removed as dead data. This is the third reading the audit floated in §3.2 (that xid-imported places should not carry restaurant-specific data at all), resolved in favour of shrinking the model.

`Restaurant` is now a **pure category marker** — `Category => "Restaurant"` and nothing else. It is still load-bearing: `DestinationCategoryHelper.IsRestaurantCategory` chooses it over `Landmark` at import, and it drives `DestinationResponse.Category`. `Landmark.OpeningHours` was explicitly left alone — unlike the two deleted fields it is genuinely sourced (Overpass).

Removed end-to-end, in one pass so no layer is left holding a field nothing supplies:

| Layer | Change |
| --- | --- |
| Domain | `Restaurant.cs` — both properties gone; ctor is now `(name, rating, externalId = null)` |
| Application | `DestinationResolver.cs:54` — `new Restaurant(details.Name, rating, details.Xid)`; the kind code is no longer written anywhere |
| Application | `DestinationResponse` — both DTO fields dropped |
| Infrastructure | `MappingProfile.cs` — the two `ForMember` calls dropped |
| Infrastructure | `RestaurantConfiguration.cs` — `CuisineType` property config gone; three seed rows shed both columns |
| Infrastructure | new migration `20260727143836_RemoveRestaurantCuisineFields` |
| Frontend | `shared/api/types.ts` — both members dropped from `interface Destination`; 9 `null` fixture lines removed across 3 test files |

**The pinning test was broken on purpose.** `TripDayServiceTests.cs:223-224` — `Assert.Equal("foods", restaurant.CuisineType)` and `Assert.False(restaurant.IsHalalFriendly)` — were deleted, exactly the deliberate change §3.2 said must not happen by accident. The rest of that test is intact and still proves the restaurant-vs-landmark import branch works: `IsType<Restaurant>`, name, `ExternalId`, `Category == "Restaurant"`, rating, the repository `Add`, and the `SaveChangesAsync`. No test case was removed, only two assertions inside one — which is why the suite count is unchanged at 308.

**The frontend was safe to change** because it never rendered either field: outside `types.ts` the only occurrences were fixtures setting them to `null`. Verified by grep before and after (`grep -rn "cuisineType\|isHalalFriendly" FE/src` now returns nothing).

The generated migration was **read, not assumed**: it is two `DropColumn` calls on `destinations`, not a table rebuild, and `Down` re-adds both columns and restores the three seed values. Only the new migration pair and `TripPlannerDbContextModelSnapshot.cs` changed; the historical `*.Designer.cs` snapshots still mention the columns, which is correct — they record the model as it was at their own commit.

**Not verified live:** the migration was not applied to a running Postgres (none available in this session). `Down` re-adds `CuisineType` as **nullable**, whereas the original column was `NOT NULL` — EF cannot backfill a non-null value for rows outside the seed set, so a rollback would leave a laxer column than the original. Acceptable, but worth knowing before relying on `Down` in production.

### Follow-up #3 — accepted as a documented trade-off

**Owner decision:** do not split. The three-role coupling in §3.1 stands as-is, and CLAUDE.md now carries a paragraph naming all three roles, the concrete consequence (a frontend field rename is not a presentation-only change — it forces edits in the OpenTripMap adapters and the domain-import path), the cost of the canonical fix, and the condition under which it becomes worth paying (the wire contract and the provider contracts actually diverging). It also warns against a piecemeal split, which would be worse than either end state.

No code changed for this item. It is closed as a *recorded decision*, not as a defect fixed — if a future audit re-derives §3.1, this is the answer.
