---
baseline_commit: 3a80e86a33052a98ed65efbc9bf25926263376dc
---

# Story 5.14: Redesign the home/search surface against the Horizon spine pair's home update

Status: review

## Story

As a Trip Planner visitor landing on the home page,
I want the search surface rebuilt as the Horizon hero band with suggestion chips and richer attraction cards specified in the UX spine pair's home update,
so that the home experience matches the premium Horizon brand while every shipped search, typeahead, state, and accessibility contract is preserved.

## Context

Source of truth: the spine pair at `_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-15/` — `DESIGN.md` (visual tokens/components) and `EXPERIENCE.md` (experience contract), as updated for the home surface and validated by `review-rubric-home-update.md` (all findings already patched into the spines). Mockups `mockups/key-home-presearch.html` and `mockups/key-home-results.html` are spine-derived references; **the spines win on conflict**. The Horizon token layer already exists app-wide in `FE/src/index.css` — no token changes are needed. The hero photograph ships as a CSS gradient stand-in over the `--color-surface-container` fallback (per the spine) until a real asset lands in `FE/src/assets`.

## Acceptance Criteria

1. **Hero band.** The home page (inside `AppLayout`) opens with a framed photographic band spanning the content column, clipped to `--radius-lg`, min-height 22rem at 768px+ relaxing to ~16rem below, never removed on small screens. Gradient stand-in photograph over the `--color-surface-container` fallback with an ink (`--color-on-surface`) overlay holding ≥65% opacity through the full headline/tagline/search block. Stacked and centered inside: the page `<h1>` "Where to next?" (48px white, stepping to 32px below 768px), tagline "Search any city and start building the trip." (18px full-opacity white), the hero search row, and (pre-search only) the suggestion chip row. The band's text is real page content exposed to assistive tech; only the photograph is decorative.
2. **Hero search.** The existing search form recomposed inside the band, behavior preserved wholesale: `role="search"`, Enter submits, Search submits the trimmed input, Clear resets input/query/selection. Input becomes a 3rem white `--radius-md` field elevated with `--shadow-lg`, **no placeholder text**, accessible name "Search" kept. Search button keeps its primary fill and stays disabled while the input is empty at 50%-opacity primary (never the gray wash); Clear drops its transparent ghost fill for solid `--color-surface-container-lowest` behind its primary border/text, hover `--color-surface-container-low`. The full typeahead contract is preserved: 300ms debounce, min 2 chars, max 5 suggestions, suppression after a chosen suggestion or submitted query, per-query Escape dismissal, full ARIA listbox contract, mousedown selection. The open dropdown overlays the chip row; chips neither hide nor reflow while the user types.
3. **Suggestion chips.** Pre-search only, under a quiet "Popular searches" label inside the band: six hand-curated well-known city names shipped as a frontend constant, rendered as real buttons — 2rem solid-white `--radius-full` pills (label-sm, hover `--color-surface-container-low`, ≥44px touch target via padding/hit area). Activating a chip pre-fills the input and submits the search in the same gesture. Chips disappear once a query has been submitted and return only when the page is cleared; restored sessions (persisted `submittedQuery`) skip the pre-search state entirely. Nothing renders below the band pre-search.
4. **Results column.** Below the band, location results and the attractions section share a 60rem centered column with a 2rem gap band→content. The location result list keeps its existing production styles and contract (`aria-pressed` toggle buttons, name/country/type/partial-match, City → attractions, Country → guidance notice). The attraction grid keeps `auto-fill` but raises the minimum column from 14rem to 16rem, gap 1rem. All shipped state copy and treatments are kept verbatim: "Searching…", search error with retry, "No matching places found.", country notice, "Attractions near {name}", attractions loading skeletons + visually hidden "Loading attractions…", attractions error with scoped retry, "No attractions in this area yet — try another city."; skeleton geometry follows the richer card so the swap does not jump.
5. **Richer attraction card.** Anatomy top to bottom: 12rem cover image (up from 9rem) clipped to the card's top corners carrying the floating badges; body with 1rem horizontal padding — name at 18px/600, optional distance line, kind-tag wrap row; then a full-width 3rem add-to-trip action row closing the card beneath a 30%-opacity hairline top border (primary label-lg text with the leading ＋ glyph, transparent fill, hover `--color-surface-container-low`, active scale 0.98), replacing today's small ghost button. The card body stays a single link to the detail route; the add-to-trip row is the only other interactive element and keeps its "Add {name} to a trip" label. Image behavior preserved: alt = name, shimmer while loading, placeholder panel on null/error at the same height. Existing 40ms entrance stagger and hover lift (translateY(-4px) + `--shadow-lg`) kept.
6. **Rating badge & heritage chip.** When a 1–3 rating exists, a `--radius-full` pill floats top-right of the cover with a 0.5rem inset: `--color-on-surface` at 80% opacity scrim, white star glyphs, carrying the accessible "Rated N of 3" text (announced exactly once per card) — rendered over image and placeholder alike. Unrated attractions render no badge and drop the current "Not rated" text. When the rating carries the `h` flag, a heritage chip (`--color-success` on solid `--color-success-container`, `--radius-full`, label-sm) floats top-left of the cover with the visible lowercase word "heritage", exposed once as part of the card link's text with no duplicate `aria-label`.
7. **Distance line & kind tags.** When `distanceMeters` is non-null the body shows "650 m from center" below 1 km (rounded meters) or "2.3 km from center" at/above it (one decimal); null renders nothing. At most 3 kind tags, underscores humanized, restyled as `--radius-full` pills (`--color-surface-container-low` fill, label-sm `--color-on-surface-variant` text).
8. **Quality gates.** `npm test`, `npm run lint`, and `npm run build` pass in `FE/`; existing tests updated to the new copy/semantics (tagline, no placeholder, no "Not rated"); new tests cover the chip row (pre-search render, pre-fill-and-submit gesture, disappearance after submit, return on Clear), the distance line formats, the unrated no-badge rule, the badge-over-placeholder rule, and the heritage chip on the cover.

## Tasks / Subtasks

- [x] Task 1: Hero band + hero search recomposition (AC: #1, #2)
  - [x] 1.1 Restructure `SearchPage.tsx`: band section wrapping h1/tagline/form, new tagline copy, drop the input placeholder
  - [x] 1.2 Rewrite `SearchPage.module.css`: band, gradient stand-in + ink overlay, responsive heights/headline, 3rem search row with `--shadow-lg` input, solid-white Clear
- [x] Task 2: Suggestion chips (AC: #3)
  - [x] 2.1 Six-city constant + chip row with "Popular searches" label, pre-search visibility rule, pre-fill-and-submit handler
- [x] Task 3: Richer attraction card (AC: #5, #6, #7)
  - [x] 3.1 Restructure `AttractionCard.tsx`: cover with floating badges over image and placeholder, distance line, no "Not rated", add-to-trip row
  - [x] 3.2 Restyle `AttractionCard.module.css`: 12rem cover, badge scrim, heritage/kind pills, full-width action row
- [x] Task 4: Results column + skeleton geometry (AC: #4)
  - [x] 4.1 60rem results column below the band, 16rem grid minimum, attraction skeleton height matched to the richer card
- [x] Task 5: Tests, lint, build, visual verification (AC: #8)

## Dev Notes

- `StarRating` is shared with `TripPlannerPage`, which is out of scope — its "Not rated" fallback stays; `AttractionCard` simply stops rendering it when unrated and reuses `StarRating` inside the badge for the "Rated N of 3" label (white glyph override scoped to the badge).
- `Skeleton.module.css` `.card` is shared with `TripsPage` — the attraction skeleton height override lives in `SearchPage.module.css`, composed onto the shared class.
- The Search button keeps the real `disabled` attribute (shipped behavior, an explicitly documented divergence from the auth never-disable rule) with the committed 50%-opacity primary treatment already in the CSS.
- The suggestion dropdown is already absolutely positioned (`SuggestionDropdown.module.css`) — it overlays the chip row without changes; `dismissedQuery`/`suppressedQuery` state handling is untouched.
- Location result list: existing production styles preserved per DESIGN's bullet — no restyle beyond what the 60rem column relocation implies.
- jsdom has no layout; band min-heights, the sub-`md` headline step-down, and the dropdown/chip overlay are CSS-only — verify visually.
- Chip activation mirrors `handleSubmit`'s state writes with the chip's city as the query (input, submittedQuery, suppressedQuery set; selection cleared) so suppression prevents the dropdown from opening on the filled input.

## Dev Agent Record

### Implementation Plan

- `SearchPage.tsx` keeps every piece of search/typeahead state logic byte-identical; only the render tree changes — a `heroBand > heroInner` section wraps the existing h1 (new tagline), the untouched form, and the new conditional chip block, with all state content moved into a `.results` 60rem column below. Chip activation (`handleChipSelect`) mirrors `handleSubmit`'s state writes with the chip city as the query, so the existing suppression logic keeps the dropdown closed on the filled input.
- The gradient photograph stand-in is composed from existing tokens (`surface-container-highest → secondary-container → tertiary-container → tertiary → on-surface`) under the same ink ramp the auth hero uses (80% bottom, ≥65% through the copy/search block, decaying above), over the `--color-surface-container` fallback — no new hex values.
- `AttractionCard` gains a `cover` wrapper (position relative, 12rem) that hosts the image/shimmer/placeholder plus the absolutely positioned heritage chip (top-left) and rating badge (top-right, `color-mix` 80% ink scrim, `StarRating` reused inside with a white-glyph override so the "Rated N of 3" label stays the single announcement). Unrated cards render no badge; `StarRating`'s "Not rated" fallback survives untouched for `TripPlannerPage`.
- The add-to-trip control becomes the full-width 3rem closing row (hairline top border, ＋ glyph aria-hidden) with `cardLink`/`body` flexed so the row pins to the card foot at equal grid heights.
- Skeleton height override (`attractionSkeleton`, 22rem ≈ richer card height) composes onto the shared `Skeleton.module.css` class locally, leaving `TripsPage` untouched.
- Chips meet the 44px touch floor via an `::after` hit-area extension over their 2rem visual height.

### Debug Log

- The existing "resets to the initial state when the search is cleared" test asserted `queryByText('Paris')` absent after Clear — the returning 'Paris' chip now legitimately matches; assertion tightened to "no result listitems + input emptied" (chip return is covered by the new chip tests).
- Playwright verification initially expected attractions straight after a chip tap — wrong per the spine's hard constraint (chips only pre-fill and submit the text search; a City result still needs selecting). Script corrected, not the app.
- 390px viewport clipped the Clear button: `.inputWrap` (a flex item) lacked `min-width: 0`. Fixed, plus a ≤480px wrap that gives the input its own full row above the buttons.
- jsdom has no layout: band min-heights, the 48px→32px headline step, and the dropdown-over-chips overlay were verified via Playwright screenshots (1440×900 and 390×844) against the dev server with mocked API routes — pre-search, dropdown-over-chips, populated grid (all four card variants), and mobile all match the mockups; zero console/page errors.

### Completion Notes

- Home surface rebuilt on the Horizon hero band: framed `--radius-lg` photographic band (gradient stand-in over the fallback fill, ≥65% ink through the copy/search block), 48px white h1 stepping to 32px below 768px, new tagline, band kept on every viewport.
- Hero search recomposed inside the band with behavior preserved wholesale (debounce/min-chars/max-5/suppression/Escape/ARIA listbox/mousedown untouched — verified by the unchanged auto-suggest test block): 3rem `--shadow-lg` input with no placeholder, solid-white Clear, disabled-empty Search kept at 50%-opacity primary.
- Six-chip "Popular searches" row ships as a frontend constant (Đà Nẵng, Paris, Tokyo, Rome, Barcelona, New York), pre-search only, pre-fill-and-submit in one gesture, returning on Clear; restored sessions skip it.
- Richer attraction card: 12rem cover with floating rating badge (ink scrim, "Rated N of 3" announced once, rendered over image and placeholder alike) and lowercase "heritage" chip; distance line ("350 m from center" / "2.3 km from center"); pill kind tags; full-width 3rem add-to-trip row replacing the ghost button; unrated cards drop "Not rated" entirely; shimmer/placeholder/stagger/hover-lift contracts kept.
- 175/175 FE tests pass (+13 net new), lint clean (2 pre-existing fast-refresh warnings untouched), production build green, Playwright visual verification desktop + mobile.

## File List

- FE/src/pages/SearchPage.tsx (modified — hero band structure, chips, results column)
- FE/src/pages/SearchPage.module.css (rewritten — band, hero search, chips, results column, skeleton height)
- FE/src/components/AttractionCard.tsx (modified — cover with floating badges, distance line, add-to-trip row)
- FE/src/components/AttractionCard.module.css (rewritten — 12rem cover, badge scrim, pills, action row)
- FE/src/pages/SearchPage.test.tsx (updated + new chip/hero coverage)
- FE/src/components/AttractionCard.test.tsx (updated + new badge/heritage/distance coverage)
- _bmad-output/implementation-artifacts/5-14-horizon-home-redesign.md (new)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-07-16: Story created from the Horizon UX spine pair home update (`ux-tripplanner-2026-07-15`, validated by `review-rubric-home-update.md`) at user request and picked up immediately for implementation.
- 2026-07-16: Implemented all 5 tasks — hero band, hero search recomposition, suggestion chips, richer attraction cards, results column. 175/175 FE tests, lint and build green, Playwright visual verification desktop + mobile. Status → review.
