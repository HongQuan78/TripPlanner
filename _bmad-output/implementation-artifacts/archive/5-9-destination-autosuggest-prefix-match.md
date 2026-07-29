---
baseline_commit: a8ccd6413b7838c7be1b63966f394df500ec2aeb
---

# Story 5.9: Destination auto-suggest prefix match

Status: done

## Story

As a user searching for a destination,
I want typing a name prefix (e.g. "Ho") to show all the distinct places it could mean (Hoi An, Ho Chi Minh City, Hong Kong, Honolulu, ...),
so that I can find the specific place I mean instead of being shown one arbitrary guess.

Origin: user report on 2026-07-13 — "when I type 'Ho' it cannot list all destination started with 'Ho'". Root-caused (not guessed) during story creation: `GET /api/locations/search` is fully implemented end-to-end (story 5-7) and the frontend already renders up to 5 suggestions from an array — but the backend's `IGeocodingService` is backed by OpenTripMap's `/geoname` endpoint, which is a single-best-match geocoder by design, not a multi-result autosuggest API. `OpenTripMapGeocodingService.SearchAsync` deserializes the response as **one object** and always returns a 1-element list, so no amount of frontend or dedup/cap logic can surface more than one match. This story replaces the geocoding provider behind the existing seam with one that natively returns multiple ranked prefix matches.

## Acceptance Criteria

1. Typing a 2+ character trimmed prefix (existing gate from story 5-7, unchanged) that matches several distinct places (e.g. "Ho") returns up to 5 distinct classified results via `GET /api/locations/search?query=`, not just one.
2. The `IGeocodingService` interface, `ISearchLocationsUseCase`, `LocationSearchResultResponse` contract, and all frontend code (hooks, `SuggestionDropdown`, `SearchPage`) are unchanged — they already handle arrays of results. Only the `IGeocodingService` implementation and its DI registration change.
3. City vs. Country classification (`SearchLocationsUseCase.Classify`) keeps working unmodified: every result's `CountryCode` must be the ISO 3166-1 alpha-2 code (e.g. "VN", "GB"), not a full country name — this is what `CountryNameHelper` and `Classify` compare against. If the new provider only returns a full country name, the service must convert it to an ISO-2 code before assigning `CountryCode` (see Dev Notes — provider response shape must be verified, not assumed).
4. `SearchLocationsUseCase`'s existing dedup-by-(name, countryCode) and cap-at-5 logic (`SearchLocations_DuplicateAndExcessResults_DeduplicatesAndCapsAtFive` in `LocationServiceTests.cs`) is exercised for the first time against a realistic multi-result payload shape from the new provider (previously only ever tested with a hand-built mock list, since the real service could never produce >1 result).
5. Provider failures (HTTP error status, timeout, malformed JSON, network error) still surface as `ErrorType.ServiceUnavailable` / "Location search is currently unavailable." — the existing `SearchLocationsUseCase` failure mapping is unchanged and must keep passing for the new provider's exceptions.
6. The new provider requires **no API key** and no new required secret in `.env`/`.env.example` (same "free, keyless" pattern as `IWikipediaImageService` from story 8-1) — only a `BaseUrl`/`TimeoutMilliseconds`-style settings section following the existing `WikipediaSettings`/`OpenTripMapSettings` convention.
7. `OpenTripMapGeocodingService` and `OpenTripMapGeonameModel` are deleted (not left dead/unused) once replaced — `OpenTripMapAttractionSearchService` and `OpenTripMapDestinationDetailsService` are untouched and keep using OpenTripMap for attraction search and destination details.
8. Unit tests cover: the new provider's HTTP parsing (multiple results, empty results, non-2xx/timeout/malformed response → empty list or thrown exception consistent with existing `OpenTripMapGeocodingService` conventions), and a `SearchLocationsUseCase` test proving a multi-result "Ho"-style payload yields >1 distinct classified result.
9. `dotnet test BE` full suite green (no regressions), `dotnet build BE` succeeds. No frontend changes are required; manually verify via `npm run dev` that typing "Ho" now shows multiple distinct suggestions in the dropdown.

## Tasks / Subtasks

- [x] Task 1: Verify provider response shape before writing code (AC: 1, 3, 6)
  - [x] Manually call the chosen provider's public endpoint (e.g. `GET https://photon.komoot.io/api/?q=Ho&limit=5`) and record the actual JSON shape in Dev Agent Record → Debug Log: does each result include a directly-usable ISO-2 country code, or only a full country name (`properties.country`)? What field indicates place type (city/town/village vs. country) — needed to keep `Classify` working correctly for country-type results?
  - [x] Confirm no API key / auth header is required and there's no undocumented rate limit that would break the existing 300ms-debounce, min-2-char UX from story 5-7
- [x] Task 2: New geocoding provider implementation (AC: 1, 2, 3, 5, 6, 7)
  - [x] Add `PhotonSettings` (or renamed to match chosen provider) in `BE/TripPlanner.Infrastructure/Settings/`, following `WikipediaSettings`'s shape (`BaseUrl`, `TimeoutMilliseconds`, no `ApiKey`)
  - [x] Add response models (internal sealed records, `JsonPropertyName` attributes) in a new `BE/TripPlanner.Infrastructure/ExternalServices/Photon/` folder, matching the GeoJSON `FeatureCollection` → `features[].properties`/`geometry.coordinates` shape confirmed in Task 1
  - [x] Implement `PhotonGeocodingService : IGeocodingService` in that folder: call the provider with `limit=5`, map each feature to a `LocationSearchResultResponse` (`Name`, `CountryCode` as ISO-2 — convert via `CountryNameHelper.GetCountryCode(fullCountryName)` if the provider only returns a full name, falling back to skipping/omitting that result if no code can be resolved, `Latitude`/`Longitude` from `geometry.coordinates` — GeoJSON order is `[lon, lat]`, `IsPartialMatch` — default `false` unless a natural signal exists), following the same try/catch → return `[]` (or let the use case's existing `HttpRequestException`/`TaskCanceledException` catch handle failures) pattern as `OpenTripMapGeocodingService`/`WikipediaImageService`
  - [x] Register in `InfrastructureServicesExtension.cs`: add `AddOptions<PhotonSettings>()...ValidateOnStart()` (mirror the `WikipediaSettings` block), replace the existing `services.AddHttpClient<IGeocodingService, OpenTripMapGeocodingService>(ConfigureOpenTripMapClient)` line with `services.AddHttpClient<IGeocodingService, PhotonGeocodingService>(ConfigurePhotonClient)`, add the `ConfigurePhotonClient` method mirroring `ConfigureWikipediaClient`
  - [x] Add `PhotonSettings` section to `BE/TripPlanner.API/appsettings.json` (mirror the `WikipediaSettings` block) and `PhotonSettings__BaseUrl`/`PhotonSettings__TimeoutMilliseconds` to `BE/.env.example` (no API key line)
  - [x] Delete `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapGeocodingService.cs` and the now-unused `OpenTripMapGeonameModel` record from `OpenTripMapModels.cs` (confirm nothing else references `OpenTripMapGeonameModel` first)
- [x] Task 3: Tests (AC: 4, 5, 8)
  - [x] New test file for `PhotonGeocodingService` (or chosen name) in `BE/TripPlanner.Tests/`: parses a realistic multi-result fixture (several "Ho*" places), an empty-results response, and a non-2xx/timeout/malformed-JSON response, using a mocked `HttpMessageHandler` (see how existing OpenTripMap/Wikipedia service tests — if any — mock `HttpClient`, otherwise follow xUnit + NSubstitute conventions already used in `BE/TripPlanner.Tests`)
  - [x] Add a new test to `BE/TripPlanner.Tests/LocationServiceTests.cs`: mock `IGeocodingService.SearchAsync` to return a multi-item "Ho" payload (mixed cities across countries, e.g. Hoi An/VN, Hong Kong/HK, Honolulu/US) and assert `SearchLocationsUseCase.ExecuteAsync` returns all distinct classified entries (not capped to 1)
  - [x] Keep all existing `LocationServiceTests` passing unmodified (they mock `IGeocodingService` at the interface level, so they should be unaffected by the provider swap)
- [x] Task 4: Verify (AC: 9)
  - [x] `dotnet build BE` and `dotnet test BE` green
  - [x] Manual check: run the API (`dotnet run --project BE/TripPlanner.API`), call `GET /api/locations/search?query=Ho` via Swagger/curl, confirm multiple distinct results
  - [x] Manual check: `npm run dev` in `FE/`, type "Ho" in the destination search box, confirm the suggestion dropdown now shows multiple distinct places with no frontend code changes

### Review Findings

- [x] [Review][Patch] AC4 dedup-and-cap logic still not exercised by realistic multi-result data [BE/TripPlanner.Tests/LocationServiceTests.cs] — `SearchLocations_MultiResultProviderPayload_ReturnsAllDistinctClassifiedResults` supplies 3 already-distinct results and asserts `Count == 3`; no duplicate `(name, countryCode)` pair and no >5-item payload are present, so `DistinctBy`/`Take(5)` are never actually exercised against a Photon-shaped payload. Fixed: added `SearchLocations_MultiResultProviderPayloadWithDuplicatesAndExcess_DeduplicatesAndCapsAtFive`.
- [x] [Review][Patch] `PhotonGeocodingService`'s `HttpClient` sends no `User-Agent` header [BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs (ConfigurePhotonClient)] — public Photon instances commonly expect an identifying `User-Agent`; the dev's manual test confirmed it currently works without one, but shipping without one risks throttling under sustained typing traffic in production. Fixed: added a `TripPlanner/1.0` `User-Agent` header in `ConfigurePhotonClient`.
- [x] [Review][Defer] No caching/retry/backoff for the third-party geocoding call — deferred, pre-existing (matches the existing OpenTripMap/Wikipedia client pattern, not introduced by this story).

## Dev Notes

- **This is a backend-only change.** The frontend (`FE/src/hooks/locations.ts`, `FE/src/pages/SearchPage.tsx`, `FE/src/components/SuggestionDropdown.tsx`) already renders whatever array `GET /api/locations/search` returns, capped client-side at 5 (`SearchPage.tsx`: `(suggestionsSource.data ?? []).slice(0, 5)`). Confirmed by reading the code during story creation — do not touch FE files unless a real defect is found there.
- **Critical gotcha — `CountryCode` is an ISO-2 code, not a full country name**, despite the JSON property historically being named `country`. Proof: `LocationServiceTests.cs` fixtures use `CountryCode = "GB"`, `"VN"`, `"US"`, `"FR"`, `"JP"`, `"MZ"` throughout, and `SearchLocationsUseCase.Classify` does `CountryNameHelper.GetCountryCode(location.Name) == location.CountryCode` to detect a country-type result — this only works if `CountryCode` is already an ISO-2 code. `OpenTripMapGeonameModel.Country` happened to already be ISO-2 from OpenTripMap's API. **Verify in Task 1** whether the new provider gives an ISO-2 code directly; if it only gives a full name (e.g. "Vietnam"), convert with `CountryNameHelper.GetCountryCode("Vietnam")` before populating `CountryCode` — otherwise every result misclassifies as neither city nor country correctly and `CountryNameHelper` (in `BE/TripPlanner.Application/Helpers/CountryNameHelper.cs`) is keyed by English country name, not code, so a raw full name in `CountryCode` won't match anything downstream either.
- **`Classify` unchanged, no redesign needed** — it only needs `Name` + ISO-2 `CountryCode` to correctly bucket City vs. Country; don't attempt to use the new provider's own place-type field (`osm_value`/`type`, if present) to replace this logic, since the existing dedupe test and title-casing/canonical-name logic depend on the current `Classify` behavior exactly as-is.
- **Reference implementation pattern**: follow `BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/WikipediaImageService.cs` and `BE/TripPlanner.Infrastructure/Settings/WikipediaSettings.cs` almost exactly — same keyless-provider shape (`BaseUrl` + `TimeoutMilliseconds`, no `ApiKey`), same DI registration style in `InfrastructureServicesExtension.cs` (`AddOptions<T>().Bind(...).Validate(...).ValidateOnStart()` + `AddHttpClient<TInterface, TImpl>(ConfigureXClient)`), same try/catch-narrow-exception-types pattern.
- **Do not touch** `OpenTripMapAttractionSearchService.cs` or `OpenTripMapDestinationDetailsService.cs` — they use different OpenTripMap endpoints (`radius`, `xid/{xid}`) for attraction search and destination details respectively, both out of scope and both still returning real arrays already.
- **Delete, don't deprecate**: per project convention (CLAUDE.md: no backwards-compatibility shims, delete unused code completely), `OpenTripMapGeocodingService.cs` and `OpenTripMapGeonameModel` must be deleted outright once the new provider is wired in, not left dangling or commented out.
- No comments in any new/modified code (XML docs, inline, or block) — project-wide rule, zero exceptions. Braces required on every control-flow statement, no single-line bodies.
- `SearchLocationsUseCase` already applies `.Take(MaxResults = 5)` and `.DistinctBy((name.ToLowerInvariant(), countryCode))` — no changes needed there; this story's tests just need to finally exercise that logic against real multi-result data (`SearchLocations_DuplicateAndExcessResults_DeduplicatesAndCapsAtFive` in `LocationServiceTests.cs:117` already proves the *logic* works given >5 candidates — new coverage should prove it against provider-shaped data, i.e. mixed distinct cities, not just duplicate "Springfield").
- `CountryNameHelper.GetCountryCode`/`IsCountry`/`GetCanonicalName` (`BE/TripPlanner.Application/Helpers/CountryNameHelper.cs`) are keyed by `RegionInfo.EnglishName` via `CultureInfo.GetCultures` — reuse this, don't add a new country-name-to-code mapping.
- The `IsPartialMatch` field only drives a "Partial match" badge in `FE/src/components/LocationResultList.tsx` (submitted-search results list, not the suggestion dropdown) — it's cosmetic. Default to `false` in the new provider unless there's a natural, cheap way to compute it (e.g. case-insensitive exact name match → `false`, otherwise `true`); this is a "should," not a hard AC — do not over-engineer it.

### Project Structure Notes

- New files land in `BE/TripPlanner.Infrastructure/ExternalServices/Photon/` (rename the folder/class to match whatever provider is actually implemented, if different from Photon) and `BE/TripPlanner.Infrastructure/Settings/PhotonSettings.cs`, mirroring the existing `OpenTripMap/` and `Wikipedia/` sibling folders exactly.
- New test file in `BE/TripPlanner.Tests/`, colocated alongside `LocationServiceTests.cs`, `WikipediaImageServiceTests.cs`, `WikipediaSettingsValidationTests.cs` (follow the latter's pattern for a `PhotonSettingsValidationTests.cs` if `ValidateOnStart()` is added).
- No new project references or NuGet packages needed — reuse `System.Net.Http.Json` / `System.Text.Json.Serialization`, already used throughout `TripPlanner.Infrastructure`.

### References

- [Source: BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapGeocodingService.cs] — the single-result implementation being replaced
- [Source: BE/TripPlanner.Application/UseCases/Location/SearchLocationsUseCase.cs] — dedup/cap/classify logic, unchanged
- [Source: BE/TripPlanner.Application/DTOs/Responses/LocationSearchResultResponse.cs] — contract unchanged
- [Source: BE/TripPlanner.Application/Helpers/CountryNameHelper.cs] — ISO-2 ↔ English-name lookup used by `Classify` and required for provider mapping
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/WikipediaImageService.cs, BE/TripPlanner.Infrastructure/Settings/WikipediaSettings.cs] — reference pattern for a keyless external service
- [Source: BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs] — DI registration to modify
- [Source: BE/TripPlanner.Tests/LocationServiceTests.cs] — existing use-case tests to extend, all provider-agnostic (mock `IGeocodingService`)
- [Source: FE/src/pages/SearchPage.tsx:46, FE/src/hooks/locations.ts, FE/src/components/SuggestionDropdown.tsx] — confirms frontend already handles arrays, no FE changes needed
- [Source: _bmad-output/implementation-artifacts/archive/5-7-search-auto-suggest.md] — origin story; its Dev Notes explicitly flagged the single-best-match limitation ("the dropdown must look right with one item") which this story now resolves
- [Source: _bmad-output/implementation-artifacts/archive/8-1-destination-image-wikipedia-fallback.md] — precedent for adding a free/keyless external service alongside OpenTripMap

## Dev Agent Record

### Agent Model Used

### Debug Log References

- Manually called `GET https://photon.komoot.io/api/?q=Ho&limit=10&layer=city&layer=country&lang=en` (no API key, no auth header, works with or without a `User-Agent` header, HTTP 200).
- Response is a GeoJSON `FeatureCollection`; each `features[].properties` includes `countrycode` as a **directly-usable ISO-2 code** (e.g. `"VN"`, `"CN"`, `"US"`, `"GH"`) alongside a separate full-name `country` field (e.g. `"Vietnam"`) — no `CountryNameHelper.GetCountryCode` conversion is needed for this provider.
- `properties.type` (normalized: `"city"`, `"country"`, also `"city"` for OSM `osm_value: "village"`) indicates place kind; repeated `layer=city&layer=country` query params restrict results to city/country-type places only, which combined with `lang=en` reliably returned Ho, Hong Kong, Ho Chi Minh City, Honduras, Houston, Honolulu, Hobart, Homel, etc. for `q=Ho` — matches the AC1 example set (minus "Hoi An", which OSM/Photon simply has no separate city-level entry for; a data-coverage gap, not a code defect).
- No-match query (`q=zzzzqqqqxx`) returns `{"type":"FeatureCollection","features":[]}` (HTTP 200, empty array) rather than an error.
- `geometry.coordinates` is GeoJSON order `[lon, lat]`.
- Photon has no documented server-side "restrict to this ISO country" query parameter (tested `osm_tag`-based attempts; they filter by OSM key/value type, not by nation) — so the `countryCode` hint `SearchLocationsUseCase` already computes (e.g. "FR" for a "France" query) is accepted by `PhotonGeocodingService.SearchAsync` per the unchanged `IGeocodingService` signature but not forwarded to the provider; `layer=city&layer=country&lang=en` alone was sufficient to reproduce the AC1 "Ho" example set.
- Manual API check: `dotnet run --project BE/TripPlanner.API` then `curl http://localhost:5000/api/locations/search?query=Ho` returned 5 distinct classified results (Ho/GH/City, Hong Kong/CN/City, Ho Chi Minh City/VN/City, Honduras/HN/Country, Houston/US/City).
- Manual FE check: started `npm run dev` (served on :5174, :5173 was already in use locally) and drove a headless Edge instance via the Chrome DevTools Protocol (no Playwright/Puppeteer installed in this repo — used Node's native `WebSocket`/`fetch` to talk CDP directly) to type "Ho" into the search input at `/`. The `SuggestionDropdown` rendered without any frontend code changes, showing the same 5 distinct places returned by the API. Both the API and Vite dev server processes were stopped after verification.

### Completion Notes List

- Replaced `OpenTripMapGeocodingService` (single-best-match `/geoname` endpoint) with `PhotonGeocodingService`, a free/keyless multi-result provider (`photon.komoot.io`), behind the unchanged `IGeocodingService` seam. `IGeocodingService`, `ISearchLocationsUseCase`, `LocationSearchResultResponse`, and all frontend code are untouched.
- Photon's `properties.countrycode` is already ISO-2, so no `CountryNameHelper` conversion was needed in the mapping (contrary to the story's precautionary assumption — confirmed empirically in Task 1, see Debug Log).
- `SearchLocationsUseCase`'s existing dedup/cap/classify logic required no changes; it's now exercised against a realistic multi-city Photon-shaped payload via a new `LocationServiceTests` case.
- Deleted `OpenTripMapGeocodingService.cs` and the now-unused `OpenTripMapGeonameModel` record outright (confirmed no other references first) — `OpenTripMapAttractionSearchService`/`OpenTripMapDestinationDetailsService` untouched.
- `PhotonGeocodingService` maps non-2xx responses and malformed JSON to a thrown `HttpRequestException` (wrapping the underlying `JsonException` for malformed bodies) so both surface through `SearchLocationsUseCase`'s existing `HttpRequestException`/`TaskCanceledException` catch as `ErrorType.ServiceUnavailable`, matching AC5 without any use-case changes.
- Full suite green: `dotnet build BE` and `dotnet test BE` (146 passed, 0 failed). Manually verified both the API endpoint (`curl`) and the FE suggestion dropdown (headless-browser CDP session) show multiple distinct "Ho" results with zero frontend code changes.

### File List

- `BE/TripPlanner.Infrastructure/Settings/PhotonSettings.cs` (new)
- `BE/TripPlanner.Infrastructure/ExternalServices/Photon/PhotonModels.cs` (new)
- `BE/TripPlanner.Infrastructure/ExternalServices/Photon/PhotonGeocodingService.cs` (new)
- `BE/TripPlanner.Tests/PhotonGeocodingServiceTests.cs` (new)
- `BE/TripPlanner.Tests/PhotonSettingsValidationTests.cs` (new)
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapGeocodingService.cs` (deleted)
- `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapModels.cs` (modified — removed `OpenTripMapGeonameModel`)
- `BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs` (modified — DI swap to `PhotonGeocodingService`)
- `BE/TripPlanner.API/appsettings.json` (modified — added `PhotonSettings` section)
- `BE/.env.example` (modified — added `PhotonSettings__*` variables)
- `BE/TripPlanner.Tests/LocationServiceTests.cs` (modified — added multi-result classification test)

## Change Log

- 2026-07-13: Implemented story — swapped `IGeocodingService`'s OpenTripMap-backed single-result geocoder for a Photon-backed multi-result implementation; added/updated tests; full suite green; manually verified API and FE.
