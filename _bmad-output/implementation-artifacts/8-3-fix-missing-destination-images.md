---
baseline_commit: 3a80e86a33052a98ed65efbc9bf25926263376dc
---

# Story 8.3: Fix missing destination images — Wikipedia 403 root cause, language-aware lookups, and Wikidata fallback

Status: review

## Story

As a TripPlanner user searching for attractions or viewing a destination's details,
I want destination images to actually appear,
so that search results and detail pages are not a wall of placeholders — today **zero** images load even though story 8-2 made Wikipedia the sole image provider.

## Root Cause Analysis (investigated 2026-07-14)

Empirical testing against the live APIs found three stacked failures, ordered by blast radius:

1. **Fatal — Wikipedia rejects every request with 403.** Wikimedia now enforces its robot policy (phabricator T400119): requests without a `User-Agent` header get `403 Forbidden`. .NET `HttpClient` sends no `User-Agent` by default, and `ConfigureWikipediaClient` in `InfrastructureServicesExtension` never sets one (the Photon client does — the Wikipedia client was missed). Result: **100% of image lookups fail silently** (the provider swallows non-success statuses and returns `null`), which exactly matches the user-visible symptom "no images anywhere".
2. **Systematic — non-English Wikipedia URLs 404 against the hard-coded en base.** OpenTripMap returns language-specific `wikipedia` URLs (verified: ~half of Hanoi-area places link to `vi.wikipedia.org`). The provider extracts only the title and queries the configured `en.wikipedia.org` base → 404 → `null`. (Deferred finding from the 8-2 review; its blast radius is large for Vietnamese searches.)
3. **Gap — places whose Wikipedia page has no thumbnail (or no `wikipedia` URL at all) get nothing.** OpenTripMap returns a `wikidata` id for nearly every place. Wikidata's `P18` (image) claim resolves to a Commons filename, and `https://commons.wikimedia.org/wiki/Special:FilePath/{file}?width=640` serves the image directly (302 to the file) — verified working. This is the most feasible "force an image" fallback: no API key, same Wikimedia infrastructure.

4. **Discovered during e2e verification — OpenTripMap 429s the enrichment fan-out.** `GetNearbyAsync` fires one `/xid` call per result via unbounded `Task.WhenAll`; OpenTripMap's free tier admits ~10 requests/second and returns `429 Too Many Requests` for the rest (verified: 20 parallel calls → exactly 10× 200 and 10× 429). A 429 aborts `EnrichAsync` before the image provider is consulted, so roughly half the search results randomly lose their image (and rating/kinds). Fixed with a `SemaphoreSlim`-bounded fan-out (5 concurrent) plus retry-on-429 (2 retries, 600 ms delay).

Also fixed opportunistically (deferred 8-2 review finding, same method): the extracted title is unescaped but never re-escaped, so titles containing `/`, `?`, `#` corrupt the request path.

## Acceptance Criteria

1. `ConfigureWikipediaClient` in `BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs` sets a `User-Agent` product header (`TripPlanner/1.0`), mirroring `ConfigurePhotonClient`.
2. `WikipediaImageProvider` queries the wiki host named in the `wikipedia` URL: for a URL whose host ends in `.wikipedia.org` (e.g. `https://vi.wikipedia.org/wiki/...`) it requests `https://{that-host}/api/rest_v1/page/summary/{title}` as an absolute URI; any other host falls back to the configured base address (relative URI), preserving current behavior for tests and unknown sources. The extracted title is re-escaped with `Uri.EscapeDataString` before path interpolation.
3. `DestinationImageContext` gains `string? WikidataId`. Both `OpenTripMapAttractionSearchService` and `OpenTripMapDestinationDetailsService` populate it from the `/xid` response's `wikidata` field (new `Wikidata` property on `OpenTripMapPlaceModel`).
4. When the Wikipedia summary path yields no image (no `WikipediaUrl`, unusable URL, non-success response, or a summary without a thumbnail) and `WikidataId` matches `^Q\d+$`, `WikipediaImageProvider` falls back to Wikidata: `GET https://www.wikidata.org/w/api.php?action=wbgetclaims&entity={id}&property=P18&format=json`; if a `P18` claim exists, return `https://commons.wikimedia.org/wiki/Special:FilePath/{Uri.EscapeDataString(filename)}?width=640`. All existing graceful-degradation guarantees are preserved: any failure at any stage → `null`, never an exception; no image context at all → `null` with no HTTP call.
5. `dotnet test BE` passes with no regressions. New/updated unit tests cover: (a) vi.wikipedia URL → request goes to `vi.wikipedia.org` host; (b) non-wikipedia host → request uses the configured base; (c) title containing `/` or `?` is escaped in the request path; (d) Wikipedia miss + valid `WikidataId` with a P18 claim → Commons FilePath URL; (e) Wikipedia miss + `WikidataId` with empty claims → `null`; (f) malformed `WikidataId` → no Wikidata HTTP call; (g) Wikipedia hit → no Wikidata call is made.
6. `OpenTripMapAttractionSearchService.GetNearbyAsync` bounds the `/xid` enrichment fan-out to 5 concurrent requests via `SemaphoreSlim` and retries a `429 Too Many Requests` response up to 2 times with a 600 ms delay before giving up on that item (existing graceful degradation — attraction returned without enrichment — preserved as the final fallback). A unit test proves a 429-then-200 sequence still yields a fully enriched attraction.
7. End-to-end verification against the running API: `GET /api/locations/{lat}/{lon}/attractions` (via the search flow) returns a majority of results with non-null `imageUrl`, and a details request returns a non-empty `imageUrls`, for a real location (Hanoi).

## Tasks / Subtasks

- [x] Task 1: Set User-Agent on the Wikipedia HttpClient (AC: #1)
- [x] Task 2: Language-aware host + title escaping in WikipediaImageProvider (AC: #2, #5a-c)
- [x] Task 3: Wikidata P18 fallback (AC: #3, #4, #5d-g)
  - [x] Add `WikidataId` to `DestinationImageContext`; add `Wikidata` to `OpenTripMapPlaceModel`; pass it from both OpenTripMap services
  - [x] Implement the wbgetclaims fallback in `WikipediaImageProvider`
- [x] Task 4: Unit tests for all new provider behavior (AC: #5)
- [x] Task 5: Throttle + retry the OpenTripMap enrichment fan-out (AC: #6)
- [x] Task 6: Run full suite + end-to-end verification against live APIs (AC: #5, #7)

## Dev Notes

- The provider seam (`IDestinationImageProvider`) from 8-2 is unchanged — this story only enriches the context record and the single Wikipedia implementation, exactly the kind of change the seam was built for.
- Absolute URIs passed to `HttpClient.GetAsync` override `BaseAddress`, so the one Wikipedia-typed client can serve language wikis and `www.wikidata.org` without a second client registration. `DefaultRequestHeaders` (including the new User-Agent) apply either way.
- Restrict absolute-host handling to `*.wikipedia.org` so an attacker-controlled `wikipedia` field in an upstream response cannot direct server-side requests at arbitrary hosts.
- Commons `Special:FilePath` responds 302 to the actual file; browsers follow it inside `<img>`, so the URL can be returned as-is.

## Dev Agent Record

### Implementation Plan

- Diagnosis-first: reproduced each failure against the live APIs (curl) before touching code — `403` on UA-less Wikipedia requests, `404` for vi-wiki titles on the en base, `429` on >10 parallel OpenTripMap `/xid` calls, and a working Wikidata `P18` → Commons `Special:FilePath` chain.
- One typed HttpClient serves all Wikimedia hosts: absolute URIs override `BaseAddress`, so language wikis and `www.wikidata.org` need no extra client registration; `DefaultRequestHeaders` (the new User-Agent) apply to all of them.
- Absolute-host handling is restricted to `*.wikipedia.org`; any other host in the upstream `wikipedia` field falls back to the configured base, preventing SSRF via attacker-influenced upstream data.
- Image resolution order: Wikipedia summary thumbnail (language-aware) → Wikidata P18 → `null`; a Wikipedia hit short-circuits so no Wikidata call is wasted.
- Enrichment fan-out bounded to 5 concurrent with `SemaphoreSlim`; `429` retried twice with 600 ms delay inside `FetchDetailAsync`, all other failure modes unchanged (attraction returned unenriched).

### Debug Log

- `curl -H "User-Agent:" https://en.wikipedia.org/api/rest_v1/page/summary/Turtle%20Tower` → `403` "Please set a user-agent" (phabricator T400119). With any UA → `200`. This alone zeroed every image.
- Hanoi radius sample: 10/10 places had a `wikipedia` URL, but 5 pointed at `vi.wikipedia.org` → `404` against the en base; `vi` host returns the thumbnail fine.
- `wbgetclaims` P18 verified: `Q1134533` → `Turtle Tower c2006.jpg`; `Special:FilePath/{file}?width=640` → `302` to the image (browser-safe inside `<img>`).
- 20 parallel `/xid` calls → exactly 10× `200` + 10× `429`, explaining the nondeterministic half-missing enrichment.
- E2E after fix: Hanoi 14/20 attractions with images (was 0/20), Paris 14/20; remaining nulls are places with no Wikipedia thumbnail and no P18 claim (minor statues, historical events). Details endpoint returns non-empty `imageUrls` for en-wiki, vi-wiki-only, and Wikidata-fallback places.

### Completion Notes

- Root cause of "no images anywhere" was the missing User-Agent header (Wikipedia 403s every request); the language-host bug and the 429 fan-out bug then determined which places would still miss images once the 403 was fixed; the Wikidata P18 fallback closes most of the remaining gap. Images cannot be literally guaranteed for every place — some POIs have no image on any Wikimedia property — but coverage went from 0% to ~70% of search results and all three detail-page classes verified.
- Full suite: 166/166 tests pass (17 new: 9 provider tests for language hosts/escaping/Wikidata fallback, 1 search-service 429-retry test, plus reworked existing provider tests for the enriched context).
- Two deferred 8-2 review findings (non-English wiki 404, unescaped title path) are resolved by this story.

## File List

- BE/TripPlanner.Application/Interfaces/Services/IDestinationImageProvider.cs (modified — `WikidataId` on `DestinationImageContext`)
- BE/TripPlanner.Infrastructure/Extensions/InfrastructureServicesExtension.cs (modified — User-Agent on Wikipedia client)
- BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/WikipediaImageProvider.cs (modified — language-aware host, title escaping, Wikidata P18 fallback + claim models)
- BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapModels.cs (modified — `Wikidata` on `OpenTripMapPlaceModel`)
- BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapAttractionSearchService.cs (modified — bounded fan-out, 429 retry, pass `WikidataId`)
- BE/TripPlanner.Infrastructure/ExternalServices/OpenTripMap/OpenTripMapDestinationDetailsService.cs (modified — pass `WikidataId`)
- BE/TripPlanner.Tests/WikipediaImageProviderTests.cs (modified — 9 new cases)
- BE/TripPlanner.Tests/OpenTripMapAttractionSearchServiceTests.cs (modified — 429-retry case)
- _bmad-output/implementation-artifacts/8-3-fix-missing-destination-images.md (new)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-07-14: Story created from user bug report ("no destination images in search or details"), root-caused via live-API probing, and implemented in the same session: Wikipedia User-Agent fix, language-aware wiki hosts, title escaping, Wikidata P18 → Commons fallback, and OpenTripMap enrichment throttle + 429 retry. 166/166 tests green; e2e verified against Hanoi and Paris. Status → review.
