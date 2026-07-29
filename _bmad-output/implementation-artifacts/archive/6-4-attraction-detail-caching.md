---
baseline_commit: 698215edd82bf9fe4c3a9acfad629b4acce3be5e
---

# Story 6.4: Cache OpenTripMap place details to reduce the US3 1+N latency

Status: done

## Story

As a traveler browsing recommended attractions,
I want the attractions list and detail pages to return quickly on repeat views,
so that searching the same city again (or opening the detail of an attraction I just saw in the list) does not pay the full per-attraction upstream cost every time and the US3 listing stays within its NFR2 latency budget.

Origin: NFR2 latency finding carried over from [[6-1-backend-requirements-verification]] and re-flagged in `_bmad-output/implementation-artifacts/feature-1-verification-report.md` (US3 note #2 and Findings-summary #3). The US3 attraction listing does 1 `radius` call + N per-`xid` detail calls (`OpenTripMapAttractionSearchService.FetchDetailAsync`), throttled to 5 concurrent with 429 retry. Functional, but the ≤1000 ms / 95th-percentile target is at risk on a cold cache. This story adds the caching layer the report said was needed.

## Scope

- **Performance (NFR2):** the per-`xid` OpenTripMap place-detail fetch is the 1+N hot path. Add an in-process cache keyed by `xid` so a place detail is fetched from OpenTripMap at most once per TTL window, regardless of how many list/detail requests reference it.
- **Shared seam:** the same `xid/{xid}` endpoint is called from two places today — `OpenTripMapAttractionSearchService.FetchDetailAsync` (list enrichment) and `OpenTripMapDestinationDetailsService.GetDetailsAsync` (detail page). Centralize both behind a single cached collaborator so a place cached by one path is reused by the other.
- **In scope:** a new `IOpenTripMapPlaceClient` (Infrastructure-internal) owning the `xid/{xid}` fetch + `IMemoryCache` + the existing 429-retry logic; both OpenTripMap services delegate to it; `AddMemoryCache()` + DI wiring; a configurable cache TTL on `OpenTripMapSettings`; unit tests proving cache hits avoid a second HTTP call and that behavior (image enrichment, 404, 429 retry) is preserved.
- **Explicitly out of scope (do not implement):** caching the `radius` listing response itself (coordinates vary per search; the detail fan-out is the dominant cost and the flagged 1+N — a listing cache is a separate, more speculative optimization); a distributed/Redis cache (single-instance `IMemoryCache` is sufficient for this deployment and matches the existing in-memory singletons like `InMemoryTokenBlacklist`); cache invalidation/eviction beyond a time-based TTL (OpenTripMap place details are effectively static); persisting details to the database; the Wikipedia image lookup cache (a distinct provider with its own seam — not part of the flagged 1+N and left untouched). US3-AC7 pagination, US4 filter, and US5 sort remain intentionally not-selected and are not touched.

## Acceptance Criteria

1. A new `IOpenTripMapPlaceClient` with `Task<OpenTripMapPlaceModel?> GetPlaceAsync(string xid, CancellationToken)` lives in `Infrastructure/ExternalServices/OpenTripMap/`, backed by a typed `HttpClient` (configured by the existing `ConfigureOpenTripMapClient`) and `IMemoryCache`.
2. `GetPlaceAsync` returns the deserialized place on HTTP 200, `null` on HTTP 404, and preserves the existing 429 rate-limit retry (up to 2 retries with the existing delay) that currently lives in `OpenTripMapAttractionSearchService.FetchDetailAsync`.
3. A successful (non-null) place is cached in `IMemoryCache` keyed by `xid`; a second `GetPlaceAsync` for the same `xid` within the TTL returns the cached value **without** issuing another HTTP request. A `null`/404 result is **not** cached (so a place that later becomes available is not permanently masked).
4. The cache TTL is configurable via a new `OpenTripMapSettings.DetailCacheMinutes` (absolute expiration), defaulting to a sensible static-data value (1440 minutes / 24h); the default requires no config change to existing `.env`/`appsettings`.
5. `OpenTripMapAttractionSearchService` delegates its per-`xid` enrichment to `IOpenTripMapPlaceClient` (its own `FetchDetailAsync` + retry constants are removed); the `radius` call and the concurrency throttle stay on the service. Image enrichment, `Kinds`/`Rating` mapping, and the graceful-degradation `catch` behavior are unchanged.
6. `OpenTripMapDestinationDetailsService` delegates its place fetch to `IOpenTripMapPlaceClient` (returning `null` when the client returns `null`); all response mapping (address, rating parse, image URLs, coordinates) is unchanged.
7. DI is wired in `InfrastructureServicesExtension`: `AddMemoryCache()` is registered, `IOpenTripMapPlaceClient` is registered as a typed `HttpClient`, and the two OpenTripMap services resolve it. `IDestinationDetailsService` no longer needs its own `HttpClient` registration if it no longer uses one directly.
8. `dotnet build BE` succeeds with 0 warnings/0 errors and `dotnet test BE` passes 100% — all existing tests (updated for the new constructor collaborators) plus new tests covering: a cache hit avoids a second HTTP call, 404 returns `null` and is not cached, 429 is retried, and both OpenTripMap services still produce their existing outputs.

## Tasks / Subtasks

- [x] Task 1: Add the cached place client (AC: 1, 2, 3, 4)
  - [x] Add `DetailCacheMinutes` (int, default 1440) to `OpenTripMapSettings`
  - [x] Add `IOpenTripMapPlaceClient` interface in `Infrastructure/ExternalServices/OpenTripMap/`
  - [x] Implement `OpenTripMapPlaceClient(HttpClient, IOptions<OpenTripMapSettings>, IMemoryCache)`: `xid/{xid}` fetch, 404→null, 429 retry (moved from the search service), cache non-null results by `xid` with absolute expiration from `DetailCacheMinutes`
- [x] Task 2: Delegate the attraction-search enrichment (AC: 5)
  - [x] Inject `IOpenTripMapPlaceClient` into `OpenTripMapAttractionSearchService`; replace `FetchDetailAsync` call with `placeClient.GetPlaceAsync`
  - [x] Remove the now-dead `FetchDetailAsync`, `RateLimitRetryCount`, `RateLimitRetryDelay`; keep the `radius` fetch, the concurrency throttle, image enrichment, and the `catch` fallback intact
- [x] Task 3: Delegate the detail-page fetch (AC: 6)
  - [x] Replace `OpenTripMapDestinationDetailsService`'s direct `HttpClient` `xid/{xid}` call with `placeClient.GetPlaceAsync`; keep all mapping logic
  - [x] Drop the unused `HttpClient`/`IOptions` constructor params if no longer referenced
- [x] Task 4: Wire DI (AC: 7)
  - [x] `services.AddMemoryCache()` in `AddInfrastructureServices`
  - [x] Register `IOpenTripMapPlaceClient` via `AddHttpClient<IOpenTripMapPlaceClient, OpenTripMapPlaceClient>(ConfigureOpenTripMapClient)`
  - [x] Adjust the `IDestinationDetailsService` registration (scoped, no HttpClient) if it no longer needs one
- [x] Task 5: Tests + validation (AC: 8)
  - [x] Add `OpenTripMapPlaceClientTests`: cache hit avoids a second HTTP call (assert request count), 404→null and not cached, 429 retried
  - [x] Update `OpenTripMapAttractionSearchServiceTests` and `OpenTripMapDestinationDetailsServiceTests` for the new collaborator (wire a real `OpenTripMapPlaceClient` over the same fake handler + a `MemoryCache`); keep their existing assertions green
  - [x] `dotnet build BE` (0/0) and `dotnet test BE` (100%)

### Review Findings

Code review 2026-07-21 (4 adversarial layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor). 3 patch (1 promoted from decision-needed), 1 defer, 9 dismissed.

- [x] [Review][Patch] Unbounded cache growth — `AddMemoryCache()` sets no `SizeLimit`/compaction; every distinct xid is cached for 24h off an anonymous search endpoint. Resolution (user decision): added a bounded `SizeLimit = 10000` with per-entry `Size = 1` [InfrastructureServicesExtension.cs] — FIXED
- [x] [Review][Patch] `DetailCacheMinutes ≤ 0` throws `ArgumentOutOfRangeException` on first cache write (500) and escapes the `EnrichAsync` catch filter — guarded the TTL in the client (falls back to `DefaultCacheMinutes = 1440` when not positive) [OpenTripMapPlaceClient.cs] — FIXED
- [x] [Review][Patch] Graceful-degradation `catch` in `EnrichAsync` (bare-attraction fallback) untested — added `GetNearbyAsync_XidDetailFetchThrows_ReturnsBareAttraction` (xid returns 500 → single bare `AttractionResponse` with null Rating/ImageUrl, image provider not called) [OpenTripMapAttractionSearchServiceTests.cs] — FIXED
- [x] [Review][Defer] Rate-limit test blocks ~600ms on the real, non-injectable `RateLimitRetryDelay` [OpenTripMapPlaceClientTests.cs:75] — deferred, low-value test-speed nit

## Dev Notes

- `IMemoryCache` / `MemoryCache` / `AddMemoryCache()` come from `Microsoft.Extensions.Caching.Memory`, already available transitively via EF Core in Infrastructure and via the Web SDK in the API — confirm it resolves; only add an explicit `PackageReference` if the build cannot find the type.
- The cache is single-instance in-memory, consistent with the existing `InMemoryTokenBlacklist` singleton — no distributed cache. State this deployment assumption in Completion Notes.
- Key convention: use a stable prefixed key such as `otm:place:{xid}` so entries are namespaced and shared identically by both services.
- Do **not** cache `null`/404 — use `TryGetValue` + conditional `Set` (not `GetOrCreateAsync`, which stores the factory result unconditionally) so a transiently-missing place is not pinned as absent for 24h.
- Repo conventions from `CLAUDE.md` apply in full: braces required on every control-flow statement; **no comments** anywhere (XML/inline/block); xUnit + NSubstitute with `Method_Scenario_ExpectedResult` test naming.
- The existing OTM service tests share a `FakeHttpMessageHandler` that branches on request path — one handler instance can back two `HttpClient`s (the service's `radius` client and the place client's `xid` client), so cache/enrichment integration is testable without new infrastructure.
- Preserve the graceful-degradation contract: `OpenTripMapAttractionSearchService.EnrichAsync` must still return the un-enriched attraction if the place fetch throws — moving the fetch into the client must not change which exceptions the service swallows (`HttpRequestException`/`TaskCanceledException`/`JsonException`).

### Project Structure Notes

- New files: `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/IOpenTripMapPlaceClient.cs`, `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapPlaceClient.cs`, `BE/TripPlanner.Tests/OpenTripMapPlaceClientTests.cs`.
- Modified: `OpenTripMapSettings.cs`, `OpenTripMapAttractionSearchService.cs`, `OpenTripMapDestinationDetailsService.cs`, `InfrastructureServicesExtension.cs`, and the two existing OTM service test files.
- All changes stay within the Infrastructure adapter layer + Tests; no Application/Domain/API signature changes, no migration.

### References

- [Source: _bmad-output/implementation-artifacts/feature-1-verification-report.md#US3 — View recommended attractions list] (NFR2 note)
- [Source: _bmad-output/implementation-artifacts/feature-1-verification-report.md#Findings summary] (#3 NFR2 latency risk)
- [Source: _bmad-output/implementation-artifacts/archive/6-1-backend-requirements-verification.md]
- [Source: CLAUDE.md#External services]
- [Source: CLAUDE.md#Code Style]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (claude-opus-4-8[1m])

### Debug Log References

- `dotnet build BE` — 0 Warning(s), 0 Error(s)
- `dotnet test BE` — Passed: 229, Failed: 0, Skipped: 0 (+3 new OpenTripMapPlaceClientTests)
- Post-review-fix `dotnet test BE` — Passed: 230, Failed: 0, Skipped: 0 (+1 graceful-degradation test)

### Completion Notes List

- Introduced `IOpenTripMapPlaceClient` / `OpenTripMapPlaceClient` as the single cached seam for the OpenTripMap `xid/{xid}` place-detail endpoint. Both `OpenTripMapAttractionSearchService` (the US3 1+N list-enrichment hot path) and `OpenTripMapDestinationDetailsService` (detail page) now delegate to it, so a place fetched by either path is served from `IMemoryCache` for subsequent references within the TTL.
- Cache is single-instance in-process `IMemoryCache` (registered via `AddMemoryCache()`), consistent with the existing `InMemoryTokenBlacklist` singleton — no distributed/Redis cache, matching this deployment's single-API-instance assumption. Keyed `otm:place:{xid}`.
- Non-null results only are cached (via `TryGetValue` + conditional `Set`, not `GetOrCreateAsync`) with absolute expiration from `OpenTripMapSettings.DetailCacheMinutes` (default 1440 / 24h). A 404/null is never cached, so a place that later becomes available is not pinned absent.
- The 429 rate-limit retry (2 retries, 600 ms) moved from `OpenTripMapAttractionSearchService.FetchDetailAsync` into the client; `FetchDetailAsync` and its retry constants were removed. The service keeps the `radius` fetch, the 5-way concurrency throttle, image enrichment, and its graceful-degradation `catch` (returns the un-enriched attraction when the place fetch throws) unchanged.
- `OpenTripMapDestinationDetailsService` no longer holds an `HttpClient`/`IOptions` — it depends only on `IOpenTripMapPlaceClient` + `IDestinationImageProvider`, so its DI registration changed from `AddHttpClient` to `AddScoped`. `IMemoryCache` requires no explicit `PackageReference` (resolved transitively via EF Core).
- Verified via a new `OpenTripMapPlaceClientTests`: a second `GetPlaceAsync` for the same `xid` is served from cache with exactly one HTTP call; 404 returns `null` and is not cached (a subsequent success is fetched); 429 is retried then succeeds. Existing OTM service tests were updated to wire a real `OpenTripMapPlaceClient` over the same fake handler and keep all prior assertions green.
- Accessibility decision: `OpenTripMapPlaceModel` is `internal`, so a public interface exposing it would break (CS0050/CS0051). Rather than leak the OpenTripMap JSON DTO as `public`, the entire OpenTripMap adapter surface was kept `internal` — `IOpenTripMapPlaceClient`/`OpenTripMapPlaceClient` are `internal`, and the two existing OTM services (`OpenTripMapAttractionSearchService`, `OpenTripMapDestinationDetailsService`) were changed from `public` to `internal` (they are only ever resolved by their Application interfaces via DI within the same assembly; the API never references the concrete types). Added `<InternalsVisibleTo Include="TripPlanner.Tests" />` to the Infrastructure csproj so the tests can construct these adapters directly, as they already did. Net effect: better encapsulation of the infra adapters with no public-surface leak of the provider DTO.

### File List

- `BE/TripPlanner.Infrastructure/Settings/OpenTripMapSettings.cs` (modified)
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/IOpenTripMapPlaceClient.cs` (new)
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapPlaceClient.cs` (new)
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs` (modified)
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs` (modified)
- `BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs` (modified)
- `BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj` (modified — added `InternalsVisibleTo` for the test project)
- `BE/TripPlanner.Tests/OpenTripMapPlaceClientTests.cs` (new)
- `BE/TripPlanner.Tests/OpenTripMapAttractionSearchServiceTests.cs` (modified)
- `BE/TripPlanner.Tests/OpenTripMapDestinationDetailsServiceTests.cs` (modified)

## Change Log

- 2026-07-21: Added an in-process cache for OpenTripMap place details (`IOpenTripMapPlaceClient` + `IMemoryCache`, keyed by xid, 24h TTL) shared by the attraction-list enrichment and the detail page, cutting the US3 1+N upstream detail calls to at most one per xid per TTL window (NFR2 latency mitigation carried over from 6-1). No API/schema change.
- 2026-07-21: Addressed code review findings — 3 patches resolved (bounded cache `SizeLimit = 10000` + per-entry `Size = 1`; `DetailCacheMinutes ≤ 0` TTL guard falling back to 1440; new graceful-degradation test for `EnrichAsync` when the xid detail fetch throws), 1 deferred (non-injectable 600ms retry delay in a test), 9 dismissed. BE 230/230 tests, build 0/0.
