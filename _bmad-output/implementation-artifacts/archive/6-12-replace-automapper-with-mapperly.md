---
baseline_commit: 6d8b85d5403dc3b263b037dccbaaf8a23e708e0e
---

# Story 6.12: Replace AutoMapper with Mapperly

Status: review

## Story

As a developer,
I want the Domain → Response mapping to be generated at compile time by Mapperly instead of resolved at runtime by AutoMapper,
so that a renamed or removed member becomes a build error rather than a production `AutoMapperMappingException`, and Infrastructure stops carrying a reflection-based runtime dependency — without changing a single byte of the HTTP contract or moving a mapping concern out of Infrastructure.

## Context & Justification

The 6-9 clean-architecture audit recorded AutoMapper as *correctly quarantined* — Application defines `IApplicationMapper`, Infrastructure implements it, and no layer above Domain ever sees `IMapper`. That verdict is not in dispute and **this story does not change it**. The port stays exactly where it is; only the engine behind it changes.

What is worth changing is the failure mode. `MappingProfile` resolves member-by-member at runtime through reflection, so:

- Renaming `Destination.ExternalId` still compiles. The `ForMember(dest => dest.Xid, …)` breaks at the first request that maps a destination.
- Adding a property to `DestinationResponse` with no matching source silently produces `null`/`0` — AutoMapper's `AssertConfigurationIsValid()` would catch it, but nothing in this solution ever calls it.
- The three `MappingProfileTests` are the *only* thing standing between a mapping typo and a 500.

Mapperly is a source generator. The same three maps become `partial` methods whose bodies are emitted at build time as plain, readable, steppable C#. A missing source member is a compiler diagnostic; there is no reflection, no runtime configuration graph, no startup cost, and the result is trim/AOT-safe.

### Why the surface is small

The whole blast radius is six files:

| File | Change |
| --- | --- |
| `TripPlanner.Infrastructure.csproj` | `AutoMapper` → `Riok.Mapperly` |
| `Mappings/MappingProfile.cs` | deleted |
| `Mappings/ApplicationMapper.cs` | rewritten as the `[Mapper] partial class` |
| `Extensions/InfrastructureServicesExtension.cs` | drop `AddAutoMapper(...)` |
| `Tests/MappingProfileTests.cs` | renamed + rewritten against the new mapper |
| `CLAUDE.md` | the "AutoMapper behind an interface" paragraph |

Nothing in Application, Domain, or API changes. **Verified while scoping:** all 12 use-case consumers of `IApplicationMapper` go through the port, and every test except `MappingProfileTests.cs` uses `Substitute.For<IApplicationMapper>()` — so the five unit-test classes that map anything are untouched by construction.

### Design decision (owner, 2026-07-27)

Mapperly over Mapster. Mapster's runtime `TypeAdapterConfig` reproduces exactly the failure mode this story exists to remove; its source-generated mode requires the separate `Mapster.Tool` MSBuild package and is materially clunkier.

**`ApplicationMapper` becomes the Mapperly mapper itself** rather than a hand-written adapter delegating to a generated one. Mapperly can implement an interface directly, so the adapter layer AutoMapper forced (`ApplicationMapper(IMapper mapper)` wrapping five `mapper.Map<T>` calls) disappears entirely. One class, no delegation, `IApplicationMapper` untouched.

## Acceptance Criteria

1. `AutoMapper` is gone from the solution: no `PackageReference`, no `using AutoMapper;`, no `IMapper`, no `Profile`, no `AddAutoMapper` anywhere under `BE/`. A repo-wide grep for `AutoMapper` returns nothing outside this story file and the sprint log.
2. `Riok.Mapperly` is referenced by **`TripPlanner.Infrastructure` only**. No other project gains a package reference. The dependency direction in CLAUDE.md is unchanged: Application still has exactly its two contract-only abstraction packages.
3. `ApplicationMapper` is a `[Mapper]`-attributed `partial class` implementing `IApplicationMapper`, with all five methods declared `partial` and their bodies generated. `IApplicationMapper` itself is **not modified** — same namespace, same five signatures.
4. `MappingProfile.cs` no longer exists.
5. The wire contract is byte-for-byte identical. Specifically:
   - `DestinationResponse.Xid` is populated from `Destination.ExternalId` (null source → null `Xid`).
   - `TripResponse.TripDays` is populated from `Trip.Days`; `TripResponse.SavedPlaces` from `Trip.SavedPlaces`.
   - `TripDayResponse.Destinations` is populated from `TripDay.Destinations` **preserving that property's `Position` ordering** — it is a computed, ordered projection, not a raw collection.
   - Every other member maps by name, with the same values AutoMapper produced.
6. `dotnet build BE` is clean at **0 warnings / 0 errors**. Mapperly's `RMG*` diagnostics for unmapped source members (`Trip.UserId`, `TripDay.Id`, `TripDay.TripId`) are resolved by **explicit `[MapperIgnoreSource]` attributes**, not by blanket `NoWarn` or by lowering a severity in `.editorconfig` — the point of adopting a compile-time mapper is to keep its diagnostics meaningful.
7. Mapping behaviour is covered by tests exercising the **real** `ApplicationMapper` (not a substitute): the three existing `MappingProfileTests` cases are preserved as behaviour, plus new coverage for the nested `Trip → TripDays → Destinations` projection including the `Position` ordering from AC #5, and for the two list-returning port methods.
8. No regression: `dotnet test BE` all green at **≥ 308** tests (the 2026-07-27 baseline at `6d8b85d`), and the API's runtime behaviour is unchanged — no endpoint, DTO, validator, migration, or auth posture touched. The frontend is not modified at all.
9. `CLAUDE.md` is updated: the **"AutoMapper behind an interface"** key-pattern paragraph and the `TripPlanner.Infrastructure` bullet in the Architecture section both name Mapperly and state that the port abstraction is what is load-bearing, not the library.

## Tasks / Subtasks

- [x] **Task 1 — Pin current behaviour before changing the engine** (AC: 5, 7)
  - [x] Extend `MappingProfileTests.cs` **against the existing AutoMapper implementation** with the AC #7 cases that do not exist yet: nested `Trip → TripDays → Destinations`, `Position`-ordering preservation (add two destinations to a day, `ReorderDestinations` to swap them, assert the mapped response follows the new order), and both list methods.
  - [x] Run them GREEN on AutoMapper. This is the characterization suite — it is what proves the swap is behaviour-preserving, so it must exist *before* the swap, not after.
- [x] **Task 2 — Package swap** (AC: 1, 2)
  - [x] In `TripPlanner.Infrastructure.csproj`, remove `AutoMapper` and add `Riok.Mapperly` (4.3.1). Leave every other project's references alone.
  - [x] Expect a broken build after this step — that is the point; the compiler will name every AutoMapper touchpoint.
- [x] **Task 3 — Rewrite `ApplicationMapper` as the generated mapper** (AC: 3, 4, 5, 6)
  - [x] Replace the body of `Mappings/ApplicationMapper.cs` with a `[Mapper] public partial class ApplicationMapper : IApplicationMapper`, five `public partial` methods matching the port signatures verbatim.
  - [x] Carry the two non-name-based mappings over as attributes: `ExternalId → Xid` on the destination method, `Days → TripDays` on the trip method. `SavedPlaces` and `Destinations` match by name and need nothing.
  - [x] Delete `Mappings/MappingProfile.cs`.
  - [x] Build, **read the actual `RMG*` diagnostics emitted**, and resolve each one with an explicit `[MapperIgnoreSource(nameof(...))]`. Do not guess which fire — the set depends on the Mapperly version's default severities.
- [x] **Task 4 — DI wiring** (AC: 1, 3)
  - [x] Remove the `services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());` line from `InfrastructureServicesExtension.cs`.
  - [x] Keep `services.AddScoped<IApplicationMapper, ApplicationMapper>();`. Mapperly mappers are stateless and have a public parameterless constructor, so the registration resolves with no constructor argument — but leave the lifetime as `Scoped` rather than "improving" it to `Singleton`; that is a separate decision and out of scope.
  - [x] Confirm the `using TripPlanner.Infrastructure.Mappings;` in that file is still required (IDE0005 is a build warning here and will say so either way).
- [x] **Task 5 — Tests** (AC: 7, 8)
  - [x] Rename `MappingProfileTests.cs` → `ApplicationMapperTests.cs` (the class it tests no longer exists); drop `using AutoMapper;` and the static `MapperConfiguration` field, instantiate `new ApplicationMapper()` directly.
  - [x] Every characterization case from Task 1 must pass **unmodified in its assertions**. If an assertion has to change, that is a behaviour change and must be recorded in Completion Notes as a deviation, not quietly edited.
  - [x] Run the full suite; confirm ≥ 308 green.
  - [x] **Added beyond the authored task list** (see Completion Notes deviation D2): `ApplicationMapperRegistrationTests` covering DI resolution, the one failure mode removing `AddAutoMapper` could introduce that no existing test reaches.
- [x] **Task 6 — Verify the removal is total** (AC: 1, 6, 8)
  - [x] `grep -rn "AutoMapper\|IMapper\b" BE --include=*.cs --include=*.csproj` — expect zero hits.
  - [x] `dotnet build BE` → 0 warnings / 0 errors. If a warning appears from generated code, fix it at the source (an attribute on the mapper), not by widening `.editorconfig`.
  - [x] Confirm `TripPlanner.Application.csproj` and `TripPlanner.Domain.csproj` are byte-identical to their state at `6d8b85d`.
- [x] **Task 7 — Documentation** (AC: 9)
  - [x] Rewrite the **"AutoMapper behind an interface"** paragraph in `CLAUDE.md` → "Mapping behind an interface", naming Mapperly, the compile-time generation, and the standing rule that Application/API must never reference the mapping library directly.
  - [x] Update the `TripPlanner.Infrastructure` bullet in the Architecture section (it currently reads "AutoMapper").

## Dev Notes

### Read these first

- `BE/TripPlanner.Infrastructure/Mappings/MappingProfile.cs` and `ApplicationMapper.cs` — 40 lines together; the entire mapping surface.
- `BE/TripPlanner.Application/Interfaces/Mapping/IApplicationMapper.cs` — the port. **Do not touch it.** It is what keeps this change invisible to the 12 use cases that consume it.
- `BE/TripPlanner.Domain/Models/TripDay.cs` — note `Destinations` is a *computed* property (`_items.OrderBy(Position).Select(…).ToList()`), not a stored collection. This is the one non-obvious thing the mapper depends on.

### The target shape

```csharp
using Riok.Mapperly.Abstractions;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Mappings;

[Mapper]
public partial class ApplicationMapper : IApplicationMapper
{
    [MapProperty(nameof(Trip.Days), nameof(TripResponse.TripDays))]
    public partial TripResponse MapToTripResponse(Trip trip);

    public partial List<TripResponse> MapToTripResponseList(List<Trip> trips);

    public partial TripDayResponse MapToTripDayResponse(TripDay tripDay);

    [MapProperty(nameof(Destination.ExternalId), nameof(DestinationResponse.Xid))]
    public partial DestinationResponse MapToDestinationResponse(Destination destination);

    public partial List<DestinationResponse> MapToDestinationResponseList(List<Destination> destinations);
}
```

Mapperly discovers the nested `Trip → TripDay → Destination` maps from the partial methods already declared on the class and reuses them; no extra declarations are needed. The `MapProperty` attributes go on the method whose **target** owns the renamed member.

### The two things likely to bite

**1. Unmapped-source diagnostics vs. the 0-warning build.** `Trip.UserId`, `TripDay.Id`, and `TripDay.TripId` have no counterpart on the response records. Mapperly reports unmapped source members (`RMG020` family); whether that lands as Info or Warning depends on the version's defaults. The repo requires 0 warnings, and `Directory.Build.props` sets `EnforceCodeStyleInBuild`, so anything at Warning **will** surface. Resolve each with an explicit attribute on the relevant method:

```csharp
[MapperIgnoreSource(nameof(Trip.UserId))]
```

Do not reach for `NoWarn` or an `.editorconfig` severity override. Silencing the class of diagnostic wholesale would discard exactly the compile-time safety that justifies the migration — and it would silently absorb a *future* unmapped member that actually matters.

**2. The generated file and the IDE analyzers.** 6-10 wired IDE0005/IDE0051/IDE0052 as build warnings with a `generated_code = true` exemption scoped to `TripPlanner.Infrastructure/Migrations/*.cs`. Mapperly's output is not on disk and is not covered by that section. Roslyn's IDE analyzers normally skip source-generator output (Mapperly marks it), so this is expected to be a non-issue — but the 6-10 story recorded that a *wrong* `.editorconfig` glob silently matches nothing, so verify by reading the build output rather than assuming. If a generated-code warning does appear, the fix belongs on the mapper declaration, not in `.editorconfig`.

### What must NOT change

- `IApplicationMapper` — signatures, namespace, file location.
- Any of the three `*Response` records. Note the standing CLAUDE.md warning: these serve three roles (HTTP body, provider-port return type, domain-import source), so a field edit here is never presentation-only. This story has no reason to touch them.
- The `Scoped` lifetime of the `IApplicationMapper` registration.
- Anything under `FE/`. This story is backend-only; there is no wire-format change for the frontend to react to.

### Baseline

Commit `6d8b85d`, backend **308/308** green, `dotnet build BE` at 0 warnings / 0 errors — measured at story authoring time. `TripPlanner.API/appsettings.json` has an unrelated uncommitted modification in the working tree; leave it alone and do not include it in the File List.

### Testing standards

xUnit + NSubstitute, `BE/TripPlanner.Tests`. The Task 1 → Task 5 sequence is a characterization-test refactor, which inverts the usual red-green rule: the new tests are written **green against the old implementation**, and their value is that they must stay green across the swap without their assertions being edited. A test authored after the migration would only prove Mapperly agrees with itself.

### Project Structure Notes

- Deleted: `BE/TripPlanner.Infrastructure/Mappings/MappingProfile.cs`, `BE/TripPlanner.Tests/MappingProfileTests.cs`.
- New: `BE/TripPlanner.Tests/ApplicationMapperTests.cs`.
- Modified: `ApplicationMapper.cs`, `InfrastructureServicesExtension.cs`, `TripPlanner.Infrastructure.csproj`, `CLAUDE.md`.
- Clean Architecture direction unaffected: Infrastructure swaps one package for another; no layer gains a reference.
- **Code style (CLAUDE.md):** braces on every control-flow statement; **no comments of any kind** in code — including none in the mapper class explaining the attributes.

### References

- `backend-clean-architecture-audit.md` §2 — records AutoMapper as correctly quarantined behind `IApplicationMapper`; that property is preserved here, not undone.
- `6-10-backend-clean-architecture-remediation.md` — the `.editorconfig` / `Directory.Build.props` analyzer wiring this story must not weaken.
- `CLAUDE.md` — "AutoMapper behind an interface" (to be rewritten) and the Architecture dependency-direction section.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (1M context)

### Debug Log References

- Baseline at `6d8b85d`: `dotnet test BE` **308/308**, `dotnet build BE` **0 warnings / 0 errors**.
- Task 1 characterization suite green on AutoMapper: 13/13 (up from the 3 pre-existing cases).
- Post-swap: `dotnet build BE --no-incremental` **0 warnings / 0 errors**; `dotnet test BE` **320/320**.
- RMG020 RED-verification transcript (see deviation D1 below):
  `ApplicationMapper.cs(11,5): warning RMG020: The member UserId on the mapping source type TripPlanner.Domain.Models.Trip is not mapped to any member on the mapping target type ...TripResponse` → `1 Warning(s)`.

### Completion Notes List

✅ **All acceptance criteria satisfied.**

- **AC #1** — AutoMapper fully gone. `grep -rn "AutoMapper\|IMapper\b\|MapperConfiguration" BE --include=*.cs --include=*.csproj` (excluding `obj/` and the unrelated `IApplicationMapper` token) returns **zero hits**.
- **AC #2** — `Riok.Mapperly` 4.3.1 added to `TripPlanner.Infrastructure.csproj` only. `git diff 6d8b85d` on `TripPlanner.Application.csproj` and `TripPlanner.Domain.csproj` is **empty** — those two projects are byte-identical to baseline, so Application still carries exactly its two contract-only abstraction packages.
- **AC #3** — `ApplicationMapper` is a `[Mapper] public partial class ... : IApplicationMapper` with five `public partial` methods. `IApplicationMapper` was **not touched** (unchanged in `git diff`). The `ApplicationMapper(IMapper mapper)` delegation layer AutoMapper forced is gone; the class now has no constructor and no fields.
- **AC #4** — `MappingProfile.cs` deleted.
- **AC #5** — Verified by *reading the generated source*, not by inference. `obj/…/Riok.Mapperly/…/ApplicationMapper.g.cs` emits `Xid = destination.ExternalId`, `TripDays = MapToListOfTripDayResponse(trip.Days)`, `SavedPlaces = MapToListOfDestinationResponse(trip.SavedPlaces)`, and `Destinations = MapToListOfDestinationResponse(tripDay.Destinations)`. All collection mappings are sequential `foreach` appends over the source, so `TripDay.Destinations`' `Position` ordering passes through unchanged. Nested `Trip → TripDay → Destination` maps reuse the declared partial methods rather than generating duplicates.
- **AC #6** — 0 warnings / 0 errors, with the three unmapped source members closed by explicit `[MapperIgnoreSource]`. No `NoWarn` entry and no `.editorconfig` change.
- **AC #7** — 13 cases in `ApplicationMapperTests` exercise the real `ApplicationMapper`, plus 2 in `ApplicationMapperRegistrationTests`.
- **AC #8** — 320/320 (308 baseline + 10 new mapping cases + 2 new registration cases). No endpoint, DTO, validator, migration, or auth change. **Zero frontend files touched** (confirmed by `git status`), so the FE suite was not re-run — there is nothing in it that could have changed.
- **AC #9** — `CLAUDE.md` updated in both places.

**The load-bearing detail: the characterization tests were written first and their assertions never changed.** Task 1 added 10 cases to the existing 3 and ran them **green against AutoMapper**. Task 5 then changed exactly one line of that file — the mapper construction — from a `MapperConfiguration(...).CreateMapper()` wrapped in `new ApplicationMapper(mapper)` to a bare `new ApplicationMapper()`. Every `Assert` in the file is byte-identical across the swap and all 13 stayed green. That is the actual evidence that the wire contract is unchanged; the tests were deliberately routed through the `IApplicationMapper` **port** rather than the concrete mapper so that this one-line substitution was all the migration required of them.

**Deviations and additions:**

- **D1 — RMG020 severity was measured, not assumed.** The story said to read the emitted diagnostics rather than guess. Confirmed empirically: with all three `[MapperIgnoreSource]` attributes in place the build is clean, and deleting just the `Trip.UserId` one produces `warning RMG020` and `1 Warning(s)` — a real bar-breaking warning in Mapperly 4.3.1, not an Info. The attributes are load-bearing for the 0-warning build, so a future reader must not "tidy them away". Following the 6-10 precedent, this was verified by breaking it and restoring, because a non-firing diagnostic looks exactly like a clean tree.
- **D2 — one test file beyond the authored task list.** `ApplicationMapperRegistrationTests` (2 cases) was not in the story's tasks. Justification: removing `services.AddAutoMapper(...)` is the single change here that can only fail at **runtime**, and nothing in the suite resolved `IApplicationMapper` from a real container — the other five mapper-touching test classes all use `Substitute.For<IApplicationMapper>()`. The tests build the provider via `AddInfrastructureServices` (same pattern as `EmailProviderSelectionTests`), assert the resolved instance is `ApplicationMapper`, and map through it to prove it works with no post-registration configuration step. Directly serves AC #8's "runtime behaviour unchanged", which no other test defended.
- **No behaviour deviation found.** Nothing about the mapping output changed; no assertion required editing.

**Noted for review:**

- `GET`-path behaviour is unchanged, but this was verified by unit tests and by reading generated code — **the API was not booted against a live Postgres in this session** (none available), so there is no end-to-end request-level confirmation. The DI-resolution tests are the closest substitute.
- `TripPlanner.API/appsettings.json` carries an **unrelated pre-existing** working-tree modification from before this story. It was deliberately left untouched and is excluded from the File List.
- The `Scoped` lifetime on `IApplicationMapper` is now arguably wrong — the Mapperly mapper is stateless and immutable, so `Singleton` would be strictly better. Left alone on purpose per Task 4; it is a separate, independently reviewable decision.

## File List

**Deleted:**
- BE/TripPlanner.Infrastructure/Mappings/MappingProfile.cs

**Renamed:**
- BE/TripPlanner.Tests/MappingProfileTests.cs → BE/TripPlanner.Tests/ApplicationMapperTests.cs — extended with 10 characterization cases while still on AutoMapper, then repointed at the Mapperly mapper by a single construction-line change

**Created:**
- BE/TripPlanner.Tests/ApplicationMapperRegistrationTests.cs — DI-resolution guard for the removed `AddAutoMapper` call (deviation D2)

**Modified:**
- BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj — `AutoMapper` 16.1.1 removed, `Riok.Mapperly` 4.3.1 added
- BE/TripPlanner.Infrastructure/Mappings/ApplicationMapper.cs — rewritten as the `[Mapper] partial class` implementing `IApplicationMapper`; two `[MapProperty]` and three `[MapperIgnoreSource]` attributes
- BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs — `AddAutoMapper(...)` line removed
- CLAUDE.md — Architecture bullet and the "AutoMapper behind an interface" → "Mapping behind an interface" key-pattern section
- _bmad-output/implementation-artifacts/sprint-status.yaml — story registered and logged

## Change Log

- 2026-07-27: Story created. Owner chose Mapperly over Mapster (compile-time generation; Mapster's runtime `TypeAdapterConfig` reproduces the failure mode being removed). Second design call: `ApplicationMapper` becomes the Mapperly mapper directly rather than an adapter over a generated one, deleting the delegation layer AutoMapper required.
- 2026-07-27: Story implemented. All 7 tasks complete. AutoMapper removed from the solution; `ApplicationMapper` is now a Mapperly `[Mapper] partial class`. The 13-case characterization suite crossed the swap with **unedited assertions** (only the mapper construction line changed), which is the evidence the wire contract is unchanged. RMG020 confirmed as a real warning by deliberately removing an ignore attribute and restoring it. Two DI-resolution tests added beyond the task list (deviation D2). BE 320/320 (from 308), build 0 warnings / 0 errors, zero frontend files touched. Status → review.
