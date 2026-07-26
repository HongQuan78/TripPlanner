---
title: 'Landing page: Framed Editorial composition and dropdown dismissal fixes'
type: 'feature'
created: '2026-07-26'
status: 'review'
baseline_commit: 'c44def9b9e9c233cb94b8ca6a557cf0e517faf45'
baseline_revision: 'c44def9b9e9c233cb94b8ca6a557cf0e517faf45'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-15/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-15/EXPERIENCE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
warnings: [multiple-goals, oversized]
---

<intent-contract>

## Intent

**Problem:** The landing page still reads as unfinished, and candidate location rows linger on screen after the user has already chosen a destination. Three shipped defects in `SearchPage` cause the lingering: the dropdown has no blur or click-outside dismissal at all, its suppression flag compares a raw suggestion name against a trimmed debounced input so the list re-opens ~300ms after a choice, and choosing calls `setSubmittedQuery(trimmedDebounced)` — searching the fragment the user never finished typing, which is why the leftovers are *partial* matches specifically.

**Approach:** Implement the pass-3 landing spine: recompose the hero band as "Framed Editorial" (bottom-left inset copy, 24rem band, 3.5rem bar capped at 34rem), add the pre-search body (recent searches → destination tile rail → how-it-works band), delete the multi-row location result list with no successor so the dropdown is the only place candidate matches ever render, and fix all three defects. The shipped one-bar-one-dropdown architecture is deliberately **kept**, not replaced.

## Boundaries & Constraints

**Always:**
- The bar stays a `<form role="search">` wrapping one input. This is what makes the search discoverable by landmark navigation; losing it is a failed redesign.
- Preserve the shipped combobox contract attribute-for-attribute: `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; `role="listbox"`/`role="option"`/`aria-selected`; ArrowDown/ArrowUp cycling with wraparound, Enter chooses, Escape dismisses; options chosen on **mousedown** so the input never loses focus first. 300ms debounce, 2-character minimum, at most 5 suggestions.
- Dropdown visibility follows exactly one question: is the user actively searching in this bar right now. Never string equality between a stored query and a debounced input.
- A choice carries the resolved `LocationSearchResult` and issues **no** further location-search request. Text location search runs only for a typed submit.
- Every colour, shadow, radius and gradient comes from a token in `FE/src/app/index.css`. No new literal hex values in component CSS.
- Keep all shipped state copy verbatim: `Searching…`, `{name} is a country — search for a specific city to see attractions.`, `Attractions near {name}`, `No attractions in this area yet — try another city.`, `No attractions match these filters — try clearing them.`, `Service unavailable — please try again.` with `Try again`, and the visually hidden `Loading attractions…` / `Showing N attractions.`
- Preserve the search-state restore contract: returning from an attraction detail restores the page as left.

**Block If:**
- Satisfying the tile rail or hero band appears to require a licensed image asset or a new network request. It must not: both ship as token-built CSS gradients.
- Deleting `LocationResultList` appears to break a surface other than `SearchPage`.

**Never:**
- No modal, dialog, scrim, focus trap, scroll lock, or trigger-and-panel indirection anywhere on this surface. An intermediate version of this design pass had a modal search overlay and a chosen-destination "Change" bar; both were cut by the user and are **not** the design.
- No candidate-match list rendered outside the dropdown — including a summary row restating the chosen city.
- No affordance implying server-side curation ("Trending", "For you"), no hero carousel or auto-advancing imagery, no infinite scroll, no geolocation prompt, no toast.
- Do not add a `/` keyboard shortcut or hint chip (explicitly dropped).
- Do not touch the backend, the attraction card, `AttractionControls`, pagination, filters/sort, or `NearbyRail`.
- Do not refactor `searchState.ts` to a single resolved fact — a recorded open item, deliberately out of scope (see Design Notes).
- Do not change `AppLayout`'s "TripPlanner" wordmark spelling — a separate recorded open item.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dismiss by outside click | Dropdown open with options | Click the page background: no option list in the DOM; input keeps its value | No error expected |
| Dismiss by blur | Dropdown open, input focused | Input loses focus: list unmounts | No error expected |
| Choose by pointer | Dropdown open | Mousedown an option: choice registers (blur must not pre-empt it), list unmounts, attractions load for that option | No error expected |
| Whitespace in returned name | Chosen suggestion name is `"  Paris  "` | Nothing re-appears after the debounce interval elapses | No error expected |
| Choose before debounce settles | Typed `Tok`, dropdown open on `Tok`, choose `Tokyo` | Zero further location-search requests; the loaded city is `Tokyo`, never `Tok` | No error expected |
| Typed submit | `Par` submitted | Matches render as dropdown options; nothing is written into the page body | Search error → state pattern with `Try again` below the band |
| Typed submit, no matches | Query matching nothing | Dropdown stays open showing one quiet line `No attractions found.`; field keeps its value; page body untouched | No error expected |
| Under 2 characters | Input `P` | Dropdown does not open; no request issued | No error expected |
| Suggestions in flight | New debounced query resolving | Previous option list stays rendered — no flash to empty | Request error → dropdown fails silently (shipped behavior) |
| Tile / recent chip activated | Pre-search body visible | Chooses that city and loads attractions in one gesture, without ever opening the dropdown | No error expected |
| First visit | No history | No "Recent searches" section at all (absent, not an empty heading); tile rail is the first thing under the band | No error expected |
| Country chosen | Chosen result is a `Country` | Country notice; no attractions request; bar holds the country name | No error expected |
| Clear | City chosen | Field emptied, dropdown closed, city dropped, body returns to pre-search including tile rail and how-it-works; recent-search history survives | No error expected |

</intent-contract>

## Code Map

- `FE/src/features/destinations/SearchPage.tsx` -- the whole change's centre: hero band, bar, dismissal, choice handling, pre-search body.
- `FE/src/features/destinations/SearchPage.module.css` -- band, bar, rail, step rows, results column.
- `FE/src/features/destinations/SuggestionDropdown.tsx` / `.module.css` -- gains the no-matches line; keeps its ARIA contract untouched.
- `FE/src/features/destinations/LocationResultList.tsx` / `.module.css` -- **to be deleted**; `SearchPage` is its only consumer.
- `FE/src/features/destinations/searchState.ts` -- session restore store; consumed only by `SearchPage` and its test.
- `FE/src/features/destinations/hooks.ts` -- `useLocationSearch` (submit) and `useLocationSuggestions` (typeahead) already share the `['locationSearch', query]` key; no change expected.
- `FE/src/app/index.css` -- the single token home; `--shadow-xl` and the gradient tokens do not exist yet.
- `FE/src/features/destinations/SearchPage.test.tsx` -- large blast radius: the filter, sort, pagination and city-selection blocks currently reach a city by clicking a result-list row.

## Tasks & Acceptance

**Execution:**
- `FE/src/app/index.css` -- add `--shadow-xl: 0 14px 30px rgba(11, 28, 48, 0.16)`, `--gradient-hero-stand-in` (radial `--color-surface-container-high` highlight at 88%/12% fading by 58%, over a 152° ramp `surface-variant` → `secondary-container` 18% → `secondary` 46% → `tertiary` 72% → `on-surface` 100%, over a `--color-surface-container` base) and `--gradient-tile-scrim` (bottom-up `on-surface` 78% → 66% at 40% → 18% at 72% → transparent) -- tokens live once; the gradients are committed deliverables, not placeholders.
- `FE/src/features/destinations/SearchPage.tsx` -- delete **both** query-scoped flags (`suppressedQuery` and `dismissedQuery`) and replace them with one boolean "is the user actively searching in this bar" -- set true on typing, set false on Escape, blur, outside click, and choosing -- then derive `dropdownOpen` from that flag plus 2+ characters and a resolved query (options present, or a settled empty result for the no-matches line) -- defect 2. The spine bans any query-scoped `dismissed`/`suppressed` bookkeeping from deciding visibility, so string equality against a debounced input disappears entirely. Escape still dismisses, and typing another character re-opens because typing sets the flag back to true.
- `FE/src/features/destinations/SearchPage.tsx` -- add blur and click-outside dismissal (a ref on the form + panel wrapper; `pointerdown` on the document, or `onBlur` guarded so it cannot pre-empt an option's mousedown) -- defect 1, the reported symptom.
- `FE/src/features/destinations/SearchPage.tsx` -- rewrite `handleChoose` to take the resolved `LocationSearchResult` only: set the input to its name, select it, close the dropdown, and issue no location-search request -- defect 3.
- `FE/src/features/destinations/SearchPage.tsx` -- feed the dropdown from the submitted-query results as well as the debounced suggestions, remove the `LocationResultList` render, and gate the pre-search body on `selected === null` rather than `submittedQuery === ''` -- the dropdown becomes the only candidate surface.
- `FE/src/features/destinations/SearchPage.tsx` -- recompose the band per Framed Editorial: `<h1>` "Where to next?", tagline "Search any city and start building the trip.", then the bar with a leading `aria-hidden` magnifier, an inline clear named "Clear search" rendered only when the field has a value, and a square primary submit named "Search" carrying an `aria-hidden` glyph.
- `FE/src/features/destinations/SearchPage.tsx` -- add the pre-search body: recent-search chip row under a "Recent searches" label carrying a "Clear" action named "Clear recent searches" (row present only when history exists) **above** the "Popular searches" tile rail, then the how-it-works band as an ordered list of three rows with `aria-hidden` ordinals, no heading of its own and no call to action, copy verbatim: **"Search a city"** / "Anywhere in the world, by name."; **"See what's there"** / "Attractions with ratings, heritage marks, and distance from the centre."; **"Build the days"** / "Drop places into a day-by-day itinerary and move them as plans change."
- `FE/src/features/destinations/SearchPage.tsx` -- upgrade the existing six-city `POPULAR_CITIES` constant from `string[]` to six fully resolved `LocationSearchResult` values (name, `countryCode`, `locationType: 'City'`, latitude, longitude) and use it as the tile rail's source, so a tile activation is a choice like any other -- required by "one gesture, no dropdown, no second request"; see Design Notes.
- `FE/src/features/destinations/SearchPage.tsx` -- make focusing the bar select its current value so typing replaces the chosen city rather than appending to it; add one `aria-live="polite"` announcement on choosing a city, and a visually hidden description on the input stating the arrow/Enter/Escape model.
- `FE/src/features/destinations/recentSearches.ts` -- **new**: client-side history of chosen `LocationSearchResult`s, most recent first, capped small (5), deduped by identity; append only on a choice, never on a keystroke or a fruitless submit; `clear()` for the "Clear recent searches" action. Survives page Clear.
- `FE/src/features/destinations/SearchPage.module.css` -- band (24rem at `md`+, ~16rem below, clipped to `--radius-lg`, gradient stand-in under the ink ramp holding ≥65% through the copy/bar block), bottom-left `2.5rem` inset composition relaxing to `1.5rem` below `md`, 3.5rem bar capped 34rem on `--shadow-lg` lifting to `--shadow-xl`, 13rem 16:10 scroll-snapped tile rail, hairline step rows with a 2.5rem numeral gutter.
- `FE/src/features/destinations/SuggestionDropdown.tsx` / `.module.css` -- render one quiet no-matches line when there are no options; keep every existing ARIA attribute, the mousedown-to-choose behavior, and the keyboard-active ring distinct from pointer hover.
- `FE/src/features/destinations/LocationResultList.tsx`, `LocationResultList.module.css` -- delete both; no successor.
- `FE/src/features/destinations/SearchPage.test.tsx` -- rework every test that reaches a city through a result-list row to choose from the dropdown instead; delete the result-list-specific tests (submitted-results rows, at-most-5 rows, partial-match badge); add coverage for each I/O Matrix row above.

**Acceptance Criteria:**
- Given the dropdown is open, when the user clicks the page background or the input loses focus, then no option list exists in the DOM and the field keeps its value.
- Given the dropdown is open, when the user mousedowns an option, then the choice registers, the list unmounts, and attractions load for exactly that option — blur does not pre-empt it.
- Given a suggestion whose name carries surrounding whitespace is chosen, when a full debounce interval elapses, then no option list re-appears.
- Given the dropdown opened on a fragment, when an option is chosen before the debounce settles, then zero additional location-search requests are issued and the loaded city is the chosen option.
- Given a typed submit, when matches return, then they render as dropdown options and no candidate list appears anywhere in the page body; when none return, the dropdown stays open showing `No attractions found.`
- Given a first visit with no history, when the landing page renders, then there is no "Recent searches" heading at all and the tile rail is the first section under the band.
- Given a city has been chosen, when the user activates the inline clear, then the pre-search body returns in full (tile rail and how-it-works included) and the recent-search history is unchanged.
- Given a tile or a recent chip is activated, when it resolves, then attractions load in one gesture and the dropdown never opens.
- Given a screen-reader user chooses a city, when the choice registers, then a polite live-region message announces it.
- Given `role="search"` landmark navigation, when the landing page is traversed, then the search form is still reachable as a landmark, and tab order runs input → clear (when present) → submit → recent chips → tiles, with dropdown options never becoming tab stops.

## Review Triage Log

### 2026-07-26 — Review pass

- intent_gap: 1: (high 1, medium 0, low 0)
- bad_spec: 0
- patch: 0
- defer: 2: (high 0, medium 2, low 0)
- reject: 6: (high 0, medium 0, low 6)
- addressed_findings:
  - none

Notes on this pass, recorded because it deviated from the standard procedure:

- Four review layers were launched in parallel as required. All four terminated on an org monthly spend limit after ingesting the 98 KB diff. The Blind Hunter layer was re-run successfully against a split, smaller payload and returned findings; the Edge Case Hunter, Verification Gap, and Intent Alignment layers were **not** re-run, because the Blind Hunter's output already established a blocking `intent_gap`, under which the cascade rule makes all lower findings moot — spending the remaining budget to enumerate moot findings was not justified. A future pass on the amended spec should run all four layers.
- 13 further findings from the Blind Hunter are real but moot under the cascade rule and are **not** recorded as patches, since the code they describe has been reverted. They are listed in the Auto Run Result so they survive re-derivation, and the substantive ones must be re-checked against the amended spec.

## Design Notes

**The no-matches string is a deliberate divergence from the spine.** `EXPERIENCE.md` names it `No matching places found.` in three places, and `mockups/key-home-suggestions.html` renders that. It is stale: story 1-6 (commit `1bbb89f`) replaced exactly that string with `No attractions found.` to satisfy requirement US2-AC6 in `requirement/Sheet1.html`, and left a test that fails if the copy drifts. `CLAUDE.md` states the sheet is authoritative where sources disagree, so the dropdown's no-matches line ships as **`No attractions found.`** The spine's structural decision still holds — the message moves into the dropdown and the page-level state is deleted — and US2-AC6 only requires that the message be received when no matching locations are found, not where it renders.

**Why the pre-search gate moves from `submittedQuery` to `selected`.** Deleting the page-level result list means a typed submit no longer produces a page-body surface. The spine ties the pre-search body's disappearance to a city being *chosen*, so gating on `submittedQuery === ''` would blank the rail and the how-it-works band on a fruitless submit and leave the body empty.

**`searchState.ts` is deliberately left at three fields.** The spine notes that a chosen city is one fact and that three independently-settable strings are what let them drift, but records this as an open item carried forward rather than a requirement of this pass. Fixing defects 2 and 3 removes the drift's user-visible consequences; collapsing the store is a refactor with no further behavior change and belongs in its own story. Note it in `deferred-work.md`.

**Why the tile constant must carry coordinates.** The spine says tiles are "six well-known city names shipped as a frontend constant" *and* that a tile "resolves to a `LocationSearchResult`… issues no second location-search request" *and* that activating one "loads its attractions in one gesture, without ever opening the dropdown". The shipped `handleChipSelect` cannot satisfy that: it sets `submittedQuery` and relies on the user then picking a row from the result list this story deletes. Resolving the name through the API instead would issue the forbidden second request and could return a different top result than the tile names — the exact bug class this pass exists to kill. Hardcoding each tile's `countryCode`/type/latitude/longitude is therefore the only reading that satisfies all three rules, and it is honest: these are six fixed, hand-curated cities, not a feed. The same applies to recent chips, which already store resolved objects by construction.

**Gradients, not photographs.** `FE/src/assets` still does not exist. `--gradient-hero-stand-in` and the per-tile variants are the shipped deliverable — vary tile mid-stops across the secondary/tertiary families so the rail reads as six places rather than one repeated swatch. Tile labels are white over the scrim at ≥6.03:1; introducing a lighter tile stop is forbidden. The how-it-works numeral takes `--color-outline` (4.48:1), never `--color-outline-variant` (1.62:1).

## Verification

**Commands:**
- `cd FE && npm test` -- expected: all pass, including the reworked selection paths and the new dismissal/whitespace/no-second-request coverage.
- `cd FE && npm run lint` -- expected: no new findings (two pre-existing fast-refresh warnings are known).
- `cd FE && npm run build` -- expected: type-check and production build succeed.

**Manual checks (if no CLI):**
- jsdom has no layout: the 24rem band and its `md` step-down, the bottom-left inset, the dropdown overlaying the rail without reflowing it, and the rail's horizontal scroll-snap must be confirmed visually at 1440×900 and 390×844.
- Keyboard-only pass: every tile reachable by Tab and scrolled into view on focus; focus rings never suppressed; the inline clear's hit area reaches 44px.

## Dev Agent Record

### Implementation Plan

Run of 2026-07-26 (attended, `bmad-dev-story`). Baseline `c44def9`, which is still HEAD.

1. Put the blocking intent gap to the user rather than guessing it a second time.
2. Re-derive the reverted work by applying `spec-5-19-attempted-implementation.patch` (it applies cleanly to HEAD and had passed 298/298 + lint + build), then review every hunk rather than trusting it.
3. Re-cut the tile path to the user's decision.
4. Fix the eight real defects the one completed review layer found in the reverted attempt.
5. Rework the tests, then close the visual-verification gap the previous run left open.

### Debug Log

- **The blocking intent gap is resolved: option (a).** Asked the user directly. Their decision: a "Popular searches" tile **pre-fills the bar and submits the existing text search**; the matches open in the dropdown for the visitor to pick. This honors `EXPERIENCE.md:34` (the line labelled a hard, non-negotiable constraint — pre-search affordances may only drive the existing `GET` location search by name) and drops `EXPERIENCE.md:121`'s "one gesture, without ever opening the dropdown" for tiles. No frontend-authored latitude/longitude ships. Asked separately whether to amend `EXPERIENCE.md` so the losing lines stop contradicting the winner; the user chose **code only**, so the doc is untouched and the surviving contradiction is recorded in `deferred-work.md`.
- **Consequences of (a), stated plainly.** `POPULAR_CITIES` stays a `string[]`. The spec's I/O matrix row "Tile / recent chip activated → …in one gesture, without ever opening the dropdown" and the matching Acceptance Criterion now hold for **recent chips only**. Recent chips are unaffected by the decision — they store resolved `LocationSearchResult`s by construction, so they still choose in one gesture with no second request. The tile half of that row/AC is knowingly not met, by the user's decision. Everything else in the spec is unaffected, exactly as the blocking note predicted. The Design Notes paragraph "Why the tile constant must carry coordinates" is superseded; it argued for option (b).
- **A new defect was found that no previous pass could see.** The hero band carried `overflow: hidden` (to clip the gradient to `--radius-lg`), which **clipped the suggestion dropdown at the band's bottom edge** — the first option rendered sliced in half. Both the spec and the reverted patch contain this bug; it was invisible to jsdom and to the unattended run, which never rendered the page. Fixed by moving the clip onto an inner absolutely-positioned `.heroSurface` layer (`inset: 0; border-radius: inherit; overflow: hidden`) that carries the gradient and the scrim, leaving `.heroBand` itself unclipped so the dropdown can escape it. Verified in a real browser before and after.
- **Review findings carried forward — all eight fixed.** (1) One-character submit was a silent dead end: submit is now gated at 2 characters (button disabled, handler early-returns) and `useLocationSearch`'s `enabled` was raised to match `useLocationSuggestions` via a shared `LOCATION_QUERY_MIN_LENGTH`. (2) Stale search-status band: the `Searching…`/error band now renders only while `submittedMatchesInput`, so it cannot contradict a live dropdown and "Try again" can only refetch a query the field still holds. (3) `placeholderData` on one of two hooks sharing `['locationSearch', q]`: now on both, so the shared cache entry reports one consistent status. (4) Indistinguishable focus: `.bar:focus-within` no longer draws the ring (it now shifts border + shadow); each of input, clear, submit, recent chips, tiles and "Clear recent searches" has its own `:focus-visible` outline. (5) Three overlapping dismissal mechanisms: reduced to two non-redundant ones — a single document `pointerdown` for outside clicks, and a form-level `onBlur` guarded by `relatedTarget` for focus leaving the form. (6) Three `<h2>`s competing with "Attractions near {name}", with the 1-2-3 order visible only to sighted users: step labels are now `<p>`, and the `<ol>` carries `role="list"` so the sequence survives `list-style: none` while the numerals stay `aria-hidden` as the spec requires. (7) Live region never reset: cleared on Clear, and an alternating trailing space makes choosing the same city twice a real DOM change so it re-announces. (8) `getRecentSearches()` returned the live internal array: all three exported functions now return copies, covered by a new `recentSearches.test.ts`.
- The two genuinely pre-existing findings (missing `role="combobox"`; options activatable only by `onMouseDown`) remain deferred in `deferred-work.md`, as does the `searchState.ts` three-field collapse.
- The spec's "13 findings moot under the cascade rule" note is discharged: the eight substantive ones above were re-checked against the re-derived code and fixed; the rest were the rejected-as-noise set the spec already lists.

### Completion Notes

Landing page shipped. The hero band is the Framed Editorial composition, the pre-search body (recent chips → tile rail → how-it-works) is in place, `LocationResultList` is deleted with no successor, and all three reported defects are fixed:

- **Defect 1 (no dismissal at all)** — outside click and blur both dismiss.
- **Defect 2 (string equality re-opened the list ~300ms after a choice)** — both query-scoped flags are gone, replaced by one `activeSearch` boolean; no string comparison decides visibility anywhere.
- **Defect 3 (`setSubmittedQuery(trimmedDebounced)` searched the unfinished fragment)** — `handleChoose` takes the resolved `LocationSearchResult`, sets `submittedQuery` to `''`, and issues no location-search request.

Verification (all run, all green): `npm test` 313/313 across 28 files; `npm run lint` clean apart from the two known pre-existing fast-refresh warnings; `npm run build` type-check and production build succeed.

**The visual-verification gap the previous run left open is now closed.** Playwright is not in `FE/node_modules`, but an `npx` cache copy and a Chromium build (`ms-playwright/chromium-1228`) were already on the machine, so no download was needed. The page was rendered and measured at 1440×900 and 390×844:

- Band 384px (24rem) at desktop with 40px (2.5rem) inset, stepping to 256px (16rem) with 24px (1.5rem) inset at 390px — both bottom-left, `align-items: flex-end`, clipped to 12px radius.
- Bar 56px (3.5rem) tall, 544px wide at desktop — capped at exactly 34rem.
- Inline clear and submit both measure 44×44px.
- Tile rail scrolls horizontally with `scroll-snap-type: x mandatory` (1316px content in a 1120px track at desktop; 1124px in 358px at mobile); all six tiles are Tab-reachable with a visible 3px focus outline.
- Dropdown overlays the rail with the rail's top unchanged to the pixel before and after opening — no reflow — at both viewports.
- No horizontal page overflow at either viewport.

**Known deviation from this spec, by user decision:** the tile half of the "one gesture, without ever opening the dropdown" matrix row and Acceptance Criterion is not met — tiles submit the text search and open the dropdown (option (a)). Recent chips still satisfy it. See the Debug Log above and the new `deferred-work.md` entry.

### File List

- `FE/src/app/index.css` — modified
- `FE/src/features/destinations/SearchPage.tsx` — modified
- `FE/src/features/destinations/SearchPage.module.css` — modified
- `FE/src/features/destinations/SearchPage.test.tsx` — modified
- `FE/src/features/destinations/SuggestionDropdown.tsx` — modified
- `FE/src/features/destinations/SuggestionDropdown.module.css` — modified
- `FE/src/features/destinations/hooks.ts` — modified
- `FE/src/features/destinations/recentSearches.ts` — added
- `FE/src/features/destinations/recentSearches.test.ts` — added
- `FE/src/features/destinations/LocationResultList.tsx` — deleted
- `FE/src/features/destinations/LocationResultList.module.css` — deleted
- `_bmad-output/implementation-artifacts/deferred-work.md` — modified
- `_bmad-output/implementation-artifacts/spec-5-19-landing-page-framed-editorial.md` — modified

## Change Log

- 2026-07-26 — Unblocked the intent gap by user decision: destination tiles take option (a), pre-fill and submit the text search. `EXPERIENCE.md` left unamended by user choice; the surviving contradiction recorded in `deferred-work.md`.
- 2026-07-26 — Implemented the Framed Editorial landing composition and the pre-search body; deleted `LocationResultList` with no successor; fixed all three reported dropdown defects.
- 2026-07-26 — Fixed 8 review findings carried forward from the reverted attempt (1-char submit dead end, stale status band, split `placeholderData`, indistinguishable focus, triple dismissal handlers, step heading/list semantics, live-region reset, mutable recent-search array).
- 2026-07-26 — Fixed a previously unseen defect: the hero band's `overflow: hidden` clipped the suggestion dropdown; clipping moved to an inner `.heroSurface` layer.
- 2026-07-26 — Added `recentSearches.test.ts` and 9 `SearchPage` tests; suite 298 → 313.
- 2026-07-26 — Closed the spec's outstanding manual visual checks at 1440×900 and 390×844 using an already-installed Chromium.

## Auto Run Result

Status: superseded by the attended run of 2026-07-26 (see Dev Agent Record). Retained below as the record of why the first run stopped.

Original status: blocked
Blocking condition: intent gap — **resolved 2026-07-26**, see Dev Agent Record → Debug Log.

Saved attempted implementation: [spec-5-19-attempted-implementation.patch](spec-5-19-attempted-implementation.patch) — apply with `git apply` from the repo root against `c44def9b9e9c233cb94b8ca6a557cf0e517faf45`. It passed FE 298/298 tests, lint, and build before being reverted.

### The intent gap

The experience spine contradicts itself about what a "Popular searches" destination tile does, and the two readings produce different UX, different network behavior, and different data provenance. Nothing in the intent selects between them, so this decision is not one an unattended run may make.

- **`EXPERIENCE.md:34`**, labelled a *hard constraint, equally non-negotiable*: "Every affordance on the pre-search page — **destination tiles included** — can only pre-fill and submit the existing text-search flow (`GET` location search by name)."
- **`EXPERIENCE.md:172`**: "A dropdown option, a recent chip, and **a tile** all resolve to a `LocationSearchResult` — name, country code, type, latitude, longitude. Choosing uses that object directly and issues **no second location-search request**."
- **`EXPERIENCE.md:121`**: activating a tile "chooses that city and loads its attractions in one gesture, **without ever opening the dropdown**."

A tile cannot simultaneously issue only a text search and issue no search at all.

**Unresolved question:** when a visitor activates a "Popular searches" tile, which happens?

- **(a) Pre-fill and submit the text search** (honors the non-negotiable line 34). The six tiles stay plain city names, the location search runs, and its matches open in the dropdown for the visitor to pick — so it is **two** gestures, not one, and line 121's "without ever opening the dropdown" is dropped.
- **(b) Tiles carry their own resolved coordinates** (honors lines 121 and 172). One gesture, no dropdown, no request — but the six tiles ship frontend-authored latitude/longitude that no server ever validated, which is what line 34 forbids.
- **(c) Submit the text search and auto-choose the top match.** One gesture, but it re-introduces exactly the bug class this pass exists to kill: the top match for a typed name can differ from the place named on the tile (this is defect 3's failure mode).

This run took (b) during planning, on the reasoning recorded under Design Notes, having missed the line-34 constraint. That reasoning was wrong to pick at all — the contradiction should have blocked. Recent-search chips are unaffected either way: they store resolved `LocationSearchResult`s by construction, so line 172 applies to them cleanly.

**To unblock:** state which of (a)/(b)/(c) is the design, ideally amending `EXPERIENCE.md` so the losing lines stop contradicting the winner, then re-invoke. Only the tile path changes; everything else in this spec is unaffected.

### Review findings carried forward

From the one review layer that completed. These are moot under the cascade rule and were not patched, but they must be re-checked when the code is re-derived — several are real defects in the reverted attempt, not in the spec:

- **A one-character submit is a silent dead end.** `handleSubmit` accepted any non-empty trimmed query and `useLocationSearch` fires for `length > 0`, but the dropdown required 2+ characters — so submitting `"A"` issued a real request, showed "Searching…", then rendered nothing at all. The error branch still rendered, so a 1-char query could show failures but never successes.
- **A stale search-status band contradicted the live dropdown.** The `Searching…`/error band keys off `submittedQuery`, so a 503 banner and its "Try again" persisted while the dropdown showed fresh successful options for newly typed text — and "Try again" refetched the old query, not the field's contents.
- **`placeholderData` was added to only one of two hooks sharing the `['locationSearch', q]` cache key**, so the same cache entry reported different status depending on which hook read it, and a disabled query could report success carrying the previous city's options.
- **Focus became indistinguishable across the three controls in the bar**: `.input:focus { outline: none }` plus `.bar:focus-within` lit the same wrapper ring for the input, Clear, and Submit alike, with no `:focus-visible` rule anywhere — a regression against the spine's "focus is always visible, never suppressed".
- **Three overlapping dismissal mechanisms** ran at once (input `onBlur`, a document `pointerdown`, and a document `mousedown`), so every outside click ran the state setters twice.
- **The how-it-works band emitted three `<h2>`s** at the same heading level as "Attractions near {name}", and its `<ol>` had `list-style: none` with `aria-hidden` numerals, so the 1-2-3 sequence existed only visually.
- **The polite live region never reset**: it retained "Paris selected." after Clear, and choosing the same city twice wrote an identical string, so React skipped the update and nothing announced.
- **`getRecentSearches()` returned the live internal array** rather than a copy.
- Two findings were deferred as genuinely pre-existing (missing `role="combobox"`; options activatable only by `onMouseDown`) — recorded in `deferred-work.md`.
- Rejected as noise or as spine-mandated: the duplicate "Search" accessible name on both input and submit (`EXPERIENCE.md:100` mandates both), select-all-on-focus (`EXPERIENCE.md:174` mandates it), the gradient stand-in shipping without a photograph (a committed deliverable per `DESIGN.md:284`), the tile-rail scroll container lacking its own tab stop (every tile is a focusable button), `TILE_GRADIENTS` modulo arithmetic, and gradient token naming.

### Verification performed

- `cd FE && npm test` — 27 files, 298 tests, all passed.
- `cd FE && npm run lint` — clean apart from the two known pre-existing fast-refresh warnings.
- `cd FE && npm run build` — `tsc -b` and `vite build` both succeeded.
- Matrix test audit — all 13 I/O matrix rows covered by tests that ran and passed; the defect-3 row asserts both halves (exactly one search call, and the chosen city's coordinates loaded).
- **Not performed:** the spec's manual visual checks (24rem band and its `md` step-down, bottom-left inset, dropdown overlaying the rail without reflow, rail scroll-snap, 44px clear hit area) at 1440×900 and 390×844. Playwright is not installed in `FE/node_modules` and a browser download was judged too heavy for an unattended run. jsdom cannot verify layout, so the composition was never seen rendered.

### Residual risks

- The attempted implementation is preserved only as a patch file, not a branch. It applies cleanly to `c44def9` but will need rebasing if `FE/src/features/destinations/` moves on.
- Three of the four review layers never ran, so the reverted attempt was reviewed from one adversarial angle only. Edge-case, verification-gap, and intent-alignment coverage is absent.
- The landing page is unchanged on disk: this run delivered a spec and a reviewed patch, not a shipped redesign.
