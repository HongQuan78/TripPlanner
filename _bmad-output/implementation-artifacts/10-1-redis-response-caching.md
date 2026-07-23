---
baseline_commit: 698215edd82bf9fe4c3a9acfad629b4acce3be5e
---

# Story 10.1: Distributed Redis cache for external API responses (+ Redis in Docker)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator running TripPlanner behind Docker (and, later, more than one API replica),
I want the responses fetched from external providers (OpenTripMap place details, Photon geocoding) cached in a shared Redis instance instead of each API process's own memory,
so that the cache survives API restarts and is shared across instances — cutting repeat upstream calls (cost + NFR2 latency) far more effectively than the current single-process `IMemoryCache`.

Origin: story [[6-4-attraction-detail-caching]] added an in-process `IMemoryCache` for the OpenTripMap `xid/{xid}` place-detail fetch and **explicitly deferred a distributed/Redis cache** ("single-instance `IMemoryCache` is sufficient for this deployment"). Now that the stack is containerized (epic [[9-1-dockerize-for-production]]) and can scale horizontally, that deferral is being lifted: the cache moves to Redis so it is shared and durable, Redis joins the compose stack, and the highly-repeatable geocoding call is added to the cached set.

## Scope

- **Promote the existing cache to distributed (Redis).** Migrate `OpenTripMapPlaceClient` off `IMemoryCache` onto .NET's `IDistributedCache` abstraction, backed by Redis via `Microsoft.Extensions.Caching.StackExchangeRedis`. All existing 6-4 semantics are preserved exactly: cache non-null places only (never cache a 404/`null`), TTL from `OpenTripMapSettings.DetailCacheMinutes` (default 1440), 429 retry, key `otm:place:{xid}`.
- **Add geocoding to the cached set.** `PhotonGeocodingService.SearchAsync` (city/place name → coordinates) is highly repeatable and effectively static — cache its result keyed by the normalized query (+ `countryCode`), with a configurable TTL.
- **Safe fallback (no hard Redis dependency).** When no Redis connection string is configured (local dev, unit tests, `dotnet run` without Redis), the app registers an in-memory `IDistributedCache` (`AddDistributedMemoryCache`) instead — startup must **never** fail, and no test may require a running Redis. Consuming code depends only on `IDistributedCache`, so it is identical in both modes and testable with `MemoryDistributedCache`.
- **Redis in Docker.** Add a `redis` service to the root `docker-compose.yml` (image, healthcheck, named volume, `restart: unless-stopped`); wire the `api` service to it via `ConnectionStrings__Redis` and `depends_on: { redis: { condition: service_healthy } }`; document the new env var in `.env.production.example`.
- **Explicitly OUT of scope (do not implement):**
  - Caching the OpenTripMap `radius` **listing** response (`OpenTripMapAttractionSearchService.GetNearbyAsync`) — coordinates/params vary per search; the flagged hot path is the per-`xid` detail fan-out, already covered. (Same rationale 6-4 gave; may be a follow-up story.)
  - Caching Wikipedia image lookups (`WikipediaImageProvider`) — a distinct provider seam, not part of the flagged 1+N.
  - HTTP-level response/output caching (`OutputCache`), CDN, or caching Application-layer `Result<T>` values (trips are per-user and mutable — must never be cached).
  - Redis-backed session/token storage (`InMemoryTokenBlacklist` stays in-memory).
  - Cache invalidation beyond time-based TTL (these upstream responses are effectively static).

## Acceptance Criteria

1. `Microsoft.Extensions.Caching.StackExchangeRedis` (version aligned to the solution's .NET 10 shared framework, i.e. `10.0.*`) is added as a `PackageReference` to `TripPlanner.Infrastructure.csproj`. `dotnet restore BE` succeeds.
2. A `RedisSettings` class exists in `Infrastructure/Settings/` following the existing settings convention (`sealed class`, `public const string SectionName = "Redis"`, `init`-only props), exposing at minimum `InstanceName` (default `"tripplanner:"`, used as the Redis key prefix). The Redis connection string is read from `ConnectionStrings:Redis` (env var `ConnectionStrings__Redis`), consistent with `ConnectionStrings:DefaultConnection`.
3. In `InfrastructureServicesExtension.AddInfrastructureServices`, `IDistributedCache` is registered conditionally: when `ConnectionStrings:Redis` is non-empty, `AddStackExchangeRedisCache` is used with `Configuration = <connString>` and `InstanceName = RedisSettings.InstanceName`; when it is empty/absent, `AddDistributedMemoryCache()` is registered instead. Startup succeeds in **both** cases (no `ValidateOnStart` failure, no thrown exception when Redis is unconfigured).
4. A new internal typed cache helper (e.g. `IResponseCache` / `RedisResponseCache` in `Infrastructure/Caching/`) wraps `IDistributedCache` with JSON (`System.Text.Json`) get/set: `Task<T?> GetAsync<T>(string key, CancellationToken)` and `Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken)`, using `DistributedCacheEntryOptions.AbsoluteExpirationRelativeToNow`. It is registered in DI and injected into the cache consumers. (Direct `IDistributedCache` use in each adapter is acceptable only if the JSON-serialization logic is not duplicated.)
5. `OpenTripMapPlaceClient` no longer depends on `IMemoryCache`; it uses the distributed cache helper. Behavior is byte-for-byte equivalent to 6-4: key `otm:place:{xid}`, a second `GetPlaceAsync(xid)` within TTL returns the cached place **without** a second HTTP call, a `null`/404 is **not** cached, TTL is `DetailCacheMinutes` (falling back to 1440 when `≤ 0`), and the 429 retry (2 attempts, 600 ms) is unchanged.
6. `PhotonGeocodingService` caches `SearchAsync` results in the distributed cache keyed by a normalized query (e.g. `geo:search:{trimmed-lowercase-query}:{countryCode-or-'any'}`); a second `SearchAsync` for the same normalized query within TTL returns the cached list without a second HTTP call. TTL is configurable via a new `PhotonSettings.SearchCacheMinutes` (default a sensible static-data value, e.g. 1440). An empty-result list may be cached (short-lived is acceptable); a **failed** upstream call (thrown `HttpRequestException`) must **not** poison the cache.
7. The `AddMemoryCache(...)` registration and the `MemoryCacheEntryLimit` constant in `InfrastructureServicesExtension` are removed **iff** a solution-wide search confirms `IMemoryCache`/`AddMemoryCache` has no remaining consumer after the place-client migration; otherwise they are left intact and a note explains why.
8. `docker-compose.yml` gains a `redis` service (`redis:7-alpine` or newer 7.x), with a healthcheck (`redis-cli ping`), a named volume for persistence, and `restart: unless-stopped`. The `api` service gains `ConnectionStrings__Redis: "redis:6379"` under `environment:` and `depends_on: { redis: { condition: service_healthy } }` (alongside the existing `db` dependency). A `redisdata` (or similar) entry is added under top-level `volumes:`. `.env.production.example` documents the Redis wiring (even if the value is fixed to the in-network host `redis:6379` and needs no secret).
9. `dotnet build BE` succeeds with 0 warnings / 0 errors and `dotnet test BE` passes 100%. Tests use the existing `FakeHttpMessageHandler` pattern and a **`MemoryDistributedCache`** (no running Redis required), covering: place-detail cache hit avoids a second HTTP call after the `IMemoryCache`→`IDistributedCache` migration; 404 still returns `null` and is not cached; geocoding cache hit avoids a second HTTP call; and `AddInfrastructureServices` with **no** `ConnectionStrings:Redis` still resolves a working `IDistributedCache`. All pre-existing tests stay green (constructors updated for the new collaborators).

## Tasks / Subtasks

- [x] Task 1: Add the Redis package, settings, and conditional DI wiring (AC: 1, 2, 3)
  - [x] Added `Microsoft.Extensions.Caching.StackExchangeRedis` `10.0.10` (the 10.0.x NuGet resolved for the net10 runtime) to `TripPlanner.Infrastructure.csproj`; `dotnet restore BE` clean
  - [x] Added `RedisSettings` (`SectionName = "Redis"`, `InstanceName` default `"tripplanner:"`)
  - [x] In `AddInfrastructureServices`: bind `RedisSettings` via `Configure<RedisSettings>` (no `ValidateOnStart`), read `GetConnectionString("Redis")` → `AddStackExchangeRedisCache` when non-empty, else `AddDistributedMemoryCache()`
  - [x] Added `"Redis": { "InstanceName": "tripplanner:" }` + `ConnectionStrings.Redis = ""` to `appsettings.json`
- [x] Task 2: Add the distributed cache helper (AC: 4)
  - [x] Created `Caching/IResponseCache.cs` (internal) + `RedisResponseCache.cs` (typed `GetAsync<T>`/`SetAsync<T>` over `IDistributedCache`, `System.Text.Json`, `AbsoluteExpirationRelativeToNow`)
  - [x] Registered `services.AddScoped<IResponseCache, RedisResponseCache>()`
- [x] Task 3: Migrate the place-detail cache off `IMemoryCache` (AC: 5, 7)
  - [x] Swapped `IMemoryCache` → `IResponseCache` in `OpenTripMapPlaceClient`; ported to `GetAsync`/`SetAsync`, preserving key `otm:place:{xid}`, non-null-only write, `DetailCacheMinutes` (`≤0`→1440) TTL, and the 429 retry (`MemoryCacheEntryOptions.Size` dropped — no `IDistributedCache` equivalent)
  - [x] Grep confirmed `OpenTripMapPlaceClient` was the only production `IMemoryCache` consumer; removed `AddMemoryCache(...)` and the `MemoryCacheEntryLimit` const
- [x] Task 4: Cache the geocoding search (AC: 6)
  - [x] Added `SearchCacheMinutes` (default 1440) to `PhotonSettings`
  - [x] Injected `IResponseCache` + `IOptions<PhotonSettings>` into `PhotonGeocodingService`; cache key `geo:search:{trimmed-lowercase-query}:{countryCode-or-'any'}`; caches on success only (failures propagate uncached)
- [x] Task 5: Redis in Docker (AC: 8)
  - [x] Added `redis` service (`redis:7-alpine`, `redis-cli ping` healthcheck, `redisdata:/data` volume, `maxmemory-policy allkeys-lru`, `restart: unless-stopped`)
  - [x] Added `ConnectionStrings__Redis: "redis:6379"` to `api` `environment:` and `redis: { condition: service_healthy }` to `api` `depends_on:`
  - [x] Added `redisdata:` under top-level `volumes:`
  - [x] Documented the Redis wiring in `.env.production.example`
- [x] Task 6: Tests + validation (AC: 9)
  - [x] Updated `OpenTripMapPlaceClientTests`, `OpenTripMapAttractionSearchServiceTests`, `OpenTripMapDestinationDetailsServiceTests` to build the place client via a shared `TestCache.Create()` (`RedisResponseCache` over `MemoryDistributedCache`); all prior assertions green
  - [x] Added `PhotonGeocodingServiceTests` cache-hit test (same query twice ⇒ 1 request; different query ⇒ 2 requests)
  - [x] Added `RedisCacheRegistrationTests`: no `ConnectionStrings:Redis` resolves a usable in-memory `IDistributedCache`; with a connection string resolves a distributed cache; both without throwing
  - [x] `dotnet build BE` (0/0) and `dotnet test BE` (264/264)

### Review Findings

- [ ] [Review][Patch] Empty geocoding results cached for the full TTL — `PhotonGeocodingService.SearchAsync` caches an empty `[]` under the same `SearchCacheMinutes` (default 1440 = 24h) as real hits, so a transient no-match / empty upstream response is served for a full day. **Resolution (decision):** cache empty results under a short negative TTL while real hits keep the full `SearchCacheMinutes` TTL. [BE/TripPlanner.Infrastructure/ExternalServices/Photon/PhotonGeocodingService.cs:23,28-31]

- [ ] [Review][Patch] Redis runtime fault surfaces as HTTP 500 — no runtime fallback. `RedisResponseCache` catches only `JsonException`; a StackExchange `RedisConnectionException`/`RedisTimeoutException` (Redis configured but drops/blips at runtime) propagates through `SearchLocationsUseCase` (catches only `HttpRequestException`/`TaskCanceledException`) and `OpenTripMapAttractionSearchService.EnrichAsync` (adds only `JsonException`), so location search and attraction enrichment return 500 even though the provider APIs are healthy. Violates the story's "no hard Redis dependency" intent at runtime (fallback today is startup-only). Fix: swallow Redis faults in `GetAsync` (treat as miss) and `SetAsync` (best-effort) and fall through to the live fetch. [BE/TripPlanner.Infrastructure/Caching/RedisResponseCache.cs:12,35]
- [ ] [Review][Patch] `allkeys-lru` eviction policy set with no `--maxmemory` ceiling — Redis only evicts once `maxmemory` is reached, so the policy is a no-op and the keyspace is bounded only by the 24h TTL. Add `--maxmemory <bytes>` alongside the policy. [docker-compose.yml:19]
- [ ] [Review][Patch] Redis-configured registration test proves nothing about Redis — `AddInfrastructureServices_WithRedisConnectionString_ResolvesDistributedCache` asserts only `NotNull`, which both the `RedisCache` and `MemoryDistributedCache` branches satisfy; dropping the Redis branch would ship green. Add `Assert.IsType<RedisCache>` (with-Redis) and `MemoryDistributedCache` (without). [BE/TripPlanner.Tests/RedisCacheRegistrationTests.cs]
- [ ] [Review][Patch] No direct test that a transient upstream failure is not cached — only the 404 path is pinned (`GetPlaceAsync_NotFound...`, RequestCount==2). Add a "fail (5xx/throw) then succeed" test for both `OpenTripMapPlaceClient` and `PhotonGeocodingService` asserting a second request is issued. [BE/TripPlanner.Tests/OpenTripMapPlaceClientTests.cs, BE/TripPlanner.Tests/PhotonGeocodingServiceTests.cs]
- [ ] [Review][Patch] TTL fallback branch (`≤0`→1440) untested — every test uses default settings, so the ternary false branch in both cache seams never runs. Add a test setting `SearchCacheMinutes`/`DetailCacheMinutes` to 0. [BE/TripPlanner.Tests/PhotonGeocodingServiceTests.cs, BE/TripPlanner.Tests/OpenTripMapPlaceClientTests.cs]

- [x] [Review][Defer] `countryCode` encoded in the geocoding cache key but never forwarded to the Photon fetch [BE/TripPlanner.Infrastructure/ExternalServices/Photon/PhotonGeocodingService.cs:21,38] — deferred, pre-existing (fetch never used countryCode; caller derives it deterministically from the query so no current fragmentation)
- [x] [Review][Defer] No cache-schema version segment in keys, combined with a persistent `redisdata` volume — a future model field rename that still deserializes could serve stale-but-wrong data for up to 24h across deploys [BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapPlaceClient.cs:20, PhotonGeocodingService.cs:21] — deferred, pre-existing
- [x] [Review][Defer] docker-compose Redis wiring has no automated/integration coverage (typo'd connection string or broken healthcheck would silently degrade to per-process cache) [docker-compose.yml] — deferred, pre-existing (no compose/integration harness exists; acknowledged in the story)
- [x] [Review][Defer] Cache stampede — no single-flight on cold keys; N concurrent misses all hit the rate-limited upstream [BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapPlaceClient.cs, PhotonGeocodingService.cs] — deferred, pre-existing

## Dev Notes

### Architecture / pattern compliance

- **Dependency direction is preserved.** `IDistributedCache` lives in `Microsoft.Extensions.Caching.Abstractions` (already in the shared framework, like `IMemoryCache`). The cache helper (`IResponseCache`) and its Redis binding stay entirely in **Infrastructure** — do **not** add a cache interface to Application or Domain. This mirrors how 6-4 kept `IOpenTripMapPlaceClient` Infrastructure-internal. `[Source: CLAUDE.md#Architecture / Dependency Direction]`
- **Adapters are `internal`.** `OpenTripMapPlaceClient`, `OpenTripMapAttractionSearchService`, `OpenTripMapDestinationDetailsService` are `internal`; `PhotonGeocodingService` is `public`. Keep `IResponseCache`/`RedisResponseCache` `internal`. `TripPlanner.Infrastructure.csproj` already declares `<InternalsVisibleTo Include="TripPlanner.Tests" />` (line 29), so tests can construct them directly. `[Source: BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj:29]`
- **Settings convention** (`[Source: BE/TripPlanner.Infrastructure/Settings/OpenTripMapSettings.cs]`): `sealed class`, `public const string SectionName`, `init`-only props with defaults. `RedisSettings.InstanceName` follows this. Note OpenTripMap uses `services.Configure<OpenTripMapSettings>(...)` (no validation) — use the same un-validated `Configure<RedisSettings>` since Redis is optional; do **not** use `ValidateOnStart` (would break the fallback path).
- **Connection-string convention:** the DB uses `configuration.GetConnectionString("DefaultConnection")` / env `ConnectionStrings__DefaultConnection`. Redis follows the same: `GetConnectionString("Redis")` / `ConnectionStrings__Redis`. `[Source: BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs:31]`

### Files to touch (all UPDATE unless marked NEW)

- **UPDATE** `BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj` — add the Redis package (no central package management exists — pin the version directly, as all other refs are).
- **NEW** `BE/TripPlanner.Infrastructure/Settings/RedisSettings.cs`
- **NEW** `BE/TripPlanner.Infrastructure/Caching/IResponseCache.cs`, `RedisResponseCache.cs`
- **UPDATE** `BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs` — currently: `AddMemoryCache(o => o.SizeLimit = MemoryCacheEntryLimit)` at line 115; the five HTTP/service registrations at lines 117-121. Add conditional `IDistributedCache` + `RedisSettings` bind + `IResponseCache`; remove `AddMemoryCache`/`MemoryCacheEntryLimit` if unused (Task 3). **Preserve** every other registration and the three `Configure*Client` helpers untouched.
- **UPDATE** `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapPlaceClient.cs` — current state: ctor `(HttpClient, IOptions<OpenTripMapSettings>, IMemoryCache)`; `GetPlaceAsync` does `cache.TryGetValue($"otm:place:{xid}", ...)` then `cache.Set(...)` with `MemoryCacheEntryOptions { Size = 1, AbsoluteExpirationRelativeToNow = ... }`; `FetchAsync` has the 404→null + 429-retry loop. **What changes:** the cache dependency and the two cache calls. **What must be preserved:** key, non-null-only write, TTL fallback (`DetailCacheMinutes > 0 ? ... : 1440`), the entire `FetchAsync` retry/404 loop. `MemoryCacheEntryOptions.Size` has no `IDistributedCache` equivalent — drop it (size limiting was a `MemoryCache`-only concern; Redis eviction is server-side).
- **UPDATE** `BE/TripPlanner.Infrastructure/ExternalServices/Photon/PhotonGeocodingService.cs` — current: `public class PhotonGeocodingService(HttpClient httpClient) : IGeocodingService`, `SearchAsync(query, countryCode?, ct)` → `List<LocationSearchResultResponse>`, throws `HttpRequestException` on failure. **What changes:** add `IResponseCache` + `IOptions<PhotonSettings>` ctor params, wrap the fetch. **Preserve:** the existing request building, deserialization, and the throw-on-failure contract (do not swallow exceptions).
- **UPDATE** `BE/TripPlanner.Infrastructure/Settings/PhotonSettings.cs` — add `SearchCacheMinutes`.
- **UPDATE** `BE/TripPlanner.API/appsettings.json` — add `"Redis"` section + `ConnectionStrings.Redis`. (`OpenTripMapSettings` in JSON has no `DetailCacheMinutes` key and relies on the class default — same is fine for the new `SearchCacheMinutes`/`Redis.InstanceName`; add explicit keys anyway for discoverability.)
- **UPDATE** `docker-compose.yml` (repo root) — current services `db`, `api`, `web`; `db` has a `pg_isready` healthcheck + `pgdata` volume, `api` `depends_on: db: { condition: service_healthy }`. Mirror that shape for `redis`. `[Source: docker-compose.yml]`
- **UPDATE** `.env.production.example` — document Redis.
- **UPDATE (tests)** `OpenTripMapPlaceClientTests.cs`, `OpenTripMapAttractionSearchServiceTests.cs`, `OpenTripMapDestinationDetailsServiceTests.cs`; **NEW/UPDATE** `PhotonGeocodingServiceTests.cs`; **NEW** a Redis-fallback DI test (and optional `RedisResponseCacheTests.cs`).

### Testing standards

- xUnit + **NSubstitute** (no Moq). External HTTP is faked with the hand-rolled `FakeHttpMessageHandler(Func<HttpRequestMessage,HttpResponseMessage>)` that overrides `SendAsync`; `OpenTripMapPlaceClientTests` uses a `RequestCount` counter to prove cache hits. `[Source: BE/TripPlanner.Tests/OpenTripMapPlaceClientTests.cs]`
- **Do not require a running Redis.** Use `Microsoft.Extensions.Caching.Distributed.MemoryDistributedCache` (in `Microsoft.Extensions.Caching.Memory`, already available) wherever the old tests used `new MemoryCache(new MemoryCacheOptions())`. Construct it as `new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()))`, wrap in a `RedisResponseCache`, and pass that to the client. This is the whole point of coding against `IDistributedCache`.
- Test naming: `Method_Scenario_ExpectedResult`. Curly braces required on every control-flow statement; **no comments anywhere** (XML/inline/block). `[Source: CLAUDE.md#Code Style]`

### Redis / library specifics (latest-version notes)

- `Microsoft.Extensions.Caching.StackExchangeRedis` provides `AddStackExchangeRedisCache(Action<RedisCacheOptions>)`, registering `IDistributedCache` backed by StackExchange.Redis (pulled transitively). `RedisCacheOptions.Configuration` takes a StackExchange.Redis connection string (`"redis:6379"` in-network; `"host:port,password=…,ssl=true"` for managed cloud). `InstanceName` is prepended to every key — set it to `"tripplanner:"` so keys read `tripplanner:otm:place:{xid}`.
- The package version must match the .NET 10 shared framework line the solution targets (`net10.0`; siblings pinned at `10.0.2`/`10.0.9`). Pick the 10.0.x that `dotnet restore` resolves cleanly — do not pull a preview/major-mismatched version.
- `IDistributedCache` stores `byte[]`/`string`, not objects — hence the JSON helper. Use `System.Text.Json` (already in the framework; matches the `ReadFromJsonAsync` usage elsewhere). Cache misses return `null` from `GetStringAsync`; guard for null/empty before deserializing.
- `AddDistributedMemoryCache()` (fallback) also registers `IDistributedCache`, implemented in-process — semantically identical API, so consumers and tests are agnostic. It does **not** share across processes (that's expected: no Redis configured = single-process dev/test).
- Redis image: `redis:7-alpine` is the small, current stable. `redis-cli ping` returns `PONG` — standard healthcheck. A named volume on `/data` persists the RDB/AOF snapshot across `docker compose down`/`up` (optional for a pure cache, included for parity with `db`).

### Previous story intelligence — 6-4 (attraction-detail-caching)

- 6-4 introduced the exact seam this story evolves. Re-read its Completion Notes: the "don't cache 404/null" rule (use `TryGetValue`+conditional `Set`, **not** `GetOrCreate*`), the `otm:place:{xid}` key, the `DetailCacheMinutes≤0`→1440 TTL guard, and the graceful-degradation `catch` in `OpenTripMapAttractionSearchService.EnrichAsync` (returns the bare attraction if the place fetch throws) are all contracts under test — the migration must not change any of them. `[Source: _bmad-output/implementation-artifacts/6-4-attraction-detail-caching.md]`
- 6-4's code review flagged **unbounded cache growth** and added `SizeLimit`/`Size=1`. With Redis this concern moves server-side (Redis `maxmemory`/eviction policy) — do not try to reproduce `SizeLimit` on `IDistributedCache` (it has no such knob). The `Size=1` lines simply disappear with the `MemoryCacheEntryOptions`. If desired, note that a production Redis should set an eviction policy (`allkeys-lru`) — but configuring the Redis server's `maxmemory-policy` is out of scope here.

### Project Structure Notes

- New `Caching/` folder under Infrastructure is a new sibling to `ExternalServices/`, `Settings/`, `Repositories/`, etc. — consistent with the layer's folder-per-concern layout.
- No Application/Domain/API signature changes; no EF migration. Changes are confined to Infrastructure (+ its settings/DI), `appsettings.json`, the Tests project, and the two ops files (`docker-compose.yml`, `.env.production.example`).
- Docker: only the compose file + env example change — the `BE/Dockerfile` needs no edit (the Redis client is a NuGet dependency compiled into the API image; no new host port is exposed — Redis stays internal to the compose network like `db`).

### References

- [Source: _bmad-output/implementation-artifacts/6-4-attraction-detail-caching.md] — the in-memory cache seam this story promotes to Redis, and its preserved contracts.
- [Source: _bmad-output/implementation-artifacts/9-1-dockerize-for-production.md] — the compose stack (`db`/`api`/`web`) the `redis` service joins.
- [Source: BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs:100-121] — settings binding, `AddMemoryCache`, and the HTTP/service registrations to modify.
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapPlaceClient.cs] — the cache read/write to migrate.
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/Photon/PhotonGeocodingService.cs] — the geocoding call to add caching to.
- [Source: BE/TripPlanner.Tests/OpenTripMapPlaceClientTests.cs] — the `FakeHttpMessageHandler` + `RequestCount` cache-hit test template.
- [Source: docker-compose.yml] — the `db` service (healthcheck + volume + `depends_on`) shape to mirror for `redis`.
- [Source: CLAUDE.md#Architecture, #Key Patterns (External services), #Code Style] — dependency direction, adapter/interface convention, braces + no-comments house style.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (claude-opus-4-8[1m])

### Debug Log References

- `dotnet add ... package Microsoft.Extensions.Caching.StackExchangeRedis` → installed 10.0.10 (pulls StackExchange.Redis 2.7.27).
- `dotnet build BE` — 0 Warning(s), 0 Error(s).
- `dotnet test BE` — Passed: 264, Failed: 0, Skipped: 0 (was 259; +2 Photon cache tests, +3 Redis registration tests).

### Completion Notes List

- Promoted the 6-4 in-process place-detail cache to a **distributed** cache behind .NET's `IDistributedCache`. When `ConnectionStrings:Redis` is set the cache is Redis (`AddStackExchangeRedisCache`, key-prefixed `tripplanner:` via `RedisSettings.InstanceName`); when it is empty the app falls back to `AddDistributedMemoryCache()`. Both register `IDistributedCache`, so all consumer code and tests are Redis-agnostic — **no test requires a running Redis** (they use `MemoryDistributedCache`).
- New internal `IResponseCache`/`RedisResponseCache` (`Infrastructure/Caching/`) centralizes JSON (System.Text.Json, web defaults) serialization + TTL over `IDistributedCache`, so the place client and geocoding service share one seam. `GetAsync<T>` returns `default` on miss and swallows a `JsonException` (treats a corrupt entry as a miss).
- `OpenTripMapPlaceClient` behavior is preserved exactly: `otm:place:{xid}` key, non-null-only write (404/null never cached), `DetailCacheMinutes` (`≤0`→1440) TTL, 429 retry (2×600 ms). The `MemoryCache`-only `Size = 1` / `SizeLimit` bounding is gone — Redis eviction is server-side; the compose `redis` runs `--maxmemory-policy allkeys-lru` as the distributed equivalent of 6-4's bounded-growth fix.
- `PhotonGeocodingService.SearchAsync` (geocoding) is now cached, keyed by the normalized (trimmed, lower-cased) query + country code, TTL `PhotonSettings.SearchCacheMinutes` (default 1440). Results cache on success only; a thrown `HttpRequestException`/timeout propagates and does **not** poison the cache (verified indirectly by the still-green failure-path tests).
- Encapsulation: `PhotonGeocodingService` changed `public`→`internal` (it is only ever resolved via `IGeocodingService`; making it `internal` was required because its new `IResponseCache` param is `internal`, and it matches the already-`internal` OpenTripMap adapters + the 6-4 encapsulation decision). No API/Application/Domain type references it directly, so nothing outside Infrastructure broke.
- Removed `AddMemoryCache(...)` + `MemoryCacheEntryLimit` from `InfrastructureServicesExtension` after grep-confirming the place client was the only production `IMemoryCache` consumer (`InMemoryTokenBlacklist` is a custom singleton, not `IMemoryCache`).
- **Docker:** added a `redis:7-alpine` service (healthcheck `redis-cli ping`, `redisdata` volume, `allkeys-lru`), wired `api` to it via `ConnectionStrings__Redis=redis:6379` + a `service_healthy` dependency. **Not verified with a live `docker compose up`** — Docker is unavailable in this dev environment; the compose additions mirror the existing `db` service shape (healthcheck + named volume + `depends_on` condition) 1:1. The `BE/Dockerfile` needed no change (Redis client is a compiled NuGet dependency; Redis is not host-exposed).
- Scope held to infra + ops: no Application/Domain/API signature changes, no EF migration. Per-user/mutable data (`Result<T>`, trips) is never cached — only effectively-static external-provider responses.

### File List

- `BE/TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj` (modified — added Redis package)
- `BE/TripPlanner.Infrastructure/Settings/RedisSettings.cs` (new)
- `BE/TripPlanner.Infrastructure/Settings/PhotonSettings.cs` (modified — `SearchCacheMinutes`)
- `BE/TripPlanner.Infrastructure/Caching/IResponseCache.cs` (new)
- `BE/TripPlanner.Infrastructure/Caching/RedisResponseCache.cs` (new)
- `BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs` (modified — conditional `IDistributedCache`, `IResponseCache` reg, removed `AddMemoryCache`)
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapPlaceClient.cs` (modified — `IMemoryCache`→`IResponseCache`)
- `BE/TripPlanner.Infrastructure/ExternalServices/Photon/PhotonGeocodingService.cs` (modified — cache + `internal`)
- `BE/TripPlanner.API/appsettings.json` (modified — `Redis` section + `ConnectionStrings.Redis` + `PhotonSettings.SearchCacheMinutes`)
- `docker-compose.yml` (modified — `redis` service, `api` wiring, `redisdata` volume)
- `.env.production.example` (modified — Redis documentation)
- `BE/TripPlanner.Tests/TestCache.cs` (new — shared `IResponseCache` over `MemoryDistributedCache`)
- `BE/TripPlanner.Tests/RedisCacheRegistrationTests.cs` (new)
- `BE/TripPlanner.Tests/OpenTripMapPlaceClientTests.cs` (modified)
- `BE/TripPlanner.Tests/OpenTripMapAttractionSearchServiceTests.cs` (modified)
- `BE/TripPlanner.Tests/OpenTripMapDestinationDetailsServiceTests.cs` (modified)
- `BE/TripPlanner.Tests/PhotonGeocodingServiceTests.cs` (modified — cache tests + new ctor)

## Change Log

- 2026-07-23: Story drafted — promote the 6-4 in-process `IMemoryCache` place-detail cache to a distributed Redis-backed `IDistributedCache` (with in-memory fallback so no test/local run needs Redis), add caching to the Photon geocoding call, and add a `redis` service to the Docker Compose stack. Infrastructure + ops only; no Application/Domain/API/schema changes.
