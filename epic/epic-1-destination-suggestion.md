# Epic 1: Destination Suggestion

Source: `requirement/Sheet1.html` — Feature 1: Destination Suggestion

**Status: Implemented** (US2 + US3). This document reflects the code as built.

## Summary

Let users search for a city or country and see a recommended list of attractions there, so they can discover places worth visiting before creating or building out a trip. This epic covers the MVP slice of Feature 1: the two "Selected = Yes" / High-priority user stories (US2, US3). Autocomplete-while-typing (US1), filtering (US4), and sorting (US5) are deferred to a later iteration and are not part of this epic's committed scope.

## In-scope user stories

### US2 — Search by city/country (High)

> As a user, I want to search for a city or country by name so I can discover destinations to visit.

**Acceptance criteria**
1. Enter at least 1 character into the search input to start searching.
2. See a list of matching city and country results based on the entered text.
3. See both city and country names clearly labeled in the results.
4. Select a city or country from the search results.
5. View the selected city or country as the active search value.
6. Receive a message "No attractions found" when no matching locations are found.
7. Clear the search input to start a new search.

**Business rules**
- Search results must include cities and countries.
- Results should be ranked by relevance (exact matches first).
- Maximum number of results displayed is 5.
- Duplicate locations must not appear in the result list.
- Search is case-insensitive.
- Partial matches are allowed (e.g. "Lon" → "London").

### US3 — View recommended attractions list (High)

> As a user, I want to see a recommended list of attractions so I can decide what to explore.

**Acceptance criteria**
1. View a list of attractions after submitting a valid location search.
2. See each attraction name in the list.
3. See each attraction category/tags when available.
4. See each attraction rating/popularity indicator when available.
5. See a thumbnail image when available.
6. See a placeholder when image or rating is unavailable.
7. See pagination and load more attractions when reaching 20 items (optional).

**Business rules**
- Fetch attractions using coordinates + radius/bounds.
- Default radius: City = 20 km; Country = broader approach (MVP: require city selection before fetching attractions — see Known Risks).
- Return max 20 items per page.
- Use provider ranking and/or internal scoring (e.g., popularity/rating first).

**Note:** Call OpenTripMap for POIs near the city center. Attraction categories come from OpenTripMap `kinds` (taxonomy: https://dev.opentripmap.org/catalog); popularity comes from the OpenTripMap `rate` field (`1`–`3`, `h` = cultural heritage). Foursquare enrichment (categories, reviews) is a candidate enhancement but deferred.

## Out of scope / backlog (not part of this epic)

- **US1 — Autocomplete for search field** (Medium): live suggestions while typing (≥2 chars, up to 5 suggestions). Note: OpenTripMap's `/autosuggest` endpoint suggests POI names near a point, not cities/countries, so US1 would still be built on `/geoname` (or another geocoding source) with client-side debouncing.
- **US4 — Filter recommended attractions** (Medium): category and rating/popularity filters, combinable, persisted across pagination. Maps directly to the `kinds` (https://dev.opentripmap.org/catalog) and `rate` parameters of `/radius`.
- **US5 — Sort attractions** (Low): default "recommended" order plus "highest rating" sort, filters preserved across sort changes. Future work would add a sort parameter to the attraction-fetch input.

## Technical approach

**Data provider:** OpenTripMap Places API (base URL `https://api.opentripmap.com/0.1/{lang}/places`, `lang` = `en`; API key passed as `apikey` query parameter — free tier, register at https://dev.opentripmap.org). Foursquare enrichment is explicitly deferred.

**Endpoints used:**

| Endpoint | Used for | Key parameters | Returns |
|---|---|---|---|
| `GET /geoname` | US2 location search | `name` (required), `country` (optional ISO-3166 filter) | Single best match: `name`, `country`, `lat`, `lon`, `timezone`, `population`, `partial_match` |
| `GET /radius` | US3 attraction list | `lat`, `lon`, `radius` (meters), `kinds`, `rate`, `limit`, `format` | List of POIs, basic info only: `xid`, `name`, `kinds`, `dist`, `point` |
| `GET /xid/{xid}` | US3 attraction details/enrichment | `xid` | Full detail: `name`, `kinds`, `rate`, `preview` (thumbnail), `image`, `wikipedia_extracts`, `point`, links |
| `GET /autosuggest` | Backlog (US1) | `name`, `lat`, `lon`, `radius`, `kinds` | POI name suggestions near a point |

**US3 query defaults:** `radius=20000` (20 km), `kinds=interesting_places`, `rate=2` (filter to reasonably popular objects), `limit=20`, `format=json`. The `kinds` taxonomy at https://dev.opentripmap.org/catalog is also the basis for the deferred US4 category filters.

**Enrichment strategy (as implemented):** The `/radius` response carries no rating or image — those require a `/xid/{xid}` call per attraction. `OpenTripMapAttractionSearchService` filters `/radius` features to those with a non-empty `xid` and `name`, caps them at the requested limit (max 20), then fires all `/xid/{xid}` detail calls in parallel via `Task.WhenAll` (bounded implicitly by the page size, not by an explicit concurrency limiter). Degradation is graceful: if a detail call throws `HttpRequestException`, `TaskCanceledException`, or `JsonException`, the attraction is returned with the basic `/radius` data (no rating/image — the UI shows placeholders per US3 AC 6) rather than failing the whole list. Detail data, when present, overrides the rating, image (`preview.source`), and kinds.

**Database & persistence:** No database changes. No new Domain entities, no EF Core configurations, and no migrations — location search results and attraction suggestions are ephemeral, provider-shaped data fetched live from OpenTripMap on every request (never persisted), keeping them distinct from the curated/persisted `Destination`/`Landmark`/`Restaurant` hierarchy.

**Data models (as implemented):**

| Model | Layer / location | Shape |
|---|---|---|
| `LocationSearchResultResponse` | Application `DTOs/Responses/` | `Name`, `CountryCode` (ISO code from `/geoname` `country`), `LocationType` (`"City"` or `"Country"`), `Latitude`, `Longitude`, `IsPartialMatch` |
| `AttractionResponse` | Application `DTOs/Responses/` | `Xid`, `Name`, `Kinds` (`List<string>`, split from comma-separated `kinds`), `Rating` (`string?` — OpenTripMap `rate`: `1`–`3`/`h` variants), `ImageUrl` (`string?`, from `preview.source`), `DistanceMeters` (`double?`) |
| `LocationSearchParameter` | Application `Parameters/` | `Query` (`string?`, required ≥1 char via validator) |
| `AttractionSearchParameter` | Application `Parameters/` | `Latitude`, `Longitude`, `Radius` (`int?`, default 20000, max 100000), `Limit` (`int?`, default 20, max 20) |
| `OpenTripMapGeonameModel`, `OpenTripMapFeatureModel`, `OpenTripMapPlaceModel`, `OpenTripMapPreviewModel` | Infrastructure `ExternalServices/OpenTripMap/OpenTripMapModels.cs` (internal) | Provider wire formats for `/geoname`, `/radius` (json), `/xid/{xid}`; mapped to Application DTOs inside the adapters |

**Layering (Clean Architecture — Domain → Application → Infrastructure → API):**
- Application service ports (`Interfaces/Services/`): `IGeocodingService.SearchAsync(query)`, `IAttractionSearchService.GetNearbyAsync(lat, lon, radiusMeters, limit)`.
- Use cases (`UseCases/Location/`): `SearchLocationsUseCase` (US2 — trims the query, passes an ISO country-code hint to the geocoder when the query is a known country name so country searches resolve to the actual country rather than a same-named locality elsewhere, filters unnamed results, dedupes by lowercased name + country code, caps at 5, classifies each result as Country only when its name is a country name *and* the returned country code agrees — otherwise City — and normalizes the display name: canonical English country name for countries, title case for cities, since `/geoname` echoes the request's casing) and `GetAttractionsForLocationUseCase` (US3 — applies the 20 km default radius and the 20-item cap), both returning `Result<T>` per the existing pattern. Provider failures (`HttpRequestException`, `TaskCanceledException`) are caught in the use cases and mapped to `Result.Failure(ErrorType.ServiceUnavailable)` — a new `ErrorType` member added for this epic.
- Country detection (`Helpers/CountryNameHelper.cs`): a lazily built, case-insensitive map of English country names to `RegionInfo` (ISO code + canonical name) from all specific cultures — no external call and no hardcoded list.
- Infrastructure adapters (`ExternalServices/OpenTripMap/`): `OpenTripMapGeocodingService` (treats provider 404 as an empty result) and `OpenTripMapAttractionSearchService`, both registered as typed clients via `AddHttpClient<TInterface, TImpl>` sharing one configuration callback that sets `BaseAddress` and `Timeout` from `OpenTripMapSettings` — the first external HTTP integration in the codebase.
- API endpoints (`Endpoints/LocationEndpoints.cs`): `GET /api/locations/search?query=` and `GET /api/locations/attractions?latitude=&longitude=&radius=&limit=`, registered under the `/api/locations` group in `RouteExtension` (anonymous, matching `DestinationEndpoints`). Parameters bind via `[AsParameters]` and are validated by `LocationSearchParameterValidator` and `AttractionSearchParameterValidator` (lat −90…90, lon −180…180, radius 1–100000 m, limit 1–20) through the group's `AddFluentValidationAutoValidation()`.

**Configuration:** `OpenTripMapSettings` (Infrastructure `Settings/`, section name `OpenTripMapSettings`) with `BaseUrl` (default `https://api.opentripmap.com/0.1/en/places`), `ApiKey`, and `TimeoutMilliseconds` (default 5000). The section is declared in `appsettings.json` (with an empty `ApiKey`) and bound in `InfrastructureServicesExtension` via `services.Configure` + `GetSection(...).Bind(...)`, mirroring the `JwtSettings` pattern; the secret comes from `.env` as `OpenTripMapSettings__ApiKey`. The adapters append the key as the `apikey` query parameter on every request.

**Empty-state handling:** "No results" (no matching locations, no attractions found) is a normal outcome — `Result.Success` with an empty list — not a `Failure`. `ErrorType`-based failures are reserved for genuine errors (external API unavailable, timeout, 5xx).

**Country search scope for US3:** In MVP, selecting a country in US2 requires the user to narrow to a city before attractions are fetched; there is no "top attractions across major cities" fallback yet.

## Known risks / open questions

1. **Geocoding result count (confirmed limitation):** Per the OpenTripMap OpenAPI spec, `/geoname` returns exactly one best match (with a `partial_match` flag), not a ranked list of up to 5 candidates as US2's AC implies. As implemented: `OpenTripMapGeocodingService` returns the single best match as a one-item list (surfacing `IsPartialMatch` so the UI can indicate an inexact hit), and `CountryNameHelper` (built from `RegionInfo` culture data) classifies it as City or Country. The use case still dedupes and caps at 5 so a richer geocoding source can be swapped in behind `IGeocodingService` without touching the use case; the "up to 5 results" AC is relaxed to "up to 5" with typically 1 provider result, documented as a known limitation.
2. **NFR risk (performance):** Search results must return within ≤500ms and attraction suggestions within ≤1000ms for 95% of requests. The `/radius` → per-`xid` detail fan-out (see Enrichment strategy) is the main cost: cap it at the page size (20), run detail calls in parallel, and treat caching/retry policies (e.g. Polly) as follow-up optimizations if targets are missed under real load. OpenTripMap's free tier is rate-limited, so caching detail responses by `xid` is the most likely first optimization.
3. **Auth requirement:** Whether `/api/locations/*` endpoints require authentication is unconfirmed — default assumption is anonymous access (matching the existing `DestinationEndpoints`), since browsing/searching destinations doesn't require a signed-in user per US8 in Feature 3.

## Key new components (as implemented)

| Layer | Component | Purpose |
|---|---|---|
| Application | `IGeocodingService`, `IAttractionSearchService` (`Interfaces/Services/`) | Ports for external location/attraction search |
| Application | `ISearchLocationsUseCase` / `SearchLocationsUseCase`, `IGetAttractionsForLocationUseCase` / `GetAttractionsForLocationUseCase` (`UseCases/Location/`) | Use cases for US2 / US3 |
| Application | `LocationSearchResultResponse`, `AttractionResponse` (`DTOs/Responses/`) | Response DTOs |
| Application | `LocationSearchParameter`, `AttractionSearchParameter` (`Parameters/`) | Query-string parameter records bound via `[AsParameters]` |
| Application | `CountryNameHelper` (`Helpers/`) | City vs. country classification from `RegionInfo` culture data |
| Application | `ErrorType.ServiceUnavailable` (`Common/ErrorType.cs`) | New error type for provider outages/timeouts |
| Infrastructure | `OpenTripMapGeocodingService`, `OpenTripMapAttractionSearchService` (`ExternalServices/OpenTripMap/`) | Typed-`HttpClient` adapters for `/geoname`, `/radius`, `/xid/{xid}` |
| Infrastructure | `OpenTripMapModels.cs` (internal records) | Provider wire-format models |
| Infrastructure | `OpenTripMapSettings` (`Settings/`) + registration in `InfrastructureServicesExtension` | Options-bound config (BaseUrl, ApiKey, TimeoutMilliseconds) and `AddHttpClient` wiring |
| API | `LocationEndpoints.cs`, `/api/locations` group in `RouteExtension` | `GET /api/locations/search`, `GET /api/locations/attractions` |
| API | `LocationSearchParameterValidator`, `AttractionSearchParameterValidator` (`Validators/`) | FluentValidation rules (query required; lat/lon ranges; radius 1–100000; limit 1–20) |
| Tests | `LocationServiceTests.cs` | Use-case unit tests |

## Test approach (as implemented)

Unit tests in `TripPlanner.Tests/LocationServiceTests.cs` (xUnit + NSubstitute, following `DestinationServiceTests.cs` conventions) for the two use cases, mocking `IGeocodingService`/`IAttractionSearchService` directly (not `HttpClient`):
- City vs. country classification of search results (`LocationType`).
- Dedup and truncation-to-5 behavior for location search.
- Default radius application and cap-at-20 behavior for attraction search.
- Empty-result paths return `Result.Success` with an empty list.
- Provider failures (`HttpRequestException`, `TaskCanceledException`) map to `Result.Failure(ErrorType.ServiceUnavailable)`.

Adapter-level tests against a stubbed `HttpMessageHandler` remain out of scope for this MVP pass.
