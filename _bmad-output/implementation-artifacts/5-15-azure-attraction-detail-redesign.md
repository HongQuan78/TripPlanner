---
baseline_commit: bc979e3c1d0183387f1fde24b903da42e4993445
---

# Story 5.15: Redesign the attraction detail page against the Azure spine pair

Status: done

## Story

As a Trip Planner visitor viewing an attraction,
I want the detail page rebuilt as the full-bleed hero + two-column sticky booking layout with an interactive map and a nearby rail specified in the Azure UX spine pair,
so that the detail experience reads as a fast, trustworthy consumer travel product while every shipped data-degradation, add-to-trip, and accessibility contract is preserved.

## Context

Source of truth: the spine pair at `_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-16/` — `DESIGN.md` (Azure visual tokens/components) and `EXPERIENCE.md` (experience contract), plus the review artifacts (`review-rubric.md`, `review-accessibility.md`, `validation-report.md`). The mockup `mockups/attraction-detail-azure.html` is a spine-derived reference; **the spines win on conflict** (notably the mockup's older, pre-AA-tuned hex values — the DESIGN.md frontmatter `colors` are the authoritative, WCAG-tuned tokens). Azure is a **fresh standalone identity** that does NOT inherit the app-wide Horizon token layer in `FE/src/index.css`; its palette/ramp/shape logic are therefore scoped locally to the detail-page root rather than mutating the global tokens (which every other screen depends on). The page lives at `/attractions/:xid` (`FE/src/pages/DestinationDetailsPage.tsx`) inside `AppLayout`; the full-bleed hero breaks out of `AppLayout`'s centered `max-width` column via a full-bleed technique. The `AddToTripContext.requestAdd` already implements the spine's exact logged-out→login(returnTo)→return→complete-pending-add flow — it is reused unchanged. The nearby rail reuses `GET /api/locations/attractions?latitude=&longitude=`. The interactive map ships on `leaflet` + `react-leaflet` (user-approved new dependencies; react-leaflet v5 supports React 19), with OSM raster tiles (no key/token) and a custom Azure `divIcon` marker to avoid Leaflet's bundler icon-asset gotcha.

## Acceptance Criteria

1. **Azure token layer (scoped).** The detail page renders under a scoped Azure token set (CSS custom properties on the page root) sourced verbatim from `DESIGN.md` frontmatter `colors`/`typography`/`rounded`/`spacing` — the AA-tuned values (primary `#1668b4`, teal `#0d7d7d`, label-muted `#586980`, na `#5e6e80`, open-now `#137a45`, star `#b5780f`, ink `#0f2540`, etc.), Inter with the documented fallbacks. No change to `FE/src/index.css` global tokens; other screens are visually unaffected.
2. **Full-bleed hero.** Above both columns, an edge-to-edge hero (`360px` desktop / `180px` mobile) breaks out of the `AppLayout` column. It carries the photograph (single image, carousel when multiple, or the diagonal-hatch "No photo yet" placeholder when zero), the two-band legibility scrim (dark cap at top + dark floor at bottom per `{components.hero.scrim}`), and overlaid content: the "← Back" control (top-left, 44px min hit area, white 92% chip), an optional "Photo · …" credit (top-right), and bottom-left the category eyebrow badge on a dark translucent plate (omitted when `category` is null), the attraction name as the page's single `<h1>` in `{typography.display}` white with the `{components.hero.text-shadow}`, and an optional location line. Carousel behavior is preserved from the shipped `PhotoCarousel` (single = static, multiple = arrows + dots + keyboard arrows + lazy frames + dropping failed photos, zero/failed = placeholder), now composed as the full-bleed hero background with overlay on top.
3. **Two-column desktop / single-column mobile.** At ≥1024px the body is a two-column grid inside a `1120px` max width: fluid main column (lead → Location/map → Details → Nearby) + a fixed `340px` sticky booking panel, `32px` gutter. Below 1024px it collapses to a single column with `16px` side margins, the booking panel's facts fold into the flow, and the CTA detaches to a sticky bottom action bar with reserved bottom padding so it never occludes content. Reading/DOM/tab order is Back → hero(name/category/location) → lead → Location/map → Details → Nearby → booking-panel/bar CTA on both form factors. The nearby rail stays a horizontal rail on mobile (never restacks vertical).
4. **Lead + Details info rows.** Lead description in `{typography.lead}` slate, or "No description available." when absent. A hairline-divided bordered white info block with one row each for Address, Opening hours, Website: `110px` label-caps key in label-muted, value in body ink; Website renders as a primary-color new-tab link (`target="_blank"`, `rel="noopener noreferrer"`) with a visually-hidden "(opens in new tab)"; missing values render "Not available" in the na tone italic. Rows never collapse out.
5. **Open-now badge.** When `openingHours` parses confidently to an open/closed determination for the current local time, an inline badge sits beside the hours value: "● Open now" (green dot + text on the 10%-tint green fill, `11px/700`) or a muted "Closed" variant. When the string is unparseable, no badge (raw string still shown). When `openingHours` is absent, the row reads "Not available" and no badge. Status is conveyed by text, not color alone; the dot is decorative (`aria-hidden`).
6. **Interactive map.** When both `latitude` and `longitude` are non-null, a `210px` bordered (hairline, 6px) Leaflet map with OSM raster tiles renders under a "Location" `<h2>`: single Azure marker (`{colors.primary}` fill, white ring) at the coords with the attraction name as its accessible label, pan/zoom enabled and keyboard-operable, and mandatory legible "© OpenStreetMap contributors" attribution in the tab order. When either coord is null, the entire Location module (heading + map) is a quiet omission. Map tile failures never escalate to a page-level error.
7. **Nearby rail.** When coords exist, `GET /api/locations/attractions` is fetched with this attraction's coords; the current attraction is filtered out by `xid` and the list capped (first 8 after self-filter). Under a "Nearby attractions" `<h2>`, a horizontal-scroll rail of `200px` cards, each a whole-card link to `/attractions/{xid}`: `108px` thumbnail (or hatch placeholder), teal tracked-caps kind (from `kinds[0]`), name, and a meta row splitting the ★ rating (deep-gold glyph + slate numeric value, omitted when the card's own rating is null) and "X km away" (from `distanceMeters`, omitted when null). Empty result, no coords, or a failed request → quiet omission of the entire module (heading + rail) — never an error, never a "nothing nearby" message.
8. **Booking panel / sticky bar + Add to Trip.** Desktop: a sticky `340px` white panel (8px radius, hairline, the one soft shadow) with teal category eyebrow, the attraction name in `{typography.panel-title}` (NOT a second `<h1>`), an optional context line, a hairline-divided fact list, the single primary *Add to Trip* button, and a one-line note. Mobile: the same *Add to Trip* in the sticky bottom bar with a compact context line. The button is always an **enabled, focusable** control (never a dead `disabled`): authed → `requestAdd(xid)` (or the `onAddToTrip` integration prop) opens the trip picker; logged-out → the same activation routes to login and returns to complete the pending add, with the note "Log in to add to your trip" ("Log in" as a primary link). Exactly one primary button per surface.
9. **States & accessibility floor.** Loading (Back present + Azure-neutral "Loading destination…" with no layout shift), Not found (404: "Destination not found" heading + "We couldn't find this destination — it may no longer exist.", Back present, no retry), and Service-unavailable (heading + "Something went wrong while loading this destination. Please try again." + a working **Try again** refetch, Back present) states are kept; error/not-found move focus to the heading. Every interactive element (Back, carousel arrows/dots, map + zoom controls, each nearby card, links, Add to Trip) is keyboard-reachable in reading order with the `{components.focus-ring}` visible focus ring (2px, 2px offset). `prefers-reduced-motion` is honored (no auto-advance — banned regardless; hover-lift and transitions reduce to instant). Tap targets ≥44px.
10. **Quality gates.** `npm test`, `npm run lint`, and `npm run build` pass in `FE/`; the existing `DestinationDetailsPage` tests are updated to the new structure/copy ("Log in to add to your trip"); new tests cover the open-now parser, the nearby rail (fetch-with-coords, self-filter, cap, quiet omission on empty/error/no-coords), the hero (single/multiple/zero-image + overlay), and the info-row/state contracts. Leaflet is mocked in the page test (jsdom has no layout).

## Tasks / Subtasks

- [x] Task 1: Add map deps + Azure token layer (AC: #1, #6)
  - [x] 1.1 `npm i leaflet react-leaflet` + `npm i -D @types/leaflet` in `FE/`; import `leaflet/dist/leaflet.css`
  - [x] 1.2 Define the scoped Azure token set (CSS custom properties) on the detail-page root in `DestinationDetailsPage.module.css`, sourced from `DESIGN.md` frontmatter
- [x] Task 2: Open-now parser util (AC: #5)
  - [x] 2.1 `FE/src/utils/openNow.ts` — parse a raw OpenTripMap hours string to `{ status: 'open' | 'closed' } | null` (null when unparseable) for the current local time
  - [x] 2.2 Unit tests `FE/src/utils/openNow.test.ts` covering confident-open, confident-closed, and unparseable/ambiguous → null
- [x] Task 3: AttractionHero component (AC: #2)
  - [x] 3.1 `FE/src/components/AttractionHero.tsx` + `.module.css` — full-bleed photo (single/carousel/hatch-placeholder) migrating `PhotoCarousel`'s load/error/drop-failed/keyboard logic, two-band scrim, and overlay slots (back, credit, eyebrow, h1 title, location)
  - [x] 3.2 `FE/src/components/AttractionHero.test.tsx` migrating + extending the carousel coverage (single static, multiple arrows/dots/keyboard/wrap, zero → placeholder with overlay, failed-photo drop); remove `PhotoCarousel.tsx` + `PhotoCarousel.test.tsx` (sole consumer was the detail page)
- [x] Task 4: AttractionMap component (AC: #6)
  - [x] 4.1 `FE/src/components/AttractionMap.tsx` + `.module.css` — react-leaflet `MapContainer` + OSM `TileLayer` (attribution) + custom Azure `divIcon` marker with the attraction name as accessible label; keyboard-operable
- [x] Task 5: NearbyRail component + hook (AC: #7)
  - [x] 5.1 `useNearbyAttractions(latitude, longitude, selfXid)` in `FE/src/hooks/locations.ts` — enabled only with both coords; self-filter + cap in the hook or component
  - [x] 5.2 `FE/src/components/NearbyRail.tsx` + `.module.css` (with the small nearby card) + `.test.tsx` — rail render, self-filter, cap, quiet omission on empty/error/no-coords, "X km away" + ★ rules
- [x] Task 6: Rebuild DestinationDetailsPage layout (AC: #2, #3, #4, #5, #8, #9)
  - [x] 6.1 Rewrite `DestinationDetailsPage.tsx`: hero + two-column grid + sticky panel + mobile sticky bar, lead, info rows with open-now badge, states with focus-to-heading, Add to Trip wiring (`requestAdd`/`onAddToTrip`) with the "Log in to add to your trip" note
  - [x] 6.2 Rewrite `DestinationDetailsPage.module.css`: Azure layout (full-bleed hero break-out, responsive two-column↔single-column, sticky panel/bar, info block, focus ring, reduced-motion)
  - [x] 6.3 Update `DestinationDetailsPage.test.tsx` to the new structure/copy; mock `AttractionMap`
- [x] Task 7: Tests, lint, build, visual verification (AC: #10)

## Dev Notes

- **Token scoping.** Azure must not leak into the Horizon app. Put all Azure custom properties on the page's root class (e.g. `.page { --az-ink: #0f2540; … }`) and reference only those inside the detail-page CSS modules. The nearby card and hero are Azure-only components, so their modules can assume the Azure vars are present via the page root (they render only inside the page).
- **Full-bleed hero inside AppLayout.** `AppLayout .content` is a centered `max-width: 72rem` column with padding. The hero breaks out with the standard trick: `width: 100vw; margin-left: calc(50% - 50vw);` (and the same on the right) so it spans the viewport while the two-column body keeps the `1120px` max width. Verify no horizontal scrollbar appears.
- **Carousel → hero migration.** `PhotoCarousel` is used only by the detail page (+ its own test). Fold its logic (loaded/failed image sets, `usableImages` filter, wrap next/prev, shimmer while loading, `data-testid="image-loading"`) into `AttractionHero` as the background photo layer, then render the scrim + overlay children on top. Migrate its assertions into `AttractionHero.test.tsx` and delete `PhotoCarousel.*`. The zero/failed state becomes the Azure diagonal-hatch placeholder (`{components.image-placeholder.fill}`) with a "No photo yet" caption — the overlay (name/category/location) still renders over it. Keep `data-testid="image-placeholder"`.
- **Leaflet in jsdom.** `MapContainer` needs real layout and will not behave in jsdom. Mock `../components/AttractionMap` in `DestinationDetailsPage.test.tsx` (return a simple stub exposing the accessible name), and do NOT unit-test the Leaflet internals — AC #6's interactive/keyboard/attribution behavior is verified via Playwright in Task 7. Use a custom `L.divIcon` (HTML marker styled by CSS) rather than the default PNG icon to sidestep the Vite/Leaflet marker-image resolution gotcha; still import `leaflet/dist/leaflet.css`.
- **Add-to-Trip.** Reuse `requestAdd(xid)` from `AddToTripContext` unchanged — it already stores the pending add, routes to `/login?returnTo=…`, and completes on return. Keep the existing `onAddToTrip?` prop as the tested integration seam (tests pass a spy). The logged-out note copy changes from "You will be asked to log in to finish adding." to "Log in to add to your trip" with "Log in" as a primary-colored control; update the existing test assertion accordingly. The button stays enabled in both states (shipped behavior; matches the spine's "never a dead disabled button").
- **Open-now parser scope.** OpenTripMap hours strings are unstructured; parse only the confident cases (e.g. `Mo-Su HH:MM-HH:MM`, `Daily HH:MM-HH:MM`, and per-day `Mo,Tu … HH:MM-HH:MM`). Anything ambiguous → return null (no badge). Do not over-engineer a full OSM opening_hours parser; the spine's rule is "confident parse or nothing".
- **Nearby rating.** `Attraction.rating` is a string like `"3"`/`"2h"` (1–3 + optional heritage flag), NOT a 0–5 float — the mockup's "★ 4.6" is illustrative. Render the ★ glyph + the parsed numeric level (1–3) in slate; omit the ★ entirely when rating is null or not 1–3. Reuse the numeric parse pattern from `AttractionCard` (`Number.parseInt(rating, 10)`), not `StarRating`'s three-glyph strip (the nearby meta row is a single ★ + value per the spine).
- **Nearby distance copy.** Spine says "X km away" (meters→km, one decimal) — this differs from `AttractionCard`'s "X km from center". The nearby card is a dedicated Azure component, so it gets the spine's "X km away" copy; `AttractionCard` (search page, out of scope) is untouched.
- **jsdom has no layout.** The full-bleed break-out, two-column↔single-column reflow, sticky panel/bar, hero heights, and focus-ring rendering are CSS-only — verify visually via Playwright (desktop 1440×900 + mobile 390×844) against the dev server with mocked API routes.
- **Focus to heading.** On the not-found and error states, move focus to the state heading (`tabIndex={-1}` + ref focus in an effect) so the state change is announced, per the accessibility floor.

## Dev Agent Record

### Implementation Plan

- Built in dependency order so each layer could be TDD'd in isolation before the page consumed it: (1) map deps + scoped Azure tokens, (2) `openNow` pure parser, (3) `AttractionHero`, (4) `AttractionMap`, (5) `useNearbyAttractions` + `NearbyRail`, (6) the page rewrite, (7) full gates.
- **Azure tokens** live as CSS custom properties on `.page` in `DestinationDetailsPage.module.css` (prefixed `--az-*`, values copied verbatim from `DESIGN.md` frontmatter). The three Azure-only child components (`AttractionHero`, `AttractionMap`, `NearbyRail`) render only inside the page, so their CSS modules read the `--az-*` vars off the cascade — no global `index.css` change, Horizon untouched.
- **Full-bleed hero** breaks out of `AppLayout`'s centered `max-width` column via `width: 100vw; margin-left/right: calc(50% - 50vw)`; the two-column body keeps the `1120px` max width. The mobile sticky bar uses the same bleed on its horizontal margins so it docks edge-to-edge.
- **Carousel → hero:** `PhotoCarousel`'s loaded/failed image sets, `usableImages` filter, wrap next/prev, shimmer, and drop-failed-photo behavior were folded into `AttractionHero` as the background photo layer, with the scrim + overlay (back / credit / eyebrow / `<h1>` / location) composited on top; arrow-key nav added on a `role="group"` frame when >1 photo. Zero/all-failed → the Azure diagonal-hatch "No photo yet" placeholder with the overlay still rendered.
- **Open-now:** a conservative parser (`Daily`/`24/7`/bare-range/`Mo-Su`/`Mo,We,Fr`/day-range + overnight-wrap) returns `{status}` only on a confident parse and `null` otherwise; the badge and the panel Status fact render only when non-null.
- **Map:** react-leaflet `MapContainer` + OSM `TileLayer` (mandatory attribution) + a custom `L.divIcon` Azure pin (HTML/CSS, `role="img"` + name label) to sidestep Leaflet's default PNG-icon bundler gotcha; `leaflet/dist/leaflet.css` imported in the component.
- **Nearby:** `useNearbyAttractions` fetches `getAttractions` only when both coords exist and `select`s out the self `xid` + caps to 8; `NearbyRail` returns `null` (quiet omission) whenever `data` is undefined/empty, covering no-coords, empty, and error identically.
- **Add to Trip:** reused `requestAdd(xid)` unchanged (already does the logged-out→`/login?returnTo`→return→complete-pending flow); the `onAddToTrip` prop kept as the tested seam. Two enabled CTAs live in the DOM (panel + sticky bar), one shown per breakpoint via CSS; the logged-out note is a `<Link>Log in</Link> to add to your trip`.
- **States:** loading/not-found/service-unavailable kept with their standalone Back control; error/not-found move focus to the heading (`tabIndex=-1` + ref focus in effect).

### Debug Log

- The user hit `[vite] Failed to resolve import "../components/PhotoCarousel"` mid-implementation — expected transient state: `PhotoCarousel` was deleted before the page that imported it was rewritten. Resolved by completing Task 6 (the page no longer imports it). Confirmed by a green production build (171 modules, no unresolved imports) and a dev-server smoke test transforming `DestinationDetailsPage.tsx` + `AttractionMap.tsx` cleanly.
- Page test: with two Add-to-Trip CTAs (panel + sticky bar) in the DOM, `getByRole` throws on multiple matches — switched to a `getAllByRole` helper and interact with `[0]`.
- Page test: category (hero + panel eyebrow) and opening-hours (info row + panel Hours fact) each render twice — assertions relaxed to `getAllByText(...).length > 0`.
- Page test: the logged-out note text spans a `<Link>` + a text node, so `getByText(/log in to add to your trip/i)` can't match across elements — assert the `Log in` link role + the `to add to your trip` text separately.
- **Visual verification substitution:** this project has no Playwright install and no browser tooling was available in this session, so the Playwright desktop/mobile screenshot pass the prior stories ran was NOT performed. Verified instead via the full unit suite (198/198), lint, a green production build, and a dev-server module-transform smoke test. The CSS-only concerns — full-bleed hero (incl. the `100vw` scrollbar-overflow edge case), the two-column↔single-column reflow, sticky panel/bar behavior, and focus-ring rendering — have NOT been pixel-verified in a browser and are recommended for manual/visual QA during review.

### Completion Notes

- Attraction detail page rebuilt on the Azure spine pair: full-bleed hero (single/carousel/hatch-placeholder photo + two-band scrim + overlaid Back, category eyebrow, single `<h1>`), two-column desktop with a sticky 340px booking panel collapsing to single-column + a sticky bottom Add-to-Trip bar below 1024px, hairline info rows with a confident-parse open-now badge, an interactive Leaflet+OSM map, and a nearby-attractions rail.
- Azure identity scoped to the page via `--az-*` custom properties (verbatim from `DESIGN.md`); the global Horizon token layer and every other screen are untouched.
- All shipped contracts preserved: graceful field-by-field degradation ("Not available"/"No description available."/"No photo yet"), the `requestAdd` logged-out→login→return add-to-trip flow, loading/not-found(no-retry)/service-unavailable(retry) states, and the enabled-focusable CTA (never a dead disabled button). Nearby rail and map failures are quiet omissions, never page-level errors.
- New dependencies (user-approved): `leaflet`, `react-leaflet`, `@types/leaflet`.
- Quality: 198/198 FE tests pass (+23 net: openNow 13, AttractionHero 8, NearbyRail 6, minus PhotoCarousel 5 removed and the page suite net −1); lint clean (2 pre-existing fast-refresh warnings untouched); production build green. Playwright visual QA not run this session (see Debug Log) — recommended before merge.

## File List

- FE/src/pages/DestinationDetailsPage.tsx (rewritten — hero + two-column + sticky panel/bar, info rows, open-now badge, states, add-to-trip)
- FE/src/pages/DestinationDetailsPage.module.css (rewritten — scoped Azure tokens + full-bleed/responsive/sticky layout)
- FE/src/pages/DestinationDetailsPage.test.tsx (updated — new structure/copy, map mock, getAllByRole CTAs)
- FE/src/components/AttractionHero.tsx (new — full-bleed hero with carousel + overlay)
- FE/src/components/AttractionHero.module.css (new)
- FE/src/components/AttractionHero.test.tsx (new — migrated + extended carousel/overlay coverage)
- FE/src/components/AttractionMap.tsx (new — react-leaflet OSM map + Azure divIcon marker)
- FE/src/components/AttractionMap.module.css (new)
- FE/src/components/NearbyRail.tsx (new — rail + nearby card)
- FE/src/components/NearbyRail.module.css (new)
- FE/src/components/NearbyRail.test.tsx (new)
- FE/src/utils/openNow.ts (new — confident open/closed parser)
- FE/src/utils/openNow.test.ts (new)
- FE/src/hooks/locations.ts (modified — added useNearbyAttractions)
- FE/src/components/PhotoCarousel.tsx (deleted — folded into AttractionHero)
- FE/src/components/PhotoCarousel.module.css (deleted)
- FE/src/components/PhotoCarousel.test.tsx (deleted — coverage migrated to AttractionHero.test.tsx)
- FE/package.json (modified — leaflet, react-leaflet, @types/leaflet)
- FE/package-lock.json (modified)
- _bmad-output/implementation-artifacts/5-15-azure-attraction-detail-redesign.md (new)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-07-16: Story created from the Azure UX spine pair (`ux-tripplanner-2026-07-16`, DESIGN.md + EXPERIENCE.md) at user request and picked up immediately for implementation.
- 2026-07-16: Implemented all 7 tasks — added leaflet/react-leaflet, scoped Azure token layer, `openNow` parser, `AttractionHero` (replacing `PhotoCarousel`), `AttractionMap`, `useNearbyAttractions` + `NearbyRail`, and the rebuilt two-column/hero/sticky-bar detail page. 198/198 FE tests, lint and build green; Playwright visual QA deferred (no browser tooling this session). Status → review.

## Review Findings

### Code Review 2026-07-16 (adversarial, 4 layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor)

- [x] [Review][Patch] MEDIUM — Logged-out mobile users get no login note in the sticky bar (decision D1 → resolved: add it). Desktop panel shows "Log in to add to your trip", but `@media (max-width: 1023px)` hides `.panel .btnNote` and the sticky bar renders no note. Add a compact "Log in to add to your trip" affordance to the mobile sticky bar. [FE/src/pages/DestinationDetailsPage.module.css:360-363, FE/src/pages/DestinationDetailsPage.tsx:246-270]
- [x] [Review][Patch] HIGH — HTML injection sink: attraction `name` interpolated unescaped into Leaflet `divIcon` `html` (set via innerHTML); untrusted OpenTripMap/OSM data can break out of the `aria-label` attribute and inject markup/script [FE/src/components/AttractionMap.tsx:17]
- [x] [Review][Patch] MEDIUM — Detail-page state not reset on attraction→attraction navigation: the route reuses one `DestinationDetailsPage` instance (no `key`), so on a cached revisit the Leaflet map stays centered on the previous attraction (MapContainer `center` is init-only) and the carousel opens mid-rotation. Fix: `key={xid}` on the route element / page [FE/src/routes.tsx:31, FE/src/components/AttractionMap.tsx:23, FE/src/components/AttractionHero.tsx:22]
- [x] [Review][Patch] MEDIUM — Carousel prev/next arrows are 40×40px, below the AC9 44px tap-target floor explicitly pre-flagged in review-accessibility.md [FE/src/components/AttractionHero.module.css:124-125]
- [x] [Review][Patch] MEDIUM — `AttractionMap` has zero real-behavior test coverage (stubbed out in the page test); OSM attribution, map/marker `aria-label`s, and the two defects above would all regress green [FE/src/components/AttractionMap.tsx, FE/src/pages/DestinationDetailsPage.test.tsx:29-31]
- [x] [Review][Patch] LOW — AC5 violation: sticky-bar "● Open now" bakes the decorative dot into the announced text (screen reader says "black circle Open now"); the info-row `OpenNowBadge` correctly `aria-hidden`s its dot [FE/src/pages/DestinationDetailsPage.tsx:259]
- [x] [Review][Patch] LOW — `parseOpenNow` `TIME_RANGE` regex accepts impossible hours 24–29 and zero-length ranges (`09:00-09:00`), both yielding a false permanent "Open now" instead of rejecting as unparseable [FE/src/utils/openNow.ts:16,55-56]
- [x] [Review][Defer] LOW — `parseOpenNow` computes open/closed in the viewer's local time, not the venue's timezone; badge is wrong for far-away attractions [FE/src/utils/openNow.ts:80-81] — deferred: no timezone data in the payload; not fixable without a new data source
- [x] [Review][Defer] LOW — `parseOpenNow` overnight ranges spanning midnight are attributed to the wrong weekday, and an unrecognized clause (e.g. `PH off`) nulls the whole string → no badge [FE/src/utils/openNow.ts:84-117] — deferred: Dev Notes explicitly scope the parser to "confident parse or nothing; do not over-engineer"; both degrade safely to no-badge
- [x] [Review][Defer] LOW — New-code test gaps: no page-level "Closed" badge render, no split-hours / `everyday` / day-only parser cases, nearby cap-at-8 and rating-out-of-range not asserted [FE/src/utils/openNow.test.ts, FE/src/components/NearbyRail.test.tsx] — deferred: low-value coverage, existing suite green
- Dismissed as noise (4): rating gated to 1–3 (by-design per Dev Notes, matches `AttractionCard`); `useNearbyAttractions` cache key omits `selfXid` (the `select` closure re-runs per consumer so the filter is always correct); comma-joined split-hours → no badge (safe degradation by design); `kinds[0]` on a null `kinds` array (the `Attraction.kinds` type is non-nullable `string[]`).

All 7 patches applied 2026-07-16: escaped `name` in the `AttractionMap` marker HTML (+ new `AttractionMap.test.tsx` locking in escaping/attribution/aria-labels); keyed `AttractionHero`/`AttractionMap` by `destination.xid` so map center and carousel reset on attraction→attraction navigation; carousel arrows 40→44px; sticky-bar open-now dot now `aria-hidden`; `openNow` `TIME_RANGE` regex rejects hours >24 and zero-length ranges; mobile sticky bar gained the logged-out "Log in to add to your trip" note. 222/222 FE tests, lint and build green.
