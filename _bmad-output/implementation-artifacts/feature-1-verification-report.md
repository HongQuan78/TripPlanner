# Feature 1: Destination Suggestion — Verification Audit

- **Source of truth:** `requirement/Sheet1.html` (rows 1–7)
- **Scope:** all 5 user stories (US1–US5), full stack (BE + FE)
- **Method:** code read + cited existing tests
- **Date:** 2026-07-21
- **Legend:** PASS ✅ · PARTIAL ⚠️ · FAIL/missing ❌ · optional/not-selected ➖

---

## US1 — Autocomplete for search field · Medium · Selected: No

| AC / Rule | Verdict | Evidence |
|---|---|---|
| 1. Type ≥2 chars → suggestions | ✅ | `SearchPage.tsx:50-56` `dropdownOpen` requires `input.trim().length >= 2 && trimmedDebounced.length >= 2`; hook enabled at `trimmed.length >= 2` (`hooks.ts:23`) |
| 2. Up to 5 suggestions | ✅ | `SearchPage.tsx:49` `.slice(0,5)`; BE `PhotonGeocodingService.cs:10` `Limit=5`; `SearchLocationsUseCase.cs:12,24` `Take(5)` |
| 3. Select a suggestion to confirm | ✅ | `SearchPage.tsx:62-69` `handleChoose` sets selection + submits |
| 4. Selected location shown in box | ✅ | `SearchPage.tsx:63` `setInput(suggestion.name)` |

**Note (not a defect):** the sheet Note says *"Use OpenTripMap Geocoding API → lat/lng"*, but geocoding is served by **Photon/OSM** (`PhotonGeocodingService`), a deliberate swap from story 5-9 to get multi-result autocomplete (OpenTripMap `geoname` returns a single best match). The same `/api/locations/search` endpoint feeds both autocomplete and US2. Fully functional though not the named provider.

## US2 — Search by city/country · High · Selected: Yes

| AC / Rule | Verdict | Evidence |
|---|---|---|
| 1. ≥1 char to start | ✅ | `LocationSearchParameterValidator.cs:10-12` `NotEmpty`; FE submit disabled when empty (`SearchPage.tsx:161`) |
| 2. List of city + country results | ✅ | `PhotonGeocodingService.cs:14` `layer=city&layer=country`; returns a list |
| 3. City/country clearly labeled | ✅ | `LocationResultList.tsx:37-38` renders `countryCode` + `locationType` pills; `SearchLocationsUseCase.Classify` sets `"City"`/`"Country"` |
| 4. Select a result | ✅ | `LocationResultList.tsx:34` `onSelect` |
| 5. View selected as active value | ✅ | `LocationResultList.tsx:32` `aria-pressed` highlight + `selected` state |
| 6. **'No attractions found'** on no match | ⚠️ | FE shows **"No matching places found."** (`SearchPage.tsx:208`) — semantically correct but wording differs from the required literal string |
| 7. Clear input | ✅ | `SearchPage.tsx:116-123,164` Clear button + `handleClear` |
| BR: include cities and countries | ✅ | Photon dual layer (above) |
| BR: **ranked by relevance (exact first)** | ⚠️ | No explicit re-rank — order delegated to Photon default relevance; `IsPartialMatch` is computed (`PhotonGeocodingService.cs:48`) but **never used to sort exact-before-partial** |
| BR: max 5 results | ✅ | Enforced at all 3 layers (Photon, use case, FE) |
| BR: no duplicates | ✅ | `SearchLocationsUseCase.cs:23` `DistinctBy((name.ToLowerInvariant(), CountryCode))` |
| BR: case-insensitive | ✅ | Photon is case-insensitive; classify normalizes via `ToLowerInvariant` |
| BR: partial matches allowed | ✅ | Photon substring match; flagged via `IsPartialMatch` |

> **This resolves the old 6-1 finding.** The backend-requirements report flagged US2-AC2 as PARTIAL because OpenTripMap `geoname` returned only one result. The Photon migration (5-9) now returns up to 5 — that gap is closed. The residual PARTIAL is only the *exact-match-first ordering* business rule.

## US3 — View recommended attractions list · High · Selected: Yes

| AC / Rule | Verdict | Evidence |
|---|---|---|
| 1. List after valid search | ✅ | `SearchPage.tsx:268-274` renders grid for a selected City |
| 2. Each attraction name | ✅ | `AttractionResponse.Name`; `AttractionCard.tsx:67` |
| 3. Category/tags when available | ✅ | `Kinds` → tags `AttractionCard.tsx:30,71-79` |
| 4. Rating/popularity when available | ✅ | `Rating` (OTM `rate`) → `StarRating` `AttractionCard.tsx:27,60-63` |
| 5. Thumbnail when available | ✅ | `ImageUrl` (Wikipedia provider) `AttractionCard.tsx:45-52` |
| 6. Placeholder when image/rating missing | ✅ | `AttractionCard.tsx:54-58` placeholder; rating badge hidden when unrated |
| 7. Pagination / load-more at 20 *(optional)* | ➖ | Not implemented — single page ≤20, no load-more. Marked optional in sheet |
| BR: fetch by coordinates + radius | ✅ | `OpenTripMapAttractionSearchService.cs:27` `radius?radius=&lat=&lon=` |
| BR: default radius City 20 km | ✅ | `GetAttractionsForLocationUseCase.cs:10` `DefaultRadiusMeters=20000` |
| BR: Country → broader / require city | ✅ | FE blocks country and prompts for a city (`SearchPage.tsx:216-225`); matches the sheet's "require city selection" MVP option |
| BR: max 20 per page | ✅ | `MaxPageSize=20` + `Math.Min` (`GetAttractionsForLocationUseCase.cs:11,16`); validator caps at 20 |
| BR: provider ranking / scoring | ✅ | `rate=2` minimum + provider order (`OpenTripMapAttractionSearchService.cs:18,27`) |

**Notes:** (1) Sheet Note mentions **Foursquare** enrichment — not integrated; enrichment is OpenTripMap detail + Wikipedia images only (documented scope decision). (2) **NFR2 latency risk persists** — the listing does 1 radius call + N per-`xid` detail calls (`FetchDetailAsync`), throttled to 5 concurrent with 429 retry (`:19-21,35-47`). Functional, but the ≤1000 ms/95% target is at risk on cold cache.

## US4 — Filter recommended attractions · Medium · Selected: No

❌ **Not implemented.** No category or rating filter exists in FE or as a backend query param (`kinds` is fixed to `interesting_places`, `OpenTripMapAttractionSearchService.cs:17`). Acceptable — story is *not selected*.

## US5 — Sort attractions · Low · Selected: No

❌ **Not implemented.** No sort control or `orderby` param; order is whatever the provider returns. Acceptable — *not selected*.

---

## Findings summary (actionable, High → Low)

1. **⚠️ US2 relevance ordering (High priority US)** — exact matches are not guaranteed first; ordering is delegated to Photon. *Fix:* sort results in `SearchLocationsUseCase` by `!IsPartialMatch` (exact first), then provider order, before `Take(5)`. Small, testable change. → follow-up story: *"Rank location search results exact-match-first."*
2. **⚠️ US2-AC6 message wording (High priority US)** — required literal *"No attractions found"* vs shipped *"No matching places found."* *Fix:* align FE copy in `SearchPage.tsx:208` (or confirm the deviation is accepted). Trivial.
3. **⚠️ NFR2 latency risk (US3)** — 1+N upstream calls per listing. *Fix:* consider caching xid details or dropping per-item enrichment from the list view. Carried over from 6-1.
4. **➖ US3-AC7 pagination** — optional, not built. No action required unless prioritized.
5. **➖ US4 filter / US5 sort** — not selected, not built. No action required.

**Test coverage backing the PASS verdicts:** `LocationServiceTests.cs` (use cases), `PhotonGeocodingServiceTests.cs`, `OpenTripMapAttractionSearchServiceTests.cs` (BE); `SearchPage.test.tsx`, `AttractionCard.test.tsx`, `api.test.ts` (FE).

---

## Verdict

Feature 1's **selected, in-scope stories (US2, US3) are functionally implemented and faithful** to the requirement, with **two minor High-priority gaps** worth a small follow-up (exact-first ordering + the AC6 message string) and one carried-over NFR2 latency risk. Non-selected US1 is fully working; US4/US5 are intentionally absent.
