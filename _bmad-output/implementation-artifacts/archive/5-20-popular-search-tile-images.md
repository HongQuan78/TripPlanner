---
baseline_commit: c44def9b9e9c233cb94b8ca6a557cf0e517faf45
---

# Story 5-20: Popular-Search Tile Images with Gradient Fallback

Status: review

## Story

As a **visitor landing on the search page**,
I want each **Popular searches** tile to show a **photograph of that city**,
so that **the pre-search body reads as a set of real destinations rather than six abstract colour swatches** — while a tile whose photograph is missing or fails to load still looks deliberate, because the existing gradient stays visible underneath.

> **Current state (verified at `c44def9`):** `FE/src/features/destinations/SearchPage.tsx:25-34` declares `POPULAR_CITIES` as six bare strings and `TILE_GRADIENTS` as six CSS-module gradient classes. The tile markup (`:394-404`) renders `<button class="{tile} {gradient}"><span class="tileScrim"/><span class="tileName">{city}</span></button>`. **There is no image path in the tile at all today** — the gradient *is* the entire visual.

## Decisions

- **D1 — Image source: hardcoded URLs in the frontend** (user decision, 2026-07-26). Rejected alternatives: (a) a new `GET /api/locations/popular` endpoint through `IDestinationImageProvider` — that provider cannot resolve by name (`IDestinationImageProvider.cs:11-14` requires a `WikipediaUrl` or `WikidataId`), so a hardcoded city→wiki-URL table would still exist, merely relocated to the backend at the cost of a port + use case + endpoint + DTO + FE hook; (b) committed local assets under `FE/public/` — rejected as unnecessary weight for six tiles.
- **D2 — Gradient is a permanent underlay, not a swapped-in branch.** The gradient class stays on every tile unconditionally and the `<img>` paints over it. This is what makes the fallback free: a null URL, a 404, a 429, or an offline viewer needs no error branch to look correct — the tile simply stays as it ships today.

## Acceptance Criteria

1. Each of the six Popular-searches tiles renders an `<img>` whose `src` is that city's hardcoded photograph URL.
2. Every tile keeps its existing gradient class regardless of image state, so the gradient is visible before the image loads, if the image fails, and if a city has no URL configured.
3. A tile whose configured URL is `null` renders **no** `<img>` element and is visually identical to today's tile.
4. When an image fails to load (`onError`), the `<img>` is removed and the tile falls back to the gradient alone — no broken-image icon, no layout shift.
5. While an image is downloading it does not partially obscure the gradient: it is mounted but not visible until `load` fires, then becomes visible. A cache-hit image (already `complete` at mount) is visible without waiting for an event.
6. The image is **decorative**: the tile's accessible name remains exactly the city name (e.g. `Tokyo`), unchanged from today. Screen-reader output gains nothing from the photograph.
7. The tile's existing behaviour is untouched: activating it pre-fills and submits the text search (`runSearch`) and focuses the input; the six cities, their order, and the gradient rotation are unchanged.
8. Every configured image URL is verified to return `200 image/*` at authoring time — no fabricated or guessed URLs.
9. Automated tests cover: image present per tile, `null`-URL tile renders no image, `onError` removes the image and leaves the tile intact, the loading→loaded visibility transition, the cache-hit path, and the accessible name staying the bare city name.

## Tasks / Subtasks

- [x] **Task 1: Restructure `POPULAR_CITIES` into name + imageUrl records** (AC: 1, 3, 7, 8)
  - [x] Replace the `string[]` with a typed `readonly` array of `{ name: string; imageUrl: string | null }`, preserving the six cities in their current order (`Đà Nẵng`, `Paris`, `Tokyo`, `Rome`, `Barcelona`, `New York`).
  - [x] Populate each `imageUrl` with the Commons `Special:FilePath?width=640` URL verified in Dev Notes → Verified image URLs. Use the same Commons FilePath convention the backend already uses (`WikipediaImageProvider.cs:19`).
  - [x] Keep `TILE_GRADIENTS` and the `index % TILE_GRADIENTS.length` rotation exactly as-is.
- [x] **Task 2: Extract a `PopularTile` component carrying the image state** (AC: 1, 2, 4, 5, 6)
  - [x] Add a `PopularTile` component taking `{ city, gradientClass, onSelect }`. Per-tile `useState` for `failed`/`loaded` is required — a single shared state on `SearchPage` cannot track six independent images. **Deviation:** placed in its own `PopularTile.tsx` rather than inside `SearchPage.tsx` — see Debug Log D3.
  - [x] Render the gradient class on the `<button>` unconditionally (D2), then, when `city.imageUrl !== null && !failed`, an `<img>` beneath the scrim.
  - [x] Give the `<img>` `alt=""` and `aria-hidden="true"` so the accessible name stays the `tileName` text alone (AC 6 — `SearchPage.test.tsx:541` asserts `getByRole('button', { name: city })`).
  - [x] `onError` → `setFailed(true)`; `onLoad` → `setLoaded(true)`; apply a hidden class until `loaded`.
  - [x] Mirror `AttractionCard.tsx:22-26`: a `useRef` + `useEffect` checking `imgRef.current?.complete` so a cached image does not strand at `opacity: 0` (this exact bug was a 5-14 review finding).
  - [x] Keep the tile's `onClick` wired to `handleTileSelect(city.name)` — signature unchanged (AC 7).
- [x] **Task 3: Tile image CSS** (AC: 2, 4, 5)
  - [x] Add `.tileImage` to `SearchPage.module.css`: absolutely positioned `inset: 0`, `width/height: 100%`, `object-fit: cover`, `z-index: 0` so it sits **below** `.tileScrim` (`z-index: 1`) and `.tileName` (`z-index: 2`).
  - [x] Add `.tileImageHidden { opacity: 0 }` plus an opacity transition using the existing `--duration-fast` token, so the photo fades over the gradient instead of popping.
  - [x] Do not alter `.tile`, `.tileScrim`, `.tileName`, or any `.tileA`–`.tileF` rule.
- [x] **Task 4: Tests** (AC: 9)
  - [x] Write FAILING tests first in `SearchPage.test.tsx` under the existing `landing body` describe. **RED verified:** 7 failed / 60 passed, every failure `Unable to find an element by: [data-testid="tile-image"]`.
  - [x] Assert each of the six tiles contains an `<img>` with the expected `src`.
  - [x] Assert `getByRole('button', { name: city })` still resolves for all six (accessible name unaffected by the image) — plus an explicit `toHaveAccessibleName('Tokyo')` and `alt=""`/`aria-hidden` assertion.
  - [x] Assert the image is hidden pre-load and visible after firing `load`.
  - [x] Assert firing `error` removes the `<img>` while the tile button and its name survive.
  - [x] Assert a `null`-`imageUrl` tile renders no `<img>` — exercise the branch by rendering `PopularTile` directly rather than mutating the shipped constant.
  - [x] Assert the cache-hit path: an image already `complete` at mount is visible with no `load` event.
  - [x] Confirm the existing tile-activation tests still pass untouched — plus a new 7th test proving a tile whose photograph failed still runs the search.
- [x] **Task 5: Validation** (AC: 1-9)
  - [x] Full FE suite green (320/320, 28 files, +7), `npm run lint` back to the 2 pre-existing warnings, `npm run build` green.
  - [x] Re-verify all six URLs return `200 image/*` (AC 8) — extracted from the shipped source, not retyped.
  - [x] Live browser verification at 1440×900 and 390×844, both the loaded and the blocked-image state.

## Dev Notes

- **Frontend-only.** No backend, DTO, endpoint, or type change. `LocationSearchResult` (`FE/src/shared/api/types.ts:12-19`) is untouched — the tiles are a static landing affordance, not API data.
- **Why `alt=""` and not the city name:** the tile's visible label already carries the city (`.tileName`), and `SearchPage.test.tsx:541` + the two activation tests select tiles by their accessible name. A non-empty `alt` would append to the button's accessible name and read as "Tokyo Tokyo". The photograph is decorative — the label is the information.
- **Why the gradient must not be conditional:** making the gradient an `else` branch of the image would leave the tile transparent during the download window (AC 5) and require an error branch to restore it (AC 4). Keeping it as an unconditional underlay makes both states correct with no extra code — see D2.
- **Cache-hit guard is not optional.** `onLoad` does not fire for an image already in the browser cache when React attaches the handler, so an `opacity: 0`-until-`loaded` image would stay invisible forever on a second visit. `AttractionCard.tsx:22-26` already solves this with `imgRef.current?.complete`; reuse that shape verbatim. Story 5-14's review caught precisely this defect.
- **Hotlinking note (accepted):** these are `upload.wikimedia.org`/`commons.wikimedia.org` URLs fetched by the browser at runtime. `FE/nginx.conf` sets no CSP, so the production container will not block them. If a URL ever rots, AC 4's `onError` path degrades that one tile to its gradient — visually acceptable, no error surface. This is the accepted cost of D1.
- **`width=640`, not a `330px-` thumb path.** Arbitrary widths on `upload.wikimedia.org/.../thumb/<n>px-` are rejected with `400` (verified). Commons `Special:FilePath/<file>?width=640` renders on demand and returns `200 image/jpeg` — and it is already the convention in `WikipediaImageProvider.cs:19`.
- **Code style:** curly braces on all control flow; **no comments** in code (CLAUDE.md + user memory).

### Verified image URLs

All six confirmed `200 image/jpeg` at authoring time (2026-07-26) via `curl -L`; sizes 119–230 KB. Titles resolved through `en.wikipedia.org/api/rest_v1/page/summary/<title>`, then converted to the Commons FilePath form.

| City | Commons file | URL |
| --- | --- | --- |
| Đà Nẵng | `Dragon_Bridge,_Da_Nang_during_day_-_20230819_(cropped).jpg` | `https://commons.wikimedia.org/wiki/Special:FilePath/Dragon_Bridge%2C_Da_Nang_during_day_-_20230819_%28cropped%29.jpg?width=640` |
| Paris | `La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques,_Paris_août_2014_(2).jpg` | `https://commons.wikimedia.org/wiki/Special:FilePath/La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg?width=640` |
| Tokyo | `Skyscrapers_of_Shinjuku_2009_January.jpg` | `https://commons.wikimedia.org/wiki/Special:FilePath/Skyscrapers_of_Shinjuku_2009_January.jpg?width=640` |
| Rome | `Trevi_Fountain,_Rome,_Italy_2_-_May_2007.jpg` | `https://commons.wikimedia.org/wiki/Special:FilePath/Trevi_Fountain%2C_Rome%2C_Italy_2_-_May_2007.jpg?width=640` |
| Barcelona | `Evening_light_over_Barcelona.jpg` | `https://commons.wikimedia.org/wiki/Special:FilePath/Evening_light_over_Barcelona.jpg?width=640` |
| New York | `View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_(cropped).jpg` | `https://commons.wikimedia.org/wiki/Special:FilePath/View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%28cropped%29.jpg?width=640` |

### Project Structure Notes

- Touch points: `FE/src/features/destinations/SearchPage.tsx`, `FE/src/features/destinations/SearchPage.module.css`, `FE/src/features/destinations/SearchPage.test.tsx`.
- Unchanged: all backend code, all API types, `SuggestionDropdown`, `recentSearches`, `searchState`, `AttractionCard`, and every other feature.

### Out of Scope

- Any backend endpoint or DTO for popular destinations (D1 rejected alternative (a)).
- Committing local image assets (D1 rejected alternative (b)).
- Changing which cities are popular, their order, or making the list configurable/dynamic.
- Images on the recent-search chips — those are text chips by design.
- The `searchState.ts` three-field collapse and the two ARIA items carried in `deferred-work.md` from story 5-19.

### References

- Current tile implementation: `FE/src/features/destinations/SearchPage.tsx:25-34,394-404`.
- Tile CSS to extend: `FE/src/features/destinations/SearchPage.module.css:311-414`.
- Image-state pattern to mirror: `FE/src/features/destinations/AttractionCard.tsx:17-26,36-58`; shimmer/hidden CSS at `AttractionCard.module.css:87-136`.
- Commons FilePath convention: `BE/TripPlanner.Infrastructure/ExternalServices/Wikipedia/WikipediaImageProvider.cs:19`.
- Predecessor story that shipped the tiles: `5-19-landing-page-framed-editorial` (spec: `spec-5-19-landing-page-framed-editorial.md`).
- Cache-hit-image regression precedent: sprint-status note for 5-14 (2026-07-16).

## Dev Agent Record

### Implementation Plan

Red-green-refactor, frontend only. Seven failing tests first (RED verified: 7 failed / 60 passed, all on the missing `tile-image` testid), then the data restructure, the `PopularTile` component, and the two CSS rules. The gradient stayed an unconditional class on the `<button>` throughout, so no state combination can produce an unstyled tile.

### Debug Log

- **D1 — `upload.wikimedia.org/.../thumb/<n>px-` rejects arbitrary widths.** The Wikipedia REST summary API returns `330px-` thumbnail URLs; rewriting the width segment to `640px-` returns **`400` with an HTML error body** for all six files (verified individually — the `330px-` original returns `200 image/jpeg` from the same host). Switched to Commons `Special:FilePath/<file>?width=640`, which renders on demand, returns `200 image/jpeg`, and is already the convention at `WikipediaImageProvider.cs:19`. Commons served **960 px** wide renders for a `width=640` request (bucketed upward) — better than requested, confirmed via `naturalWidth` in the live browser.
- **D2 — Two URLs initially returned `429`.** `Evening_light_over_Barcelona.jpg` and the New York file were rate-limited on first request, not broken; both returned `200 image/jpeg` on retry. Every verification pass since retries before reporting a failure, so a transient `429` is never recorded as a dead URL.
- **D3 — Deviation from Task 2's stated location, forced by lint.** The story said to define `POPULAR_CITIES` and `PopularTile` inside `SearchPage.tsx` and export them for the tests. Doing so introduced a **new** oxlint warning (`react(only-export-components)` at `SearchPage.tsx:32`) — the baseline is exactly 2 pre-existing warnings, and shipping a third would have been a silent regression. Split into `popularCities.ts` (data + type, no component) and `PopularTile.tsx` (component only, default export). Lint returned to the 2 pre-existing warnings and `SearchPage.tsx` now has **no** named exports at all. This also matches the feature-folder convention already in use (`recentSearches.ts`, `attractionFilters.ts`, `searchState.ts` are plain data/logic modules).
- **Live verification.** Vite dev server + the installed Chromium (`ms-playwright/chromium-1228`; the npx `playwright@1.62` CLI expects build `1234`, so the browser was driven via an explicit `executablePath`). At 1440×900 and 390×844 all six tiles reported `data-loaded="true"`, real pixels (`naturalWidth` 960), computed `opacity: 1`, computed `z-index: 0` (below the `z-index: 1` scrim), and **zero console errors**. A second pass with `**commons.wikimedia.org/**` and `**upload.wikimedia.org/**` aborted at the network layer produced `imgCount: 0` on every tile, the gradient `background-image` intact, accessible names unchanged, and no page errors — the fallback is visually identical to the pre-story tile.

### Completion Notes

The six Popular-searches tiles now render a real city photograph; the CSS gradient 5-19 shipped remains underneath as the fallback.

- **Gradient as underlay, not an alternative branch (D2 in Decisions).** The gradient class is applied to the `<button>` unconditionally and the `<img>` paints over it at `z-index: 0`, below the existing scrim. That single choice covers four states with no error-handling code: image downloading (image at `opacity: 0`, gradient visible), image loaded (photo visible), image failed (`<img>` unmounted, gradient visible), and no URL configured (no `<img>` ever rendered). Verified live in both the loaded and network-blocked states.
- **The photograph is decorative.** `alt=""` + `aria-hidden="true"` keeps each tile's accessible name the bare city name. This was load-bearing, not cosmetic: three existing tests select tiles via `getByRole('button', { name: city })`, and a descriptive `alt` would have made Tokyo's button announce as "Tokyo Tokyo". Pinned by an explicit `toHaveAccessibleName` assertion.
- **Cache-hit guard carried over from `AttractionCard`.** `onLoad` does not fire for an image already in the browser cache, so the `opacity: 0`-until-loaded image would have stranded invisible on every repeat visit — the exact defect story 5-14's review caught. The `imgRef.current?.complete` effect is pinned by its own test using the same `spyOn(HTMLImageElement.prototype, 'complete', 'get')` pattern as `AttractionCard.test.tsx:166`.
- **Zero behaviour change to the search.** `handleTileSelect` → `runSearch` is untouched; the cities, their order, and the gradient rotation are unchanged. An added test proves a tile whose photograph failed still pre-fills and submits the search.
- **No backend, DTO, or API-type change**, per decision D1 — the API alternative was costed in the story and rejected.
- **Accepted risk (recorded, not mitigated):** the six URLs are runtime hotlinks to Wikimedia. `FE/nginx.conf` sets no CSP so production will not block them, and link rot degrades one tile to its gradient with no error surface — but the URLs are unversioned third-party state that nothing in CI checks. See Follow-ups.

### Follow-ups (not blocking)

- No automated guard against image-URL rot. If a Commons file is renamed or deleted, that tile silently degrades to its gradient and only a human would notice. A CI or scheduled HEAD-check over `popularCities.ts` would close it; out of scope here.
- `SearchPage.test.tsx` is now 700+ lines covering the hero, dropdown, tiles, filters, and results. Splitting the `landing body` describe into its own file would be a pure test-organisation change, deliberately not bundled into this story.

## File List

- `FE/src/features/destinations/popularCities.ts` — **new**; `PopularCity` type + the six verified city/image records.
- `FE/src/features/destinations/PopularTile.tsx` — **new**; the tile button with per-tile image load/fail state and the cache-hit guard.
- `FE/src/features/destinations/SearchPage.tsx` — modified; `POPULAR_CITIES` moved out, tile markup replaced by `<PopularTile>`, two imports added. No named exports remain.
- `FE/src/features/destinations/SearchPage.module.css` — modified; added `.tileImage`, `.tileImageHidden`, and a `prefers-reduced-motion` rule. No existing rule altered.
- `FE/src/features/destinations/SearchPage.test.tsx` — modified; +7 tests, imports repointed to the two new modules.
- `_bmad-output/implementation-artifacts/archive/5-20-popular-search-tile-images.md` — **new**; this story.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified; story entry + dated note.

## Change Log

| Date | Change |
| --- | --- |
| 2026-07-26 | Story created from the user's request; image source decided as hardcoded FE URLs (D1) after costing and rejecting the API alternative. All six Commons URLs verified `200 image/jpeg` before authoring. |
| 2026-07-26 | Implemented all 5 tasks. Popular-searches tiles now show a city photograph over their existing gradient, which remains the fallback for the null-URL, loading, and load-failure states. `PopularTile.tsx` + `popularCities.ts` extracted (see Debug Log D3 — avoided a new lint warning). FE 320/320 (+7), lint at the 2 pre-existing warnings, build green, live-verified at 1440×900 and 390×844 in both the loaded and blocked-image states. Status → review. |
