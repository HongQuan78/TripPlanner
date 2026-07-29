---
baseline_commit: a8ccd6413b7838c7be1b63966f394df500ec2aeb
---

# Story 8.1: Fall back to Wikipedia thumbnails when OpenTripMap has no image

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a TripPlanner user browsing or viewing a destination,
I want to see a real photo of the place even when OpenTripMap's dev-tier API has no `preview`/`image` for it,
so that I see a relevant thumbnail/photo instead of the generic placeholder whenever one is findable, while the existing placeholder fallback still covers the (rarer) case where no image exists anywhere.

## Acceptance Criteria

1. `OpenTripMapPlaceModel` (`BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapModels.cs`) gains a `Wikipedia` property (`[JsonPropertyName("wikipedia")] public string? Wikipedia { get; init; }`) mapping OpenTripMap's `/xid/{xid}` `wikipedia` field (a full Wikipedia article URL, e.g. `https://en.wikipedia.org/wiki/Eiffel_Tower`) — the same response already used for `Preview`, `Image`, and `WikipediaExtracts`.
2. A new provider-agnostic interface `IWikipediaImageService` is added to `BE/TripPlanner.Application/Interfaces/Services/` with a single method `Task<string?> GetThumbnailUrlAsync(string wikipediaUrl, CancellationToken cancellationToken = default)`. It returns `null` (never throws) when the URL can't be parsed, the page has no thumbnail, or the request fails.
3. `WikipediaImageService` (new class, `BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/WikipediaImageService.cs`, implements `IWikipediaImageService`) extracts the article title from the last path segment of `wikipediaUrl` (`Uri.UnescapeDataString`, e.g. `https://en.wikipedia.org/wiki/Eiffel_Tower` → `Eiffel_Tower`), calls Wikipedia's public REST summary endpoint `GET {BaseUrl}page/summary/{title}` (no API key required), and returns `thumbnail.source` from the JSON response if present, else `null`. Malformed `wikipediaUrl` (no path segment, or not parseable as a `Uri`), a non-success HTTP status (including 404 for a missing page), and any `HttpRequestException`/`TaskCanceledException`/`JsonException` all result in `null`, matching the existing degrade-gracefully pattern in `OpenTripMapAttractionSearchService.EnrichAsync`.
4. A new `WikipediaSettings` class is added to `BE/TripPlanner.Infrastructure/Settings/WikipediaSettings.cs`: `SectionName = "WikipediaSettings"`, `BaseUrl` (default `"https://en.wikipedia.org/api/rest_v1/"`), `TimeoutMilliseconds` (default `5000`). No API key field — the REST summary endpoint is public.
5. `OpenTripMapAttractionSearchService.EnrichAsync` (`BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs`) takes an added `IWikipediaImageService wikipediaImageService` constructor dependency. After computing `ImageUrl = detail.Preview?.Source`, if the result is still `null`/whitespace and `detail.Wikipedia` is present, call `wikipediaImageService.GetThumbnailUrlAsync(detail.Wikipedia, cancellationToken)` and use its result as `ImageUrl` (still nullable — no change to `AttractionResponse.ImageUrl`'s type or the existing FE placeholder path if it's still `null`). Do not call the Wikipedia service when `Preview?.Source` is already present (avoid an unnecessary HTTP call on the common path).
6. `OpenTripMapDestinationDetailsService.GetDetailsAsync` (`BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs`) takes the same added `IWikipediaImageService wikipediaImageService` constructor dependency. After `ComposeImageUrls(place)` returns, if the list is empty and `place.Wikipedia` is present, call `wikipediaImageService.GetThumbnailUrlAsync(place.Wikipedia, cancellationToken)` and, if it returns a non-null URL, use `[thatUrl]` as `ImageUrls` (still `List<string>`, still defaults to `[]` when nothing is found — no change to `DestinationDetailsResponse.ImageUrls`'s type or the FE `PhotoCarousel` placeholder path when it's empty). Do not call the Wikipedia service when `ComposeImageUrls` already returned at least one URL.
7. `InfrastructureServicesExtension.AddInfrastructureServices` (`BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs`) binds and validates `WikipediaSettings` via `AddOptions<WikipediaSettings>().Bind(...).Validate(settings => !string.IsNullOrWhiteSpace(settings.BaseUrl), ...).Validate(settings => settings.TimeoutMilliseconds > 0, ...).ValidateOnStart()`, and registers `services.AddHttpClient<IWikipediaImageService, WikipediaImageService>(ConfigureWikipediaClient)` following the same `BaseAddress`/`Timeout` pattern as `ConfigureOpenTripMapClient` (new private static method `ConfigureWikipediaClient`, no API key to set).
8. `BE/TripPlanner.API/appsettings.json` and `BE/.env.example` each gain a `WikipediaSettings` section (`BaseUrl`, `TimeoutMilliseconds`) with the defaults from AC #4.
9. `CLAUDE.md`'s "External services" bullet (under Key Patterns) gains a sentence noting that `IWikipediaImageService` provides a free image fallback (via Wikipedia's public REST summary API) consumed by both `OpenTripMapAttractionSearchService` and `OpenTripMapDestinationDetailsService` when OpenTripMap's own `preview`/`image` fields are absent — no API key involved, unlike the OpenTripMap/Resend integrations.
10. `dotnet test BE` passes, including: a new `WikipediaImageServiceTests` covering (a) a wikipedia URL whose summary response has a `thumbnail.source` → returns that URL, (b) a response with no `thumbnail` → returns `null`, (c) a non-success HTTP status (e.g. 404) → returns `null`, (d) a malformed/empty `wikipediaUrl` → returns `null` without making an HTTP call; a new `WikipediaSettingsValidationTests` covering valid/invalid `BaseUrl`/`TimeoutMilliseconds`; and updated tests for `OpenTripMapAttractionSearchService`/`OpenTripMapDestinationDetailsService` behavior if existing tests construct them directly (confirm during implementation whether such tests exist — none were found in `BE/TripPlanner.Tests` at story creation time, so this may be net-new coverage rather than an update).

## Tasks / Subtasks

- [x] Task 1: Map OpenTripMap's `wikipedia` field (AC: #1)
  - [x] Add `Wikipedia` property to `OpenTripMapPlaceModel` in `OpenTripMapModels.cs`

- [x] Task 2: Add the Wikipedia image-fallback seam (AC: #2, #3, #4)
  - [x] Add `IWikipediaImageService` to `BE/TripPlanner.Application/Interfaces/Services/IWikipediaImageService.cs`
  - [x] Add `BE/TripPlanner.Infrastructure/Settings/WikipediaSettings.cs`
  - [x] Add `BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/WikipediaImageService.cs` implementing title extraction + REST summary call + graceful-degrade error handling

- [x] Task 3: Wire the fallback into both OpenTripMap consumers (AC: #5, #6)
  - [x] Update `OpenTripMapAttractionSearchService` constructor + `EnrichAsync` to call the fallback only when `Preview?.Source` is absent
  - [x] Update `OpenTripMapDestinationDetailsService` constructor + `GetDetailsAsync` to call the fallback only when `ComposeImageUrls` returns empty

- [x] Task 4: DI registration and configuration (AC: #7, #8)
  - [x] In `InfrastructureServicesExtension.AddInfrastructureServices`, add `AddOptions<WikipediaSettings>()` binding/validation and `AddHttpClient<IWikipediaImageService, WikipediaImageService>(ConfigureWikipediaClient)` with a new `ConfigureWikipediaClient` method
  - [x] Add `WikipediaSettings` section to `BE/TripPlanner.API/appsettings.json`
  - [x] Add `WikipediaSettings__*` entries to `BE/.env.example`

- [x] Task 5: Documentation (AC: #9)
  - [x] Update the "External services" bullet in `CLAUDE.md` (Key Patterns section)

- [x] Task 6: Tests (AC: #10)
  - [x] Add `BE/TripPlanner.Tests/WikipediaImageServiceTests.cs` (thumbnail present / absent / non-success status / malformed URL cases)
  - [x] Add `BE/TripPlanner.Tests/WikipediaSettingsValidationTests.cs`
  - [x] Confirm whether `OpenTripMapAttractionSearchService`/`OpenTripMapDestinationDetailsService` have existing direct unit tests; if so, update them for the new constructor dependency and fallback behavior — if not, note in Completion Notes that this story does not add first-time coverage for those two classes beyond what's needed to exercise the new fallback path
  - [x] Run `dotnet test BE` and confirm the full suite passes with no regressions

## Dev Notes

- **Why Wikipedia, not a stock-photo API:** OpenTripMap's dev/free tier frequently omits `preview`/`image` for a place, but its `/xid/{xid}` response already includes a `wikipedia` URL and `wikipedia_extracts` text for many of the same places (already consumed for `DestinationDetailsResponse.Description`). Wikipedia's public REST summary API (`https://en.wikipedia.org/api/rest_v1/page/summary/{title}`) needs no API key, has generous rate limits, and — critically — returns a photo of the *same* place, unlike a keyword-matched stock-photo search (Unsplash/Pexels) which could return an unrelated photo for a generic name like "City Park". This was evaluated and rejected in favor of the Wikipedia approach during story scoping.
- **Existing placeholder behavior is out of scope and must not change:** `FE/src/components/AttractionCard.tsx` and `FE/src/components/PhotoCarousel.tsx` already render a 🏞️ placeholder when `imageUrl`/`imageUrls` is null/empty, and `AttractionCard` already falls back on an `<img onError>`. This story only improves how often the backend *has* an image to send — it makes no frontend changes. Confirm no FE files need touching; if `ImageUrl`/`ImageUrls` nullability or shape were to change, that would be a red flag this story has grown beyond its scope.
- **Two independent consumers, not a shared "enrichment orchestrator":** `OpenTripMapAttractionSearchService` (list flow, only ever reads `Preview?.Source`, ignores plain `Image`) and `OpenTripMapDestinationDetailsService` (details flow, reads both `Preview?.Source` and `Image` via `ComposeImageUrls`) each call `IWikipediaImageService` directly and independently — do not introduce a new shared "image resolution" class that both delegate to; that's a bigger refactor than this story needs. Keep the fallback call as a small addition at the end of each existing method, following the same call-only-when-needed guard in AC #5/#6.
- **Graceful degradation is the load-bearing property:** `IWikipediaImageService` must never throw — every current OpenTripMap consumer already treats missing images as an expected, non-error state (see the existing `catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)` in `EnrichAsync`). `WikipediaImageService` must catch the same exception set internally and return `null`, so callers never need their own try/catch around it.
- **No secrets, no new required config:** unlike `OpenTripMapSettings.ApiKey` or `ResendSettings.ApiKey`, `WikipediaSettings` has no key — `BaseUrl`/`TimeoutMilliseconds` only. `ValidateOnStart()` still applies so a blank `BaseUrl` fails fast rather than silently 404ing at request time.
- **Testing standards:** xUnit + NSubstitute (existing convention in `BE/TripPlanner.Tests`). For `WikipediaImageServiceTests`, follow the HTTP-client-under-test pattern already used for `ResendEmailSenderTests`/OpenTripMap-style services — inject a fake/mocked `HttpMessageHandler` (or an `HttpClient` pointed at a local test server) rather than hitting the real Wikipedia API in unit tests.
- **Verify before extending `EnrichAsync`/`GetDetailsAsync`:** re-read both methods in full at implementation time (they're short — under 40 lines each) since this story adds a constructor parameter and a conditional branch to each; don't restructure anything else in them.

### Project Structure Notes

- New folder: `BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/` for `WikipediaImageService` (sibling to the existing `ExternalServices/OpenTripMap/`, `ExternalServices/Resend/`, `ExternalServices/Email/` provider folders).
- New file in `BE/TripPlanner.Application/Interfaces/Services/` for `IWikipediaImageService`, alongside the existing `IAttractionSearchService.cs`, `IDestinationDetailsService.cs`, `IGeocodingService.cs`.
- No changes to `TripPlanner.Domain`, `TripPlanner.API` (beyond `appsettings.json`), or any `FE/` file — this story is backend-only, Infrastructure + one new Application interface.

### References

- [Source: BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapModels.cs] — `OpenTripMapPlaceModel` gains `Wikipedia`; existing `Preview`/`Image`/`WikipediaExtracts` fields this story reads alongside
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs] — `EnrichAsync` method this story extends with the fallback call
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs] — `GetDetailsAsync`/`ComposeImageUrls` this story extends with the fallback call
- [Source: BE/TripPlanner.Infrastructure/Settings/OpenTripMapSettings.cs] — settings-class shape (`SectionName`, defaults) `WikipediaSettings` follows
- [Source: BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs] — `ConfigureOpenTripMapClient`/`AddHttpClient` pattern `ConfigureWikipediaClient` follows; where the new `AddOptions<WikipediaSettings>()` block is added
- [Source: BE/TripPlanner.API/appsettings.json] — existing settings-section layout the new `WikipediaSettings` section follows
- [Source: FE/src/components/AttractionCard.tsx] — confirms the existing placeholder-on-null-imageUrl behavior this story must not change
- [Source: FE/src/components/PhotoCarousel.tsx] — confirms the existing placeholder-on-empty-imageUrls behavior this story must not change
- [Source: epic/epic-1-destination-suggestion.md, US3 AC5/AC6] — original thumbnail/placeholder requirement this story improves the image-availability rate for
- [Source: epic/epic-2-destination-details.md, US1 AC3, US2] — original images/photos/placeholder requirement this story improves the image-availability rate for
- [Source: requirement/Sheet1.html] — "Show at least 1 image if available; otherwise show placeholder" business rule this story serves
- [Source: CLAUDE.md#Key-Patterns, "External services"] — documentation this story must update with the new fallback seam
- [Source: _bmad-output/implementation-artifacts/archive/7-2-email-provider-strategy-pattern.md] — prior story in this repo using the same "new Application interface + Infrastructure implementation + DI registration" shape this story follows

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

None — implementation proceeded without needing debug logging; a running `dotnet run --project BE/TripPlanner.API` process from a prior session locked `bin/` output and had to be stopped before `dotnet build BE`/`dotnet test BE` could succeed (user-confirmed).

### Completion Notes List

- Implemented `IWikipediaImageService`/`WikipediaImageService` as a free, no-API-key Wikipedia REST-summary-based image fallback, wired into both `OpenTripMapAttractionSearchService.EnrichAsync` and `OpenTripMapDestinationDetailsService.GetDetailsAsync` only when OpenTripMap's own `preview`/`image` fields are absent, per AC #5/#6.
- Confirmed (via search) that `OpenTripMapAttractionSearchService`/`OpenTripMapDestinationDetailsService` had no existing direct unit tests in `BE/TripPlanner.Tests` prior to this story, so no existing tests needed updating for the new constructor dependency — this story adds no first-time coverage for those two classes beyond what AC #10 requires.
- `WikipediaImageServiceTests` uses a small inline `FakeHttpMessageHandler` (no existing HTTP-mocking helper existed in the test project) to cover thumbnail-present, no-thumbnail, non-success-status, and malformed/empty-URL (no HTTP call made) cases.
- `WikipediaSettingsValidationTests` follows the same `AddInfrastructureServices`/`IStartupValidator` pattern as `ResendSettingsValidationTests`/`EmailSettingsValidationTests`.
- Full `dotnet test BE` run: 135/135 passing, no regressions.

### File List

- BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapModels.cs (modified)
- BE/TripPlanner.Application/Interfaces/Services/IWikipediaImageService.cs (added)
- BE/TripPlanner.Infrastructure/Settings/WikipediaSettings.cs (added)
- BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/WikipediaImageService.cs (added)
- BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs (modified)
- BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs (modified)
- BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs (modified)
- BE/TripPlanner.API/appsettings.json (modified)
- BE/.env.example (modified)
- CLAUDE.md (modified)
- BE/TripPlanner.Tests/WikipediaImageServiceTests.cs (added)
- BE/TripPlanner.Tests/WikipediaSettingsValidationTests.cs (added)

## Change Log

- 2026-07-13: Implemented story 8.1 — added `IWikipediaImageService`/`WikipediaImageService` Wikipedia-thumbnail fallback, wired into both OpenTripMap consumers, DI/config/docs updates, and new unit tests. `dotnet test BE`: 135/135 passing.
