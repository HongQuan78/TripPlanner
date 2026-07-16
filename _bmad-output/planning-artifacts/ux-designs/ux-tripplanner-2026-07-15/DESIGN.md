---
name: Trip Planner — Horizon
description: Horizon design language for Trip Planner — a premium-travel Material 3-flavored token system, hand-rolled in CSS custom properties, applied here to the auth surfaces (Login, Register, Verify Email) and the home/search surface (hero search band, attraction cards).
status: final
updated: 2026-07-15
colors:
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  secondary: '#405f91'
  secondary-container: '#a6c5fe'
  on-secondary-container: '#315182'
  tertiary: '#006577'
  tertiary-container: '#008096'
  error: '#ba1a1a'
  error-container: '#ffdad6'
  success: '#146c2e'
  success-container: '#d7f2dd'
  background: '#f8f9ff'
  surface: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  surface-variant: '#d3e4fe'
  surface-dim: '#cbdbf5'
  on-surface: '#0b1c30'
  on-surface-variant: '#414755'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  disabled: '#c1c6d7'
typography:
  display-sm:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  title-md:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  md: 0.5rem
  lg: 0.75rem
  full: 999px
spacing:
  '1': 0.25rem
  '2': 0.5rem
  '3': 0.75rem
  '4': 1rem
  '5': 1.5rem
  '6': 2rem
  '7': 2.5rem
  '8': 3rem
  auth-card-max: 26rem
  home-results-max: 60rem
  hero-band-min: 22rem
  card-image-height: 12rem
shadows:
  sm: '0 1px 3px rgba(11, 28, 48, 0.08)'
  lg: '0 10px 24px rgba(11, 28, 48, 0.12)'
motion:
  fast: 150ms
  slow: 400ms
  ease-spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
components:
  button-primary:
    background: '{colors.primary}'
    background-hover: '{colors.primary-container}'
    background-disabled: '{colors.primary} at 50% opacity'
    foreground: '{colors.on-primary}'
    radius: '{rounded.md}'
    typography: '{typography.label-lg}'
    height: 3rem
  input:
    background: '{colors.surface-container-lowest}'
    border: '1px solid {colors.outline-variant}'
    border-focus: '2px solid {colors.primary}'
    foreground: '{colors.on-surface}'
    icon: '{colors.outline}'
    radius: '{rounded.md}'
    height: 3rem
    typography: '{typography.body-md}'
  field-label:
    foreground: '{colors.on-surface-variant}'
    typography: '{typography.label-sm}'
  auth-card:
    background: '{colors.surface-container-lowest}'
    border: '1px solid {colors.outline-variant}'
    radius: '{rounded.lg}'
    shadow: '{shadows.sm}'
    max-width: '{spacing.auth-card-max}'
    padding: '{spacing.6}'
  hero-panel:
    background: '{colors.surface-container}'
    overlay: 'linear-gradient of {colors.on-surface}, 80% opacity at the bottom, holding at least 65% opacity through the full welcome-copy block, decaying to transparent only above it'
    foreground: '{colors.on-primary}'
    headline: '{typography.display-sm}'
    body: '{typography.body-lg}'
  hero-band:
    background: '{colors.surface-container}'
    overlay: 'linear-gradient of {colors.on-surface}, 80% opacity at the bottom, holding at least 65% opacity through the full headline/tagline/search block, decaying to transparent only above it'
    foreground: '{colors.on-primary}'
    headline: '{typography.display-sm}'
    tagline: '{typography.body-lg}'
    radius: '{rounded.lg}'
    min-height: '{spacing.hero-band-min}'
  hero-search:
    background: '{colors.surface-container-lowest}'
    border: '1px solid {colors.outline-variant}'
    border-focus: '2px solid {colors.primary}'
    foreground: '{colors.on-surface}'
    radius: '{rounded.md}'
    shadow: '{shadows.lg}'
    height: 3rem
    typography: '{typography.body-md}'
  suggestion-chip:
    background: '{colors.surface-container-lowest}'
    background-hover: '{colors.surface-container-low}'
    foreground: '{colors.on-surface}'
    radius: '{rounded.full}'
    typography: '{typography.label-sm}'
    height: 2rem
  attraction-card:
    background: '{colors.surface-container-lowest}'
    border: '1px solid {colors.outline-variant} at 30% opacity'
    radius: '{rounded.lg}'
    shadow-hover: '{shadows.lg}'
    image-height: '{spacing.card-image-height}'
    name: '{typography.title-md}'
  rating-badge:
    background: '{colors.on-surface} at 80% opacity'
    foreground: '{colors.on-primary}'
    radius: '{rounded.full}'
    typography: '{typography.label-sm}'
  heritage-chip:
    background: '{colors.success-container}'
    foreground: '{colors.success}'
    radius: '{rounded.full}'
    typography: '{typography.label-sm}'
  kind-tag:
    background: '{colors.surface-container-low}'
    foreground: '{colors.on-surface-variant}'
    radius: '{rounded.full}'
    typography: '{typography.label-sm}'
  add-to-trip-row:
    background: 'transparent'
    background-hover: '{colors.surface-container-low}'
    foreground: '{colors.primary}'
    border-top: '1px solid {colors.outline-variant} at 30% opacity'
    typography: '{typography.label-lg}'
    height: 3rem
  banner-error:
    background: '{colors.error-container}'
    foreground: '{colors.error}'
    radius: '{rounded.md}'
  banner-success:
    background: '{colors.success-container}'
    foreground: '{colors.success}'
    radius: '{rounded.md}'
---

# Trip Planner — Horizon DESIGN.md

## Brand & Style

Horizon is the visual language of a premium travel product: airy, blue-forward, quietly confident. The mood is "golden-hour coastline seen from a clean modern lobby" — one large photographic moment per screen, and everything else calm, white, and typographic. The system is Material 3 in spirit (tonal surface ramp, on-color pairs, outline tokens) but hand-rolled: tokens live as CSS custom properties in `FE/src/index.css` and are consumed by CSS Modules, with no component library underneath.

This document describes the Horizon system as it is already implemented app-wide in `FE/src/index.css` — the palette, radii, shadows, and motion durations below are the existing production values, not a new invention. The scope of this pair now covers two surface families: the auth surfaces (Login, Register, Verify Email) and the home/search surface (`/` → SearchPage with its attraction cards). The auth redesign was the occasion of the token layer; the home surface extends the same language rather than inventing a second one.

The user-facing brand spelling is **"Trip Planner"** — two words, wherever the wordmark or product name appears in the UI (the repository and code identifiers use `TripPlanner`; copy does not).

→ Reference: `imports/sign-in-horizon-travel.html` (the Horizon Travel sign-in mock this language derives from). Where the mock and this pair diverge — button hover color, focus treatment, placeholders, the toggle's suppressed focus ring — **the spines win on conflict.**

→ Mockups rendered from this pair: `mockups/key-login.html`, `mockups/key-register.html`, `mockups/key-verify-email.html` (the auth surfaces with their load-bearing states), `mockups/key-home-presearch.html`, and `mockups/key-home-results.html` (the home surface, first visit and populated) — 1:1 offline HTML, gradient stand-in for the hero photograph.

The aesthetic posture for auth specifically: a split canvas. Half the screen is an emotional travel photograph with a dark gradient and a short welcome; the other half is a single white card doing exactly one job. Nothing decorative inside the card. No feature the backend cannot honor — no social buttons, no remember-me, no forgot-password. The photograph carries the brand; the card carries the task.

The aesthetic posture for home: the same photographic moment, rotated into a **hero band** at the top of the page. The headline, tagline, and the search bar all live inside the photograph, over the same ink gradient the auth hero uses — the search bar is the one white object floating on the image, so the page opens with its single task already in hand. Below the band, everything is calm white cards on the blue-tinted canvas: location results, then a grid of attraction cards. Attraction cards stay image-above-body — a "richer classic": a taller cover photograph carrying a floating rating badge, then name, meta, refined pill tags, and a full-width add-to-trip action row closing the card. No feature the backend cannot honor here either: there is no popular-destinations API, so any suggestion content on the empty page can only feed the existing text-search flow.

→ Mockups of this posture: `mockups/key-home-presearch.html` (hero band with headline, tagline, hero search — disabled Search, solid-white Clear — and the six-chip "Popular searches" row) and `mockups/key-home-results.html` (location result list with a selection, plus all four attraction-card variants: rated with distance, heritage, unrated without badge, and missing-image placeholder carrying its badge).

## Colors

The palette is a cool blue tonal ramp over a near-white blue-tinted canvas.

- **Primary (`{colors.primary}`, #0058bc)** is Horizon blue — the single call-to-action color. Used for the primary button fill, links, focus rings, the brand wordmark, and the add-to-trip action row's text. It is never used as a background wash.
- **Primary Container (`{colors.primary-container}`, #0070eb)** is the hover brightening of primary. On Horizon, hover moves *lighter and more saturated*, not darker — the button feels like it catches light.
- **Background / Surface (`{colors.background}`, #f8f9ff)** is the app canvas: white with a barely perceptible blue cast. On auth screens it is the form-side backdrop behind the card; on home it is the field the results and card grid sit on.
- **Surface Container ramp (`{colors.surface-container-lowest}` → `{colors.surface-container-highest}`)** provides tonal elevation without shadows. `surface-container-lowest` (pure white) is the auth card, every input fill, the hero search bar, suggestion chips, and the attraction card body. `surface-container-low` (#eff4ff) is the quiet-fill step: kind tags, image placeholders, skeleton shimmer, and hover fills. `surface-container` (#e5eeff) is the fallback fill behind every hero photograph while it loads. The higher steps remain reserved for the wider app.
- **On-Surface (`{colors.on-surface}`, #0b1c30)** is ink — headings, input text, and card names. It doubles as the hue of the hero gradient overlays, the rating badge's scrim, and both shadow tints, which keeps depth effects chromatically consistent with the text.
- **On-Surface Variant (`{colors.on-surface-variant}`, #414755)** is the supporting-text gray-blue: field labels, helper text, card subtitles, the home tagline's canvas-side siblings (state-pattern text, distance lines), and kind-tag text.
- **Outline / Outline Variant (`{colors.outline}` / `{colors.outline-variant}`)** draw the quiet structure: `outline-variant` for input borders and card hairlines (attraction cards soften it further to 30% opacity via `color-mix`, the existing production treatment), `outline` for input leading icons and placeholder-adjacent chrome. `disabled` shares `outline-variant`'s value and stays reserved for truly inert chrome in the wider app; the one disabled control on these surfaces — the empty-input Search button — keeps its primary fill at 50% opacity instead (see Components), because `{colors.on-primary}` text on the `{colors.disabled}` gray computes to 1.70:1.
- **Error pair (`{colors.error}` on `{colors.error-container}`)** is reserved for genuine failure: form-level error banners and field-level validation text. Never used for emphasis. Home's search and attraction failures speak through the shared state pattern (emoji, text, retry) rather than banners — the pair stays an auth-side voice.
- **Success pair (`{colors.success}` on `{colors.success-container}`)** confirms completed moments on auth — and on home it is the heritage accent: the heritage chip on attraction imagery reuses the pair, marking UNESCO-grade places as the one warm-note distinction in the grid.
- **Secondary and Tertiary families** exist in the token layer for the wider app (chips, category accents). Neither the auth nor the home surfaces use them — one chromatic voice per screen.

Inputs carry **no placeholder text** on auth. The visible label and leading icon fully identify each field, and an empty field reads as empty at a glance; the reference mock's `hello@example.com` convention is dropped because `{colors.outline-variant}` placeholder text computes to 1.70:1 on white — far below the 4.5:1 AA floor — and no token in the ramp renders convincingly "placeholder-quiet" while passing it. The hero search field is the same story: its accessible label and the headline above it identify the task, so the current placeholder string is dropped rather than re-litigated at a failing ratio.

Contrast, verified (WCAG relative luminance): `{colors.on-surface}` on white 17.17:1; `{colors.on-surface-variant}` on white 9.30:1 and on `{colors.surface-container-low}` 8.44:1 (kind tags); `{colors.on-primary}` on `{colors.primary}` 6.73:1; `{colors.primary}` links on white 6.73:1, on `{colors.background}` 6.40:1, and on `{colors.surface-container-low}` 6.11:1 (add-to-trip hover); `{colors.error}` on `{colors.error-container}` 5.00:1; `{colors.success}` on `{colors.success-container}` 5.49:1 (heritage chip); `{colors.outline}` icons on white 4.48:1 against the 3:1 non-text floor; `{colors.on-primary}` text on the rating badge's `{colors.on-surface}` 80%-opacity scrim ≥9.13:1 even composited over a pure-white photograph. One documented exception: the `{colors.outline-variant}` input border computes to 1.70:1 against the 3:1 non-text boundary expectation — accepted deliberately, because the field is also identified by its visible label, leading icon, 3rem height, and the 2px `{colors.primary}` focus outline; the hairline border is texture, not the sole boundary. The attraction card's 30%-opacity hairline inherits the same exception on the same grounds: the white card on the blue-tinted canvas is the boundary, the hairline is texture.

Horizon ships as a single light theme. The reference mock carries a `darkMode: "class"` hook, but no dark palette exists in `index.css` and none is introduced here; a future dark theme would extend this token table with paired values rather than forking the components.

Avoid: introducing new hex values, warm accent colors, colored backgrounds behind the auth card or the card grid, and using primary blue for anything that is not interactive.

## Typography

One family everywhere: **Plus Jakarta Sans** (with the system-ui fallback stack from `{typography.body-md.fontFamily}`'s declaration in `index.css`). Horizon's voice comes from weight and tracking contrast within the single family — no serif moment, no second face.

- **`display-sm` (48px / 700 / -0.01em)** is the hero headline scale — the auth panel's welcome ("Welcome Back.") and the home band's "Where to next?". It appears only over photography, only in `{colors.on-primary}` white. This role comes from the reference mock; `index.css` does not yet define a display scale, so it is a net-new size introduced for the hero surfaces. On the home band it steps down to `{typography.headline-lg}`'s 32px below `md` so the band, which unlike the auth hero survives on mobile, never forces the search bar below the fold.
- **`headline-lg` (32px / 700)** is the h1 scale already set in `index.css` — on auth cards it is the brand wordmark size.
- **`headline-md` (24px / 600)** is the h2/h3 scale from `index.css` — the card title ("Sign In", "Create your account", "Verify email") and home's section heading ("Attractions near Đà Nẵng").
- **`title-md` (18px / 600 / -0.01em)** is the attraction card name — the grid's unit of scanning, one weight-step above body so a wall of cards reads as a list of places, not a wall of text.
- **`body-lg` (18px / 400 / 1.6)** is the hero supporting sentence — the auth panel's welcome line and the home band's tagline — white at full opacity over the gradient.
- **`body-md` (16px / 400 / 1.5)** is default text: input values, card subtitles, hints, banners, state-pattern text. Line-height 1.5 matches the `index.css` root.
- **`label-lg` (14px / 600 / +0.05em)** is button text — tracked out, matching the existing `.submit` styles — including the Search button and the add-to-trip action row.
- **`label-sm` (12px / 500)** is field labels, kind tags, the heritage chip, suggestion chips, the rating badge, and the distance line — the metadata voice, always quiet, never competing with `title-md`.

Negative tracking on headings (-0.01em) is already global via `index.css`; do not tighten further. All-caps is not part of the language — `label-lg`'s letterspacing does the "label" work without capitalization.

## Layout & Spacing

The scale is rem-based on a 4px grid: `{spacing.1}` (4px) through `{spacing.8}` (48px). Field label→input gaps sit at the bottom of the scale; card padding uses `{spacing.6}`; the space between the card title block and the form uses `{spacing.5}`–`{spacing.7}`.

Auth screens use a **split viewport**: hero panel left, form panel right, each 50% width at `md` (768px) and above. The form panel centers a single card of `max-width: {spacing.auth-card-max}` (26rem — the width already established by `AuthForm.module.css`) with `{spacing.5}` gutter padding so the card never touches viewport edges. The hero panel is full-bleed — the photograph runs edge to edge with the welcome copy pinned to the bottom-left inside a 40px inset, per the reference mock.

Below `md`, the auth hero panel is removed entirely and the card becomes the screen: single column, vertically centered, full-width minus gutters, following the reference mock's hidden-under-`md` treatment.

Vertical rhythm inside the auth card: brand wordmark, then title block (title + one-line subtitle), then the form with `{spacing.4}` between fields, then the primary button separated by `{spacing.5}`, then the cross-link footer ("Don't have an account?") after `{spacing.4}`. Nothing else. The card has no internal scroll at default text spacing; under user text-spacing overrides the card grows and the page scrolls — the card never clips its content.

The home surface stacks vertically inside `AppLayout`'s content column (max-width 72rem, sticky header above): **hero band**, then results. The hero band is a framed photographic band spanning the full content column and clipped to `{rounded.lg}` — not a viewport bleed — because AppLayout owns the horizontal frame and a clipped band keeps the sticky white header visually separate from the photograph. The band holds a min-height of `{spacing.hero-band-min}` (22rem) at `md` and above, relaxing to roughly 16rem below `md`; unlike the auth hero it is never removed on small screens — it is the page's identity, and the search task lives inside it. Inside the band, the headline, tagline, and search bar stack center-aligned with `{spacing.3}`–`{spacing.5}` gaps, the search row capped at 32rem (the width the current form already uses).

Below the band: location results and the attractions section share a `max-width: {spacing.home-results-max}` (60rem — the current page width) centered column with `{spacing.6}` separating the band from the first result content. The attraction grid keeps its `auto-fill` behavior but raises the minimum column from 14rem to 16rem, since the richer card (taller image, badge, action row) needs the extra breathing room; gap stays `{spacing.4}`.

## Elevation & Depth

Two shadows exist in the system, both tinted with `{colors.on-surface}` ink rather than black:

- **`{shadows.sm}`** — `0 1px 3px rgba(11, 28, 48, 0.08)`. The resting elevation of the auth card and the primary button.
- **`{shadows.lg}`** — `0 10px 24px rgba(11, 28, 48, 0.12)`. Overlays and lifted states: the hero search bar's resting elevation (it floats on a photograph and must read as an object, not a cutout), the attraction card's hover lift, and the suggestion dropdown. Auth surfaces never use it.

Depth on Horizon is mostly tonal, not shadowed: the white card reads as raised because it sits on the blue-tinted `{colors.background}`, with a 1px `{colors.outline-variant}` hairline (at reduced opacity, per the mock) doing the crisp edge work. The hero panel's depth is the gradient overlay — `{colors.on-surface}` at 80% opacity at the bottom edge, **holding at least 65% opacity through the entire welcome-copy block**, and decaying to transparent only above it. The 65% floor is what guarantees white body text at 4.5:1 over any photograph (an unqualified 80%→0 ramp drops white 18px text to 3.32:1 at panel midheight); the supporting line renders in full-opacity white, not the mock's 90%.

The home hero band inherits the identical gradient contract: the ink overlay holds ≥65% opacity through the full headline/tagline/search block. Because the search bar is a solid white surface, only the text depends on the gradient — but the rule is stated over the whole block so the copy never drifts above the protected zone as the band's height flexes.

The rating badge is the third place text sits on photography, and it gets its own scrim rather than borrowing the card's: a `{rounded.full}` pill filled with `{colors.on-surface}` at 80% opacity, carrying `{colors.on-primary}` text and star glyphs. At that opacity the composite stays ≥9.13:1 for white text even over a pure-white photograph — the same ink-over-photo strategy as the hero gradients, applied as a pill instead of a ramp. Badges never sit on photography without this scrim.

Attraction cards rest borderline-flat — hairline border, no resting shadow — and lift on hover: `translateY(-4px)` with `{shadows.lg}`, the existing production treatment, now the canonical card-lift signature.

Motion is part of depth: `{motion.fast}` (150ms) for hovers and focus transitions, `{motion.slow}` (400ms) with `{motion.ease-spring}` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) for entrances — including the card grid's existing 40ms-stagger entrance and the image shimmer while a cover photo loads. All motion collapses under `prefers-reduced-motion`, already enforced globally in `index.css`.

## Shapes

Three radii plus a pill:

- **`{rounded.sm}` (0.25rem)** — the smallest chrome; rarely needed on these surfaces.
- **`{rounded.md}` (0.5rem)** — inputs, buttons, and message banners. The workhorse. The hero search bar keeps it: the search field is an input first, a hero ornament second.
- **`{rounded.lg}` (0.75rem)** — the auth card, the attraction card, the home hero band, and other large containers.
- **`{rounded.full}` (999px)** — the metadata pills: rating badge, heritage chip, kind tags, and suggestion chips. Kind tags move from their current `{rounded.md}` to the pill as part of the "refined tags" upgrade, so every small floating metadata object shares one silhouette distinct from the rectangular action shapes. On auth surfaces only the password-visibility toggle's hover halo may use it.

The logic: radius grows with container size, and the pill is reserved for small metadata — never for buttons or inputs. Softer than sharp-cornered "tool" aesthetics, but never bubbly — no pill-shaped buttons. Imagery clips to its container's radius: the attraction card's cover image clips to the card's top corners, the hero band clips to `{rounded.lg}`; the auth hero panel, being full-bleed, has none.

## Components

- **Auth card** — `{components.auth-card}`. White `{colors.surface-container-lowest}` surface, `{rounded.lg}`, hairline border, `{shadows.sm}`, `{spacing.6}` padding, `max-width: {spacing.auth-card-max}`. Contains, top to bottom: centered brand wordmark in `{typography.headline-lg}` `{colors.primary}`; centered title in `{typography.headline-md}` `{colors.on-surface}` with a one-line `{typography.body-md}` `{colors.on-surface-variant}` subtitle; the form; the cross-link footer.
- **Hero panel** — `{components.hero-panel}`. Local travel photograph from `FE/src/assets` as a cover-fit background over a `{colors.surface-container}` fallback fill, bottom-up gradient of `{colors.on-surface}` per the ≥65%-through-copy rule in Elevation & Depth, welcome headline in `{typography.display-sm}` `{colors.on-primary}` with a `{typography.body-lg}` supporting line in full-opacity white, both pinned bottom-left. Hidden below `md`.
- **Hero band (home)** — `{components.hero-band}`. The auth hero language rotated horizontal: cover-fit travel photograph over the `{colors.surface-container}` fallback, clipped to `{rounded.lg}`, ink gradient per the same ≥65% rule, min-height `{spacing.hero-band-min}`. Contains, stacked and centered: headline in `{typography.display-sm}` white, tagline in `{typography.body-lg}` full-opacity white, then the hero search row, then (pre-search only) the suggestion chip row. The band may reuse the auth hero's photographic asset or ship a second local asset in `FE/src/assets`; either way it is one local file with the same fallback-fill loading behavior, chosen at the implementation story.
- **Hero search** — `{components.hero-search}`. The existing search form recomposed inside the band: a 3rem white `{rounded.md}` input with Search-button and Clear-button siblings in their current `{typography.label-lg}` styles, elevated with `{shadows.lg}` because it floats on photography. Focus keeps the global 2px `{colors.primary}` outline. The Search button keeps its `{components.button-primary}` fill; while the input is empty it is disabled in that same primary fill at 50% opacity — the shipped treatment, now the committed one — never the `{colors.disabled}` gray wash, so the band's resting state keeps its one chromatic anchor (WCAG exempts disabled controls from contrast minimums; the gray's reservation for inert chrome is stated in Colors). The Clear button drops its transparent ghost fill inside the band: solid `{colors.surface-container-lowest}` behind its `{colors.primary}` 1px border and text (6.73:1 on white), hover → `{colors.surface-container-low}` — the same solid-white-object rule the chips follow, because no transparent control may float bare on the photograph. No placeholder text; the suggestion dropdown anchors below the input on white (see its own bullet).
- **Suggestion chip** — `{components.suggestion-chip}`. A 2rem `{rounded.full}` white pill in `{typography.label-sm}` `{colors.on-surface}`, hover → `{colors.surface-container-low}`, sitting in a wrap row beneath the hero search. Solid white fill — never translucent over the photograph.
- **Suggestion dropdown** — Preserved as shipped; restated here so the contract is explicit: a `{colors.surface-container-lowest}` panel anchored directly below the search input, 1px `{colors.outline-variant}` border, `{rounded.lg}`, `{shadows.lg}`. Option rows are `{rounded.md}` with the location name in semibold `{colors.on-surface}` and country-code/type pills in `{typography.label-sm}` `{colors.on-surface-variant}` on `{colors.surface-variant}`; the hovered or keyboard-active option fills with `{colors.surface-container-low}`.
- **Location result list** — Existing production styles preserved; restated here so the buttons directly beneath the band have a spec: a centered 32rem column of full-width `{rounded.md}` toggle buttons, `{colors.surface-container-lowest}` fill, 1px `{colors.outline-variant}` border, `{typography.body-md}` text — location name semibold `{colors.on-surface}`, country-code and type pills in `{typography.label-sm}` `{colors.on-surface-variant}` on `{colors.surface-container-low}`, and an italic partial-match note in `{colors.on-surface-variant}`. Hover → `{shadows.sm}` plus a `{colors.primary}` border; the selected (`aria-pressed`) button holds the `{colors.primary}` border on a `{colors.surface-container-low}` fill.
- **Attraction card** — `{components.attraction-card}`. White surface, `{rounded.lg}`, 30%-opacity hairline, no resting shadow; hover lifts with `{shadows.lg}`. Anatomy, top to bottom: cover image at `{spacing.card-image-height}` (12rem — up from today's 9rem, the "taller image" of the richer-classic direction) clipped to the top corners, carrying the rating badge and, when applicable, the heritage chip; body with `{spacing.4}` horizontal padding — name in `{typography.title-md}`, optional distance line in `{typography.label-sm}` `{colors.on-surface-variant}`, kind-tag wrap row; then the add-to-trip action row closing the card. Missing images keep the existing `{colors.surface-container-low}` placeholder panel (emoji glyph) at the same height; loading images keep the existing shimmer between `{colors.surface-container-low}` and white.
- **Rating badge** — `{components.rating-badge}`. Floats top-right of the cover image with a `{spacing.2}` inset: `{rounded.full}` pill, `{colors.on-surface}` 80%-opacity scrim, white `{typography.label-sm}` star glyphs (filled/outlined out of 3, per the existing 1–3 scale). Rendered over image and placeholder alike; absent entirely when the attraction is unrated.
- **Heritage chip** — `{components.heritage-chip}`. `{colors.success}` on solid `{colors.success-container}`, `{rounded.full}`, `{typography.label-sm}`, floating top-left of the cover image opposite the rating badge — the one warm distinction in the grid, reserved for heritage-flagged ratings.
- **Kind tag** — `{components.kind-tag}`. `{rounded.full}` pill, `{colors.surface-container-low}` fill, `{typography.label-sm}` `{colors.on-surface-variant}` text — the existing production tag with the refined silhouette; content rules (count cap, humanized underscores) live in the experience spine's Attraction card pattern.
- **Add-to-trip row** — `{components.add-to-trip-row}`. A full-width 3rem row closing the card beneath a 30%-opacity hairline top border: `{colors.primary}` `{typography.label-lg}` text with the leading ＋ glyph, transparent fill, hover → `{colors.surface-container-low}`, active → scale 0.98. It replaces today's small ghost button: one uninterrupted horizontal target, visually part of the card but a separate control from the card link.
- **Text input** — `{components.input}`. 3rem tall, white fill, `{colors.outline-variant}` 1px border, `{rounded.md}`, `{typography.body-md}` value text. Leading icon (mail, lock) in `{colors.outline}`, vertically centered, with input padding making room. Focus replaces the border treatment with the existing 2px `{colors.primary}` outline. Invalid fields show `{typography.label-sm}`-adjacent error text in `{colors.error}` directly beneath — the border does not turn red on its own.
- **Password input** — Text input plus a trailing visibility toggle: an icon button in `{colors.outline}` that moves to `{colors.primary}` on hover, sitting inside the field's right padding.
- **Field label** — `{components.field-label}`. `{typography.label-sm}` in `{colors.on-surface-variant}`, above the input with a `{spacing.1}`-plus gap.
- **Password helper** — `{typography.label-sm}` in `{colors.on-surface-variant}`, directly under the register password input; swaps to `{colors.error}` text when validation fails.
- **Primary button** — `{components.button-primary}`. Full-width within the form, 3rem tall, `{colors.primary}` fill, `{colors.on-primary}` text in `{typography.label-lg}`, `{rounded.md}`, `{shadows.sm}`. Hover → `{colors.primary-container}`; active → scale 0.98. The **pending** state keeps the full primary fill with the label swapped to a progress phrase — white on `{colors.disabled}` computes to 1.70:1, unreadable for exactly the moment the label carries the status, and the auth surfaces have no truly inert control that would justify the gray wash. No spinner iconography required.
- **Error banner** — `{components.banner-error}`. Form-level failures: `{colors.error}` text on `{colors.error-container}`, `{rounded.md}`, comfortable padding. Sits between the last field and the button.
- **Success banner** — `{components.banner-success}`. Completion notices: `{colors.success}` on `{colors.success-container}`, same geometry as the error banner.
- **Cross-link footer** — Centered `{typography.body-md}` sentence in `{colors.on-surface-variant}` whose action ("Sign Up", "Log in") is a `{colors.primary}` semibold link, hover → `{colors.primary-container}`.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use only the hex values already in `FE/src/index.css` | Introduce new colors, gradients-as-decoration, or warm accents |
| One photographic moment per screen — auth split panel or home hero band | A second photographic moment below the fold, or photography behind cards |
| Primary blue exclusively for interactive elements and the wordmark | Blue headings, blue body text, blue decorative panels |
| White card on blue-tinted canvas + hairline border for elevation | Heavy shadows, stacked cards, borders darker than `{colors.outline-variant}` |
| Full-width 3rem primary button, one per card | Multiple buttons, split actions, pill-shaped or outlined CTAs on auth |
| Tracked-out `{typography.label-lg}` mixed-case button text | ALL-CAPS labels anywhere |
| Ink-tinted shadows (`rgba(11,28,48,…)`) | Pure-black shadows |
| Hide the auth hero below `md` and let the card own the screen | Squeeze a shrunken split hero above the form on mobile |
| Keep the home hero band on every viewport — it holds the search task | Collapse the band to a bare heading on small screens |
| Text over photography only behind an ink layer at ≥65% opacity — gradient or badge scrim | Bare text, glyphs, or sub-65% scrims on photographs |
| `{rounded.full}` pills for metadata: tags, chips, badges | Pill-shaped buttons, inputs, or cards |
| One full-width action row per attraction card | Stacking multiple buttons or icon actions inside a card |
| Keep the pending button in its primary fill with a swapped label | Gray-wash a button that is carrying status information |
| Use `{colors.primary-container}` as a text color only on `#ffffff` | `{colors.primary-container}` text on `{colors.background}` (4.42:1 — fails AA) |
| Let labels and icons identify fields — no placeholder text | Sub-AA placeholder text in any outline tone |
| Honor `prefers-reduced-motion` via the global rule | Motion that survives the reduced-motion setting |
