---
baseline_commit: 1bbb89f1298f0c6cf2edb46800b161052978e812
---

# Story 6.5: Source destination opening hours from OpenStreetMap

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a destination's opening hours on its details page when that data exists,
so that I can plan the right day and time to visit (Feature 2 / US4, requirement source `requirement/Sheet1.html`, Selected = Yes).

## Context & Justification

This story closes the single outstanding gap in **Feature 2 (Destination Details / epic-2)**, confirmed by a fresh audit of the current tree (2026-07-24) and consistent with the earlier `6-1-backend-requirements-verification` finding #4.

Everything else in Feature 2 is implemented and tested — US1 (name, category, description, images, address, website, coordinates, add-to-trip gating, error semantics), US2 (photos list + placeholder), and the frontend "Opening hours: Not available" fallback that already satisfies **US4 AC2**. The one remaining defect:

- `DestinationDetailsResponse.OpeningHours` is a **dead field**: `OpenTripMapDestinationDetailsService` never assigns it, and `OpenTripMapPlaceModel` has no source property for opening hours. OpenTripMap's `/places/xid/{xid}` response carries no hours data, and the Foursquare integration hinted at in the requirement sheet was never built. So `OpeningHours` is *always* `null` — **US4 AC1 ("View opening hours when available") can never be satisfied**, and a test (`GetDestinationDetailsUseCaseTests.cs:64`) even codifies the always-null expectation.
- Knock-on: add-to-trip xid-import (`DestinationResolver.cs:55`) therefore imports every `Landmark` with `OpeningHours = string.Empty`.

**Resolution chosen:** integrate a real opening-hours source. Because OpenTripMap `xid` values are OSM-derived (e.g. `N191031796` = OSM node `191031796`; `W…`/`R…` = way/relation), the raw OSM `opening_hours` tag can be fetched from the **OpenStreetMap Overpass API** — a keyless HTTP source, mirroring the existing keyless providers (`WikipediaImageProvider`, `PhotonGeocodingService`). The FE's `parseOpenNow` already parses the OSM `opening_hours` grammar (`Mo-Fr 09:00-17:00`, `Mo-Su …`, `Daily …`, `24/7`), so passing the raw tag through as a string needs **no format conversion** and finally makes the already-coded "Open now / Closed" badge functional.

> **Alternative (documented, not chosen):** formally descope US4 and remove the dead `OpeningHours` field + its FE row. See Open Questions — the user asked to "implement or fix," so this story implements; if the team prefers descope-with-sign-off instead, that is a smaller, separate change.

## Acceptance Criteria

1. When the OSM object underlying a destination has an `opening_hours` tag, `GET /api/locations/{xid}/details` returns that value in `DestinationDetailsResponse.OpeningHours` (non-null), as the **raw OSM string** (e.g. `Mo-Fr 09:00-17:00`, `24/7`). (F2-US4 AC1, F2-US1 AC5)
2. When opening hours are unavailable — no OSM element for the xid, element has no `opening_hours` tag, xid is not an OSM-form id, or the source call fails/times out — `OpeningHours` is `null` and the details view still returns `200` with all other fields intact (existing behavior preserved; the FE renders its "Not available" fallback per F2-US4 AC2). (F2-US4 AC2, F2-US1 BR "detail still opens when fields missing")
3. An Overpass failure, timeout, non-2xx, or malformed response is swallowed and degrades to `null` opening hours — it must **never** turn the details endpoint into a 5xx (mirror the `WikipediaImageProvider` graceful-degradation contract).
4. Add-to-trip xid-import persists the sourced opening hours on the imported `Landmark` (via `DestinationResolver`) instead of empty string, so a scheduled landmark reflects the same hours shown on its details page.
5. Opening-hours lookups are cached to respect Overpass usage limits (reuse the existing cache seam used by `OpenTripMapPlaceClient`; do not add a second caching mechanism).
6. No regression: all existing BE tests pass (update only the tests whose premise genuinely changes), `dotnet build BE` clean, and the anonymous/auth posture of the details and add-to-trip routes is unchanged.

## Tasks / Subtasks

- [x] **Task 1 — Application port** (AC: 1, 2, 3)
  - [x] Added `IOpeningHoursProvider` + `OpeningHoursContext` in `BE/TripPlanner.Application/Interfaces/Services/IOpeningHoursProvider.cs`, mirroring `IDestinationImageProvider`.
- [x] **Task 2 — Infrastructure adapter (Overpass)** (AC: 1, 2, 3, 5)
  - [x] Added `OverpassOpeningHoursProvider : IOpeningHoursProvider` under `BE/TripPlanner.Infrastructure/ExternalServices/Overpass/`, injecting `HttpClient`, `IOptions<OverpassSettings>`, `IResponseCache`.
  - [x] `ParseElement` accepts `^[NWRnwr]\d+$` and maps `N`→`node`, `W`→`way`, `R`→`rel`; non-OSM xids return `null` with no HTTP call.
  - [x] POSTs `[out:json];<element>(<id>);out tags;` as form field `data` to `interpreter`; reads `elements[0].tags["opening_hours"]`, trimmed, else `null`.
  - [x] Fetch wrapped in `catch (… is HttpRequestException or TaskCanceledException or JsonException) { return null; }`; non-success status also returns `null`.
- [x] **Task 3 — Wire into details mapping** (AC: 1, 2)
  - [x] `OpenTripMapDestinationDetailsService` now injects `IOpeningHoursProvider`, calls it with `place.Xid`, and sets `OpeningHours = NormalizeOptional(openingHours)` in the response initializer.
- [x] **Task 4 — Config + DI** (AC: 5, 6)
  - [x] Added `OverpassSettings` (`BaseUrl`, `TimeoutMilliseconds`, `CacheMinutes`); bound + `ValidateOnStart()` and `AddHttpClient<IOpeningHoursProvider, OverpassOpeningHoursProvider>(ConfigureOverpassClient)` with a `TripPlanner/1.0` User-Agent in `InfrastructureServicesExtension`.
  - [x] Added the `OverpassSettings` section to `appsettings.json` and documented it in `BE/.env.example`.
- [x] **Task 5 — Cache the lookup** (AC: 5)
  - [x] Routed through the existing `IResponseCache` seam, keyed `osm:hours:{xid}`, TTL from `CacheMinutes` (default 1440). Both hits and misses (a `null` value) are cached via an `OpeningHoursCacheEntry` wrapper so hours-less places aren't re-queried. No new caching stack.
- [x] **Task 6 — Fix the import knock-on** (AC: 4)
  - [x] `DestinationResolver.cs:55` needed no change — Task 3 populates `details.OpeningHours`; added an assertion in the xid-import Landmark test proving the imported `Landmark.OpeningHours` equals the sourced value.
- [x] **Task 7 — Tests** (AC: 1, 2, 3, 4, 6)
  - [x] New `OverpassOpeningHoursProviderTests` (9 cases): node/way/rel success + query-body assertions; empty `elements` → `null`; no `opening_hours` tag → `null`; non-OSM xid → `null` with `CallCount == 0`; `HttpRequestException` → `null`; non-success status → `null`; malformed JSON → `null`.
  - [x] Extended `OpenTripMapDestinationDetailsServiceTests`: hours populated when provider returns them; `null` when it returns `null` (constructor updated for the new dependency).
  - [x] `GetDestinationDetailsUseCaseTests` sparse-data null case still valid (unchanged); the populated-hours path is covered at the details-service level above.
  - [x] Extended the `TripDayServiceTests` xid-import Landmark path to assert `landmark.OpeningHours == "9am-11pm"` (AC #4).

## Dev Notes

### Current behavior being changed (read these files first)

- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs` — the `DestinationDetailsResponse` initializer at `:23-35` sets every field **except** `OpeningHours`. This is the single edit point for AC #1/#2. Preserve the existing null-tolerant helpers (`NormalizeOptional`, `ComposeAddress`, `PrimaryKind`, `ParseRating`) and the `place is null || blank xid || blank name → return null` guard at `:12-16`.
- `BE/TripPlanner.Application/DTOs/Responses/DestinationDetailsResponse.cs` — `string? OpeningHours` already exists (`:12`); no DTO change required.
- `BE/TripPlanner.Application/Services/DestinationResolver.cs:55` — already reads `details.OpeningHours ?? string.Empty` when importing a `Landmark`; once Task 3 populates the field this path fixes itself, but it must be covered by a test (AC #4). Note `Landmark.OpeningHours` is a **non-nullable** domain string defaulting to empty, while the DTO treats hours as nullable-optional — keep the `?? string.Empty` coalescing at the domain boundary (do not change the domain contract in this story).
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapModels.cs` — `OpenTripMapPlaceModel` has no hours field; we intentionally do **not** add one (OpenTripMap doesn't provide it). Hours come from the new Overpass provider, not from parsing the OTM payload.

### Pattern to mirror (do not reinvent)

- **Keyless external provider behind an Application port:** `IDestinationImageProvider` (`Application/Interfaces/Services/IDestinationImageProvider.cs`) + `WikipediaImageProvider` (`Infrastructure/ExternalServices/Wikipedia/WikipediaImageProvider.cs`) is the exact template — a small port with a context record, an Infrastructure adapter that swallows `HttpRequestException`/`TaskCanceledException`/`JsonException` into `null`, and a single `AddHttpClient<TInterface, TImpl>(ConfigureClient)` registration.
- **Settings + validated options:** copy `PhotonSettings`/`WikipediaSettings` (`Infrastructure/Settings/`) and their `AddOptions<T>().Bind(...).Validate(...).ValidateOnStart()` block in `InfrastructureServicesExtension.cs:102-112`.
- **User-Agent header:** `ConfigureWikipediaClient`/`ConfigurePhotonClient` (`InfrastructureServicesExtension.cs:150-164`) add `ProductInfoHeaderValue("TripPlanner", "1.0")`. Overpass requires this too — a UA-less request is the same 403/blocked failure mode fixed in story 8-3 for Wikimedia.
- **Caching seam:** `OpenTripMapPlaceClient` already composes an `HttpClient` + cache (24h TTL, non-null-only, keyed `otm:place:{xid}`). Reuse that seam/convention for `osm:hours:{xid}` rather than adding a new one (relates to the deferred "cache stampede" / "cache-schema version" notes — do not regress those, but they are out of scope here).

### OSM / Overpass specifics

- OpenTripMap `xid` prefix → OSM element type: `N` = node, `W` = way, `R` = relation. The numeric remainder is the OSM id. The audited manual probe used `N191031796`. Validate strictly with `^[NWR]\d+$` (case-insensitive) and short-circuit to `null` for anything else (Wikidata `Q…` ids, etc.) so a non-OSM xid costs no HTTP round-trip.
- Overpass QL for a single element's tags: `[out:json];node(191031796);out tags;` (swap `node`→`way`/`rel`). POST body form-encoded as `data=<query>` to `.../api/interpreter`. Response shape: `{ "elements": [ { "tags": { "opening_hours": "Mo-Fr 09:00-17:00", ... } } ] }`.
- Expected data availability: like opening hours generally, most OSM objects will **not** carry the tag — `null` (→ FE "Not available") remains the common case, exactly as with the sparse-provider caveat documented in `epic/epic-2-destination-details.md`. This is expected, not a defect; AC #2 is the primary observable behavior and AC #1 fires only when the tag exists.

### Frontend — no change required

- The details view already renders an "Opening hours" `InfoRow` with a fallback, plus an `OpenNowBadge` driven by `parseOpenNow` (`FE/src/features/destinations/DestinationDetailsPage.tsx:190-194`, `openNow.ts`). `parseOpenNow` already handles `Daily`, `Mo-Su`, `Mo-Fr`, bare `HH:MM-HH:MM`, and `24/7` (see `openNow.test.ts`). Passing the raw OSM string through therefore needs no FE work and makes the badge functional. The TS `DestinationDetails` type already has `openingHours: string | null` (`FE/src/shared/api/types.ts:42`).
- US4 AC2 phrasing note (out of scope, informational): the FE shows the label "Opening hours" with value "Not available" rather than the literal string "Opening hours not available". The audit rated this as satisfying-the-intent; no change is requested here. If strict phrasing is ever required, that is a trivial FE-only follow-up.

### Testing standards

- xUnit + NSubstitute, per `BE/TripPlanner.Tests` conventions. Mock the `HttpClient` via a fake `HttpMessageHandler` (see existing `OpenTripMapPlaceClientTests` / `WikipediaImageProvider`-style tests) — do **not** hit the live Overpass API in tests.
- Run `dotnet test BE` (all green) and `dotnet build BE` before marking review. The details use case, resolver, and new provider are all unit-testable; there are no endpoint/integration tests by repo convention.

### Project Structure Notes

- New files: `Application/Interfaces/Services/IOpeningHoursProvider.cs`, `Infrastructure/ExternalServices/Overpass/OverpassOpeningHoursProvider.cs`, `Infrastructure/Settings/OverpassSettings.cs`, `Tests/OverpassOpeningHoursProviderTests.cs`.
- Modified: `OpenTripMapDestinationDetailsService.cs`, `InfrastructureServicesExtension.cs`, `appsettings.json`, `BE/.env.example`, and the three test files noted in Task 7.
- Clean Architecture direction preserved: the port lives in Application, the Overpass adapter in Infrastructure; Application/Domain gain no new framework dependency. Follows CLAUDE.md's "External services" and "provider-swap seam" conventions.
- **Code style (CLAUDE.md):** braces required on every control-flow statement; **no comments** of any kind in the code.

### References

- Requirement source: `requirement/Sheet1.html` — Feature 2, US4 "View opening hours when available" (Selected = Yes) and US1 AC5.
- Epic: `epic/epic-2-destination-details.md` (US4 originally deferred as "redundant"; this story implements it against the selected requirement).
- Prior audit: `_bmad-output/implementation-artifacts/backend-requirements-verification-report.md#Feature-2` (F2-US4 AC1 FAIL, F2-US1 AC5 PARTIAL) and finding #4 in its recommendations table; `6-1-backend-requirements-verification.md`.
- Sibling audit-fix precedent: `6-3-fix-xid-import-destination-mapping` (same epic-6 quality-fix pattern; also touches `DestinationResolver` import fidelity).
- Provider pattern: `IDestinationImageProvider` + `WikipediaImageProvider`; DI in `InfrastructureServicesExtension.cs:135,150-156`.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- `dotnet build BE` — initially failed with CS0246 (missing `using TripPlanner.Infrastructure.ExternalServices.Overpass` in `InfrastructureServicesExtension.cs`); added the using, rebuild clean (0 warnings, 0 errors).
- `dotnet test BE` — **291/291 passing**, 0 skipped (+11 net new tests vs. the prior 280).

### Completion Notes List

- Closed the sole Feature 2 gap (F2-US4 AC1 / F2-US1 AC5): `DestinationDetailsResponse.OpeningHours` is now sourced from real data instead of always `null`.
- Source is the keyless OpenStreetMap **Overpass API** — OpenTripMap xids are OSM ids (`N`/`W`/`R` prefix → node/way/rel), so the raw OSM `opening_hours` tag is fetched by id. Chosen to match the existing keyless-provider pattern (Photon/Wikipedia) and avoid a new secret.
- Raw OSM `opening_hours` strings are passed through unchanged; the FE's existing `parseOpenNow`/`OpenNowBadge` already parse that grammar, so the "Open now / Closed" badge becomes functional with **zero frontend changes**.
- Graceful degradation (AC #3): any Overpass failure/timeout/non-2xx/malformed response, or a non-OSM xid, yields `null` hours and the details endpoint still returns `200` — mirrors the `WikipediaImageProvider` contract.
- Cached through the existing `IResponseCache` seam (`osm:hours:{xid}`), caching both found and not-found results (via `OpeningHoursCacheEntry`) so hours-less places don't repeatedly hit the rate-limited Overpass service.
- Import knock-on (AC #4): xid-imported `Landmark`s now carry the sourced hours; `DestinationResolver` required no change (already read `details.OpeningHours`), now covered by a test.
- No frontend changes were needed or made (US4 AC2 fallback + `openingHours` type + `parseOpenNow` already shipped). `dotnet test BE` is the safety net; FE untouched.
- Code style: braces on all control flow, no comments in code (config-file comments in `.env.example` only).

### File List

- `BE/TripPlanner.Application/Interfaces/Services/IOpeningHoursProvider.cs` (new)
- `BE/TripPlanner.Infrastructure/ExternalServices/Overpass/OverpassOpeningHoursProvider.cs` (new)
- `BE/TripPlanner.Infrastructure/Settings/OverpassSettings.cs` (new)
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs` (modified — inject provider, set `OpeningHours`)
- `BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs` (modified — settings bind, HttpClient registration, `ConfigureOverpassClient`, using)
- `BE/TripPlanner.API/appsettings.json` (modified — `OverpassSettings` section)
- `BE/.env.example` (modified — `OverpassSettings__*` documented)
- `BE/TripPlanner.Tests/OverpassOpeningHoursProviderTests.cs` (new — 9 tests)
- `BE/TripPlanner.Tests/OpenTripMapDestinationDetailsServiceTests.cs` (modified — constructor + 2 hours tests)
- `BE/TripPlanner.Tests/TripDayServiceTests.cs` (modified — import Landmark hours assertion)
- `_bmad-output/implementation-artifacts/6-5-destination-opening-hours-source.md` (this story)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status tracking)

## Change Log

- 2026-07-24: Story created from the Feature 2 audit (F2-US4 opening hours gap).
- 2026-07-24: Implemented all 7 tasks — new `IOpeningHoursProvider` port + keyless Overpass adapter (OSM `opening_hours` by xid), wired into details mapping and the xid-import path, cached via `IResponseCache`, config/DI added. BE 291/291 (+11), build clean. Status → review.

## Open Questions (for the user — non-blocking)

1. **Implement vs. descope:** this story integrates OpenStreetMap Overpass to make US4 real (per your "implement or fix" directive). The documented alternative is to formally descope US4 (Low priority) and delete the dead `OpeningHours` field + FE row. If you prefer descope-with-sign-off, say so and this story can be swapped for a much smaller removal.
2. **Data source:** Overpass (`overpass-api.de`) was chosen because it is keyless and OTM xids are OSM ids, matching the existing Photon/Wikipedia keyless-provider pattern. If you'd rather use a keyed source with richer coverage (e.g. Foursquare Places, as the requirement sheet hints), that changes config/DI and adds a secret — flag it and the adapter can target that instead.
