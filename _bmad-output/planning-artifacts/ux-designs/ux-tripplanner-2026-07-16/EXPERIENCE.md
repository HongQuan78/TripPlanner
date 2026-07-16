---
name: Trip Planner — Attraction Detail Experience (Azure)
description: Information architecture, behavior, states, data-handling, and flows for the attraction detail page redesign. Fresh standalone run; pairs with DESIGN.md (Azure).
status: final
updated: 2026-07-16
---

# Trip Planner — Attraction Detail — Experience Spine

> Responsive web (React). The attraction detail surface at route `/attractions/:xid` (e.g. `/attractions/Q3162511`). This spine owns *how it works*; `DESIGN.md` (Azure) owns *how it looks* and is the visual reference. Tokens below are referenced by name with `{path.to.token}` and resolve against DESIGN.md frontmatter.

## Foundation

Responsive web, single surface, two form factors: desktop (two-column) and mobile (single-column). This is a React web app (React Router; the page is `FE/src/pages/DestinationDetailsPage.tsx`), not a native app — inherit browser conventions for scroll, back, links, and focus. No component library is imposed; visual identity comes from `DESIGN.md` (Azure). The page consumes `DestinationDetails` (`xid`, `name`, `category?`, `description?`, `imageUrls[]`, `address?`, `openingHours?`, `website?`, `latitude?`, `longitude?`) from `GET` destination-details, and the nearby rail reuses the existing `GET /api/locations/attractions?latitude=&longitude=` endpoint returning `Attraction[]` (`xid`, `name`, `kinds[]`, `rating?`, `imageUrl?`, `distanceMeters?`). Every field except `xid` and `name` may be absent and must degrade gracefully — this is a hard requirement carried from epic-2 (US1/US2, already implemented): the detail view must open even when most fields are missing.

## Information Architecture

| Module | Reached from | Purpose |
|---|---|---|
| Hero (full-bleed) | Top of page | Photograph + overlaid name, category, location; the page's primary visual hook |
| Back control | Overlaid on hero, top-left | Return to the previous list (browser back) |
| Lead description | Below hero, main column | Short prose on what the place is |
| Location / map | Main column | Interactive Leaflet+OSM map to gauge where it is |
| Details (info rows) | Main column | Address, Opening hours (+ open-now badge), Website |
| Nearby attractions rail | Main column | Horizontally-scrolling nearby places from this attraction's coords |
| Booking panel (desktop) | Right column, sticky | Facts + the primary *Add to Trip* conversion action |
| Sticky action bar (mobile) | Pinned bottom | Mobile stand-in for the booking panel's *Add to Trip* |

Reading order (and DOM/tab order): Back → Hero (name/category/location) → Lead → Location/map → Details → Nearby → (main column ends) → Booking panel. On mobile the booking panel content folds into the flow and the *Add to Trip* action detaches to the sticky bottom bar. The page has one primary action (*Add to Trip*) and one navigational control (Back); there is no in-page nav, no tabs.

→ Composition reference: the canonical Azure desktop + mobile mock at [`mockups/attraction-detail-azure.html`](mockups/attraction-detail-azure.html). This spine (with DESIGN.md) wins on conflict with the mock.

## Voice and Tone

Warm, confident, concrete — a trustworthy consumer travel product that talks like a well-traveled friend, not a booking robot. Honest about gaps: absent data says "Not available," never fake filler.

| Do | Don't |
|---|---|
| "Add to Trip" | "Book Now" / "Reserve" (we plan, we don't transact) |
| "Log in to add to your trip" | "You must be authenticated to perform this action" |
| "Not available" (missing address/hours/website) | Blank space, "N/A", or a fabricated value |
| "No photo yet" (empty image slot) | A broken-image icon or "image failed to load" |
| "● Open now" / "Closed" (only when hours parse) | Guessed status when hours are ambiguous |
| "We couldn't load this destination. Try again." | "Error 503: ServiceUnavailable" |
| "We couldn't find this destination — it may no longer exist." | "404 Not Found" |
| "X km away" | "distance: 5400m" |
| "No description available." | Lorem, or a generic "Explore this amazing place!" |

## Component Patterns

Behavioral only. Visual specs live in `DESIGN.md.Components`.

| Component | Behavioral rules |
|---|---|
| Hero / photo carousel | With one image: static hero. With multiple: swipeable carousel (touch swipe on mobile, arrows + dots on desktop), lazy-loads frames, wraps or clamps at ends; keyboard arrows move frames when focused. With zero images: image placeholder fills the hero, name/category/location still overlaid. Name and category always render over the photo regardless of photo state. |
| Back control ({components.back-control}) | Returns to the previous list via browser history (`navigate(-1)`). If there is no history entry, falls back to the search/home surface. Always present, even in error/not-found states. |
| Open-now badge ({components.open-now-badge}) | Rendered only when `openingHours` parses to a confident open/closed determination for the current local time. See Open-Now Behavior. Never a link. |
| Info row ({components.info-row}) | One row each for Address, Opening hours, Website. Value present → render. Website is a new-tab link (`target="_blank"`, `rel="noopener noreferrer"`) with a visually-hidden "(opens in new tab)" so sighted-hover and screen-reader users are both warned of the new context. Value absent → "Not available" in `{colors.na}`. Rows never collapse out — the label stays so absence is legible. |
| Map block ({components.map-block}) | Interactive Leaflet map, OSM tiles, pan/zoom, single marker at `latitude`/`longitude`. OSM attribution always visible. Rendered only when both coords are present. See Map Behavior. |
| Nearby card ({components.nearby-card}) | Whole card is a link to that attraction's detail page (`/attractions/{xid}`), replacing the current page. Shows thumbnail (or placeholder), `kinds[0]`-derived kind label, name, ★ rating, and "X km away" from `distanceMeters`. |
| Nearby rail ({components.nearby-rail}) | Horizontal scroll; capped list; self-filtered. See Nearby Rail Behavior. Absent (heading included) when empty/failed. |
| Booking panel ({components.booking-panel}) | Desktop only. Sticky; follows scroll and stays in view. Holds facts + the primary CTA. Not rendered as a floating panel on mobile — its CTA moves to the sticky bar. |
| Add to Trip button ({components.button-primary}) | Authed: click adds this attraction to the user's trip flow and confirms. Logged-out: the button stays *enabled and focusable* (not a dead disabled control) — activating it routes to login and returns here to complete the add, with the "Log in to add to your trip" note beneath. See Add-to-Trip Flow. |
| Sticky action bar ({components.sticky-action-bar}) | Mobile only. Pinned to viewport bottom; hosts the same *Add to Trip* button with identical authed/logged-out behavior. Page reserves bottom padding so it never occludes content. |
| Image placeholder ({components.image-placeholder}) | Fills any empty image slot (hero or nearby thumb) with the hatch fill + "No photo yet". Never a broken image. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Loading | Whole page | Back control present; hero area + content show skeletons/loading in Azure neutrals ("Loading destination…"). No layout shift when data resolves. |
| Loaded | Whole page | Full IA renders; modules with data present, missing-field/absent treatments applied per module. |
| Not found (404) | Whole page | Friendly not-found state: heading "Destination not found", copy "We couldn't find this destination — it may no longer exist.", Back control present. No retry (retrying won't help). |
| Service-unavailable / error | Whole page | "Service unavailable" heading, copy "Something went wrong while loading this destination. Please try again.", a **Try again** button that refetches, Back control present. |
| Missing field | Info rows / description | Address/Hours/Website absent → "Not available". Description absent → "No description available." Category absent → category eyebrow omitted (name still shows). |
| No photos | Hero | Image placeholder fills the hero; name/category/location overlaid on the hatch. Carousel controls suppressed. |
| Logged-out | Booking panel / sticky bar | *Add to Trip* rendered as an enabled, focusable control that routes to login (returning here to complete the add), with the "Log in to add to your trip" note beneath. Never a dead disabled button. The rest of the page is fully readable. |
| Empty nearby | Nearby module | Quiet omission — the entire "Nearby attractions" heading + rail are not rendered. No empty-state message, no error. |
| Map absent (no coords) | Location module | "Location" heading + map not rendered when `latitude`/`longitude` are null. Quiet omission; address info row still carries location text if present. |
| Nearby load failed | Nearby module | Treated exactly like empty nearby — quiet omission, never an error surfaced to the user. The main page is unaffected. |

## Interaction Primitives

- Click / tap to act. The primary action is *Add to Trip*; the only navigational control is Back.
- Nearby cards and the map are the two exploratory affordances: a nearby card navigates to a sibling detail page; the map pans/zooms in place (never navigates).
- Photo carousel: swipe (touch), arrows + dots (pointer), left/right arrow keys (keyboard, when focused).
- Nearby rail: horizontal scroll — trackpad/wheel-horizontal, touch swipe, and keyboard focus traversal through cards.
- Back uses browser history; browser back/forward behave normally.
- External website links open in a new tab (`rel="noopener noreferrer"`) and announce the new context via a visually-hidden "(opens in new tab)".
- **Reduced motion:** honor `prefers-reduced-motion`. The carousel never auto-advances (banned regardless); under reduced motion, carousel frame transitions, the nearby-card hover lift, and any sticky-panel motion are disabled or reduced to an instant change.
- **Banned:** modal interstitials before the page renders; auto-playing hero video; carousels that auto-advance; a second competing primary button; blocking the whole page on a nearby-rail or map failure.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md` § Colors, where the muted values were tuned to clear AA and every text/background pair is stated with its measured ratio. Not every pair is AA at every size by default; the palette is legible at the sizes each token is actually used, and the Colors prose is the source of truth for which combinations pass.

- WCAG 2.2 AA across desktop and mobile web.
- Hero overlay text stays legible over any photo via the two-band scrim *plus* a text-shadow on the title, eyebrow, and location — legibility is engineered, not assumed (see `DESIGN.md` hero).
- The attraction name is the page's single `<h1>`; section headings are `<h2>` in reading order; the booking-panel repeated name is not a second `<h1>`.
- Every interactive element is keyboard-reachable in reading order and shows the visible focus ring defined by `{components.focus-ring}` (2px outline, 2px offset, verified ≥3:1 against each surface it lands on): Back, carousel arrows and dots, map (focusable container + focusable zoom controls, pan/zoom operable via keyboard), each nearby card, external links, and *Add to Trip*.
- The logged-out *Add to Trip* is an enabled, focusable control with an accessible name conveying *why* ("Log in to add to your trip"), so screen-reader and keyboard users reach it in one step and learn the gate — not a dead `aria-disabled`/`disabled` control removed from the tab order.
- Open-now badge conveys status by text ("Open now" / "Closed"), not color alone; the dot is decorative.
- The nearby-card ★ is a meaningful graphic (deep gold, ≥3:1) with its numeric value in passing slate text, not color-only data.
- Map marker has an accessible label (the attraction name); the Address info row always carries the textual location so a screen-reader user gets "where it is" without the map; OSM attribution links are in the tab order and legible at AA.
- External website links announce "(opens in new tab)" for the new context.
- "Not available" and "No photo yet" are real text, announced by screen readers — absence is spoken, not silent.
- Tap targets ≥ `{spacing.touch-target-min}` (44px), with hit area allowed to exceed visible size — explicitly the back control, each carousel dot, and all buttons; the sticky bar CTA and nearby cards meet this on mobile.
- Honor `prefers-reduced-motion`: no auto-advancing carousel, and transitions/hover-lifts reduce to instant under the setting.
- Errors and not-found states move focus to the heading so the state change is announced.

## Data & Missing-Field Handling

Every `DestinationDetails` field is handled with an explicit present/absent treatment. The page must open with `name` + `xid` alone.

| Field | Present | Absent |
|---|---|---|
| `name` | Hero `<h1>` + panel title | Always present (required) |
| `xid` | Identity + Add-to-Trip payload + self-filter key | Always present (required) |
| `category` | Category eyebrow (hero + panel) | Eyebrow omitted; name unaffected |
| `description` | Lead paragraph | "No description available." |
| `imageUrls[]` | Hero (single) or carousel (multiple) | Image placeholder in hero ("No photo yet") |
| `address` | Info row value | "Not available" |
| `openingHours` | Raw string always shown; open-now badge only on confident parse | Row shows "Not available"; no badge |
| `website` | Info row link (new tab) | "Not available" |
| `latitude` / `longitude` | Map block rendered + nearby rail fetched | Map omitted; nearby rail cannot be fetched → omitted |
| `rating` | Not on `DestinationDetails` — the main attraction shows no star rating. Rating exists only on `Attraction` (nearby cards) and is shown there. | Nearby card omits ★ when its own `rating` is null |
| `distanceMeters` (nearby) | "X km away" (meters → km, one decimal) | Distance line omitted on that card |

## Map Behavior

- Rendered only when `latitude` and `longitude` are both non-null. Otherwise the whole Location module (heading + map) is a quiet omission.
- Interactive Leaflet map with OpenStreetMap raster tiles — no API key, no token, no billing.
- Single marker at the attraction's coordinates; sensible default zoom (neighborhood level). Pan and zoom enabled and keyboard-operable.
- **OSM attribution is mandatory and always visible** ("© OpenStreetMap contributors") in the standard control position.
- Map failures (tiles fail to load) degrade to the map's own empty tile state; they never escalate to a page-level error.

## Open-Now Behavior

- `openingHours` is a raw provider string (OpenTripMap) with no guaranteed structure.
- **Always** show the raw string in the Opening hours info row when present.
- Render the "● Open now" / "Closed" badge **only** when the string parses confidently to an open/closed determination for the current local time.
- When the string is unparseable or absent: show **no badge** — never guess. Absent string → row reads "Not available".

## Nearby Rail Behavior

- Powered by the existing `GET /api/locations/attractions?latitude=&longitude=`, called with *this* attraction's `latitude`/`longitude` (so it requires coords — no coords → no rail).
- **Filter out the current attraction** by `xid` (self) so the page never lists itself.
- **Cap** the list (e.g. first 6–8 after self-filtering) — it is a taste of what's around, not an exhaustive index.
- Each card shows: thumbnail (or "No photo yet" placeholder), name, kind (from `kinds[]`), ★ rating (omit when null), and "X km away" (from `distanceMeters`, omit when null).
- Empty result or failed request → **quiet omission** of the entire module (heading + rail). Never an error, never a "no nearby places" message that implies something broke.

## Add-to-Trip Flow

- *Add to Trip* is the single primary conversion, present in the desktop booking panel and the mobile sticky bar.
- **Logged-out:** the button is an enabled, focusable `{components.button-primary}` control. Activating it (click, Enter, or Space) routes to login and, on success, returns to this page to complete the pending add. A "Log in to add to your trip" note sits beneath it as an up-front, honest signal of the gate. The user is invited, not blocked, and never hits a dead unfocusable button.
- **Authenticated:** clicking adds this attraction (by `xid`) into the Add-to-Trip flow and confirms the addition. The confirmation is immediate and legible (the existing add-to-trip context handles trip/day selection downstream).
- **Add failure / already added:** the add mutation and its failure, retry, and duplicate handling are owned by the downstream add-to-trip context; this surface does not navigate away on a failed add or re-render its own error page for it.

## Responsive & Platform

Two form factors, one breakpoint. The threshold is `{spacing.breakpoint-desktop}` (1024px): at or above it the page is the two-column desktop layout; below it, single-column with a sticky bottom *Add to Trip* bar.

| At / above `{spacing.breakpoint-desktop}` (desktop) | Below `{spacing.breakpoint-desktop}` (mobile / narrow tablet) |
|---|---|
| Two columns: fluid main column + fixed `{spacing.booking-panel-width}` (340px) sticky booking panel, `{spacing.gutter}` gutter, inside `{spacing.page-max}` max width | Single column, `{spacing.margin-mobile}` side margins |
| Booking panel is `position: sticky`, follows scroll | Booking panel's **facts fold into the main flow**; its *Add to Trip* action **detaches** to the sticky bottom bar (`{components.sticky-action-bar}`) |
| Hero uses `{components.hero.height-desktop}` (360px) | Hero uses `{components.hero.height-mobile}` (180px) |
| Nearby rail: horizontal scroll | Nearby rail: **stays** a horizontal touch-swipe rail (never restacks into a vertical list) |
| — | Page reserves bottom padding equal to the sticky bar height so the bar never occludes the last row |

What reflows on the way down: the booking-panel facts merge into the reading flow, the panel's CTA becomes the bottom-bar CTA (identical authed/logged-out behavior), and the hero height token switches. What does *not* reflow: the nearby rail stays horizontal, and reading/tab order is unchanged (Back → hero → lead → map → details → nearby → panel/bar CTA).

## Inspiration & Anti-Patterns

The page borrows the proven shape of best-in-class place surfaces and deliberately rejects their transactional and attention-extractive habits.

| Borrowed from | What we take |
|---|---|
| Airbnb listing page | The persistent, scroll-following booking panel that keeps the one decision at the reader's cursor (our booking panel / sticky bar) |
| Google Maps place card | Scannable, honest facts — address, hours, an at-a-glance open/closed signal |
| TripAdvisor | Immersive lead photo and a "nearby / around here" discovery rail |
| Lonely Planet | Editorial, place-first hero that lets the destination sell itself |

| Explicitly rejected | Why |
|---|---|
| Fake reviews / ratings we don't have | We only show a rating where real data exists (nearby cards); the main attraction shows none rather than inventing one |
| "Book Now" / "Reserve" transactional language | We plan, we don't transact — the action is "Add to Trip" |
| Ad clutter, upsells, sign-up interstitials | The page is readable end-to-end logged-out; the only gate is the honest, invitational login on *Add to Trip* |
| Autoplaying media (hero video, auto-advancing carousel) | Motion is user-initiated and reduced-motion-aware |
| Save/Share module | Out of scope for this surface; not stubbed as a dead control |

## Key Flows

### Flow 1 — Linh finds and commits to Trang An (Linh, 28, on her lunch break, laptop, logged in)

1. Linh searches "Ninh Binh" and, from the results, opens the Trang An Scenic Landscape Complex detail page (`/attractions/Q3162511`).
2. The **full-bleed hero** loads — limestone karsts over emerald water, the name overlaid in white. It hooks her; this is the place she half-remembered.
3. She reads the short **lead description** and clocks the category eyebrow and the "UNESCO World Heritage" framing — real, trustworthy, not hype.
4. In the **Details** rows she sees "Daily 07:00–17:00" with a green **● Open now** badge (the string parsed confidently), so she knows it's live right now.
5. She scrolls to the **interactive map** to gauge how far it is from her guesthouse — pans once, satisfied.
6. The **nearby rail** surfaces Mua Cave Viewpoint (★ 4.7, 5.4 km away) — she files it away as a maybe for the same day.
7. **CLIMAX:** the **booking panel** that followed her down the right column the whole time puts *Add to Trip* right at her cursor at the exact moment of conviction. One click — no scrolling back up, no hunting — and Trang An is on her Ninh Binh itinerary. Confirmed. She's back to her sandwich in under two minutes.

Failure branch: if the hours string had been unparseable, step 4 shows the raw hours with no badge — she still learns the hours, just without the live signal. If nearby returned nothing, step 6 simply isn't there; nothing looks broken.

### Flow 2 — Dan meets the gate and walks through it (Dan, browsing logged-out on a shared link, phone)

1. Dan opens the Trang An detail page from a link a friend sent — no account, not logged in.
2. He reads the hero, description, and details freely; the whole page is open to browse and nothing nags him to sign up.
3. He decides he wants this on a trip and reaches the sticky bottom bar, where *Add to Trip* sits **live and tappable** with "Log in to add to your trip" beneath it — a clear signal, not a locked door.
4. **CLIMAX:** he taps *Add to Trip*. Instead of a dead "disabled" bounce, the tap carries him straight into login with his intent remembered; he authenticates in a few seconds.
5. He lands back on the exact Trang An page, the pending add completes, and Trang An is on his trip. The gate invited rather than blocked — the moment of conviction and the moment of action were one continuous tap-through, never a dead end.
