# Story 8-5: Destination Details — Multiple Images for Photo Swipe (US2-AC2)

Status: ready-for-dev

## Story

As a **user viewing a destination's details**,
I want to **see and swipe through multiple photos of the destination when they are available**,
so that **I can better judge whether it is worth visiting** (Feature 2 · US2 · AC2).

This closes the **Medium-priority gap** surfaced by story `6-6-feature-2-requirements-verification`: the details photo gallery (`AttractionHero.tsx`) already fully supports multi-photo navigation (prev/next controls, arrow keys, dot indicators for `total > 1`), but the backend supplies **at most one** image, so the swipe path is never reachable.

> **Root cause (from the 6-6 audit, citations verified at `8146a05`):** `OpenTripMapDestinationDetailsService.cs:27` reads `List<string> imageUrls = string.IsNullOrWhiteSpace(imageUrl) ? [] : [imageUrl];`, where `imageUrl` comes from the single-image call at `:19-21` (`imageProvider.GetImageUrlAsync(new DestinationImageContext { Name = place.Name, WikipediaUrl = place.Wikipedia, WikidataId = place.Wikidata }, ...)`) awaited at `:26`. `IDestinationImageProvider.GetImageUrlAsync` returns one thumbnail (Wikipedia REST summary) or one Wikidata `P18` image. Note `epic-2:55-56` already specs the DTO as carrying an "**ordered list of image URLs**", so this is a shortfall against documented design intent, not only against the sheet.

## Acceptance Criteria

1. When multiple images are available for a destination, `GET /api/locations/{xid}/details` returns an **ordered `imageUrls` list with more than one entry** (capped at a sane maximum).
2. When only one image is available, `imageUrls` contains exactly that one entry (behavior unchanged for single-image destinations).
3. When no image is available, `imageUrls` is an **empty list** and the FE placeholder still shows (US2-AC3 unchanged).
4. The image list is **ordered deterministically** (primary/lead image first), contains only non-empty, **properly URL-escaped** absolute URLs, and is **de-duplicated by the underlying Commons file title, not by URL string** — the summary thumbnail (`…/thumb/…/640px-Foo.jpg`) and the FilePath form (`Special:FilePath/Foo.jpg?width=640`) are the same photograph and must not both appear.
5. Only the **details** path changes. The attraction-list thumbnail path (`OpenTripMapAttractionSearchService`) is **unchanged** — still one representative image, no extra latency. **`DestinationResolver.ResolveAsync` (`DestinationResolver.cs:45`) also calls `GetDetailsAsync` on the add-to-trip write path and must not pay for multi-image sourcing** — either keep `maxImages = 1` for that caller or make the media-list fetch opt-in per call. A test must pin that add-to-trip issues no media-list request.
6. Multi-image sourcing **degrades gracefully, including on partial failure**: any provider/network failure yields the existing single-image (or empty) result, the endpoint still returns `200` and never throws, **and if the summary-thumbnail leg fails while media-list succeeds, the media-list images are still returned but no arbitrary item is promoted to the lead position in a way that changes the hero for a destination that previously had one** (AC2's "behavior unchanged" holds on every path, not just total failure).
7. Only **photographs** are listed. Media-list entries that are locator maps, logos, coats of arms, flags, icons or SVGs are excluded (filter on `type == "image"` **plus** a rejection list on file title/extension) — a gallery padded to the cap with a municipal crest satisfies the letter of AC1 and fails US2-AC2's intent.
8. The image cap is **validated**: `MaxDetailImages` must be `> 0`, falling back to the default when misconfigured (mirroring the `CacheMinutes > 0 ? … : Default` guard already used in the providers). A `0` or negative override must never empty every gallery.
9. Failure/absence results are **not negatively cached for the full TTL** — a transient media-list error must not pin a destination to a single image for 24 h (see Dev Notes; this is 6-6 Finding #3's defect and must not be reproduced here).
10. The frontend requires **no production changes** — the existing `AttractionHero` gallery activates automatically once `imageUrls.length > 1` (verified by an FE test asserting swipe controls render for a 2+ image details payload). Note two known FE weaknesses this story must not rely on being absent: duplicate URLs collide on the React `key` and a single `onError` drops both copies (`AttractionHero.tsx:121-123,26`), and `index` is not reset when `total` shrinks, so a failed image can snap a mid-browse user back to photo 1 (`:26-29`). AC4's title-level de-dup is what keeps the first out of reach; the second is carried in `deferred-work.md`.
11. New/updated automated tests cover: multi-image mapping, single-image fallback, empty fallback, ordering, title-level de-dup, non-photo filtering, **cap boundary (`maxImages` exactly N and N+1 candidates)**, **misconfigured cap (`0` → default, not empty)**, **cancellation**, partial-failure degradation, total-failure degradation, and no-media-list-request-on-add-to-trip.

## Tasks / Subtasks

- [ ] **Task 1: Extend the image-provider port to return an ordered list** (AC: 1, 2, 3, 4)
  - [ ] Add `Task<IReadOnlyList<string>> GetImageUrlsAsync(DestinationImageContext context, int maxImages, CancellationToken)` to `IDestinationImageProvider` (`Application/Interfaces/Services/IDestinationImageProvider.cs`). Keep the existing `GetImageUrlAsync` for the single-thumbnail callers (Interface Segregation — do not break the list path).
  - [ ] Write FAILING tests first in `WikipediaImageProviderTests.cs` for the new method (ordering, de-dup, cap, empty).
- [ ] **Task 2: Implement multi-image sourcing in `WikipediaImageProvider`** (AC: 1, 2, 4, 6, 7)
  - [ ] Source multiple images via the keyless Wikipedia REST **`/api/rest_v1/page/media-list/{title}`** endpoint (same host/derivation as the existing `page/summary` call in `BuildSummaryUrl`), selecting `type == "image"` items and composing Commons `Special:FilePath/{title}?width=640` URLs (mirror `CommonsFilePathUrlFormat`). **Escape each file title with `Uri.EscapeDataString` as the Wikidata path already does** — "mirror the format string" is not the same as mirroring the escaping, and a title containing a space, `&`, `+` or `#` otherwise 404s and silently shrinks the list.
  - [ ] Filter out non-photographs (locator maps, logos, coats of arms, flags, icons, `.svg`) before composing URLs — see AC7.
  - [ ] Compose the final ordered list as: existing summary thumbnail first (lead image), then media-list images, then the Wikidata `P18` image as a last-resort — capped at `maxImages`, non-empty, and de-duplicated **by underlying Commons file title** so the summary thumb and the FilePath form of the same file collapse to one entry (AC4).
  - [ ] Wrap every network call in the existing `catch (HttpRequestException or TaskCanceledException or JsonException)` pattern. On **total** failure fall back to `GetImageUrlAsync`'s single result (or empty). On **partial** failure keep what succeeded, but preserve the lead-image contract from AC6 — if the summary leg is the one that failed, do not silently re-hero an arbitrary media-list item for a destination that previously showed a specific photo first.
- [ ] **Task 3: Populate `DestinationDetailsResponse.ImageUrls` from the list** (AC: 1, 2, 3, 5, 6)
  - [ ] In `OpenTripMapDestinationDetailsService.cs`, keep the `DestinationImageContext` construction at `:19-21` (the new method still needs `Name`/`WikipediaUrl`/`WikidataId`) and swap the call to `GetImageUrlsAsync(context, maxImages, ct)`; then replace the single-URL assignment at **`:27`** (`List<string> imageUrls = string.IsNullOrWhiteSpace(imageUrl) ? [] : [imageUrl];`) with the returned list. Do **not** delete `:19-22` wholesale — that removes the context object the new call depends on.
  - [ ] Keep the awaited task started before `openingHoursTask` is awaited, so the image ∥ hours concurrency at `:19-29` is preserved (`OpenTripMapDestinationDetailsServiceTests.cs:126-158` deadlocks if it is serialized) and NFR3 does not regress further.
  - [ ] Add FAILING tests first in `OpenTripMapDestinationDetailsServiceTests.cs`: multi-image, single-image, empty, partial-failure, provider-throws → graceful, and cancellation.
  - [ ] Confirm `OpenTripMapAttractionSearchService` still calls `GetImageUrlAsync` only (no change), **and that `DestinationResolver.ResolveAsync` does not trigger a media-list fetch** (AC5).
- [ ] **Task 4: Config for the image cap** (AC: 1, 8)
  - [ ] Add a `MaxDetailImages` (default `8`) setting to `WikipediaSettings`, bound + validated like the existing settings, and guard its use with the established `MaxDetailImages > 0 ? MaxDetailImages : DefaultMaxDetailImages` pattern so a `0`/negative override falls back instead of emptying every gallery. Pass it through as `maxImages`. Update `WikipediaSettingsValidationTests.cs` with the `0` and negative cases.
- [ ] **Task 5: Caching** (AC: 6, 9)
  - [ ] Ensure the details image list benefits from the existing detail cache seam (the place detail is already cached via `otm:place:{xid}`); if `media-list` is fetched separately, cache it under `IResponseCache` with a key that **includes the wiki host**, e.g. `wiki:media:{wikipediaUrl}` or `wiki:media:{host}:{title}` — mirroring the existing host-bearing `wiki:image:{wikipediaUrl}|{wikidataId}` key (`WikipediaImageProvider.cs:48-57`). A bare `wiki:media:{title}` collides across language wikis (`en`/`fr` "Cathedral"), so two destinations would serve each other's photo set for 24 h, first-cached-wins.
  - [ ] **Do NOT mirror `OverpassOpeningHoursProvider`'s "cache found + not-found" pattern.** That pattern *is* 6-6 Finding #3: it stores a failure-produced `null` for the full `CacheMinutes` (1440), so one media-list `503` would freeze the gallery at a single image for 24 h while AC6 still reads as satisfied. Instead distinguish a confirmed "no additional media" result (cacheable for the full TTL) from a transient error (not cached, or a short TTL of a few minutes) — AC9. The same correction is owed to the Overpass and single-image Wikipedia paths, but that is 6-5 / the image-provider owners' work, not this story's.
- [ ] **Task 6: Frontend verification (no code change expected)** (AC: 10)
  - [ ] Add/extend an FE test in `DestinationDetailsPage.test.tsx` (or `AttractionHero.test.tsx`) asserting that a details payload with 2+ `imageUrls` renders the Next/Previous controls and dot indicators.
- [ ] **Task 7: Validation** (AC: 11)
  - [ ] Run full BE + FE suites green; run lint/build.

## Dev Notes

- **Design seam:** `IDestinationImageProvider` is the single, documented source of destination images consumed by both the details service and the attraction search service (per CLAUDE.md). Add the list capability **alongside** the single-image method rather than replacing it, so the list-heavy details path and the thumbnail-only list path stay separated. This mirrors the "provider-swap" convention already used for images and email.
- **Keyless, same-family source:** the existing `WikipediaImageProvider` already talks to the Wikipedia REST v1 API (`page/summary`) and Wikimedia Commons `Special:FilePath` — no API key. `page/media-list/{title}` is the natural multi-image extension on the same host, so no new settings/HttpClient registration beyond the existing Wikipedia client is required (only the `MaxDetailImages` value).
- **Ordering rationale:** lead thumbnail first preserves the current "best" hero image as photo 1 (no visual regression for single-image destinations); media-list supplies the additional swipeable photos; Wikidata `P18` remains a final fallback so destinations with only a `P18` still get their one image.
- **No FE work expected:** `DestinationDetailsPage.tsx:159` already passes `destination.imageUrls` into `AttractionHero`, which renders controls when `total > 1` (`AttractionHero.tsx:34-45,102-131`) and a placeholder when `total === 0` (`:64-72`). Failed image URLs are already filtered client-side (`:26,95-99`). The story is backend-only apart from a confirming test. Two FE weaknesses become *reachable* for the first time once lists exceed one entry, which is why AC4 demands title-level de-dup: duplicate URLs share a React `key` and one `onError` drops both copies (`:121-123`), and `index` is never reset when `total` shrinks, so a mid-browse failure snaps the user to photo 1 (`:26-29`). Both are recorded in `deferred-work.md`; if either is closed first, this story gets simpler, not harder.
- **Latency (NFR3):** 6-6's review round 2 **downgraded NFR3 to ⚠️** — the cold path is dominated by the mandatory OTM leg (5000 ms timeout at `OpenTripMapSettings.cs:8` plus two 429 retries at 600 ms, `OpenTripMapPlaceClient.cs:40-52`), and the image leg is already serial internally (summary → Wikidata on one 5000 ms client, `WikipediaImageProvider.cs:34-37`). **A media-list call adds a third hop to that same leg**, so it must not be added naively: fetch it only for the details endpoint (never the list endpoint or the add-to-trip resolve path), cache it (AC9), cap the count, and prefer running it concurrently with the summary fetch rather than after it. If the enrichment timeouts are tightened per 6-6 Finding #2 (~800 ms), this leg inherits that budget — design for it.
- **Graceful degradation:** consistent with the existing image/opening-hours patterns — every external failure returns null/empty, never an exception; the details endpoint stays `200` even with zero images. **But note the existing pattern's own defect:** `AwaitOrNullAsync` (`OpenTripMapDestinationDetailsService.cs:47-57`) has a bare `catch` that converts *any* fault — including a Redis outage or a cancellation — into "no images", which is indistinguishable from AC3's legitimate empty case. Do not widen that behavior; where the distinction matters (AC9), decide cacheability inside the provider, before the result reaches `AwaitOrNullAsync`.

### Project Structure Notes

- Touch points (BE): `Application/Interfaces/Services/IDestinationImageProvider.cs`, `Infrastructure/ExternalServices/Wikipedia/WikipediaImageProvider.cs`, `Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs`, `Infrastructure/Settings/WikipediaSettings.cs`.
- Touch points (tests): `WikipediaImageProviderTests.cs`, `OpenTripMapDestinationDetailsServiceTests.cs`, `WikipediaSettingsValidationTests.cs`, `DestinationDetailsPage.test.tsx`.
- Unchanged: `OpenTripMapAttractionSearchService.cs`, `DestinationResolver.cs` (must stay off the media-list path — AC5), all FE components (verification test only).
- **Curly-braces-required** and **no-comments** code style per CLAUDE.md apply to all new code.

### References

- Gap origin: `6-6-feature-2-requirements-verification.md` — Finding #1 (US2-AC2 multi-photo swipe unreachable). Related constraints from the same audit: Finding #2 (NFR3 cold-path bounding) and Finding #3 (24 h negative-cache poisoning — do not reproduce; AC9).
- Design intent: `epic/epic-2-destination-details.md:55-56` — the details DTO was specified from the start as carrying an "ordered list of image URLs".
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
- 2026-07-25: Hardened during 6-6's code review round 2, before any implementation started. Citations corrected (`OpenTripMapDestinationDetailsService.cs:19-22`→ context at `:19-21` + assignment at `:27`; `DestinationDetailsPage.tsx:157`→`:159`; `AttractionHero.tsx:32-45`→`:34-45`) — the draft had reproduced the exact stale citation 6-6 records as fixed, and its Task 3 wording would have deleted the `DestinationImageContext` the new call needs. ACs 8 → 11: de-dup moved from URL-string to **file-title** level (thumb and FilePath forms are the same photo), non-photo filtering added (media-list `type == "image"` admits maps/logos/crests), a validated floor added for `MaxDetailImages` (`0` would have emptied every gallery), partial-failure degradation specified (a failed summary leg must not re-hero an arbitrary image), URL-escaping required for the FilePath composition, `DestinationResolver`'s write path explicitly exempted, and negative-caching of transient errors forbidden — **Task 5 had instructed the developer to mirror the very cache pattern that is 6-6 Finding #3**, and its proposed `wiki:media:{title}` key dropped the wiki host, colliding across language wikis. Test list extended with cap-boundary, misconfigured-cap and cancellation cases. Status unchanged: ready-for-dev.
