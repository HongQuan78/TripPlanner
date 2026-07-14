---
baseline_commit: b492f9c021f757587cb0d94596758cc42cad4524
---

# Story 8.2: Make Wikipedia the sole destination image source behind a replaceable provider seam

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a TripPlanner user browsing attractions or viewing a destination's details,
I want every destination image to come from Wikipedia instead of OpenTripMap's dev-tier image URLs,
so that I see images that actually load (OpenTripMap's dev-tier `preview`/`image` URLs are unusable/broken), while the image source lives behind a provider-agnostic seam so it can be maintained or replaced with a different approach later via a single DI swap.

## Acceptance Criteria

1. A new provider-agnostic interface `IDestinationImageProvider` is added at `BE/TripPlanner.Application/Interfaces/Services/IDestinationImageProvider.cs` with a single method `Task<string?> GetImageUrlAsync(DestinationImageContext context, CancellationToken cancellationToken = default)`. It returns `null` (never throws) when no image can be found. `DestinationImageContext` is a sealed record in the same file (or a sibling file in the same folder) with `required string Name` and `string? WikipediaUrl` — the context record is the extension point that lets a future provider (e.g. a stock-photo API keyed by name) work without changing the interface or its callers.
2. `IWikipediaImageService` (`BE/TripPlanner.Application/Interfaces/Services/IWikipediaImageService.cs`) is deleted. `WikipediaImageService` is renamed to `WikipediaImageProvider` (file `BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/WikipediaImageProvider.cs`) and implements `IDestinationImageProvider`. Its behavior: when `context.WikipediaUrl` is present, reuse the existing title-extraction + `GET page/summary/{title}` logic and return `thumbnail.source` or `null`; when `context.WikipediaUrl` is null/whitespace, return `null` without making any HTTP call. All existing graceful-degradation behavior is preserved verbatim: malformed URL → `null`, non-success HTTP status → `null`, `HttpRequestException`/`TaskCanceledException`/`JsonException` → `null`. The `WikipediaSummaryModel`/`WikipediaThumbnailModel` records and `WikipediaSettings` are unchanged.
3. `OpenTripMapAttractionSearchService.EnrichAsync` no longer reads `detail.Preview?.Source` at all. It sets `ImageUrl` exclusively from `await imageProvider.GetImageUrlAsync(new DestinationImageContext { Name = feature.Name!, WikipediaUrl = detail.Wikipedia }, cancellationToken)` (constructor dependency changes from `IWikipediaImageService` to `IDestinationImageProvider`). `ImageUrl` remains nullable; the existing FE placeholder path when it is `null` is unchanged.
4. `OpenTripMapDestinationDetailsService.GetDetailsAsync` no longer reads `place.Preview?.Source` or `place.Image`: the `ComposeImageUrls` method is deleted. `ImageUrls` is set exclusively from the provider: call `await imageProvider.GetImageUrlAsync(new DestinationImageContext { Name = place.Name, WikipediaUrl = place.Wikipedia }, cancellationToken)`; if the result is non-null/non-whitespace, `ImageUrls = [result]`, otherwise `ImageUrls = []` (constructor dependency changes from `IWikipediaImageService` to `IDestinationImageProvider`). `DestinationDetailsResponse.ImageUrls` remains `List<string>` and the FE `PhotoCarousel` placeholder path when it is empty is unchanged.
5. The now-unused `Preview` and `Image` properties and the `OpenTripMapPreviewModel` record are removed from `BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapModels.cs` (dead code once ACs #3/#4 land — `System.Text.Json` ignores unknown JSON fields, so deserialization is unaffected). The `Wikipedia` and `WikipediaExtracts` properties stay (still used for the image provider and `Description`).
6. `InfrastructureServicesExtension.AddInfrastructureServices` replaces `services.AddHttpClient<IWikipediaImageService, WikipediaImageService>(ConfigureWikipediaClient)` with `services.AddHttpClient<IDestinationImageProvider, WikipediaImageProvider>(ConfigureWikipediaClient)`. The `WikipediaSettings` options binding/validation and `ConfigureWikipediaClient` are unchanged. Swapping to a different image approach later must require only a new `IDestinationImageProvider` implementation plus this one DI line change — no changes to either OpenTripMap service or to Application.
7. `CLAUDE.md`'s "External services" bullet (Key Patterns section) is updated: replace the `IWikipediaImageService` fallback sentence with a description of `IDestinationImageProvider` (implemented by `WikipediaImageProvider` in `Infrastructure/ExternalServices/Wikipedia/`) as the sole source of destination images — OpenTripMap's own `preview`/`image` fields are ignored because dev-tier image URLs are unusable — noting that a different image approach is a new implementation + one DI swap, mirroring the `IEmailSender` provider-swap convention.
8. `dotnet test BE` passes with no regressions. `BE/TripPlanner.Tests/WikipediaImageServiceTests.cs` is renamed to `WikipediaImageProviderTests.cs` and updated to the new interface/context shape, keeping all four existing cases (thumbnail present → URL, no thumbnail → `null`, non-success status → `null`, malformed `WikipediaUrl` → `null` with no HTTP call) and adding: (a) `WikipediaUrl` null/whitespace → `null` with no HTTP call. New direct unit tests for both OpenTripMap services (constructed with a `FakeHttpMessageHandler`-backed `HttpClient` and an NSubstitute `IDestinationImageProvider`) verify: (b) an `/xid` response containing `preview.source`/`image` values does NOT surface them — `ImageUrl`/`ImageUrls` come only from the mocked provider; (c) a `null` provider result yields `ImageUrl == null` (search) and `ImageUrls == []` (details). `WikipediaSettingsValidationTests` continues to pass unchanged.

## Tasks / Subtasks

- [ ] Task 1: Introduce the provider seam in Application (AC: #1, #2)
  - [ ] Add `IDestinationImageProvider` + `DestinationImageContext` to `BE/TripPlanner.Application/Interfaces/Services/`
  - [ ] Delete `BE/TripPlanner.Application/Interfaces/Services/IWikipediaImageService.cs`
- [ ] Task 2: Rename and adapt the Wikipedia implementation (AC: #2)
  - [ ] Rename `WikipediaImageService.cs` → `WikipediaImageProvider.cs`, class `WikipediaImageProvider : IDestinationImageProvider`
  - [ ] Adapt the entry point to take `DestinationImageContext` and short-circuit to `null` when `WikipediaUrl` is null/whitespace; keep `ExtractTitle`, the summary call, and the exception filter identical
- [ ] Task 3: Route both OpenTripMap consumers exclusively through the provider (AC: #3, #4, #5)
  - [ ] `OpenTripMapAttractionSearchService`: swap the constructor dependency, delete the `Preview?.Source` read, always call the provider
  - [ ] `OpenTripMapDestinationDetailsService`: swap the constructor dependency, delete `ComposeImageUrls`, build `ImageUrls` from the provider result only
  - [ ] Remove `Preview`, `Image`, and `OpenTripMapPreviewModel` from `OpenTripMapModels.cs`
- [ ] Task 4: DI registration (AC: #6)
  - [ ] Replace the `IWikipediaImageService` typed-client registration with `AddHttpClient<IDestinationImageProvider, WikipediaImageProvider>(ConfigureWikipediaClient)` in `InfrastructureServicesExtension`
- [ ] Task 5: Documentation (AC: #7)
  - [ ] Rewrite the Wikipedia sentence of the "External services" bullet in `CLAUDE.md`
- [ ] Task 6: Tests (AC: #8)
  - [ ] Rename/update `WikipediaImageServiceTests.cs` → `WikipediaImageProviderTests.cs`; add the no-`WikipediaUrl` case
  - [ ] Add `OpenTripMapAttractionSearchServiceTests.cs` and `OpenTripMapDestinationDetailsServiceTests.cs` covering the provider-only image path (including that `preview`/`image` JSON in the `/xid` response is ignored)
  - [ ] Run `dotnet test BE` and confirm the full suite passes

## Dev Notes

- **Why this story exists:** story 8-1 made Wikipedia a *fallback* — OpenTripMap's `preview.source`/`image` still won when present. The user has since confirmed those dev-tier (`dev.opentripmap.org`) image URLs are unusable in practice (broken/unloadable), so serving them at all is a bug: the FE renders a broken `<img>` instead of either a real photo or the placeholder. This story inverts the design: Wikipedia is the *only* image source, and the seam is generalized so "Wikipedia" itself is replaceable.
- **The seam is the deliverable, not just the behavior change.** Follow the repo's established provider-swap convention from story 7-2 (`IVerificationEmailContentBuilder`/`IEmailSender`): a provider-agnostic Application interface, one Infrastructure implementation, one `AddHttpClient` DI line. The `DestinationImageContext` record is deliberately richer than what `WikipediaImageProvider` needs today (`Name` is unused by it) — that's intentional: a future provider keyed by place name (stock-photo API, Wikimedia Commons search, self-hosted image proxy) must be pluggable without touching the interface, the two OpenTripMap services, or Application. Do not collapse the context record into a bare `string wikipediaUrl` parameter — that would re-couple the interface to Wikipedia and defeat the story's replaceability requirement.
- **Do NOT add name-based Wikipedia lookup.** When `WikipediaUrl` is absent the provider returns `null` and the FE placeholder shows. Guessing `page/summary/{Name}` was considered and rejected: generic place names ("City Park", "Central Market") resolve to unrelated articles and would show *wrong* photos, which is worse than the placeholder — the same reasoning that rejected keyword-matched stock photos in story 8-1's scoping. `Name` lives on the context for future providers, not for this one to use.
- **Rename, don't parallel-run:** `IWikipediaImageService` must be deleted, not kept alongside the new interface. It has exactly three consumers (the two OpenTripMap services and DI registration) plus one test file — all updated by this story. Leaving both seams in place is the kind of duplicate-abstraction drift this workflow exists to prevent.
- **Graceful degradation is still the load-bearing property:** `IDestinationImageProvider.GetImageUrlAsync` must never throw. `WikipediaImageProvider` keeps the exact `catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)` filter from `WikipediaImageService` (`WikipediaImageService.cs:30`), so neither OpenTripMap service needs its own try/catch around the call. Note `EnrichAsync`'s outer try/catch already swallows the same exception set for the `/xid` call itself — don't restructure that.
- **Behavior deltas to be aware of (intended, not regressions):**
  - Places whose only image was an OpenTripMap `preview`/`image` URL and that have no `wikipedia` field will now show the FE placeholder instead of a (broken) image. This is the point of the story.
  - The details flow previously could return up to 2 `ImageUrls` (preview + image); it now returns at most 1 (the Wikipedia thumbnail) or `[]`. `PhotoCarousel` already handles 0, 1, or N images — no FE change needed.
  - `EnrichAsync` now makes the Wikipedia call even when OpenTripMap *has* a preview (because the preview is ignored). Per-attraction latency is unchanged in the worst case (the calls were already sequential in the fallback path) and the `/xid` enrichment already fans out via `Task.WhenAll` (`OpenTripMapAttractionSearchService.cs:31`), so list-endpoint latency is bounded by the slowest item, not the sum.
- **No config changes:** `WikipediaSettings` (`BaseUrl`, `TimeoutMilliseconds`), its options validation, `appsettings.json`, and `.env.example` are all untouched — 8-1 already put them in place. No new secrets, no new settings class.
- **Frontend is out of scope:** `AttractionCard.tsx` (placeholder + `<img onError>` fallback) and `PhotoCarousel.tsx` (placeholder on empty list) already handle null/empty image data. If you find yourself editing any `FE/` file, the story has grown beyond its scope — stop and re-read the ACs.
- **Testing standards:** xUnit + NSubstitute (`BE/TripPlanner.Tests`). For HTTP-level tests reuse the inline `FakeHttpMessageHandler` pattern established in `WikipediaImageServiceTests.cs` (8-1 confirmed no shared HTTP-mocking helper exists — keep the fake local to each test file, matching convention). For the two OpenTripMap service tests, mock `IDestinationImageProvider` with NSubstitute and fake only the OpenTripMap HTTP responses; assert the provider was called with the expected `Name`/`WikipediaUrl` and that `preview`/`image` JSON never leaks into the response DTOs.
- **Code style guardrails:** curly braces on every control-flow statement; zero comments of any kind (no XML docs, inline, or block comments) — both are hard rules from `CLAUDE.md`.

### Project Structure Notes

- `BE/TripPlanner.Application/Interfaces/Services/` — add `IDestinationImageProvider.cs` (with `DestinationImageContext`), delete `IWikipediaImageService.cs`. Sibling interfaces for reference: `IAttractionSearchService.cs`, `IDestinationDetailsService.cs`, `IGeocodingService.cs`.
- `BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/` — `WikipediaImageService.cs` becomes `WikipediaImageProvider.cs` (same folder; keep `WikipediaSummaryModel`/`WikipediaThumbnailModel` in the file as today).
- Touched but not moved: `OpenTripMapAttractionSearchService.cs`, `OpenTripMapDestinationDetailsService.cs`, `OpenTripMapModels.cs`, `InfrastructureServicesExtension.cs`, `CLAUDE.md`.
- Untouched: `TripPlanner.Domain`, `TripPlanner.API` (including `appsettings.json`), `BE/.env.example`, all of `FE/`.
- Dependency direction check: `DestinationImageContext` lives in Application (referenced by Infrastructure) — never define it in Infrastructure, since Application code must not reference Infrastructure types.

### References

- [Source: BE/TripPlanner.Application/Interfaces/Services/IWikipediaImageService.cs] — the interface this story deletes and generalizes
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/WikipediaImageService.cs] — implementation renamed to `WikipediaImageProvider`; `ExtractTitle`, summary call, and exception filter preserved verbatim
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs#EnrichAsync] — `Preview?.Source` read removed (line 54); provider becomes sole image source
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs#ComposeImageUrls] — method deleted (lines 77–89); provider becomes sole image source
- [Source: BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapModels.cs] — `Preview`, `Image`, `OpenTripMapPreviewModel` removed; `Wikipedia`/`WikipediaExtracts` retained
- [Source: BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs] — line 89 typed-client registration swapped; `ConfigureWikipediaClient` and `WikipediaSettings` options unchanged
- [Source: BE/TripPlanner.Tests/WikipediaImageServiceTests.cs] — `FakeHttpMessageHandler` pattern to reuse; file renamed/updated by AC #8
- [Source: _bmad-output/implementation-artifacts/8-1-destination-image-wikipedia-fallback.md] — predecessor story; its Dev Notes explain the Wikipedia-over-stock-photo rationale and the graceful-degradation contract this story inherits
- [Source: _bmad-output/implementation-artifacts/7-2-email-provider-strategy-pattern.md] — the repo's provider-swap convention (`IEmailSender`) this story's seam mirrors
- [Source: CLAUDE.md#Key-Patterns, "External services"] — documentation bullet updated by AC #7
- [Source: FE/src/components/AttractionCard.tsx, FE/src/components/PhotoCarousel.tsx] — existing placeholder behavior that must keep working unchanged when the provider returns nothing

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
