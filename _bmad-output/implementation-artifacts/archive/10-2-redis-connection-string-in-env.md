---
baseline_commit: 35c7897abffa45e38fa670624cc45a6e00834e0e
---

# Story 10.2: Source the Redis connection string from the environment

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator deploying TripPlanner,
I want the Redis connection string supplied through the environment (the host-side `.env` for Compose, and `BE/.env` for a plain `dotnet run`) instead of being hard-coded in `docker-compose.yml`,
so that I can point the API at a managed/external Redis (or deliberately disable it) without editing a version-controlled file, exactly the way every other connection string and secret in this stack already works.

Origin: story [[10-1-redis-response-caching]] added the `redis` service and wired the API to it, but pinned the value literally — `docker-compose.yml:41` reads `ConnectionStrings__Redis: "redis:6379"`. Every sibling setting on that same `environment:` block (`JwtSettings__SecretKey`, `OpenTripMapSettings__ApiKey`, the whole `EmailSettings__*` group, both SMTP credential pairs) is a `${...}` substitution fed by the host `.env`; the Postgres connection string is likewise assembled from `${POSTGRES_*}`. Redis is the lone exception. Correspondingly, `.env.production.example` only *describes* Redis in a comment block (lines 16-20) — it declares no variable — and `BE/.env.example` does not mention Redis at all, so a local developer has no discoverable way to opt in to a real Redis and no signal that the in-process fallback is what they are getting.

## Scope

- **Make the Compose value an env substitution with a safe default.** `docker-compose.yml`'s `api.environment` entry becomes `ConnectionStrings__Redis: ${ConnectionStrings__Redis:-redis:6379}` so an unset/absent host `.env` variable still resolves to the in-network `redis` service (today's behavior, byte-for-byte), while an operator who sets the variable overrides it.
- **Declare the variable in `.env.production.example`.** Replace the comment-only Redis block with a real, documented, uncommented `ConnectionStrings__Redis=redis:6379` line, keeping the existing explanation of what is cached, that the value is not a secret and not host-exposed, and that emptying it falls back to the in-process cache.
- **Declare the variable in `BE/.env.example`.** Add a documented `ConnectionStrings__Redis=` line (blank by default) for the local `dotnet run` path, stating that blank/absent means `AddDistributedMemoryCache()` (per-process, non-shared) and that a local Redis is reached with `localhost:6379`.
- **Document the convention in `CLAUDE.md`.** The Docker/Production section's `Config/secrets` bullet currently calls out only the Postgres connection string; extend it (or add a sibling bullet) to record the Redis service, the `ConnectionStrings__Redis` variable, its Compose default, and the empty-value in-process fallback. CLAUDE.md was never updated for 10-1, so the `redis` service is currently undocumented there.
- **Pin the empty-string fallback with a test.** `BE/.env.example` shipping a blank `ConnectionStrings__Redis=` makes an *empty-string* (as opposed to *absent-key*) configuration value a first-class, reachable state. `RedisCacheRegistrationTests` today only covers the absent-key and non-empty cases. Add coverage for the empty and whitespace-only values so the `IsNullOrWhiteSpace` guard in `InfrastructureServicesExtension` cannot regress into an `AddStackExchangeRedisCache("")` startup failure.
- **Explicitly OUT of scope (do not implement):**
  - Any change to `RedisSettings`, `RedisResponseCache`, `IResponseCache`, `OpenTripMapPlaceClient`, or `PhotonGeocodingService` — caching behavior is untouched. The connection string is already read from configuration (`GetConnectionString("Redis")`); this story only changes where the *value* comes from.
  - The six open `[Review][Patch]` findings on story 10-1 (empty-geocoding-result TTL, Redis runtime-fault fallback, `--maxmemory` ceiling, the `NotNull`-only Redis-branch assertion, transient-failure caching, TTL-fallback branch coverage). They stay with 10-1. In particular, do **not** "fix" the `Assert.NotNull` weakness or add `--maxmemory` here.
  - Host-exposing the `redis` port, Redis auth/TLS, or a `REDIS_PASSWORD` variable — the compose Redis stays in-network and unauthenticated, as 10-1 shipped it.
  - `appsettings.json` — `ConnectionStrings.Redis` is already present as `""` and is the correct no-Redis default for a config file. Leave it.

## Acceptance Criteria

1. `docker-compose.yml`'s `api` service sets `ConnectionStrings__Redis: ${ConnectionStrings__Redis:-redis:6379}`. With no `ConnectionStrings__Redis` defined in the host `.env`, the effective value is still `redis:6379` — the API's connection to the compose `redis` service is unchanged from 10-1. With the variable defined, that value wins.
2. The `:-` (default-if-unset-**or-empty**) form is used, not `:?` or a bare `${...}`. A bare `${ConnectionStrings__Redis}` would resolve to an empty string when unset, silently degrading every default `docker compose up` to a per-process in-memory cache while the `redis` container sits idle and healthy — a regression that no test in this repo would catch.
3. `.env.production.example` contains an uncommented `ConnectionStrings__Redis=redis:6379` line under a `# --- Redis (the `redis` service) ---` heading, with comments stating: what is cached (OpenTripMap place details, Photon geocoding), that `redis:6379` targets the in-network compose service and is neither a secret nor host-exposed, that an external/managed Redis is set by replacing the value, and that an empty value falls back to a per-process in-process cache.
4. `BE/.env.example` contains a `ConnectionStrings__Redis=` line (empty value) with comments stating that blank or absent selects the in-process `AddDistributedMemoryCache()` fallback (per-process, not shared, lost on restart) and that a locally running Redis is reached with `localhost:6379`. It is placed adjacent to the existing `ConnectionStrings__DefaultConnection` line so the two connection strings read together.
5. `CLAUDE.md`'s "Docker / Production Deployment" section documents the `redis` service and the `ConnectionStrings__Redis` variable: the Compose `${...:-redis:6379}` default, that an empty value degrades to an in-process cache rather than failing startup, and that Redis is not host-exposed. No other CLAUDE.md section is rewritten.
6. `RedisCacheRegistrationTests` gains coverage proving `AddInfrastructureServices` resolves a **usable** `IDistributedCache` when `ConnectionStrings:Redis` is an empty string, and when it is whitespace-only — neither throws at registration nor at first resolve, and a set/get round-trip succeeds. The existing absent-key and non-empty-value tests remain and stay green.
7. `dotnet build BE` succeeds with 0 warnings / 0 errors and `dotnet test BE` passes 100% with no pre-existing test modified other than the additive `RedisCacheRegistrationTests` cases.
8. No production C# file changes. The File List contains only `docker-compose.yml`, `.env.production.example`, `BE/.env.example`, `CLAUDE.md`, and `BE/TripPlanner.Tests/RedisCacheRegistrationTests.cs`.

## Tasks / Subtasks

- [x] Task 1: Env-source the Compose value (AC: 1, 2)
  - [x] Changed `docker-compose.yml:41` to `ConnectionStrings__Redis: "${ConnectionStrings__Redis:-redis:6379}"` (quoted — see Completion Notes for the deviation from the Dev Notes' "follow the unquoted sibling style")
  - [x] Parsed the file with `js-yaml`: parse OK, and the value reads back as the exact literal `${ConnectionStrings__Redis:-redis:6379}`; `git diff` confirms this is the only line of `api.environment` this story touched
  - [x] Recorded the Docker-unavailable verification limit in the Completion Notes
- [x] Task 2: Declare the variable in the two env examples (AC: 3, 4)
  - [x] `.env.production.example`: comment-only Redis block replaced with a documented, uncommented `ConnectionStrings__Redis=redis:6379`; the stale "docker-compose.yml already wires ... via ConnectionStrings__Redis=redis:6379" sentence rewritten
  - [x] `BE/.env.example`: documented blank `ConnectionStrings__Redis=` added directly beneath `ConnectionStrings__DefaultConnection`
- [x] Task 3: Pin the empty/whitespace fallback with tests (AC: 6) — RED first
  - [x] Added `AddInfrastructureServices_WithEmptyRedisConnectionString_CacheIsUsable` and `..._WithWhitespaceRedisConnectionString_CacheIsUsable`, both asserting a set/get round-trip, reusing the existing `BuildProvider`
  - [x] RED confirmed by temporarily weakening the guard to `redisConnectionString is not null`: both new tests failed with `System.ArgumentException : is empty (Parameter 'configuration')`; guard restored and re-run green (5/5)
  - [x] The three existing tests are unmodified
- [x] Task 4: Document in CLAUDE.md (AC: 5)
  - [x] Added a "Redis is optional and env-sourced" bullet to the Docker/Production section, ahead of the Migrations bullet
- [x] Task 5: Validate (AC: 7, 8)
  - [x] `dotnet build BE` — 0 Warning(s), 0 Error(s); `dotnet test BE` — 298/298 passed
  - [x] `git diff --stat` confirms the File List and that no production C# file changed

## Dev Notes

### Why `:-` and not a bare substitution

Compose's `${VAR:-default}` applies the default when `VAR` is **unset or empty**; `${VAR-default}` (no colon) applies it only when *unset*, and a bare `${VAR}` expands to an empty string with a warning. The empty case matters here because the API treats an empty connection string as "no Redis" (`IsNullOrWhiteSpace` → `AddDistributedMemoryCache()`), so a bare substitution turns a missing `.env` entry into a silently degraded cache — the `redis` container would still start, still pass its healthcheck, and still be depended on, so nothing visibly breaks. Choose `:-`. `[Source: docker-compose.yml:49-51 uses the `${VAR:-}` form for the optional SMTP credentials — same operator, opposite intent (default to empty).]`

### Current state of each file to touch

- `docker-compose.yml:41` — `ConnectionStrings__Redis: "redis:6379"`, inside `api.environment`. The `redis` service (lines 17-27) and `depends_on: redis: { condition: service_healthy }` (lines 36-37) and the `redisdata` volume (line 82) are all correct and must not change. Note the quoting: sibling substitutions on this block are written unquoted (`${JwtSettings__SecretKey}`); follow that.
- `.env.production.example:16-20` — a four-line comment block describing Redis with **no variable declaration**. Line 19 currently asserts `docker-compose.yml already wires the API to the in-network redis service via ConnectionStrings__Redis=redis:6379`; that sentence becomes stale once the value is env-sourced and must be rewritten, not just appended to.
- `BE/.env.example:1` — `ConnectionStrings__DefaultConnection=...`. No Redis line exists. This file is consumed by DotNetEnv at startup (`Program.cs` walks up for a `.env`), so a variable declared here reaches `GetConnectionString("Redis")` through the standard `Section__Key` → `Section:Key` mapping.
- `CLAUDE.md:78` — the `Config/secrets` bullet in "Docker / Production Deployment". The section's other bullets (Backend image, Frontend image, nginx routing, Migrations, Readiness, Postgres credentials, DataProtection keys, TLS) make no mention of Redis at all, because 10-1 did not update CLAUDE.md.
- `BE/TripPlanner.Tests/RedisCacheRegistrationTests.cs` — has a `BuildProvider(Dictionary<string, string?> overrides)` helper over `AddInMemoryCollection` + `AddInfrastructureServices`, and three tests: absent-key resolves non-null, absent-key round-trips a string, non-empty value resolves non-null. Add to this file; reuse `BuildProvider`.

### The registration guard being pinned

`InfrastructureServicesExtension.AddInfrastructureServices` (around lines 121-137) reads `configuration.GetConnectionString("Redis")` and branches on `!string.IsNullOrWhiteSpace(...)` → `AddStackExchangeRedisCache` else `AddDistributedMemoryCache()`. The `IsNullOrWhiteSpace` (not `IsNullOrEmpty`) is what makes the whitespace-only case safe; AC 6 exists to keep it that way. Do **not** change this method — the test is the deliverable, not a refactor.

Note that `AddStackExchangeRedisCache` does not connect eagerly, so a *wrong-but-non-empty* connection string still registers and resolves fine — which is precisely why the with-Redis test can only assert type, and why 10-1's review flagged the `Assert.NotNull` weakness. That finding belongs to 10-1; resolving it here would blur the two stories' File Lists.

### Testing standards

- xUnit; NSubstitute where mocking is needed (not needed here). Test naming `Method_Scenario_ExpectedResult`. Curly braces on every control-flow statement; **no comments anywhere**. `[Source: CLAUDE.md#Code Style]`
- No running Redis may be required by any test. The empty/whitespace cases exercise the `AddDistributedMemoryCache()` branch, so they are inherently Redis-free. `[Source: 10-1 AC 9]`
- Assert *usability*, not just non-nullness — a set/get round-trip, mirroring the existing `AddInfrastructureServices_WithoutRedisConnectionString_CacheIsUsable`. A `NotNull` assertion alone would pass even if the branch resolved a broken cache.

### Verification limits to state honestly

Docker is not installed in this environment (`docker: command not found`), so `docker compose config` cannot be run to prove the substitution expands as intended — the same limitation 9-1 and 10-1 both recorded. Verify by YAML-parsing the file and by inspection against the documented Compose interpolation rules, and say so explicitly in the Completion Notes rather than implying the compose path was exercised.

### Project Structure Notes

- Ops/config + docs + one test file. No new folders, no new packages, no EF migration, no Application/Domain/API/Infrastructure production change.
- `appsettings.json` deliberately keeps `ConnectionStrings.Redis = ""` — a committed config file is the right place for the safe no-Redis default; the env layer overrides it.

### References

- [Source: _bmad-output/implementation-artifacts/archive/10-1-redis-response-caching.md] — the story that introduced the `redis` service, the conditional registration, and the hard-coded value this story replaces; also the owner of the six open review patches deliberately excluded here.
- [Source: docker-compose.yml:38-51] — the `api.environment` block, including the `${VAR:-}` precedent on the optional SMTP credentials.
- [Source: .env.production.example:16-20] — the comment-only Redis block to replace.
- [Source: BE/.env.example:1] — the `ConnectionStrings__DefaultConnection` line the new Redis line sits beside.
- [Source: BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs:121-137] — the `IsNullOrWhiteSpace` branch AC 6 pins.
- [Source: BE/TripPlanner.Tests/RedisCacheRegistrationTests.cs] — the `BuildProvider` helper and three existing cases to extend.
- [Source: CLAUDE.md#Docker / Production Deployment] — the section to document Redis in (currently silent on it).

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (claude-opus-5[1m])

### Debug Log References

- `git rev-parse HEAD` → `35c7897abffa45e38fa670624cc45a6e00834e0e` (baseline).
- RED probe — guard weakened to `if (redisConnectionString is not null)`, `dotnet test BE --filter "FullyQualifiedName~RedisCacheRegistrationTests"` → **Failed: 2, Passed: 3**. Both new tests threw `System.ArgumentException : is empty (Parameter 'configuration')` from `StackExchange.Redis.ConfigurationOptions.DoParse`, via `RedisCache.SetImplAsync`.
- GREEN — guard restored to `!string.IsNullOrWhiteSpace(...)`, same filter → **Passed: 5, Failed: 0**.
- `npx --yes js-yaml docker-compose.yml` → parses; `services.api.environment.ConnectionStrings__Redis` = `"${ConnectionStrings__Redis:-redis:6379}"`.
- `docker --version` / `docker compose version` → `command not found`.
- `dotnet build BE` → 0 Warning(s), 0 Error(s).
- `dotnet test BE` → Passed: 298, Failed: 0, Skipped: 0 (was 296 in this working tree; +2 new).

### Completion Notes List

- The connection string was **already** read from configuration (`GetConnectionString("Redis")`) — 10-1 got the plumbing right and only the *supply* of the value was hard-coded. So this story changed zero production C#: it is a Compose-substitution change, two env-example declarations, a CLAUDE.md entry, and additive test coverage.
- **Deviation from Dev Notes (quoting).** The Dev Notes said to follow the unquoted `${JwtSettings__SecretKey}` style of the sibling entries. I quoted the value instead: `"${ConnectionStrings__Redis:-redis:6379}"`. Reason — the `:-redis:6379` default embeds colons, and every *other* colon-bearing value on that block (`ConnectionStrings__DefaultConnection`) is quoted for the same reason. Unquoted does parse (a YAML plain scalar only breaks on `": "`, which is absent), and I verified that; quoting simply removes the dependence on that subtlety. Compose interpolates inside double quotes exactly as it does bare — `ConnectionStrings__DefaultConnection` is the in-repo proof. No AC is affected: AC 1/2 constrain the substitution form (`:-`), not the quoting.
- **The `:-` choice earned its AC.** The RED probe showed an empty connection string reaching `AddStackExchangeRedisCache` throws `ArgumentException: is empty` — but that is the *loud* failure. The quiet one is the reason AC 2 exists: with a bare `${ConnectionStrings__Redis}` and no host `.env` entry, Compose expands to empty, the API's `IsNullOrWhiteSpace` guard catches it, and the stack comes up **healthy** on a per-process cache while the `redis` container runs, passes `redis-cli ping`, and is depended on by `api`. Nothing in this repo would have caught that. `:-` makes unset and empty both resolve to `redis:6379`.
- Consequence of `:-` worth knowing: because it defaults on *empty* as well as unset, an operator cannot disable Redis in Compose by blanking the variable in `.env` — that yields `redis:6379`. Disabling requires editing the compose default, or setting the variable to whitespace (which the API's `IsNullOrWhiteSpace` guard treats as "no Redis" — now a tested path). This is the right trade: silent cache downgrade is a worse default than a slightly awkward opt-out. Flagged rather than "fixed", since making it configurable would mean `${VAR-redis:6379}` (no colon), which reintroduces exactly the silent-empty hazard AC 2 rules out.
- The two new tests assert a **set/get round-trip**, not `NotNull`. A `NotNull` assertion would pass even with the weakened guard right up until the first cache write — the RED run proves it: the failure surfaced inside `SetStringAsync`, not at resolve. (This is the same weakness 10-1's review flagged in `..._WithRedisConnectionString_ResolvesDistributedCache`; that test is 10-1's to fix and was deliberately left alone here.)
- `appsettings.json` intentionally still carries `ConnectionStrings.Redis = ""`. A committed config file should default to no-Redis; the env layer overrides it. Left untouched per the story's out-of-scope list.
- CLAUDE.md had no mention of the `redis` service at all — 10-1 shipped without documenting it. The new bullet covers the service, the variable, the Compose default, and the empty-value fallback, so the gap is closed as part of this story rather than left dangling.
- **Not verified live.** Docker is not installed in this environment (same limitation 9-1 and 10-1 both recorded), so `docker compose config` could not be run and the substitution was **not** observed expanding for real. What was verified: the file parses as YAML, the value is the intended literal, and the form matches the documented Compose interpolation rules and the in-file `${VAR:-}` precedent. A `docker compose config` on a machine with Docker — once with `ConnectionStrings__Redis` unset, once with it set — is the recommended check at review.
- All six open `[Review][Patch]` findings on 10-1 were left untouched, including the `--maxmemory` ceiling on the same compose file and the `Assert.NotNull` weakness in the same test file. Both were tempting one-line additions here; folding them in would have blurred the two stories' File Lists and let 10-1 close without its review being addressed on its own terms.

### File List

- `docker-compose.yml` (modified — `api.environment.ConnectionStrings__Redis` is now the `${...:-redis:6379}` substitution)
- `.env.production.example` (modified — comment-only Redis block replaced with a documented `ConnectionStrings__Redis=redis:6379` declaration)
- `BE/.env.example` (modified — documented blank `ConnectionStrings__Redis=` added beside the DB connection string)
- `CLAUDE.md` (modified — new "Redis is optional and env-sourced" bullet in Docker / Production Deployment)
- `BE/TripPlanner.Tests/RedisCacheRegistrationTests.cs` (modified — +2 additive tests for the empty and whitespace-only connection string)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story registered and status tracked)

## Change Log

- 2026-07-25: Story implemented — all 5 tasks done. Compose now reads `ConnectionStrings__Redis: "${ConnectionStrings__Redis:-redis:6379}"` (quoted, deviating from the Dev Notes' unquoted-sibling guidance because the default embeds colons — see Completion Notes); `.env.production.example` and `BE/.env.example` both declare the variable with documentation of the empty-value in-process fallback; CLAUDE.md documents the `redis` service and the variable for the first time. Zero production C# changed — 10-1 already read the value from configuration. The newly-reachable empty/whitespace configuration is pinned by 2 additive tests, RED-verified against a weakened guard (`ArgumentException: is empty`). BE 298/298, build 0 warnings / 0 errors. Live `docker compose config` deferred — Docker is not installed here. Moved to review.
- 2026-07-25: Story drafted — env-source the Redis connection string. 10-1 shipped it hard-coded at `docker-compose.yml:41` while every sibling setting is a `${...}` substitution, `.env.production.example` declares no Redis variable, and `BE/.env.example` omits Redis entirely. Compose gains `${ConnectionStrings__Redis:-redis:6379}`, both env examples gain documented variables, CLAUDE.md gains the Redis wiring it never received, and the newly-reachable empty-string configuration is pinned by tests. Ops/config/docs + one test file; no production code change.
