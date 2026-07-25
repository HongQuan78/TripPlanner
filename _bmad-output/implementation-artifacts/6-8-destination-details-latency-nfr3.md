---
baseline_commit: 1bbb89f1298f0c6cf2edb46800b161052978e812
---

# Story 6-8: Destination Details — Cold-Open Latency ≤ 2s (NFR3)

Status: review

## Story

As a **user opening a destination's detail view**,
I want the details to appear **within 2 seconds even on a cold cache**,
so that **the experience meets the performance requirement** (Feature 2 · NFR3).

This addresses the latency watch-item raised by story `6-6-feature-2-requirements-verification` (Finding #5): on an uncached open, the details service makes up to **three upstream calls in sequence**, which can approach the NFR3 budget.

> **Root cause (from 6-6):** `OpenTripMapDestinationDetailsService.GetDetailsAsync` (`OpenTripMapDestinationDetailsService.cs:11-42`) runs, in order: (1) `placeClient.GetPlaceAsync` (cached `otm:place:{xid}`), then (2) `imageProvider.GetImageUrlAsync` (Wikipedia REST — **not cached**), then (3) `openingHoursProvider.GetOpeningHoursAsync` (Overpass — cached `osm:hours:{xid}`). Steps 2 and 3 both depend only on the resolved `place` and are independent of each other, yet run sequentially. The image leg is the only uncached upstream call.

## Acceptance Criteria

1. Once `place` is resolved, the **image fetch and the opening-hours fetch run concurrently** (not sequentially), so cold-open wall time ≈ `place + max(image, hours)` instead of `place + image + hours`.
2. The **image provider result is cached** (via the existing `IResponseCache` seam) so a repeat open of the same destination does not re-hit Wikipedia; cache both found and not-found outcomes (mirroring `OverpassOpeningHoursProvider`).
3. The composed `DestinationDetailsResponse` is **byte-for-byte equivalent** to today's output for the same inputs — no field, ordering, or null-semantics change.
4. **Graceful degradation preserved**: if either the image or hours fetch fails, the other still populates and the endpoint returns `200` (unchanged from current behavior).
5. NFR3 target documented: on a warm cache the details compose from cache hits only; on a cold cache the upstream calls are parallelized. Record the before/after call-chain shape in the Dev Agent Record.
6. Tests cover: both providers invoked and composed correctly; concurrency (both awaited, neither serialized behind the other); image cache hit path; and each provider failing independently → graceful result.

## Tasks / Subtasks

- [x] **Task 1: Parallelize the independent fetches** (AC: 1, 3, 4)
  - [x] In `OpenTripMapDestinationDetailsService.GetDetailsAsync`, after `place` resolves, start the image task and the opening-hours task, then `await Task.WhenAll(...)` (or await both after starting) instead of awaiting them one at a time.
  - [x] Preserve the exact composition order and null-normalization (`NormalizeOptional`, `ImageUrls` shape) so the response is unchanged.
  - [x] Keep each provider's own try/catch → null/empty degradation intact; ensure one task faulting does not cancel the other unexpectedly (handle within providers, which already swallow their own exceptions).
- [x] **Task 2: Cache the image lookup** (AC: 2, 4)
  - [x] Add caching to the image path so repeat opens skip Wikipedia. Preferred: introduce a small cache inside `WikipediaImageProvider` (inject `IResponseCache`) keyed on the resolved title/wikidata id (e.g. `wiki:image:{key}`), caching found + not-found with a TTL from settings (default 1440 min, mirroring `OverpassOpeningHoursProvider`/`OpenTripMapPlaceClient`).
  - [x] Write FAILING tests first: second call for the same context returns the cached URL without a second HTTP call.
- [x] **Task 3: Concurrency + degradation tests** (AC: 4, 6)
  - [x] In `OpenTripMapDestinationDetailsServiceTests.cs`, add a test using delayed provider substitutes proving image + hours run concurrently (e.g. both started before either completes) rather than serially.
  - [x] Add/confirm tests: image throws → hours still populates and vice versa; response fields unchanged for the happy path.
- [x] **Task 4: Coordinate with story 8-5** (AC: 1, 3)
  - [x] If `8-5-destination-details-multiple-images` (list-returning `GetImageUrlsAsync` + `page/media-list`) lands first, parallelize/cache the **list** call instead of the single-image call; the parallelization structure is identical. Note whichever order is chosen in the Dev Agent Record.
- [x] **Task 5: Validation** (AC: all)
  - [x] Run full BE suite green; build clean (0 warnings). Optionally capture a rough cold vs warm timing note in the Debug Log.

## Dev Notes

- **Backend-only; no contract change.** `GET /api/locations/{xid}/details`, the DTO, and the FE are untouched — this is an internal fetch-orchestration + caching optimization. AC3 is the guardrail: identical output.
- **Why parallel is safe:** the image context (`Name`, `WikipediaUrl`/`Wikidata`) and the opening-hours context (`Xid`) are both derived from the already-fetched `place`; neither depends on the other's result. They are pure reads against different hosts (Wikipedia/Commons vs Overpass).
- **Caching gap:** `place` and `hours` are already cached; the **image leg is the only uncached upstream** on a warm-ish cache, so caching it is the highest-value single change for repeat opens. Reuse the existing `IResponseCache` (Redis) abstraction and the found+not-found caching convention already established in `OverpassOpeningHoursProvider.cs:27-39` and `OpenTripMapPlaceClient.cs:20-32`.
- **NFR3 semantics:** `requirement/Sheet1.html` NFR3 — "Destination details popup must be displayed within ≤ 2 seconds after the user opens the detail popup." The cache seam already exists from `6-4-attraction-detail-caching` / `10-1-redis-response-caching`; this story extends it to the image leg and removes the sequential penalty.
- **Do not** introduce a second-level "whole response" cache that could mask per-leg TTLs — caching each upstream leg (place/hours/image) keeps invalidation semantics consistent with the rest of the codebase. If a composed-response cache is later desired, that is a separate decision.
- **Ordering with 8-5:** these two stories both edit the image path in `OpenTripMapDestinationDetailsService` / the Wikipedia provider. Whichever is implemented second should rebase onto the other; the parallelization and caching apply equally to the single-URL and list-returning image methods. Flag the merge order at dev time.
- **Code style:** curly braces required on all control flow; no comments (CLAUDE.md).

### Project Structure Notes

- Touch points: `Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs` (parallelize), `Infrastructure/ExternalServices/Wikipedia/WikipediaImageProvider.cs` (+ `IResponseCache`), `Infrastructure/Settings/WikipediaSettings.cs` (cache TTL), tests `OpenTripMapDestinationDetailsServiceTests.cs`, `WikipediaImageProviderTests.cs`, `WikipediaSettingsValidationTests.cs`.
- Unchanged: Application DTO/use case, API endpoint, all FE code, attraction-list path (its single-image call also benefits from the new image cache but its behavior is unchanged).

### References

- Gap origin: `6-6-feature-2-requirements-verification.md` — Finding #5 (NFR3 cold-cache latency risk).
- Requirement: `requirement/Sheet1.html` NFR3.
- Related: `6-4-attraction-detail-caching`, `10-1-redis-response-caching` (existing cache seam), `8-5-destination-details-multiple-images` (coordinated image-path change), `6-5-destination-opening-hours-source` (the Overpass leg).

## Dev Agent Record

### Implementation Plan

- **Task 1 (parallelize):** In `OpenTripMapDestinationDetailsService.GetDetailsAsync`, after `place` resolves, start the image and opening-hours tasks (hot) before awaiting either, then await each. Composition order and null-normalization are untouched, so the DTO is unchanged (AC3).
- **Task 2 (cache image):** Move the cache seam into `WikipediaImageProvider` (mirrors `OverpassOpeningHoursProvider`): inject `IResponseCache` + `IOptions<WikipediaSettings>`, key on `wiki:image:{wikipediaUrl}|{wikidataId}`, cache found **and** not-found for `WikipediaSettings.CacheMinutes` (default 1440). The provider became `internal` (was `public`) to accept the `internal` `IResponseCache` dependency — consistent with the other external clients; only DI + `TripPlanner.Tests` (via `InternalsVisibleTo`) reference the concrete type.
- **Task 4 (8-5 coordination):** `8-5-destination-details-multiple-images` was still `ready-for-dev` at dev time, so I parallelized/cached the **single-image** `GetImageUrlAsync` call. When 8-5 lands it should rebase its list-returning `GetImageUrlsAsync`/`page/media-list` onto this structure — the parallelization in the details service and the cache wrapper in the provider apply identically to the list method (swap the cached value type `ImageCacheEntry.Value` from `string?` to a list).

### Completion Notes

- **AC1** — image + hours now run concurrently: both tasks are started before either is awaited (`GetDetailsAsync`), so cold-open wall time ≈ `place + max(image, hours)`. Proven by `GetDetailsAsync_ImageAndHours_RunConcurrently` (each substitute blocks until the other has started; a serial implementation would deadlock — the 5s guard asserts it does not).
- **AC2** — image result cached via the existing `IResponseCache` seam inside `WikipediaImageProvider`; both found and not-found are cached. Proven by `GetImageUrlAsync_SecondCallSameContext_...` and `GetImageUrlAsync_SecondCallAfterNotFound_...` (second call makes no second HTTP request).
- **AC3** — `DestinationDetailsResponse` composition order, `ImageUrls` shape, and `NormalizeOptional` semantics are unchanged; all four pre-existing details-service tests still pass byte-for-byte.
- **AC4** — graceful degradation preserved and hardened: providers still swallow their own transport exceptions, and the details service now awaits each leg through `AwaitOrNullAsync`, so a faulting leg degrades to null/empty while the other still populates and the endpoint returns 200. Proven by `GetDetailsAsync_ImageProviderFaults_...` and `GetDetailsAsync_OpeningHoursProviderFaults_...`.
- **AC5 (NFR3 call-chain shape):**
  - **Before:** `place` → `image` (uncached Wikipedia) → `hours` (Overpass) — three upstream calls fully sequential; only `place`/`hours` cached.
  - **After (cold):** `place` → `{ image ∥ hours }` in parallel; wall time ≈ `place + max(image, hours)`.
  - **After (warm):** all three legs (`place`/`image`/`hours`) served from Redis — no upstream calls. The image leg was the last uncached upstream; it is now cached, so a repeat open composes entirely from cache hits.
- **AC6** — tests cover: both providers invoked & composed (pre-existing), concurrency (neither serialized), image cache-hit path (found + not-found), and each provider failing independently → graceful result.

### Debug Log

- Full BE suite: **296 passed, 0 failed**. Build: **0 warnings, 0 errors**.
- Initial NSubstitute `Returns` calls on the nullable `Task<string?>` member emitted CS8620; resolved by returning through `Func<CallInfo, Task<string?>>` / casting the async-lambda result to `string?` so the generic infers `Task<string?>` cleanly.

## File List

- BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs (modified — parallelize legs, add `AwaitOrNullAsync`)
- BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/WikipediaImageProvider.cs (modified — `internal`, inject `IResponseCache`/`IOptions<WikipediaSettings>`, cache found+not-found, add `ImageCacheEntry`)
- BE/TripPlanner.Infrastructure/Settings/WikipediaSettings.cs (modified — add `CacheMinutes`, default 1440)
- BE/TripPlanner.Tests/OpenTripMapDestinationDetailsServiceTests.cs (modified — concurrency + independent-fault degradation tests)
- BE/TripPlanner.Tests/WikipediaImageProviderTests.cs (modified — new provider ctor in helper; image cache found/not-found tests)
- _bmad-output/implementation-artifacts/6-8-destination-details-latency-nfr3.md (modified — frontmatter, tasks, Dev Agent Record, status)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified — 6-8 → in-progress → review)

## Change Log

- 2026-07-24: Story drafted from `6-6` Finding #5 (NFR3 cold-open latency). Status: ready-for-dev.
- 2026-07-25: Implemented parallel image/hours fetch + Wikipedia image caching (found+not-found) behind `IResponseCache`; per-leg fault isolation via `AwaitOrNullAsync`. 296 tests pass, build clean. Status: review.
