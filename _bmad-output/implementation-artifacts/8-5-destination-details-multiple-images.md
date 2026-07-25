# Story 8-5: Destination Details — Multiple Images for Photo Swipe (US2-AC2)

Status: ready-for-dev

## Story

As a **user viewing a destination's details**,
I want to **see and swipe through multiple photos of the destination when they are available**,
so that **I can better judge whether it is worth visiting** (Feature 2 · US2 · AC2).

This closes the **Medium-priority gap** surfaced by story `6-6-feature-2-requirements-verification`: the details photo gallery (`AttractionHero.tsx`) already fully supports multi-photo navigation (prev/next controls, arrow keys, dot indicators for `total > 1`), but the backend supplies **at most one** image, so the swipe path is never reachable.

> **Root cause (from the 6-6 audit):** `OpenTripMapDestinationDetailsService.cs:19-22` sets `ImageUrls = string.IsNullOrWhiteSpace(imageUrl) ? [] : [imageUrl]` — a single URL from `IDestinationImageProvider.GetImageUrlAsync`, which returns one thumbnail (Wikipedia REST summary) or one Wikidata `P18` image.

## Acceptance Criteria

1. When multiple images are available for a destination, `GET /api/locations/{xid}/details` returns an **ordered `imageUrls` list with more than one entry** (capped at a sane maximum).
2. When only one image is available, `imageUrls` contains exactly that one entry (behavior unchanged for single-image destinations).
3. When no image is available, `imageUrls` is an **empty list** and the FE placeholder still shows (US2-AC3 unchanged).
4. The image list is **ordered deterministically** (primary/lead image first), **de-duplicated**, and contains only non-empty absolute URLs.
5. The **attraction list** thumbnail path (`OpenTripMapAttractionSearchService`) is **unchanged** — it still uses a single representative image; no extra latency or behavior change there.
6. Multi-image sourcing **degrades gracefully**: any provider/network failure yields the existing single-image (or empty) result — the details endpoint still returns `200` and never throws.
7. The frontend requires **no changes** — the existing `AttractionHero` gallery activates automatically once `imageUrls.length > 1` (verified by an FE test asserting swipe controls render for a 2+ image details payload).
8. New/updated automated tests cover: multi-image mapping, single-image fallback, empty fallback, ordering + de-dup, and graceful degradation.

## Tasks / Subtasks

- [ ] **Task 1: Extend the image-provider port to return an ordered list** (AC: 1, 2, 3, 4)
  - [ ] Add `Task<IReadOnlyList<string>> GetImageUrlsAsync(DestinationImageContext context, int maxImages, CancellationToken)` to `IDestinationImageProvider` (`Application/Interfaces/Services/IDestinationImageProvider.cs`). Keep the existing `GetImageUrlAsync` for the single-thumbnail callers (Interface Segregation — do not break the list path).
  - [ ] Write FAILING tests first in `WikipediaImageProviderTests.cs` for the new method (ordering, de-dup, cap, empty).
- [ ] **Task 2: Implement multi-image sourcing in `WikipediaImageProvider`** (AC: 1, 2, 4, 6)
  - [ ] Source multiple images via the keyless Wikipedia REST **`/api/rest_v1/page/media-list/{title}`** endpoint (same host/derivation as the existing `page/summary` call in `BuildSummaryUrl`), selecting `type == "image"` items and composing Commons `Special:FilePath/{title}?width=640` URLs (mirror `CommonsFilePathUrlFormat`).
  - [ ] Compose the final ordered list as: existing summary thumbnail first (lead image), then media-list images, then the Wikidata `P18` image as a last-resort — de-duplicated, non-empty, capped at `maxImages`.
  - [ ] Wrap every network call in the existing `catch (HttpRequestException or TaskCanceledException or JsonException)` pattern; on any failure fall back to `GetImageUrlAsync`'s single result (or empty).
- [ ] **Task 3: Populate `DestinationDetailsResponse.ImageUrls` from the list** (AC: 1, 2, 3, 5, 6)
  - [ ] In `OpenTripMapDestinationDetailsService.cs`, replace the single-URL block (`:19-22`) with a call to `GetImageUrlsAsync(context, maxImages, ct)`; assign the returned list to `ImageUrls`.
  - [ ] Add FAILING tests first in `OpenTripMapDestinationDetailsServiceTests.cs`: multi-image, single-image, empty, and provider-throws → graceful.
  - [ ] Confirm `OpenTripMapAttractionSearchService` still calls `GetImageUrlAsync` only (no change).
- [ ] **Task 4: Config for the image cap** (AC: 1)
  - [ ] Add a `MaxDetailImages` (default e.g. `8`) setting to `WikipediaSettings` (bound + validated like the existing settings); pass it through as `maxImages`. Update `WikipediaSettingsValidationTests.cs`.
- [ ] **Task 5: Caching** (AC: 6)
  - [ ] Ensure the details image list benefits from the existing detail cache seam (the place detail is already cached via `otm:place:{xid}`); if `media-list` is fetched separately, cache it under a dedicated key (e.g. `wiki:media:{title}`) using `IResponseCache`, mirroring `OverpassOpeningHoursProvider`'s cache pattern (cache found + not-found).
- [ ] **Task 6: Frontend verification (no code change expected)** (AC: 7)
  - [ ] Add/extend an FE test in `DestinationDetailsPage.test.tsx` (or `AttractionHero.test.tsx`) asserting that a details payload with 2+ `imageUrls` renders the Next/Previous controls and dot indicators.
- [ ] **Task 7: Validation** (AC: 8)
  - [ ] Run full BE + FE suites green; run lint/build.

## Dev Notes

- **Design seam:** `IDestinationImageProvider` is the single, documented source of destination images consumed by both the details service and the attraction search service (per CLAUDE.md). Add the list capability **alongside** the single-image method rather than replacing it, so the list-heavy details path and the thumbnail-only list path stay separated. This mirrors the "provider-swap" convention already used for images and email.
- **Keyless, same-family source:** the existing `WikipediaImageProvider` already talks to the Wikipedia REST v1 API (`page/summary`) and Wikimedia Commons `Special:FilePath` — no API key. `page/media-list/{title}` is the natural multi-image extension on the same host, so no new settings/HttpClient registration beyond the existing Wikipedia client is required (only the `MaxDetailImages` value).
- **Ordering rationale:** lead thumbnail first preserves the current "best" hero image as photo 1 (no visual regression for single-image destinations); media-list supplies the additional swipeable photos; Wikidata `P18` remains a final fallback so destinations with only a `P18` still get their one image.
- **No FE work expected:** `DestinationDetailsPage.tsx:157` already passes `destination.imageUrls` into `AttractionHero`, which renders controls when `total > 1` (`AttractionHero.tsx:32-45,102-131`) and a placeholder when `total === 0` (`:64-72`). Failed image URLs are already filtered client-side (`:26,95-99`). The story is backend-only apart from a confirming test.
- **Latency (NFR3 watch-item):** details already caches OTM place + opening hours. Cache the media-list result too, and cap image count, to keep the cold-open within the ≤ 2 s budget flagged by 6-6. Prefer fetching media-list only for the details endpoint (not the list endpoint).
- **Graceful degradation:** consistent with the existing image/opening-hours patterns — every external failure returns null/empty, never an exception; the details endpoint stays `200` even with zero images.

### Project Structure Notes

- Touch points (BE): `Application/Interfaces/Services/IDestinationImageProvider.cs`, `Infrastructure/ExternalServices/Wikipedia/WikipediaImageProvider.cs`, `Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs`, `Infrastructure/Settings/WikipediaSettings.cs`.
- Touch points (tests): `WikipediaImageProviderTests.cs`, `OpenTripMapDestinationDetailsServiceTests.cs`, `WikipediaSettingsValidationTests.cs`, `DestinationDetailsPage.test.tsx`.
- Unchanged: `OpenTripMapAttractionSearchService.cs`, all FE components (verification test only).
- **Curly-braces-required** and **no-comments** code style per CLAUDE.md apply to all new code.

### References

- Gap origin: `6-6-feature-2-requirements-verification.md` — Finding #1 (US2-AC2 multi-photo swipe unreachable).
- Requirement: `requirement/Sheet1.html` Feature 2 · US2 (AC1 view photos, AC2 swipe multiple, AC3 placeholder; BR: ≥1 image if available else placeholder).
- Related image stories: `8-1-destination-image-wikipedia-fallback`, `8-2-wikipedia-primary-image-provider`, `8-3-fix-missing-destination-images`, `8-4-image-loading-state`.

## Dev Agent Record

### Implementation Plan

_(to be filled by the developer during implementation)_

### Completion Notes

_(to be filled by the developer during implementation)_

### Debug Log

_(to be filled by the developer during implementation)_

## File List

_(to be filled by the developer during implementation)_

## Change Log

- 2026-07-24: Story drafted from `6-6` Finding #1 (US2-AC2 multi-image gap). Status: ready-for-dev.
