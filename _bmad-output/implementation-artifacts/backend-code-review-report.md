# Backend Code Review — Epics 1-4

Story: [[6-2-backend-code-review-epics-1-4]]. Scope: code-behavior review of `BE/` against the four epic docs in `epic/` (`epic-1-destination-suggestion.md`..`epic-4-user-authentication.md`) — does the code actually do what each epic's "Technical approach" section claims, not just "does an endpoint/file with the right name exist." Distinct from [[6-1-backend-requirements-verification]], which audited requirements traceability against `requirement/Sheet1.html`.

Verdict vocabulary: `CONFIRMED` (code matches the epic's claim), `DEVIATION` (code differs from the claim but is arguably still correct — documentation drift, not a bug), `BUG` (code does not correctly implement the underlying AC/business rule — a real defect), `GAP` (claimed behavior has no corresponding code), `FE-scope` (purely frontend concern).

## Test run

- `dotnet build BE`: succeeded, 0 warnings / 0 errors.
- `dotnet test BE`: **119 passed / 0 failed / 0 skipped** (initial baseline run before the review; re-confirmed identical since this story made no production or test code changes).

## Epic 1 — Destination Suggestion

| Claim | Verdict | Evidence (file:line) | Justification |
|---|---|---|---|
| Country-code hint resolution when query matches a known country name | CONFIRMED | `SearchLocationsUseCase.cs:19-20` | `CountryNameHelper.GetCountryCode(query)` passed as `countryCodeHint` to `geocodingService.SearchAsync`; covered by `SearchLocations_CountryNameQuery_PassesCountryCodeHint`. |
| Dedup key = lowercased name + country code | CONFIRMED | `SearchLocationsUseCase.cs:23` | `.DistinctBy(location => (location.Name.ToLowerInvariant(), location.CountryCode))`. |
| Cap at 5 results | CONFIRMED | `SearchLocationsUseCase.cs:12,24` | `MaxResults = 5; ... .Take(MaxResults)`; covered by dedup+cap test (10→7→5). |
| City/Country classification: Country only if name matches a country AND returned country code agrees | CONFIRMED | `SearchLocationsUseCase.cs:37` | `string.Equals(CountryNameHelper.GetCountryCode(location.Name), location.CountryCode, OrdinalIgnoreCase)`; covered by both a same-name-different-country → City test and a matching-code → Country test. |
| Display-name normalization: canonical country name vs title-case city | CONFIRMED | `SearchLocationsUseCase.cs:40-43` | `CountryNameHelper.GetCanonicalName` for countries; `ToTitleCase` for cities. |
| 20 km default radius | CONFIRMED | `GetAttractionsForLocationUseCase.cs:10,15` | `DefaultRadiusMeters = 20000`. |
| 20-item cap | CONFIRMED | `GetAttractionsForLocationUseCase.cs:11,16`; `AttractionSearchParameterValidator.cs:23-26` | Use-case clamp plus an independent validator range (1-20) as defense-in-depth. |
| Per-xid detail fan-out via `Task.WhenAll`, no explicit concurrency limiter | CONFIRMED | `OpenTripMapAttractionSearchService.cs:28` | Matches the epic's own caveat that concurrency is bounded implicitly by page size. |
| Graceful degradation on `HttpRequestException`/`TaskCanceledException`/`JsonException` during detail fetch | CONFIRMED | `OpenTripMapAttractionSearchService.cs:58-61` | Per-item catch returns the basic `/radius` data instead of failing the batch. |
| OpenTripMap 404 on `/geoname` treated as empty result, not exception | CONFIRMED | `OpenTripMapGeocodingService.cs:19-23` | 404 special-cased before `EnsureSuccessStatusCode()`; other non-success codes still throw. |
| Provider failures mapped to `ErrorType.ServiceUnavailable` | CONFIRMED | `SearchLocationsUseCase.cs:29-32`, `GetAttractionsForLocationUseCase.cs:23-26` | Mapping happens in the use cases, not the Infrastructure services (which throw plain exceptions) — consistent with the epic's layering description. |
| `CountryNameHelper` is `RegionInfo`-based, no hardcoded list | CONFIRMED | `CountryNameHelper.cs:24-39` | Lazily built from `CultureInfo.GetCultures(CultureTypes.SpecificCultures)`, no literal country list. |
| Test coverage: classification, dedup+cap, default radius+cap, empty-result success, provider-failure mapping | CONFIRMED (minor gap) | `LocationServiceTests.cs` | All scenarios exist with real assertions on values, not just names — except `GetAttractionsForLocationUseCase` has no `TaskCanceledException` test (see finding #1). |

**Findings:**
1. **GAP (Low)** — `GetAttractionsForLocationUseCase` catches `TaskCanceledException` (`GetAttractionsForLocationUseCase.cs:23`) but `LocationServiceTests.cs` only tests the `HttpRequestException` branch for attraction search; the symmetric timeout test exists for location search but not attractions. Not a production defect — an untested branch. **Fix:** add `GetAttractions_ProviderTimeout_ReturnsServiceUnavailableFailure` mirroring the existing location-search timeout test. **Follow-up story:** "Add missing TaskCanceledException test coverage for GetAttractionsForLocationUseCase."
2. **DEVIATION (Low)** — `OpenTripMapAttractionSearchService.GetNearbyAsync` does not `DistinctBy(xid)` before capping to the page size (`OpenTripMapAttractionSearchService.cs:23-26`); if the provider ever returns a duplicate `xid`, a detail-call slot is wasted and duplicate attractions could surface. Not a violation of any explicit epic claim. **Fix:** add `.DistinctBy(feature => feature.Xid)` before `.Take(limit)`. **Follow-up story:** "De-duplicate attraction results by xid before capping to page size."

## Epic 2 — Destination Details

| Claim | Verdict | Evidence (file:line) | Justification |
|---|---|---|---|
| `IGetDestinationDetailsUseCase`: validation error for empty/whitespace xid | DEVIATION | `GetDestinationDetailsUseCase.cs:11-14`; `ErrorType.cs:4-10` | The epic names `ErrorType.Validation`, which doesn't exist in the enum (`BadRequest, Unauthorized, NotFound, Conflict, ServiceUnavailable`); the code correctly returns `BadRequest` (still a 400). Doc-naming drift, not a functional bug. |
| `ErrorType.NotFound` when provider has no match | CONFIRMED | `GetDestinationDetailsUseCase.cs:19-22` | Covered by `GetDestinationDetailsUseCaseTests.cs:81-90`. |
| `Result.Success` otherwise | CONFIRMED | `GetDestinationDetailsUseCase.cs:24` | Covered by 3 success-path tests. |
| Undocumented: `ErrorType.ServiceUnavailable` on provider exception/timeout | GAP (doc silent) | `GetDestinationDetailsUseCase.cs:26-29` | Real, tested behavior not mentioned in the epic's use-case bullet — informational only. |
| `OpenTripMapDestinationDetailsService` calls `GET /places/xid/{xid}` | CONFIRMED | `OpenTripMapDestinationDetailsService.cs:14-15`; `OpenTripMapSettings.cs:6` | Resolved URL matches `.../0.1/en/places/xid/{xid}`. |
| Field mapping: name, category from `kinds`, Wikipedia-extract description, preview image, composed address, website | CONFIRMED | `OpenTripMapDestinationDetailsService.cs:28-97` | All six fields map exactly as claimed. |
| xid-upsert: reuse existing `Destination` by xid | CONFIRMED | `AddDestinationToTripDayUseCase.cs:81,83-86` | `destinationRepository.GetByExternalIdAsync(xid, ...)` reused when found. |
| xid-upsert: create using data from `IDestinationDetailsService` | **BUG** | `AddDestinationToTripDayUseCase.cs:97` | `new Landmark(details.Name, 0, details.OpeningHours ?? string.Empty, details.Xid)` — always constructs a `Landmark` regardless of `details.Category` (a restaurant persists as a Landmark), hardcodes `rating = 0`, and drops `ImageUrls`, `Description`, `Address`, `Website`, `Latitude/Longitude` entirely. Only `Name`, `OpeningHours`, and the xid survive. Confirms the same defect already flagged in [[6-1-backend-requirements-verification]]'s report, now pinned at the code level. |
| `GET /api/locations/{xid}/details` anonymous | CONFIRMED | `LocationEndpoints.cs:13`; `RouteExtension.cs:20-23` | `/api/locations` group carries no `.RequireAuthorization()`. |
| "Add to Trip" gating via existing `/api/trips` authorization, no new endpoint | CONFIRMED | `RouteExtension.cs:25-29` | No separate import/add-by-xid endpoint exists. |
| `GetDestinationDetailsUseCaseTests.cs` covers success/not-found/validation | CONFIRMED | `GetDestinationDetailsUseCaseTests.cs:17-115` | All three plus two extra undocumented scenarios (service-unavailable). |
| Extended `AddDestinationToTripDayUseCaseTests.cs` create-vs-reuse tests | DEVIATION | `TripDayServiceTests.cs:129-214` | Scenarios exist and pass but live in the pre-existing `TripDayServiceTests.cs`, not a distinctly named/extended file as the epic states — naming drift only. |
| Create-test verifies data fidelity (category/rating/image) | **GAP** | `TripDayServiceTests.cs:148-168` | The test only asserts `Name` and `ExternalId`; its fixture doesn't even set `Category`/`ImageUrls`, so it cannot catch the data-loss bug above. |

**Findings:**
1. **BUG (High)** — xid-import silently drops category, image, and rating data (`AddDestinationToTripDayUseCase.cs:97`). Every destination imported from the details page becomes a `Landmark` with `rating = 0` and no photo, permanently, regardless of its real category. **Fix:** branch on `details.Category` to construct `Restaurant` vs `Landmark`; either persist a real rating source or an explicit "unrated" sentinel instead of a fake `0`; persist at least the primary image URL if the Domain model gains an image field (or explicitly document images as out of scope for persisted entities). **Follow-up story:** "Fix xid-import destination mapping to preserve category, rating, and image from provider details."
2. **GAP (Medium)** — no test guards xid-import data fidelity (`TripDayServiceTests.cs:148-168`), which let the bug above ship with 119/119 green. **Fix:** extend the fixture with `Category`/`ImageUrls` values and assert the resulting entity's runtime type/category (and image, once added) match. **Follow-up story:** "Add regression test coverage for destination field fidelity on xid import."
3. **DEVIATION (Low)** — epic doc references a nonexistent `ErrorType.Validation`; actual enum member is `BadRequest`. **Fix:** correct the epic doc wording. **Follow-up story:** "Correct epic-2 doc to reference ErrorType.BadRequest instead of nonexistent ErrorType.Validation."

## Epic 3 — Trip Planner

| Claim | Verdict | Evidence (file:line) | Justification |
|---|---|---|---|
| `Trip.UserId` added via new ctor param | CONFIRMED | `Trip.cs:11,16,21` | Tested `TripTests.cs:41-51`. |
| `Trip.Update` retains in-range days with destinations intact | CONFIRMED | `Trip.cs:25-33` | `RemoveAll` by out-of-range date, then `GenerateDays()` only adds missing dates. Tested `TripTests.cs:65-76`. |
| `Trip.Update` adds new days for new dates | CONFIRMED | `Trip.cs:35-44` | Tested `TripTests.cs:78-90`. |
| `Trip.Update` removes out-of-range days (EF cascade cleans join rows) | CONFIRMED | `Trip.cs:30`; `TripConfiguration.cs:27-30` | `OnDelete(DeleteBehavior.Cascade)` on the day FK. Tested `TripTests.cs:53-63`. |
| `Trip.Update` name-only change leaves days untouched | CONFIRMED | `Trip.cs:25-33` | Tested `TripTests.cs:92-102`. |
| `CreateTripUseCase` stamps `userId` on new Trip | CONFIRMED | `CreateTripUseCase.cs:13` | Tested `TripServiceTests.cs:96-106`. |
| `GetTripUseCase`/`GetAllTripsUseCase`/`AddDestinationToTripDayUseCase`/`RemoveDestinationFromTripDayUseCase`/`UpdateTripUseCase` all thread `userId` | CONFIRMED | Respective use-case files | Each has a dedicated cross-user → NotFound test. |
| Repository filters ownership **at the query level**, not in-memory after load | CONFIRMED | `TripRepository.cs:10-14,16-21` | `.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ...)` and `.Where(t => t.UserId == userId)` are composed into the `IQueryable` before materialization — translated to SQL, not filtered client-side. This is the safety-critical claim for NFR6 and it holds. |
| Foreign trip id → NotFound (not Forbidden) | CONFIRMED | `ErrorType.cs` has no `Forbidden` member | All five use cases map a null repo result to `NotFound`, avoiding existence leakage by design. |
| `TripResponse` does not expose `UserId` | CONFIRMED | `Application/DTOs/Responses/` | No `UserId` field on the response DTO. |
| `PUT /api/trips/{id}` wired in the authorized group | CONFIRMED | `TripEndpoints.cs:17,41-45` | Inside `MapTripEndpoints`, group carries `.RequireAuthorization()`. |
| Confirmation contract: dropped day with destinations + `Confirmed=false` → Conflict; confirmed or no-destinations-dropped → success | CONFIRMED | `UpdateTripUseCase.cs:23-38` | Tested `UpdateTripUseCaseTests.cs:46-92`. |
| `Conflict` → HTTP 409 | CONFIRMED | `ResultExtension.cs:40` | `ErrorType.Conflict => StatusCodes.Status409Conflict`. |
| `UpdateTripValidator` mirrors `CreateTripValidator` | CONFIRMED | `UpdateTripValidator.cs:10-25` | Name required, dates required, `EndDate >= StartDate`. |
| Migration `AddTripOwnership` deletes orphan trips before adding non-nullable `user_id` | CONFIRMED | `20260706095531_AddTripOwnership.cs:13-20` | `DELETE FROM trips;` runs before the non-nullable `AddColumn`. |
| `ClaimsPrincipalExtension.GetUserId()` parses `sub` claim | CONFIRMED | `ClaimsPrincipalExtension.cs:8-19` | Falls back to `ClaimTypes.NameIdentifier`; throws on unparsable claim. |
| Domain + use-case + ownership tests all present and asserting the claimed scenarios | CONFIRMED | `TripTests.cs`, `UpdateTripUseCaseTests.cs`, `TripServiceTests.cs`, `TripDayServiceTests.cs` | Every scenario named in the epic's test-approach section exists with a real assertion, not just a matching name. |

**Findings:** None. Every Epic 3 claim — including the safety-critical repository-level ownership filtering — was verified against actual code and matches exactly. No BUG, GAP, or DEVIATION identified. (One purely cosmetic doc-wording nit: the epic's test-approach note says a confirmed shrink returns "success with regenerated days," but the dropped day is deleted via cascade, not regenerated; the test itself correctly asserts deletion. Not worth a follow-up story.)

## Epic 4 — User Authentication

| Claim | Verdict | Evidence (file:line) | Justification |
|---|---|---|---|
| Duplicate-email path: no write, no email, generic success | CONFIRMED | `RegisterUserUseCase.cs:24-29` | Returns immediately after `GetByEmailAsync` finds an existing user. Tested `AuthServiceTests.cs:65-78`. |
| Fresh-email path: hash, create, token, save, then send email in try/catch (SMTP failure swallowed/logged, success still returned) | CONFIRMED | `RegisterUserUseCase.cs:31-58` | `SaveChangesAsync` happens outside the try; email send is wrapped in `try/catch` (line 49-56) and logged on failure; generic success returned unconditionally. Tested `AuthServiceTests.cs:42-62,81-94`. |
| Login: verified check happens strictly after password verification | CONFIRMED | `LoginUserUseCase.cs:18-26` | Password check fails fast first; verified-gate checked only afterward. |
| Login: invalid-password and unverified-account return identical message + `ErrorType.Unauthorized` | CONFIRMED | `LoginUserUseCase.cs:20,25` | Both branches return the literal same string `"Invalid email or password."`. Tested `AuthServiceTests.cs:111-150`. |
| `VerifyEmailUseCase`: empty/unknown/expired/already-used token → BadRequest | CONFIRMED | `VerifyEmailUseCase.cs:17-28` | Replayed (already-used) tokens fail because `VerifyEmail()` nulls the hash, making a used token indistinguishable from unknown. Tested `AuthServiceTests.cs:180-217,344-367`. |
| Valid token → `VerifyEmail()` clears both hash and expiry (single-use) | CONFIRMED | `User.cs:34-39`; `VerifyEmailUseCase.cs:30-31` | Tested `AuthServiceTests.cs:164-178`. |
| `ResendVerificationEmailUseCase`: 60s cooldown, no regen/send within cooldown | CONFIRMED (undocumented in epic-4) | `ResendVerificationEmailUseCase.cs:18,29-35` | `ResendCooldownSeconds = 60` gate exists and is tested (`AuthServiceTests.cs:262-278,280-299`), but the epic-4 "Technical approach"/"Test approach" text never mentions a cooldown — doc is incomplete relative to shipped code. |
| Resend: unknown/already-verified email → generic success without sending | CONFIRMED | `ResendVerificationEmailUseCase.cs:22-27` | Tested `AuthServiceTests.cs:235-260`. |
| `User.cs` mutators / single-use semantics | CONFIRMED | `User.cs:23-39` | `SetVerificationToken`/`VerifyEmail()` as claimed. |
| `VerificationTokenService`: 32-byte `RandomNumberGenerator`, SHA-256 hash at rest | CONFIRMED | `VerificationTokenService.cs:14,19-20` | Cryptographically strong RNG and hash, not weaker alternatives. |
| Register duplicate-email race handled via unique-constraint catch | DEVIATION (positive, undocumented) | `RegisterUserUseCase.cs:40-47` | TOCTOU-safe `UniqueConstraintViolationException` catch returning the same generic success — stronger than documented, not a defect. |
| All claimed test scenarios exist and assert correctly | CONFIRMED | `AuthServiceTests.cs` | Includes extra tests beyond the epic's stated plan (concurrent-duplicate race, `OperationCanceledException` propagation). |

**Findings:**
1. **DEVIATION (Low)** — epic-4's Technical approach/Test approach sections omit the 60-second resend cooldown and the unique-constraint race handling in `RegisterUserUseCase`, both of which exist in code and are correctly tested. **Fix:** update `epic-4-user-authentication.md` to document the `ResendCooldownSeconds` gate and the race-safety net. **Follow-up story:** "Docs: reconcile epic-4 technical approach with shipped resend-cooldown and race-safe registration behavior."
2. **Informational, accepted risk (not a new finding)** — the timing side channel between the duplicate-email fast path and the fresh-email path (PBKDF2 + SMTP round-trip) is confirmed present in code; the epic already discloses and accepts this for MVP, so no new severity is assigned. Noted for completeness only.

## Findings summary (all epics, ordered High → Medium → Low)

| # | Severity | Epic | Type | Finding | Recommended fix | Follow-up story |
|---|---|---|---|---|---|---|
| 1 | **High** | 2 | BUG | xid-import always creates a `Landmark` with `rating = 0` and drops image/description/address/website, regardless of the destination's real category | Branch on `details.Category` to construct `Restaurant` vs `Landmark`; persist a real rating or explicit "unrated" sentinel; persist at least the primary image URL (extend the Domain model if needed) | Fix xid-import destination mapping to preserve category, rating, and image from provider details |
| 2 | Medium | 2 | GAP | No test asserts xid-import data fidelity (category/rating/image), which let finding #1 ship with all tests green | Extend the fixture in `TripDayServiceTests.cs` with `Category`/`ImageUrls` and assert the created entity's type/category/image | Add regression test coverage for destination field fidelity on xid import |
| 3 | Low | 1 | GAP | `GetAttractionsForLocationUseCase`'s `TaskCanceledException` branch has no covering test (only `HttpRequestException` is tested) | Add a symmetric timeout test mirroring the existing location-search one | Add missing TaskCanceledException test coverage for GetAttractionsForLocationUseCase |
| 4 | Low | 1 | DEVIATION | `/radius` results aren't de-duplicated by `xid` before capping to the page size | Add `.DistinctBy(feature => feature.Xid)` before `.Take(limit)` | De-duplicate attraction results by xid before capping to page size |
| 5 | Low | 2 | DEVIATION | Epic-2 doc references a nonexistent `ErrorType.Validation`; actual code uses `ErrorType.BadRequest` | Correct the epic doc wording | Correct epic-2 doc to reference ErrorType.BadRequest instead of nonexistent ErrorType.Validation |
| 6 | Low | 4 | DEVIATION | Epic-4 doc omits the 60s resend cooldown and the unique-constraint race-safety net, both implemented and tested | Update epic-4 doc's Technical approach section | Docs: reconcile epic-4 technical approach with shipped resend-cooldown and race-safe registration behavior |

Epic 3 (Trip Planner) had zero findings — every claim, including the safety-critical per-user data isolation (NFR6), was verified at the query level and matches exactly.
