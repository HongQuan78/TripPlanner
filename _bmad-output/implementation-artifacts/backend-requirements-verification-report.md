# Backend Requirements Verification Report

Story: 6-1-backend-requirements-verification
Date: 2026-07-13
Source of truth: `requirement/Sheet1.html` (Google Sheet export, selected rows only)
Audit target: `BE/` at commit `f00b40f4c8dcc65b031ea66b055918d806f36eb7`

## Verdict vocabulary

- `PASS` — implemented and evidenced by code reference plus a named test or a manual verification performed during this audit.
- `PASS (design)` — code posture supports the requirement but the requirement itself (e.g. a latency SLA) is not provable by unit tests.
- `PARTIAL` — implemented with a material deviation or missing sub-behavior.
- `FAIL` — required behavior not implemented.
- `FE-scope` — purely UI behavior; backend data/endpoint support is noted where relevant.
- `N/A` — not applicable to the backend or superseded by another selected requirement.

## Audit baseline

- `dotnet build BE` — succeeded, 0 warnings, 0 errors.
- `dotnet test BE` — **119 passed, 0 failed, 0 skipped** (initial run, 2026-07-13). Final re-run recorded at the end of this report.
- Manual verification: API started locally (`dotnet run --project BE/TripPlanner.API --urls http://localhost:5199`, real OpenTripMap key from `BE/.env`) and probed with curl. Results cited inline as "manual probe".

### Endpoint inventory

| Endpoint | Auth | Feature(s) served |
|---|---|---|
| `POST /api/auth/register` | anonymous | F4-US1 |
| `POST /api/auth/login` | anonymous | F4-US3 |
| `POST /api/auth/logout` | required (`AuthEndpoints.cs:14`) | F4-US4 |
| `GET /api/auth/verify-email` | anonymous | F4-US2 |
| `POST /api/auth/resend-verification` | anonymous | F4-US2 |
| `GET /api/locations/search` | anonymous | F1-US2 (and F1-US1 informational) |
| `GET /api/locations/attractions` | anonymous | F1-US3 |
| `GET /api/locations/{xid}/details` | anonymous | F2-US1/US2/US4 |
| `GET /api/destinations`, `GET /api/destinations/{id}` | anonymous | internal catalog (informational) |
| `GET /api/trips`, `GET /api/trips/{id}` | required (group, `RouteExtension.cs:27`) | F3-US10 |
| `POST /api/trips` | required | F3-US1 |
| `PUT /api/trips/{id}` | required | F3-US2 |
| `POST /api/trips/{id}/days/{date}/destinations` | required | F3-US3 |
| `DELETE /api/trips/{id}/days/{date}/destinations/{destinationId}` | required | F3-US7 |

Manual probe (no token): all five `/api/trips` routes and `POST /api/auth/logout` returned **401**; `/api/locations/*` and `/api/destinations` returned **200/400/404** as appropriate (anonymous confirmed).

---

## Feature 1 — Destination Suggestion

### F1-US2 Search by city/country (High, Selected)

| # | AC / Business rule | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | Enter at least 1 character to start searching | PASS | `LocationSearchParameterValidator.cs:10-12`; manual probe: empty query → 400 | `NotEmpty` enforces min 1 non-whitespace char |
| AC2 | See a list of matching city and country results | PARTIAL | `OpenTripMapGeocodingService.cs:14,32-42`; manual probe: `?query=lon` → exactly 1 result | Client calls OpenTripMap `geoname`, which returns a single best match; the endpoint can never return more than 1 result, so "a list of matching results" degenerates to 0 or 1 items |
| AC3 | City and country names clearly labeled | PASS | `SearchLocationsUseCase.cs:35-45` (`LocationType` = "City"/"Country"); test `SearchLocations_CityMatch_ReturnsSuccessWithCityType`, `SearchLocations_CountryMatch_ReturnsCountryType` | Classification via `CountryNameHelper` |
| AC4 | Select a result | FE-scope | response carries name + lat/lon for selection | — |
| AC5 | View selected value as active search value | FE-scope | — | — |
| AC6 | 'No attractions found' message when no matches | PASS | `OpenTripMapGeocodingService.cs:20-23,27-30`; test `SearchLocations_NoMatches_ReturnsSuccessWithEmptyList`; manual probe: `?query=zzzzqqq` → 200 `[]` | Backend contract: empty list with 200, FE renders the message |
| AC7 | Clear input to start new search | FE-scope | — | — |
| BR | Results include cities and countries | PASS | `SearchLocationsUseCase.cs:35-45`; tests `SearchLocations_CountryMatch_ReturnsCountryType`, `SearchLocations_PlaceNamedAfterCountryInOtherCountry_ClassifiedAsCity` | Both types classified and returned |
| BR | Ranked by relevance (exact matches first) | PARTIAL | `SearchLocationsUseCase.cs:21-26` | No ranking logic exists; vacuously true only because the provider returns a single result (see AC2) |
| BR | Max 5 results | PASS | `SearchLocationsUseCase.cs:12,24`; test `SearchLocations_DuplicateAndExcessResults_DeduplicatesAndCapsAtFive` | `Take(5)` cap |
| BR | No duplicate locations | PASS | `SearchLocationsUseCase.cs:23`; same test | `DistinctBy(name.ToLowerInvariant(), countryCode)` |
| BR | Case-insensitive search | PASS | test `SearchLocations_LowercaseCityName_IsTitleCased`; manual probe: `?query=PARIS` → "Paris" | Provider is case-insensitive; names normalized |
| BR | Partial matches allowed ("Lon" → "London") | PARTIAL | `OpenTripMapModels.cs:19-20` (`partial_match`), `LocationSearchResultResponse.IsPartialMatch`; manual probe: `?query=lon` → `{"name":"Lon", lat/lon of London}` | Partial query resolves to the right coordinates, but the returned label is the partial string "Lon", not "London" — the sheet's example expects the full name |

### F1-US3 View recommended attractions list (High, Selected)

| # | AC / Business rule | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | View attractions after valid location search | PASS | `LocationEndpoints.cs:12,26-33`; manual probe: Paris coords → 200 with attraction list | Endpoint takes lat/lon from the search result |
| AC2 | Attraction name | PASS | `AttractionResponse.Name`; `OpenTripMapAttractionSearchService.cs:24,37` (unnamed features filtered out); test `GetAttractions_ReturnsAttractionsFromService`; manual probe | Always present |
| AC3 | Category/tags when available | PASS | `AttractionResponse.Kinds`; `OpenTripMapAttractionSearchService.cs:38,55,64-72`; manual probe: `kinds` array populated | OpenTripMap `kinds` split into list |
| AC4 | Rating/popularity when available | PASS | `AttractionResponse.Rating`; `OpenTripMapAttractionSearchService.cs:53`; manual probe: `"rating":"3"` / `"3h"` / null | Nullable; raw OpenTripMap `rate` string passed through |
| AC5 | Thumbnail image when available | PASS | `AttractionResponse.ImageUrl`; `OpenTripMapAttractionSearchService.cs:54` (`preview.source`); manual probe: URL or null | Nullable |
| AC6 | Placeholder when image/rating missing | FE-scope | Rating/ImageUrl nullable in contract | Backend signals absence via null |
| AC7 | Pagination / load more at 20 items (optional) | PARTIAL | `AttractionSearchParameter` has `Limit` but no offset/page; `GetAttractionsForLocationUseCase.cs:11,16` | Only the first ≤20 items are reachable; no way to fetch page 2. AC is marked optional in the sheet |
| BR | Fetch by coordinates + radius | PASS | `OpenTripMapAttractionSearchService.cs:20` (`radius?radius=&lat=&lon=`); test `GetAttractions_CustomRadiusAndLimit_ArePassedThrough` | — |
| BR | City default radius 20 km | PASS | `GetAttractionsForLocationUseCase.cs:10,15`; test `GetAttractions_NoRadiusProvided_AppliesDefaultTwentyKilometers` | 20000 m default |
| BR | Country: broader approach (MVP: top attractions / require city) | PARTIAL | `AttractionSearchParameterValidator.cs` caps radius at 100 km | No country-specific strategy; a country search returns POIs within radius of the country's geoname centroid. Sheet allows an MVP simplification, but none of the listed MVP options is explicitly implemented |
| BR | Max 20 items per page | PASS | `GetAttractionsForLocationUseCase.cs:11,16` (`Math.Min(limit, 20)`); test `GetAttractions_LimitAboveMaximum_CapsAtTwenty` | Also validator caps `Limit` at 20 |
| BR | Provider ranking and/or internal scoring | PASS (design) | `OpenTripMapAttractionSearchService.cs:13-14,20` (`rate=2` minimum, provider order preserved) | Relies on provider ordering plus a minimum-rate filter; no internal scoring layer |
| Note | Foursquare enrichment for categories/reviews | N/A (scope decision) | only OpenTripMap integrated (`Infrastructure/ExternalServices/OpenTripMap/`) | Categories and ratings are available from OpenTripMap `kinds`/`rate`, so the ACs are satisfiable without Foursquare; flagged as a conscious scope decision, not a FAIL |

### F1-US1 Autocomplete (Not selected — informational)

FE story 5-7 consumes `GET /api/locations/search` for autosuggest. Backend supports it, but the single-result geoname limitation (F1-US2 AC2) means the dropdown can only ever offer one suggestion, and partial queries are labeled with the typed fragment ("Lon"), which limits autocomplete usefulness.

---

## Feature 2 — Destination Details

### F2-US1 Open a destination details view (Medium, Selected)

| # | AC / Business rule | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | Open detail view for a selected destination | PASS | `LocationEndpoints.cs:13,35-42`; manual probe: `GET /api/locations/N191031796/details` → 200 | Keyed by provider place id |
| AC2 | Name, category, short description | PASS | `OpenTripMapDestinationDetailsService.cs:30-33` (name, primary kind, wikipedia extract); test `GetDestinationDetails_ValidXid_ReturnsSuccessWithDetails`; manual probe | Category = first `kinds` entry; description from `wikipedia_extracts.text` |
| AC3 | Images when available | PASS | `OpenTripMapDestinationDetailsService.cs:34,52-64`; manual probe: 2 URLs returned | See F2-US2 note about the second URL |
| AC4 | Location on a map (optional) | PASS | `DestinationDetailsResponse.Latitude/Longitude`; `OpenTripMapDestinationDetailsService.cs:37-38`; manual probe | Coordinates provided for FE map rendering |
| AC5 | Address, opening hours, website when available | PARTIAL | Address: `OpenTripMapDestinationDetailsService.cs:66-87` PASS; Website: `:36` PASS; OpeningHours: `DestinationDetailsResponse.OpeningHours` exists but is **never assigned** in `OpenTripMapDestinationDetailsService.cs:28-39`; manual probe: `"openingHours":null` on every response | Opening hours are never populated — OpenTripMap's `xid` response carries no opening-hours data and no other source is integrated (see F2-US4) |
| AC6 | Identify "Add to Trip" option | FE-scope | backend: `POST /api/trips/{id}/days/{date}/destinations` accepts `Xid` | — |
| AC7 | Close detail view | FE-scope | — | — |
| BR | Details match selected destination exactly | PASS | `OpenTripMapDestinationDetailsService.cs:14` (fetch by xid); test `GetDestinationDetails_ValidXid_ReturnsSuccessWithDetails` | Lookup is by the provider's own id |
| BR | Detail still opens when fields are missing | PASS | all optional fields nullable; `NormalizeOptional`; test `GetDestinationDetails_SparseProviderData_StillReturnsSuccess` | Null-tolerant mapping |
| BR | Images/maps optional, shown only when available | PASS | `ImageUrls` empty list / null coordinates when absent | — |
| BR | "Add to Trip" unavailable when not logged in | PASS | `RouteExtension.cs:27` (`RequireAuthorization` on `/api/trips`); manual probe: anonymous POST → 401 | Backend enforces; FE hides the button |
| Sheet note | Fetch by provider place ID (OpenTripMap xid) | PASS | route `/{xid}/details`, `GetDestinationDetailsUseCase.cs:9` | Takes the xid, not an internal DB id |

Error semantics: unknown xid → 404 (`GetDestinationDetailsUseCase.cs:19-22`, test `GetDestinationDetails_UnknownXid_ReturnsNotFoundFailure`, manual probe `xyz` → 404); provider failure/timeout → 503 (tests `..._ProviderUnavailable_...`, `..._ProviderTimeout_...`).

### F2-US2 View photos (Medium, Selected)

| # | AC / Business rule | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | View photos when available | PASS | `ImageUrls` list; `ComposeImageUrls` (`OpenTripMapDestinationDetailsService.cs:52-64`); manual probe | Preview image + `image` field, deduplicated |
| AC2 | Swipe through multiple photos | FE-scope | contract is a list, supports multiple | Note: the second URL comes from OpenTripMap `image`, which is a Wikimedia Commons **page** URL, not a direct image file — FE must handle it or it renders broken |
| AC3 | Placeholder when no photos | FE-scope | empty `ImageUrls` signals absence explicitly | — |
| BR | Show ≥1 image if available, else placeholder | PASS | same as AC1 | — |

### F2-US4 View opening hours when available (Low, Selected)

| # | AC | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | View opening hours when available | FAIL | `OpenTripMapDestinationDetailsService.cs:28-39` never sets `OpeningHours`; `OpenTripMapPlaceModel` has no opening-hours property; manual probe: always `null` | The backend can never supply opening hours: OpenTripMap does not provide them and the Foursquare integration mentioned in the sheet was never built. The response field exists but is dead |
| AC2 | "Opening hours not available" when missing | FE-scope | `OpeningHours` nullable → FE renders the message | Backend contract supports the absent case (which is currently the only case) |

---

## Feature 3 — Trip Planner

### F3-US1 Create a trip (High, Selected)

| # | AC / Business rule | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | Create a trip by entering a trip name | PARTIAL | `CreateTripValidator.cs` requires Name **and** StartDate **and** EndDate; `CreateTripRequest.cs` | Stricter than the sheet: a name alone is not enough, dates are mandatory at creation. The FE always sends dates, so the flow works, but "create with just a name" per the AC is not possible |
| AC2 | View the new trip in my trip list | PASS | `TripEndpoints.cs:15,28-32` (`GET /api/trips`); test `GetAllTripsAsync_WithTrips_ReturnsSuccessResult` | Persisted via `CreateTripUseCase` + `SaveChangesAsync` |
| AC3 | Open the planner after creating | FE-scope | `CreateTrip` returns 201 with the full `TripResponse` incl. generated days (`TripEndpoints.cs:39`) | Backend provides everything the redirect needs |
| BR | Trip name is required | PASS | `CreateTripValidator.cs:10-12` (`NotEmpty`, rejects null/empty/whitespace); test `CreateTripAsync_ValidRequest_ReturnsSuccessResult` covers happy path | — |

### F3-US2 Set trip start and end dates (High, Selected)

| # | AC / Business rule | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1/AC2 | Set start / end date | PASS | `CreateTripRequest`/`UpdateTripRequest`; `PUT /api/trips/{id}` | — |
| AC3 | One itinerary day per date in range | PASS | `Trip.GenerateDays` (`Trip.cs:35-43`); tests `Trip_SingleDay_GeneratesOneTripDay`, `Trip_MultiDay_GeneratesCorrectDayCount`, `Trip_MultiDay_DaysAreConsecutive` | Inclusive range, one `TripDay` per date |
| AC4 | Days update when dates change | PASS | `Trip.Update` (`Trip.cs:26-33`); tests `Update_ExtendingRange_AddsNewDaysInOrder`, `Update_RetainedDays_KeepTheirDestinations`, `ExecuteAsync_ExtendOnly_SucceedsAndAddsDays` | Out-of-range days removed, new dates added, retained days keep destinations |
| AC5 | Confirm date changes that remove planned items | PASS | `UpdateTripUseCase.cs:22-34`: shrink dropping days **with destinations** → `409 Conflict` unless `confirmed=true`; tests `ExecuteAsync_ShrinkDropsDaysWithDestinationsNotConfirmed_ReturnsConflictFailure`, `..._Confirmed_ReturnsSuccessWithRegeneratedDays`, `..._ShrinkDropsOnlyEmptyDays_SucceedsWithoutConfirmation` | Backend behavior for destructive shrinks is defined, documented and pinned by tests: two-phase confirm; once confirmed, dropped days and their destinations are deleted (`Trip.cs:30`) |
| BR | Require start ≤ end | PASS | `CreateTripValidator`/`UpdateTripValidator` (`EndDate >= StartDate`) | — |

### F3-US3 Add a destination to a trip (High, Selected)

| # | AC | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | Add from the attraction list | PASS | `POST /api/trips/{id}/days/{date}/destinations` with `Xid` (`AddDestinationToDayRequest.cs`); test `AddDestinationToTripDayAsync_XidNotImported_CreatesDestinationFromProviderDetails` | Provider destination imported on first use, reused thereafter (`..._XidAlreadyImported_ReusesExistingDestination`) |
| AC2 | Add from the details page | PASS | same endpoint, same `Xid` contract | — |
| AC3 | Select a day in the trip | PASS | day is part of the route (`/days/{date}/`); unknown day → 404 (test `AddDestinationToTripDayAsync_DayNotFound_ReturnsNotFoundFailure`) | — |
| AC4 | Destination appears immediately under the trip | PASS | returns updated `TripDayResponse` (`AddDestinationToTripDayUseCase.cs:57-59`); test `AddDestinationToTripDayAsync_ValidInput_ReturnsSuccessResult` | — |
| BR (from US4 note) | Prevent duplicate in the same day | PASS | `AddDestinationToTripDayUseCase.cs:47-51` → 400; tests `..._DestinationAlreadyOnDay_...`, `..._XidDestinationAlreadyOnDay_...` | — |
| Data fidelity | Imported destination preserves provider data | FAIL | `AddDestinationToTripDayUseCase.cs:97`: `new Landmark(details.Name, 0, details.OpeningHours ?? string.Empty, details.Xid)` | Only the name and xid survive the import. Rating is hardcoded to `0`, category is always `"Landmark"` (even for restaurants/museums), opening hours are always empty (see F2-US4), and image/description/coordinates are not persisted. See F3-US10 AC2 impact and findings summary |

### F3-US7 Remove a destination from the itinerary (High, Selected)

| # | AC | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | Remove a destination from a trip day | PASS | `DELETE /api/trips/{id}/days/{date}/destinations/{destinationId}`; `RemoveDestinationFromTripDayUseCase`; test `RemoveDestinationFromTripDayAsync_ValidInput_ReturnsSuccessResult` | 204 on success; 404 for unknown trip/day/destination (tests `..._TripNotFound_...`, `..._DayNotFound_...`, `..._DestinationNotOnDay_...`) |
| AC2 | Removed immediately after confirmation | FE-scope | confirmation dialog is FE; backend deletes synchronously | — |

### F3-US8 Require login to save trips (Medium, Selected)

| # | AC | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | Browse destinations without logging in | PASS | `RouteExtension.cs:15-24`: `/api/destinations` and `/api/locations` have no auth; manual probe: 200 anonymously | — |
| AC2 | Prompted to log in when creating a trip logged out | PASS (backend) | `RouteExtension.cs:27`; manual probe: anonymous `POST /api/trips` → **401** | Prompt itself is FE; backend returns 401 |
| AC3 | Prompted when adding a destination logged out | PASS (backend) | manual probe: anonymous `POST /api/trips/1/days/2026-07-14/destinations` → **401** | — |
| AC4/AC5 | Return to same place / complete action after login | FE-scope | — | — |

### F3-US10 Load saved trips and destinations (Medium, Selected)

| # | AC | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | Log in and see previously created trips | PASS | `GET /api/trips` scoped by user (`TripRepository.cs:17-21`); test `GetAllTripsAsync_QueriesRepositoryWithCallerUserId` | — |
| AC2 | Open a trip and see saved destinations and days | PARTIAL | `TripRepository.GetWithDaysAndDestinationsAsync` (`Include/ThenInclude`, `TripRepository.cs:10-14`); mapper `MappingProfile.cs`; test `GetTripAsync_ExistingId_ReturnsSuccessResult` | Days and destinations are returned, but a reloaded destination exposes only `Id/Name/Rating=0/Category="Landmark"/OpeningHours=""` (`DestinationResponse.cs`) — the category, rating and image the user saw when adding are lost (root cause: F3-US3 data-fidelity FAIL) |
| AC3 | Empty state when no saved trips | PASS | returns `200 []`, not an error; test `GetAllTripsAsync_EmptyRepository_ReturnsSuccessWithEmptyList` | — |

### F3-US9 Auto-save (Not selected — informational)

Every mutation (`POST/PUT/DELETE` on trips/days) persists immediately via `IUnitOfWork.SaveChangesAsync`; nothing is held client-side-only. Backend already satisfies the persistence portion of this US.

---

## Feature 4 — User Authentication

### F4-US1 Sign up with email and password (Medium, Selected)

| # | AC / Business rule | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1/AC2 | Open sign-up screen, enter email + password | FE-scope | `POST /api/auth/register` accepts `{email, password}` | — |
| AC3 | Create account when email not registered | PASS | `RegisterUserUseCase.cs`; test `RegisterAsync_NewEmail_ReturnsGenericSuccessAndSendsVerificationEmail` | User persisted with hash + verification token |
| AC4 | Message when email already registered | PASS (per BR) | `RegisterUserUseCase.cs:23-29` returns the **same generic success**; tests `RegisterAsync_DuplicateEmail_...`, `RegisterAsync_ConcurrentDuplicateEmail_...` | The sheet's own business rule ("generic error messages to avoid account enumeration") overrides a distinct duplicate-email message; implementation follows the BR deliberately, including the DB-race path (`UniqueConstraintViolationException`) |
| AC5 | Message when password fails policy | PASS | `RegisterRequestValidator.cs:15-23` → 400 with message | — |
| AC6 | Signed-in state after successful sign-up | N/A (superseded) | register returns `MessageResponse`, no token | Selected F4-US2 requires email verification before login; auto-sign-in after sign-up is intentionally impossible. Recorded as superseded, not a defect |
| BR | Unique email per account | PASS | `UserConfiguration` unique index (migration `AddUserAuthentication`); race handled at `RegisterUserUseCase.cs:44-49` | — |
| BR | Password policy min 8 chars | PASS | `RegisterRequestValidator.cs:19` | Implementation is stricter than the MVP policy (also requires an uppercase letter and a digit) — deviation is in the safe direction but worth noting for UX copy |
| BR | Strong password hashing (e.g. bcrypt/argon2) | PASS | `PasswordHasher.cs:8-17`: PBKDF2-SHA256, 100 000 iterations, 16-byte salt, fixed-time compare | PBKDF2 at 100k iterations is a recognized strong KDF (NIST-approved), functionally equivalent for this requirement though not literally bcrypt/argon2 |
| BR | Generic errors to avoid enumeration | PASS | identical `GenericMessage` for fresh/duplicate/failed-email paths; tests above + `RegisterAsync_EmailSendFails_StillReturnsGenericSuccess` | — |

### F4-US2 Verify email to activate account (Medium, Selected — sheet row has no AC text; verified against the implemented contract)

| # | Behavior | Verdict | Evidence | Justification |
|---|---|---|---|---|
| 1 | Verification token generated at sign-up | PASS | `RegisterUserUseCase.cs:34-36`; `VerificationTokenService.cs:14` (32 random bytes, base64url) | — |
| 2 | Token stored hashed at rest | PASS | `VerificationTokenService.cs:20` (SHA-256 hex); tests `Generate_HashOfRawTokenMatchesTokenHash`, `Generate_TokenHashIs64HexCharacters` | Raw token only leaves via email |
| 3 | `GET /api/auth/verify-email` consumes token | PASS | `VerifyEmailUseCase.cs`; tests `VerifyEmailAsync_ValidToken_VerifiesUserAndClearsTokenFields`, `..._ExpiredToken_...`, `..._UnknownToken_...`, `..._EmptyToken_...`, `..._NullExpiry_...` | Expiry enforced (`TokenExpiryHours` = 24) |
| 4 | Resend with 60 s cooldown | PASS | `ResendVerificationEmailUseCase.cs:18,29-34`; tests `ResendVerificationAsync_WithinCooldown_ReturnsGenericSuccessWithoutRegeneratingOrSending`, `..._CooldownElapsed_RegeneratesTokenSendsEmailAndStampsSentAt` | Generic response during cooldown, no token churn |
| 5 | Login blocked until verified | PASS | `LoginUserUseCase.cs:23-26` → same generic `Invalid email or password.`; test `LoginAsync_UnverifiedEmail_ReturnsUnauthorized` | No verify-first hint → no enumeration |

### F4-US3 Log in (Medium, Selected)

| # | AC | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1/AC2 | Open login screen, enter credentials | FE-scope | `POST /api/auth/login` | — |
| AC3 | Sign in with valid credentials | PASS | `LoginUserUseCase.cs:28-36` returns `AuthResponse` with JWT (HS256, 60 min, `TokenService.cs`); test `LoginAsync_ValidCredentialsAndVerifiedEmail_ReturnsSuccessWithToken` | — |
| AC4 | Message when credentials invalid | PASS | generic `Invalid email or password.` for unknown email and wrong password alike; tests `LoginAsync_InvalidPassword_ReturnsUnauthorized`, `LoginAsync_UnknownEmail_ReturnsUnauthorized`; 401 mapping pinned by `ToResponse_UnauthorizedFailure_MapsTo401` | — |
| AC5 | Stay signed in after refresh | FE-scope | token valid 60 min (`appsettings.json` `ExpirationMinutes: 60`); FE persists it | — |

### F4-US4 Log out (Medium, Selected)

| # | AC | Verdict | Evidence | Justification |
|---|---|---|---|---|
| AC1 | Log out action | PASS | `POST /api/auth/logout` (auth required, `AuthEndpoints.cs:14`); manual probe: anonymous → 401 | — |
| AC2 | Session ends immediately | PASS | `LogoutUseCase.cs` adds `jti` to `ITokenBlacklist`; test `LogoutAsync_ValidJti_RevokesTokenAndReturnsSuccess` | — |
| AC3 | App returns to logged-out state | FE-scope | — | — |
| AC4 | Prevent access after logout | PASS (design) | `JwtExtension.cs:38-41`: `OnTokenValidated` fails blacklisted `jti` on every request | Enforced in code; no automated test exercises the JWT pipeline (unit-testing middleware requires an integration harness). Caveat: blacklist is an **in-memory singleton** (`InMemoryTokenBlacklist.cs`) — an API restart empties it, so a logged-out token becomes valid again until its 60-minute expiry, and it does not scale past one instance |

---

## Non-Functional Requirements

| NFR | Requirement | Verdict | Evidence | Justification |
|---|---|---|---|---|
| NFR1 | Search results ≤ 500 ms (p95) | PASS (design) | one upstream call per search (`OpenTripMapGeocodingService`); HTTP timeout 5 s (`OpenTripMapSettings.cs:9`, applied in `InfrastructureServicesExtension.cs:80-85`); trivial post-processing | Latency is dominated by OpenTripMap; no caching layer exists, so the SLA is unproven and unprovable by unit tests. Design-review verdict only |
| NFR2 | Attraction suggestions ≤ 1000 ms (p95) | PARTIAL (design) | `OpenTripMapAttractionSearchService.cs:21-28`: 1 radius call + up to 20 **parallel** per-xid enrichment calls (`Task.WhenAll`) | The N+1 enrichment fan-out (up to 21 upstream calls per request) makes the 1 s p95 target unlikely under real provider latency; parallelism helps but the tail is governed by the slowest of 20 calls. No caching. Flagged as a latency-risk design gap |
| NFR3 | Details popup ≤ 2 s | PASS (design) | single `xid` call, 5 s timeout | Same caveat: unmeasured SLA |
| NFR5 | Handle millions of external destination records | PASS (design) | no bulk import: external data is fetched per-request and returned capped (5 locations / 20 attractions); only destinations actually added to trips are persisted, one row per xid (`AddDestinationToTripDayUseCase.cs:83-99`); no unbounded in-memory accumulation of provider data | The catalog scale stays with the provider. Minor note: `InMemoryTokenBlacklist` grows monotonically with logouts until restart (bounded by token lifetime relevance, but never pruned) |
| NFR6 | Users can only view/modify their own trips and destinations | PASS | Every trip query filters `t.UserId == userId` (`TripRepository.cs:10-21`); every use case takes the authenticated user id from claims (`TripEndpoints.cs` + `ClaimsPrincipalExtension`); foreign trip → `NotFound`. Covering tests, one per use case: `GetTripAsync_TripOwnedByAnotherUser_ReturnsNotFoundFailure`, `ExecuteAsync_TripOwnedByAnotherUser_ReturnsNotFoundFailure` (UpdateTrip), `AddDestinationToTripDayAsync_TripOwnedByAnotherUser_ReturnsNotFoundFailure`, `RemoveDestinationFromTripDayAsync_TripOwnedByAnotherUser_ReturnsNotFoundFailure`, `GetAllTripsAsync_QueriesRepositoryWithCallerUserId`, `CreateTripAsync_StampsCallerUserIdOnTrip` | Note: imported `Destination` rows are a shared catalog (not user-owned); ownership applies to trip membership, which is the behavior the requirement describes. The anonymous-request path returns 401 (manual probe, all five trip routes) |

NFR4 (drag-and-drop responsiveness) is FE-only — no backend row.

---

## Destination model alignment (focused review)

Requested focus area: does the `Destination` model align with the external API and the requirements?

**External contract (read models, `OpenTripMapModels.cs`)** — aligned with the OpenTripMap API: `geoname` (name/country/lat/lon/partial_match), `radius` features (xid/name/kinds/dist), `xid` place (kinds, `rate` as *string* — OpenTripMap uses values like `"3h"` for heritage — preview/image/url/wikipedia_extracts/address/point). Field mapping is correct and null-tolerant. Verified against live responses.

**Response DTOs** — `AttractionResponse` and `DestinationDetailsResponse` cover the selected ACs, with one dead field: `DestinationDetailsResponse.OpeningHours` is declared but never populated (F2-US4 FAIL).

**Domain model (`Destination`/`Landmark`/`Restaurant`)** — this is where alignment breaks:

1. `Destination.Rating` is a `double`, but the provider's rating is a string scale (`"1"`–`"3h"`); there is no conversion anywhere — imports just write `0` (`AddDestinationToTripDayUseCase.cs:97`).
2. Every imported place becomes a `Landmark` regardless of its OpenTripMap `kinds` — the `Restaurant` subtype and its fields (`CuisineType`, `IsHalalFriendly`) are unreachable from the external flow (`Restaurant`'s constructor doesn't even accept an `ExternalId`).
3. Provider category, image, description, and coordinates are dropped at import, so trips reload with visibly degraded data (F3-US10 AC2 PARTIAL).
4. `Landmark.OpeningHours` is non-nullable (`string.Empty` default) while the DTO layer treats opening hours as nullable-optional — a semantic mismatch between "unknown" and "empty".

Conclusion: the read-side (search/attractions/details) aligns well with OpenTripMap; the persistence-side domain model predates the OpenTripMap integration (it models a hand-seeded Landmark/Restaurant catalog) and was only minimally retrofitted (`ExternalId`). This is the root cause of findings 2, 3 and 6 below.

---

## Findings summary (PARTIAL / FAIL, ordered by requirement priority)

| # | Priority | Req | Verdict | Finding | Recommended fix | Suggested follow-up story |
|---|---|---|---|---|---|---|
| 1 | High | F1-US2 AC2 + ranking/partial BRs | PARTIAL | Geocoding uses OpenTripMap `geoname`, which returns a single best match — the API can never return a result *list*, relevance ranking is vacuous, and partial queries are labeled with the typed fragment ("Lon" instead of "London") | Switch to OpenTripMap `autosuggest` (returns multiple named suggestions) or another geocoder returning candidate lists; keep the existing dedup/cap/classify pipeline, which is already list-ready and tested | "Return multiple ranked location suggestions from geocoding search" |
| 2 | High | F3-US3 data fidelity → F3-US10 AC2 | FAIL / PARTIAL | Destinations imported by xid persist only name + xid: rating hardcoded `0`, category always `"Landmark"`, no image/description/coordinates — saved trips display degraded data compared to the attraction list the user chose from | Extend `Destination` (or the import path) to persist provider category (from `kinds`), rating, image URL and coordinates; map provider rating string to the domain type explicitly | "Persist provider category, rating and image on destinations imported into trips" |
| 3 | High (NFR) | NFR2 | PARTIAL (design) | Attraction listing makes 1 + N upstream calls (N ≤ 20 xid enrichments) per request; 1 s p95 is unlikely and there is no caching | Cache enriched attractions per xid (memory cache with TTL) and/or drop per-item enrichment by using `radius` fields already returned; measure with a load probe | "Cache attraction enrichment and measure search/attraction latency SLAs" |
| 4 | Low (US priority) | F2-US4 AC1, F2-US1 AC5 | FAIL (opening hours) | `OpeningHours` is never populated: OpenTripMap doesn't supply it and no secondary source (Foursquare per the sheet note) is integrated; the DTO field is dead | Integrate an opening-hours source (Foursquare/OSM `opening_hours`) in `IDestinationDetailsService`, or get formal sign-off to descope and remove the dead field | "Source destination opening hours from a secondary provider" |
| 5 | Low (optional AC) | F1-US3 AC7 | PARTIAL | No pagination offset — only the first ≤ 20 attractions are reachable | Add an `offset`/`page` parameter mapped to OpenTripMap `radius`'s `offset` | "Add pagination to the attractions endpoint" |
| 6 | Low | F3-US1 AC1 | PARTIAL | Trip creation requires start/end dates, stricter than "create by entering a trip name" | Either make dates optional at creation (generate days when dates are set, per F3-US2) or record the stricter contract as an accepted product decision | "Allow trip creation with name only (dates optional)" |
| 7 | Low | F1-US3 country BR | PARTIAL | No country-level attraction strategy; a country search radius-scans the geoname centroid (max 100 km) | Adopt one sheet MVP option explicitly (e.g. FE requires city selection for countries) and document it | "Define country-level attraction browsing behavior" |
| 8 | Low | F4-US4 AC4 / NFR5 | Caveat | In-memory token blacklist: emptied on restart (revoked tokens resurrect until expiry), unbounded growth between restarts, single-instance only | Move the blacklist to a store with TTL (e.g. Redis/DB) keyed by jti+expiry, or shorten token lifetime | "Durable token revocation store" |

Deliberate deviations recorded as compliant (no action): F4-US1 AC4 generic duplicate-email response (mandated by the anti-enumeration BR); F4-US1 AC6 no auto-sign-in after sign-up (superseded by selected F4-US2 email verification); password policy stricter than MVP minimum; Foursquare enrichment descoped in favor of OpenTripMap-only data (categories/ratings available).

## Test run record

- Initial run (audit baseline, 2026-07-13): `dotnet test BE` — Passed 119, Failed 0, Skipped 0 (515 ms).
- Final run (post-audit confirmation, 2026-07-13): `dotnet test BE` — Passed 119, Failed 0, Skipped 0. No production or test code was modified by this audit.
