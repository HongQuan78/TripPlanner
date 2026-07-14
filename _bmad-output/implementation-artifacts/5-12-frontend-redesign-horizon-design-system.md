---
baseline_commit: b492f9c
---

# Story 5.12: Frontend redesign — Horizon Desktop design system

Status: review

## Story

As a user of the app, I want the interface restyled to match the "Horizon Desktop" visual design (blue/navy corporate-modern palette, Plus Jakarta Sans typography, tonal-layer cards, 8px/12px/pill radii) instead of the current "cute sky" light-blue system, so the product reads as more professional and polished while every existing feature keeps working exactly as it does today.

This is a **style-only replacement** of the design system introduced in story 5-6 and polished in story 5-10 — same pattern (token swap + restyle every existing screen), new source of truth: the 5 mockups in `example_design/` (`sign_in_horizon_travel`, `create_account_horizon_travel`, `explore_attractions_horizon_travel`, `destination_details_horizon_travel`, `search_destinations_horizon_travel`) and `example_design/horizon_desktop/DESIGN.md`.

## Acceptance Criteria

1. **Design tokens replaced in `FE/src/index.css`:** the entire "cute sky" token set (`--color-primary: #38bdf8` etc., see Dev Notes for the full old set) is replaced by the Horizon Desktop token set below (exact values in Dev Notes § Design Tokens). `--duration-fast`, `--duration-slow`, `--ease-spring`, and the global `prefers-reduced-motion: reduce` override (added by story 5-10) are kept unchanged. All component/page CSS modules continue to consume tokens via `var(--…)` — no new hard-coded hex colors introduced (existing ones being fixed, see AC3).
2. **Typography:** `Plus Jakarta Sans` (weights 400/500/600/700/800) replaces Nunito — swap the Google Fonts `<link>` tags in `FE/index.html` and `--font-sans` in `index.css`. Headings keep bold weight; `h1`/`h2`/`h3` use the new `headline-lg`/`headline-md` scale (Dev Notes) instead of ad hoc sizing.
3. **Global button/input/chip conventions (Dev Notes § Component Conventions) applied consistently:** standard buttons and inputs use `--radius-md` (8px); pill shape (`--radius-full`) is reserved for tag/badge chips only (no pill buttons); primary buttons are solid `--color-primary` / `on-primary` white text, hover `--color-primary-container`, active `scale(0.98)`; secondary/outline buttons are a 1px `--color-primary` border with `--color-primary` text, hover fills `--color-primary-soft`(-equivalent) background; the two hard-coded `#cbd5e1` disabled-state colors (`DestinationDetailsPage.module.css`, `AuthForm.module.css`) are replaced with a `--color-disabled` token.
4. **App shell (`AppLayout`):** header is a fixed, non-floating top bar (`--color-surface` background, `shadow-sm`-equivalent shadow, no rounded "pill" bar, no margin from viewport edges), brand link keeps the existing "✈️ TripPlanner" text (do not rename the product) styled in `headline-md`/`--color-primary`; nav links use the `label-lg` scale with the new hover/active colors. The current "cute sky" decorative background blobs (`.blobs`/`.blobOne`/`.blobTwo` in `AppLayout.module.css`) are removed — the page background becomes the flat `--color-bg` wash, matching the mockups' minimalist/no-blob aesthetic. The existing route-transition fade/slide-up animation (story 5-10, AC4 of that story) is preserved unchanged.
5. **Auth screens (Login/Register/VerifyEmail, sharing `AuthForm.module.css`):** the form sits in a white (`--color-surface-container-lowest`) card, `--radius-lg` (12px) corners, 1px `--color-outline-variant` border, `shadow-sm`-equivalent shadow, centered on the `--color-bg` wash — matching the sign-in/create-account mockups' card treatment. Inputs are 48px tall, `--radius-md`, 1px `--color-outline-variant` border, focus ring in `--color-primary`, label always visible above the field. The primary submit button follows AC3's button spec. Error/success callouts keep their current rounded-soft-tint treatment but recolor to `--color-error`/`--color-error-container` (error) and a defined `--color-success`/`--color-success-soft` pair (Dev Notes — the mockups have no error handling), and drop the previous 🙈/🎉 pattern (this is a fresh visual system, not a "cute" one). **No social-login buttons are added** — the backend has no OAuth support; this is out of scope even though the mockups show Google/Apple/GitHub buttons.
6. **Search & attraction cards (`SearchPage`, `AttractionCard`, `LocationResultList`, `SuggestionDropdown`, `Skeleton`):** cards use `--color-surface-container-lowest` background, `--radius-lg` (12px) corners, 1px `--color-outline-variant` (at ~30% opacity) border, no shadow at rest, and on hover gain a `shadow-lg`-equivalent shadow plus `translateY(-4px)` lift (replacing the current `translateY(-2px) scale(1.01)` treatment) — matching the explore/search mockups' card hover. Rating/tag chips use `--color-surface-container-low`/`--color-surface-variant` backgrounds with `on-surface-variant` text at `label-sm`, `--radius-md`. The existing `StarRating` text glyph (★/☆) is kept as-is (recolored via CSS only) — **do not** introduce a Material Symbols icon font or any new npm icon dependency; this is an explicit scope boundary (see Dev Notes). No filter sidebar, sort dropdown, category-browse row, or pagination control is added — the mockups show these, but the corresponding backend features are out of scope per `epic/epic-5-frontend-web-app.md` ("no filters/sorting", "no map"); style only what already exists.
7. **Destination details (`DestinationDetailsPage`, `PhotoCarousel`):** header (name/category/rating), description, and info rows (address/hours/website) restyled with the new tokens (`headline-lg`/`headline-md` for title, `body-md`/`label-sm` for meta). The existing `PhotoCarousel` component is restyled (border/radius per AC6's card spec) but **not** rebuilt into the mockup's multi-image bento grid — that is a structural/component change, not a style swap, and out of scope. The "Add to Trip" action area is restyled as a bordered `--radius-lg` card (mirroring the mockup's sticky-booking-card visual treatment: border, `shadow-sm`, padded) but with **no fabricated price, date/guest picker, or "Get Directions" map card** — those reference domain concepts (bookings, pricing, maps) this app doesn't have.
8. **Trips list & trip planner (`TripsPage`, `TripPlannerPage`, `TripForm.module.css`, `Dialog.module.css`, `AddToTripDialog.module.css`):** no mockup covers these screens directly — apply the same token set and card/button/hover conventions from AC3/AC6 for visual consistency (trip cards match the attraction-card treatment; destination rows in the planner keep their current layout, restyled hover/chip colors only).
9. **No footer is added.** The mockups include a 4-column marketing footer (Company/Support/Destinations/Legal links); this app has no such content or routes to link to, and epic-5's scope never included a footer — do not add one.
10. **No behavior changes:** routes, form logic, validation, auth flows, data fetching, and all component APIs are untouched; every existing unit test passes without modification (style-only test updates are allowed only if a test asserts a class name or exact DOM structure that changed, and must be noted in the Change Log).
11. `npm run build`, `npm test`, and `npm run lint` are green.

## Tasks / Subtasks

- [x] Task 1: Replace design tokens + typography (AC: 1, 2)
  - [x] Replace the `:root` token block in `FE/src/index.css` with the Horizon Desktop set (Dev Notes § Design Tokens); keep `--duration-fast`, `--duration-slow`, `--ease-spring`, and the `prefers-reduced-motion` block unchanged
  - [x] Swap the Google Fonts `<link>` tags in `FE/index.html` from Nunito to Plus Jakarta Sans (400/500/600/700/800); update `--font-sans`
  - [x] Update the `h1`/`h2`/`h3` base rule in `index.css` to align with the `headline-lg`/`headline-md` scale
- [x] Task 2: Global button/input/disabled-state conventions (AC: 3)
  - [x] Fix the two hard-coded `#cbd5e1` disabled colors (`FE/src/pages/DestinationDetailsPage.module.css`, `FE/src/pages/AuthForm.module.css`) to use a new `--color-disabled` token
  - [x] Audit primary/secondary button classes app-wide (`AuthForm.module.css`, `TripForm.module.css`, `SearchPage.module.css`, `TripsPage.module.css`, `TripPlannerPage.module.css`, `AppLayout.module.css`, `Dialog.module.css`) and align radius (`--radius-md` standard, pill only for chips), hover/active states per AC3
- [x] Task 3: App shell restyle (AC: 4)
  - [x] Rework `AppLayout.module.css`: fixed non-floating header bar, new brand/nav colors and hover states, remove `.blobs`/`.blobOne`/`.blobTwo` and their markup in `AppLayout.tsx`
  - [x] Confirm the route-transition animation (`.routeTransition`/`route-fade-in` keyframe) is untouched
- [x] Task 4: Auth screens restyle (AC: 5)
  - [x] Rework `AuthForm.module.css`: card container, 48px inputs with focus ring, button per Task 2, recolored error/success callouts (drop 🙈/🎉 emoji prefixes)
  - [x] Read `LoginPage.tsx`, `RegisterPage.tsx`, `VerifyEmailPage.tsx` fully before touching — JSX changes limited to className/static markup, no logic changes
- [x] Task 5: Search & attraction cards restyle (AC: 6)
  - [x] Rework `AttractionCard.module.css` and `SearchPage.module.css` (card surface/border/hover per AC6, chip colors)
  - [x] Rework `LocationResultList.module.css`, `SuggestionDropdown.module.css`, `Skeleton.module.css`, `StarRating.module.css` to the new token set (CSS-only, no markup/logic change)
- [x] Task 6: Destination details restyle (AC: 7)
  - [x] Rework `DestinationDetailsPage.module.css` (header, info rows, Add-to-Trip card) and `PhotoCarousel.module.css` (border/radius/controls) — no structural change to the carousel or info rows
- [x] Task 7: Trips & trip planner restyle (AC: 8)
  - [x] Rework `TripsPage.module.css`, `TripPlannerPage.module.css`, `TripForm.module.css`, `Dialog.module.css`, `AddToTripDialog.module.css` to the new tokens/card/hover conventions
- [x] Task 8: Verify (AC: 10, 11)
  - [x] Full `npm test` green with no logic changes (note any unavoidable style-only test updates in Change Log); `npm run build` and `npm run lint` green
  - [x] Visually sanity-check every route via `npm run dev` (or Playwright): `/`, `/login`, `/register`, `/verify-email`, `/attractions/:xid`, `/trips`, `/trips/:id` — confirm no console errors and that blobs are gone

## Dev Notes

### Design Tokens — "Horizon Desktop" (authoritative — replaces the 5-6 "cute sky" set)

Values below are the mockups' actual rendered Tailwind-config hex values (ground truth), not `example_design/horizon_desktop/DESIGN.md`'s prose values, which differ slightly (`#007AFF`/`#002B5B`/`#63E1FF` vs. the values actually used in the 5 code.html files).

```css
:root {
  --color-primary: #0058bc;
  --color-on-primary: #ffffff;
  --color-primary-container: #0070eb;       /* hover fill for primary buttons */
  --color-on-primary-container: #fefcff;
  --color-secondary: #405f91;
  --color-secondary-container: #a6c5fe;
  --color-on-secondary-container: #315182;
  --color-tertiary: #006577;
  --color-tertiary-container: #008096;
  --color-error: #ba1a1a;
  --color-error-container: #ffdad6;
  --color-success: #146c2e;                 /* not in mockups (no error/success UI shown); chosen to sit tonally with the palette */
  --color-success-container: #d7f2dd;
  --color-bg: #f8f9ff;                      /* page wash, was surface/surface-bright */
  --color-surface: #f8f9ff;
  --color-surface-container-lowest: #ffffff; /* cards, header */
  --color-surface-container-low: #eff4ff;
  --color-surface-container: #e5eeff;
  --color-surface-container-high: #dce9ff;
  --color-surface-container-highest: #d3e4fe;
  --color-surface-variant: #d3e4fe;
  --color-surface-dim: #cbdbf5;
  --color-on-surface: #0b1c30;
  --color-on-surface-variant: #414755;
  --color-outline: #717786;
  --color-outline-variant: #c1c6d7;
  --color-disabled: #c1c6d7;                 /* was hard-coded #cbd5e1 in two files */
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.5rem;    /* 8px — standard buttons/inputs */
  --radius-lg: 0.75rem;   /* 12px — cards, auth card, modals */
  --radius-full: 999px;   /* pills/chips only */
  --shadow-sm: 0 1px 3px rgba(11, 28, 48, 0.08);
  --shadow-lg: 0 10px 24px rgba(11, 28, 48, 0.12);
  --duration-fast: 150ms;   /* unchanged from 5-10 */
  --duration-slow: 400ms;   /* unchanged from 5-10 */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* unchanged from 5-10 */
  --font-sans: 'Plus Jakarta Sans', system-ui, 'Segoe UI', Roboto, sans-serif;
}
```

Typography scale (apply via existing heading/utility rules, not new components):

| Token | Size / Weight / Line-height / Tracking | Usage |
|---|---|---|
| `headline-lg` | 32px / 700 / 1.3 | Page titles (trip name, destination name) |
| `headline-md` | 24px / 600 / 1.4 | Card titles, section headings, brand text |
| `body-lg` | 18px / 400 / 1.6 | Prominent body copy (destination description) |
| `body-md` | 16px / 400 / 1.6 | Default body/paragraph/input text |
| `label-lg` | 14px / 600 / 1.2 / +0.05em | Nav links, buttons, emphasized labels |
| `label-sm` | 12px / 500 / 1.2 | Chips, tags, meta text, input field labels |

(`display-lg`/`display-sm`, 64px/48px hero scale, are marketing-hero-only in the mockups — this app has no marketing hero page, so they are **not** needed.)

### Component Conventions (reconciles inconsistencies across the 5 mockups — pick ONE canonical treatment)

- **Buttons/inputs:** `--radius-md` (8px) standard for both — the mockups are inconsistent (4px vs 8px vs pill across pages); DESIGN.md's explicit "Base Radius 8px" guidance is the tiebreaker. Pill (`--radius-full`) is reserved for chips/tags only, not buttons (the mockups' pill nav buttons on the search/home page are the outlier, not the pattern).
- **Cards:** `--radius-lg` (12px), `--color-surface-container-lowest` bg, 1px `--color-outline-variant` border at reduced opacity, no shadow at rest; hover adds `--shadow-lg` + `translateY(-4px)` (replacing the current `-2px`/`scale(1.01)` combo from story 5-10 — the mockups use a plain lift, no scale).
- **Chips/tags/badges:** `--radius-md`, `--color-surface-container-low` or `--color-surface-variant` bg, `on-surface-variant` text, `label-sm`.
- **Icons:** deliberately **not** adopting Material Symbols Outlined (the mockups' icon font) — this repo's hard rule is "no new dependencies" beyond the already-established webfont-for-typography pattern (Nunito → Plus Jakarta Sans is a like-for-like swap; adding an icon font is a new kind of dependency). Keep the existing emoji/text-glyph iconography (✈️ brand, ★/☆ `StarRating`, empty-state emoji in `PageState.module.css`), recolored only.

### Explicit Out-of-Scope (mockups show these; this app's feature set does not have them — do not add)

- Filter sidebar, sort dropdown, pagination (explore-attractions mockup) — `epic/epic-5-frontend-web-app.md` explicitly defers F1 US4/US5 (filters/sorting) and there is no pagination in the current API contract.
- Category-browse row, glass-morphism hero search bar, trending-destinations home section (search/home mockup) — this app's `/` route is `SearchPage`, not a marketing landing page.
- 4-column marketing footer (all mockups) — no such content/routes exist.
- Social login buttons (sign-in/create-account mockups) — backend has no OAuth.
- Bento-grid multi-photo gallery, sticky booking card with price/date/guest picker, "Get Directions" map card (destination-details mockup) — this app has no pricing/booking/map domain concepts; keep the existing `PhotoCarousel` and info-row layout, restyled only.
- Breadcrumbs (destination-details mockup) — no location-hierarchy data model backs this.

### Previous story intelligence

- Story 5-6 established the token-driven pattern this story follows: nearly the whole app consumes `index.css` custom properties, so most of the visual change is achievable by editing tokens plus the ~10 CSS modules that hard-code values or need conceptual changes (radius/shadow philosophy, not just color swaps). [Source: `_bmad-output/implementation-artifacts/5-6-ui-modernization-cute-light-blue.md`]
- Story 5-10 added `--duration-fast`/`--duration-slow`/`--ease-spring`, the reduced-motion override, route-transition animation, background blobs, and card entrance/hover animation — **keep** the duration/easing tokens, reduced-motion override, and route-transition; **remove** the background blobs (thematically "cute sky", not "Horizon Desktop"); **replace** the card hover's `scale(1.01)` with a plain `translateY(-4px)` lift per the new mockups. Entrance-animation stagger (nth-child, capped at item 10) can stay as-is — it's a generic motion pattern, not palette-specific. [Source: `_bmad-output/implementation-artifacts/5-10-ui-motion-and-depth-polish.md`]
- 5-10's own code review flagged that `TripPlannerPage.module.css`'s `.row` hover styling using `--duration-fast`/`--ease-spring` bled into story 5-11 before 5-10 was committed — those tokens are now committed (5-10 is `done`), so no conflict for this story.
- All existing tests query by ARIA role/label/text, not CSS class names or snapshots (confirmed across `AppLayout.test.tsx`, `AttractionCard.test.tsx`, `SearchPage.test.tsx`, and the general pattern across the suite) — a pure visual/token/CSS-module redesign should not break any test as long as visible text, accessible names, hrefs, and `data-testid` hooks (`image-placeholder`, `home-location`) are preserved.

### Project Structure Notes

- No new files, routes, or npm packages — all changes are edits to existing `.css`/`.module.css` files, `index.html`, and (only where a component's decorative markup is removed, e.g. `AppLayout.tsx`'s blob divs) minimal JSX wrapper/className edits. Zero logic changes.
- Files expected to change: `FE/index.html`, `FE/src/index.css`, `FE/src/layout/AppLayout.tsx`, `FE/src/layout/AppLayout.module.css`, `FE/src/pages/AuthForm.module.css`, `FE/src/pages/PageState.module.css`, `FE/src/pages/SearchPage.module.css`, `FE/src/pages/DestinationDetailsPage.module.css`, `FE/src/pages/TripsPage.module.css`, `FE/src/pages/TripPlannerPage.module.css`, `FE/src/components/AttractionCard.module.css`, `FE/src/components/LocationResultList.module.css`, `FE/src/components/SuggestionDropdown.module.css`, `FE/src/components/StarRating.module.css`, `FE/src/components/Skeleton.module.css`, `FE/src/components/PhotoCarousel.module.css`, `FE/src/components/TripForm.module.css`, `FE/src/components/Dialog.module.css`, `FE/src/components/AddToTripDialog.module.css`.

### References

- [Source: example_design/horizon_desktop/DESIGN.md] — brand/style narrative, typography/spacing/elevation/shape philosophy.
- [Source: example_design/sign_in_horizon_travel/code.html, example_design/create_account_horizon_travel/code.html] — auth card/input/button treatment (AC5).
- [Source: example_design/explore_attractions_horizon_travel/code.html, example_design/search_destinations_horizon_travel/code.html] — card/chip/hero treatment (AC6); filters/pagination/category-browse are the explicitly out-of-scope elements from these files.
- [Source: example_design/destination_details_horizon_travel/code.html] — details header/info-row/action-card treatment (AC7); bento gallery/booking picker/breadcrumbs are the explicitly out-of-scope elements from this file.
- [Source: epic/epic-5-frontend-web-app.md] — confirms filters/sorting/map are deferred backend scope, reinforcing the out-of-scope list above.
- [Source: _bmad-output/implementation-artifacts/5-6-ui-modernization-cute-light-blue.md] — token-driven restyle pattern and behavior-freeze convention this story repeats.
- [Source: _bmad-output/implementation-artifacts/5-10-ui-motion-and-depth-polish.md] — motion tokens/route-transition/blobs/card-hover this story keeps, removes, or adjusts.
- [Source: FE/src/index.css, FE/index.html] — current "cute sky" token set and font-loading mechanism being replaced.

## Dev Agent Record

### Agent Model Used

claude-fable-5 (Claude Fable 5)

### Debug Log References

- AC4 says the header background is `--color-surface` (#f8f9ff) while the token block's own annotation marks `--color-surface-container-lowest` (#ffffff) as "cards, header". Resolved in favor of the token annotation (white header), matching the mockups' white bar over the #f8f9ff page wash; the header uses `position: sticky` (attached to the top edge, full-width, no margins/radius) as the "fixed, non-floating" treatment.
- The "1px `--color-outline-variant` at ~30% opacity" card border (AC6) is implemented as `color-mix(in srgb, var(--color-outline-variant) 30%, transparent)` so it still consumes the token rather than a hard-coded rgba value. Applied to attraction cards, trip cards, planner day cards, the details card, and the photo carousel.
- The old `--color-overlay` token has no Horizon equivalent (the authoritative token block omits it); `Dialog.module.css`'s overlay now uses `rgba(11, 28, 48, 0.4)` — an alpha of the `--color-on-surface` scrim base, consistent with the shadow tokens' rgba(11, 28, 48, …) values, not a new hex color.
- Visual verification ran Playwright (installed in the session scratchpad, not the repo) against `npm run dev` with the backend mocked at the network layer and a seeded `tripplanner.auth` localStorage session for the protected routes. First attempt intercepted `**/api/**`, which also caught Vite's `/src/api/*.ts` module requests and blanked the app — rescoped the interception to the API origin `http://localhost:5000/**`.

### Completion Notes List

- Replaced the full "cute sky" token set in `FE/src/index.css` with the Horizon Desktop set (exact values from Dev Notes § Design Tokens); `--duration-fast`, `--duration-slow`, `--ease-spring`, and the `prefers-reduced-motion` override are byte-identical to before. Grep confirms zero references to any old token name (`--color-ink*`, `--color-primary-strong/dark/soft`, `--color-border`, `--color-danger*`, `--shadow-soft/lift`, `--color-overlay`) and zero hard-coded hex colors in any `.module.css`.
- Typography: Google Fonts link swapped to Plus Jakarta Sans 400/500/600/700/800; base `h1` = 2rem/700/1.3 (headline-lg), `h2`/`h3` = 1.5rem/600/1.4 (headline-md); page-title module rules aligned to 2rem, card/section/dialog titles to the headline-md or label scale; buttons use the label-lg scale (0.875rem/600/+0.05em).
- Buttons app-wide converted from pills to `--radius-md`: primary = solid `--color-primary`/`--color-on-primary`, hover `--color-primary-container`, active `scale(0.98)`; secondary (Clear, Back, Edit trip, Cancel, Logout, retry buttons, Add to trip on cards) = 1px `--color-primary` border + `--color-primary` text, hover `--color-surface-container-low` fill. Both `#cbd5e1` disabled states now use `--color-disabled`. Pill radius survives only on the carousel's circular controls/dots container (circular controls, not buttons-with-text) — all text buttons and all chips are `--radius-md`.
- App shell: blob divs removed from `AppLayout.tsx` (the only JSX change in the story), `.blobs`/`.blobOne`/`.blobTwo` rules deleted; header is a sticky full-width white bar with `--shadow-sm`, brand stays "✈️ TripPlanner" in headline-md/`--color-primary`, nav links use label-lg with `--color-surface-container-low` hover; `.routeTransition`/`route-fade-in` untouched.
- Auth card per the sign-in/create-account mockups: white `--color-surface-container-lowest` card, `--radius-lg`, `--color-outline-variant` border, `--shadow-sm`; inputs 3rem (48px) tall with always-visible label-sm labels and `--color-primary` focus ring; error/success callouts recolored to `--color-error`/`--color-error-container` and `--color-success`/`--color-success-container`; the 🙈/🎉 `::before` prefixes deleted. No social login added. LoginPage/RegisterPage/VerifyEmailPage read fully — no JSX changes were needed (the emoji lived in CSS).
- Cards per AC6: `--color-surface-container-lowest` bg, `--radius-lg`, 30%-opacity outline-variant border, no shadow at rest, hover = `--shadow-lg` + `translateY(-4px)` (scale(1.01) removed); entrance-stagger animation kept. Chips (tags, rating, category, day-count, location pills) = `--radius-md`, `--color-surface-container-low`/`--color-surface-variant` bg, `--color-on-surface-variant` text, label-sm; heritage badge keeps its success semantics on the new `--color-success-container` pair. StarRating recolored to `--color-primary` (glyphs kept, no icon font).
- Destination details: title at headline-lg, description at body-lg, info labels at label-sm; Add-to-Trip action area is now a bordered `--radius-lg` + `--shadow-sm` card per the mockup's booking-card treatment (no price/date/guest/directions content added); PhotoCarousel restyled (border/radius/control colors) without structural change.
- Trips/planner/forms/dialogs restyled to the same conventions; planner destination rows keep their layout with recolored hover (`--color-primary` link hover) and `--color-surface-variant` chips; Remove keeps its error-tinted treatment on the new `--color-error-container` pair.
- Verification: 143/143 FE tests pass unmodified, `npm run build` and `npm run lint` green (2 pre-existing fast-refresh lint warnings in untouched files). Playwright sweep of `/` (including the attraction-card grid via mocked search), `/login`, `/register`, `/verify-email`, `/attractions/W123`, `/trips`, `/trips/1`: zero console errors, zero `[class*="blob"]` elements, computed body font is Plus Jakarta Sans on every route; screenshots visually confirmed against the mockups' card/button/header treatment.

### File List

- FE/index.html
- FE/src/index.css
- FE/src/layout/AppLayout.tsx
- FE/src/layout/AppLayout.module.css
- FE/src/pages/AuthForm.module.css
- FE/src/pages/PageState.module.css
- FE/src/pages/SearchPage.module.css
- FE/src/pages/DestinationDetailsPage.module.css
- FE/src/pages/TripsPage.module.css
- FE/src/pages/TripPlannerPage.module.css
- FE/src/components/AttractionCard.module.css
- FE/src/components/LocationResultList.module.css
- FE/src/components/SuggestionDropdown.module.css
- FE/src/components/StarRating.module.css
- FE/src/components/Skeleton.module.css
- FE/src/components/PhotoCarousel.module.css
- FE/src/components/TripForm.module.css
- FE/src/components/Dialog.module.css
- FE/src/components/AddToTripDialog.module.css

## Change Log

- 2026-07-14: Story created — full visual redesign to the "Horizon Desktop" design system sourced from `example_design/`, following the token-swap + restyle pattern established by 5-6/5-10. Explicit out-of-scope list added to prevent scope creep into filters/pagination/footer/booking/social-login/icon-font features shown in the mockups but not backed by this app's actual feature set.
- 2026-07-14: Implemented — all 8 tasks done. Token set, typography, and every screen restyled to Horizon Desktop; blobs removed; pills reserved for chips; no behavior changes and no test updates were needed (all 143 FE tests pass unmodified). Build and lint green; all 7 routes visually verified via Playwright with no console errors. Status → review.
