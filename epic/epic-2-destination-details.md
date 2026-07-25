# Epic 2: Destination Details

Source: `requirement/Sheet1.html` — Feature 2: Destination Details

**Status: Implemented** (US1 + US2). This document reflects the code as built.

## Summary

Let users open a details view for a destination — name, category, description, photos, address, opening hours, and website when available — so they can decide whether to add it to a trip. This epic covers the MVP slice of Feature 2: the two "Selected = Yes" / Medium-priority user stories (US1, US2). Map/location display (US3) and dedicated opening-hours display (US4) are deferred.

**Dependency:** This epic depends on Feature 1's OpenTripMap groundwork (`epic-1-destination-suggestion.md`) — specifically the `OpenTripMapSettings` options class and typed-`HttpClient` registration pattern. Feature 1 is itself only planned, not yet implemented; whoever implements either feature should build the shared OpenTripMap plumbing (settings + HttpClient registration) once, not duplicate it.

## In-scope user stories

### US1 — Open a destination details view (Medium)

> As a user, I want to open destination details so I can see more information before adding it to my trip.

**Acceptance criteria**
1. Select a destination from the list to open its detail view.
2. View the destination name, category, and short description.
3. View images of the destination when available.
4. View the destination location on a map (optional).
5. View additional information such as address, opening hours, and website when available.
6. Identify an option to add the destination to a trip.
7. Close the destination detail view and return to the previous list.

**Business rules**
- Destination details must match the selected destination exactly.
- If some data fields are missing, the detail view must still open.
- Images and maps are optional and shown only when data is available.
- The "Add to Trip" action must be unavailable/unclickable if the user is not logged in.

**Note:** Fetch details by provider place ID (e.g., OpenTripMap xid or Foursquare).

### US2 — View photos in destination details (Medium)

> As a user, I want to see photos of a destination so I can judge if it's worth visiting.

**Acceptance criteria**
1. View destination photos when available.
2. Swipe through multiple photos when available.
3. See a placeholder when no photos are available.

**Business rules**
- Show at least 1 image if available; otherwise show placeholder.

## Out of scope / backlog (not part of this epic)

- **US3 — View map and location info** (Low): map with marker, zoom/pan, address/area label. Future work; the DTO already carries lat/lng and address fields from US1, so this is primarily a frontend map-rendering task layered on existing data.
- **US4 — View opening hours when available** (Low): largely redundant with US1's AC, which already requires displaying opening hours when available and a fallback message when missing. No separate backend work is needed beyond what's built for US1.

## Technical approach

**DTO, not Domain entity:** `DestinationDetailsResponse` (xid, name, category, description, ordered list of image URLs, address, opening hours, website, latitude/longitude) lives in `Application/DTOs/Responses/` — following Feature 1's precedent that non-persisted, provider-shaped data stays out of Domain. No "can add to trip" field is included; that's inferred client-side from the caller's auth state, not leaked by an anonymous GET.

**Service port:** `IDestinationDetailsService.GetDetailsAsync(string xid, CancellationToken)` in `Application/Interfaces/Services/` — a small, dedicated port rather than extending Feature 1's planned `IAttractionSearchService`, per Interface Segregation. Shares the same OpenTripMap `HttpClient`/settings as Feature 1's adapters.

**Infrastructure adapter:** `OpenTripMapDestinationDetailsService` calls OpenTripMap's `GET /places/xid/{xid}`, mapping name, primary category (`kinds`), Wikipedia-extract description, preview image, composed address, and website URL. **Known data-availability caveat:** OpenTripMap rarely provides structured opening-hours or website data — most responses will legitimately hit the "not available" fallback. This is expected provider behavior, consistent with the AC's "detail view must still open" rule, not a defect to fix later.

**Use case:** `IGetDestinationDetailsUseCase.ExecuteAsync(string xid) -> Result<DestinationDetailsResponse>` — `ErrorType.Validation` for empty/whitespace xid, `ErrorType.NotFound` when the provider has no match for the xid, `Result.Success` otherwise.

**"Add to Trip" gating:** Resolves a real gap — the existing `IAddDestinationToTripDayUseCase` only accepts a persisted int `Destination.Id`, but Feature 2's details view is keyed by a provider `xid` that may not exist as a `Destination` row yet. **Decision:** extend `AddDestinationToDayRequest` / `AddDestinationToTripDayUseCase` to accept a provider `xid` and upsert-by-xid internally (look up an existing `Destination` by xid; if absent, create one using data from `IDestinationDetailsService`), rather than adding a separate "import" use case and endpoint. This keeps a single client call and reuses the already-authorized `/api/trips` route. The details GET endpoint stays anonymous (browsing works logged out); "unavailable if not logged in" is enforced purely by the existing `.RequireAuthorization()` on the add-to-trip route (401) — the correct API-level translation of the UI-language AC. A future frontend greys out the button based on its own auth state; no server-side flag is needed.

**Routing:** New `GET /api/locations/{xid}/details` added to a shared `LocationEndpoints.cs` (the same `/api/locations` group Feature 1 plans to introduce), anonymous. No new "add to trip" endpoint — the existing trip-day route is reused once the request/use-case change above lands.

**Config/DI:** Reuse Feature 1's `OpenTripMapSettings` (BaseUrl/ApiKey/TimeoutMilliseconds) — no new settings class. Only new DI addition: registering `IDestinationDetailsService`'s typed `HttpClient` in `Infrastructure/Extensions/InfrastructureServicesExtension.cs`.

## Known risks / open questions

1. **Sparse provider data:** OpenTripMap frequently lacks opening hours and website fields — expect the "not available" fallback to be the common case, not the exception. This should be communicated to whoever designs the frontend empty states.
2. **Feature 1 dependency:** the shared OpenTripMap settings/HttpClient registration must exist before or alongside this epic's implementation — do not stand up a second, duplicate registration.
3. **Image ordering for "swipe" (US2):** the backend only needs to return images as a plain ordered list; no pagination or extra metadata is required — swiping through them is a frontend concern.

## Key new components (reference)

| Layer | Component | Purpose |
|---|---|---|
| Application | `IDestinationDetailsService` | Port for fetching full place details by provider xid |
| Application | `IGetDestinationDetailsUseCase` | Use case for US1/US2 |
| Application | `DestinationDetailsResponse` | Response DTO |
| Application | `AddDestinationToDayRequest` (modified), `AddDestinationToTripDayUseCase` (modified) | Accepts a provider xid, upserts into `Destination` before scheduling |
| Infrastructure | `OpenTripMapDestinationDetailsService` | HttpClient-based adapter for `/places/xid/{xid}` |
| API | `LocationEndpoints.cs` | `GET /api/locations/{xid}/details` |

## Test approach

Unit tests (xUnit + NSubstitute, following `DestinationServiceTests.cs` conventions):
- `GetDestinationDetailsUseCaseTests.cs`: success mapping, not-found (provider returns null), validation failure on empty/whitespace xid.
- Extend `AddDestinationToTripDayUseCaseTests.cs`: xid-upsert path creates a new `Destination` when none exists by that xid, and reuses an existing one when found.
