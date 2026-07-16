---
name: Trip Planner — Attraction Detail (Azure)
description: Crisp coastal-minimalist visual identity for the attraction detail page — cool blue/teal on white, all-geometric-sans, hairline borders, small sharp radii, one confident solid-blue primary action.
status: final
updated: 2026-07-16
colors:
  ink: '#0f2540'
  primary: '#1668b4'
  primary-foreground: '#ffffff'
  teal: '#0d7d7d'
  sky: '#e8f1fb'
  surface: '#ffffff'
  canvas: '#f4f7fa'
  hairline: '#d7e1ea'
  slate: '#45566b'
  label-muted: '#586980'
  na: '#5e6e80'
  open-now: '#137a45'
  star: '#b5780f'
  focus-ring: '#0f2540'
  scrim-top: 'rgba(6,24,40,0.55)'
  scrim-strong: 'rgba(6,24,40,0.72)'
  scrim-soft: 'rgba(6,24,40,0.10)'
  disabled-surface: '#e3eaf1'
  disabled-foreground: '#5e6e80'
typography:
  display:
    fontFamily: 'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'
    fontSize: 42px
    fontWeight: '800'
    lineHeight: '1.05'
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: 'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'
    fontSize: 23px
    fontWeight: '800'
    lineHeight: '1.08'
    letterSpacing: -0.01em
  panel-title:
    fontFamily: 'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'
    fontSize: 20px
    fontWeight: '800'
    lineHeight: '1.15'
    letterSpacing: -0.01em
  section-heading:
    fontFamily: 'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'
    fontSize: 15px
    fontWeight: '800'
    lineHeight: '1.3'
    letterSpacing: 0.02em
  card-title:
    fontFamily: 'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  lead:
    fontFamily: 'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.7'
  body:
    fontFamily: 'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: 'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.4'
    letterSpacing: 0.04em
  meta:
    fontFamily: 'Inter, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 4px
  DEFAULT: 6px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 14px
  '5': 18px
  '6': 24px
  '7': 32px
  gutter: 32px
  margin-mobile: 16px
  page-max: 1120px
  booking-panel-width: 340px
  info-label-width: 110px
  touch-target-min: 44px
  breakpoint-desktop: 1024px
components:
  hero:
    height-desktop: 360px
    height-mobile: 180px
    scrim: 'linear-gradient(180deg, {colors.scrim-top} 0%, {colors.scrim-soft} 32%, {colors.scrim-soft} 52%, {colors.scrim-strong} 100%)'
    text-shadow: '0 1px 3px rgba(6,24,40,0.65), 0 0 2px rgba(6,24,40,0.55)'
    title: '{typography.display}'
    title-color: '{colors.primary-foreground}'
    category-badge-background: 'rgba(6,24,40,0.55)'
    category-badge-border: 'rgba(255,255,255,0.35)'
    category-badge-radius: '{rounded.sm}'
  focus-ring:
    color: '{colors.focus-ring}'
    width: 2px
    offset: 2px
    style: 'solid'
  back-control:
    position: 'overlaid top-left of hero'
    background: 'rgba(255,255,255,0.92)'
    foreground: '{colors.ink}'
    radius: '{rounded.sm}'
    fontSize: 13px
    fontWeight: '600'
    min-hit: '{spacing.touch-target-min}'
  open-now-badge:
    foreground: '{colors.open-now}'
    background: 'rgba(19,122,69,0.10)'
    radius: '{rounded.sm}'
    dot: '{colors.open-now}'
    fontSize: 11px
    fontWeight: '700'
  info-row:
    label: '{typography.label-caps}'
    label-color: '{colors.label-muted}'
    label-width: '{spacing.info-label-width}'
    value: '{typography.body}'
    value-color: '{colors.ink}'
    link-color: '{colors.primary}'
    divider: '{colors.hairline}'
    na-color: '{colors.na}'
  map-block:
    height: 210px
    border: '1px solid {colors.hairline}'
    radius: '{rounded.md}'
    marker: '{colors.primary}'
    marker-ring: '{colors.primary-foreground}'
  nearby-card:
    width: 200px
    thumb-height: 108px
    radius: '{rounded.md}'
    border: '1px solid {colors.hairline}'
    kind-color: '{colors.teal}'
    title: '{typography.card-title}'
    rating-glyph-color: '{colors.star}'
    rating-value-color: '{colors.slate}'
    meta-color: '{colors.slate}'
    hover-wash: '{colors.sky}'
  nearby-rail:
    gap: '{spacing.4}'
    overflow: 'horizontal-scroll'
    card: '{components.nearby-card}'
  booking-panel:
    width: '{spacing.booking-panel-width}'
    background: '{colors.surface}'
    border: '1px solid {colors.hairline}'
    radius: '{rounded.lg}'
    shadow: '0 2px 10px rgba(15,37,64,0.05)'
    title: '{typography.panel-title}'
    fact-divider: '{colors.hairline}'
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
    fontSize: 15px
    fontWeight: '700'
    min-hit: '{spacing.touch-target-min}'
    gated-note-link: '{colors.primary}'
    pending-background: '{colors.disabled-surface}'
    pending-foreground: '{colors.disabled-foreground}'
  sticky-action-bar:
    background: '{colors.surface}'
    border-top: '1px solid {colors.hairline}'
    button: '{components.button-primary}'
  image-placeholder:
    fill: 'repeating-linear-gradient(45deg,#eef4f9,#eef4f9 11px,#e2ebf3 11px,#e2ebf3 22px)'
    label-color: '{colors.na}'
    label: '{typography.label-caps}'
---

## Brand & Style

Azure is crisp coastal minimalism for a consumer travel product. The register is a clear morning on the water: cool blues and a single teal accent laid over generous white, nothing ornamental competing with the photography or the facts. Where a travel page can drift toward either brochure-decorative or utilitarian-flat, Azure holds the middle — it reads *fast and reliable*, the way a well-run booking product should, while the full-bleed hero still lets a place sell itself.

The discipline is subtractive. One accent family (blue, with teal as its quieter sibling), hairline borders instead of heavy chrome, small sharp corners instead of soft pillows, and shadow used only where a surface genuinely floats. Type is all geometric sans — no serif, ever — sized tight and scannable so a traveler on a lunch break can absorb a place in one pass. The primary action is a solid confident blue button and there is only one of it per surface; everything else steps back so that button reads as *the* decision.

This is a fresh standalone identity. It does not inherit the sibling run's Horizon tokens — its palette, ramp, and shape logic are defined here in full.

## Colors

The palette is cool, high-clarity, and deliberately narrow. Blue carries brand and action; teal is the only secondary chroma; everything else is neutral or a single functional signal color. The muted values were tuned to clear WCAG AA at the sizes they are actually used — this palette is not uniformly "AA everywhere," but every text/background pair below is stated with its measured ratio so downstream never ships a failing combination on faith.

- **Ink (`#0f2540`)** — the deep navy for the attraction name, section headings, and body ink on light surfaces. The darkest value and the anchor of every text hierarchy. 15.45:1 on white, 14.37:1 on canvas — passes AA at any size.
- **Primary Blue (`#1668b4`)** — the brand and conversion color: the *Add to Trip* button fill, links, the map marker, and active affordances. Full strength in exactly one dominant place per surface (the primary button); a small accent everywhere else. Never a large fill behind body text. White-on-primary and primary-as-link-on-white both compute to 5.72:1 — comfortably past AA (the prior `#1a73c7` sat at a thin 4.86:1).
- **Teal (`#0d7d7d`)** — the quiet secondary, reserved for taxonomy text: the category eyebrow and the `kind` label on nearby cards. Signals "classification," never action. 4.95:1 on white — passes AA as normal text at 12px, where the prior brighter teal (3.09:1) failed.
- **Sky (`#e8f1fb`)** — a pale blue tint for the faintest fills (hover wash on nearby cards, subtle selected states). Decorative-adjacent, never load-bearing for meaning.
- **Canvas (`#f4f7fa`)** — the cool off-white page background. Cards and panels sit on pure **Surface white (`#ffffff`)**, distinguished from canvas by tone plus a hairline — not by shadow.
- **Hairline (`#d7e1ea`)** — the single border color. Every divider, card edge, info-row rule, and panel outline is this one cool gray at 1px. It is a boundary cue, not a contrast-bearing element; structure never depends on the hairline alone (tonal delta + layout carry it too).
- **Slate (`#45566b`)** — secondary text: the lead description, card metadata, and the nearby-card rating *value*. 7.51:1 on white — solidly AA.
- **Label Muted (`#586980`)** — the tertiary/label gray for info-row keys ("Address", "Hours", "Website") and fact labels, set at 12px. 5.60:1 on white and 5.21:1 on canvas — passes AA as normal text (the prior `#7a8aa0` was ~3.4:1 and failed at this size).
- **Not-available (`#5e6e80`)** — the muted italic tone for `Not available` and image-placeholder captions. 5.23:1 on white and 4.86:1 on canvas — passes AA. It is the lightest gray in the ramp that still clears 4.5:1, so it reads "honestly absent," visibly softer than ink/slate content without dropping below legibility (the prior `#9aa7b6` at ~2.45:1 was effectively invisible). Softness now comes from italic + weight, not from sub-threshold contrast.
- **Open-now Green (`#137a45`)** — the *only* status color, for the confidently-parsed "Open now" badge and its dot. 5.39:1 on white, and 4.70:1 as text on its own 10% tint (`rgba(19,122,69,0.10)` over white ≈ `#e7f2ec`) — passes AA for the 11px badge text against its real rendered background (the prior `#1f9d5b` sat at ~3.1:1 on the tint).
- **Star (`#b5780f`)** — a deep gold, used *only* for the ★ rating glyph on nearby cards as a meaningful graphic: 3.71:1 on white, clearing the 3:1 UI-graphic threshold while still reading as gold. Amber cannot reach 4.5:1 on white and stay amber, so the numeric rating *value* beside it is rendered in `{colors.slate}` (7.51:1), not in gold. Gold is never used for text.
- **Focus-ring (`#0f2540`)** — the ink-dark focus indicator color; see Accessibility / Components.

Avoid: gradients as UI surface (the hero photo may have a tonal scrim, but panels/cards/buttons are flat), a second saturated accent beyond blue+teal, colored fills behind body text, and any red error fill on this surface (errors are handled as full-surface states, described in EXPERIENCE.md, not inline chips).

## Typography

All-geometric-sans, no serif anywhere. The family is Inter (with Segoe UI Variable / system-ui fallbacks) at every level; hierarchy comes from size and weight, not from a change of voice.

- **Display (`42px / 800`, mobile `23px / 800`)** — the attraction name, overlaid on the hero in white. Heavy and tightly tracked (`-0.02em`) so it holds against photography.
- **Panel title (`20px / 800`)** — the attraction name repeated in the booking panel; the desktop anchor for the conversion column.
- **Section heading (`15px / 800`, tracked `+0.02em`, UPPERCASE)** — "Location", "Details", "Nearby attractions". Small, bold, slightly tracked caps — a structural label, not a headline. This tracked-caps treatment is what gives Azure its scannable, efficient rhythm.
- **Card title (`14px / 700`)** — nearby-attraction names.
- **Lead (`16px / 1.7`)** — the description paragraph, set in slate for comfortable long-form reading.
- **Body (`14px / 1.6`)** — info-row values, panel facts, general copy.
- **Label caps (`12px / 700`, tracked)** — info-row keys and placeholder captions.
- **Meta (`12px / 500`)** — card metadata (rating, distance), review counts.

Rules: never set the attraction name or any heading in a serif; never go below 12px for anything a user must read; the tracked-caps treatment is reserved for section headings, info-row keys, and the category eyebrow — do not track out body or lead text.

## Layout & Spacing

Base unit is 4px; the working scale is 4 / 8 / 12 / 14 / 18 / 24 / 32. Azure runs *tighter* than a typical editorial layout on purpose — density is part of the personality. Section-to-section gaps sit at 24–32px, not 60–80px; within a card, padding is 11–13px.

Desktop is a two-column grid inside a `{spacing.page-max}` (1120px) max width: a fluid main column (hero-width content — lead, map, info, nearby rail) at left and a fixed `{spacing.booking-panel-width}` (340px) booking panel at right, separated by a `{spacing.gutter}` (32px) gutter. The hero is full-bleed above both columns. The booking panel is `position: sticky` and follows the reader down the page.

Mobile collapses to a single column with `{spacing.margin-mobile}` (16px) side margins. The booking panel's job is taken over by a sticky bottom action bar pinned to the viewport; page content gets bottom padding so the bar never occludes the last row.

The desktop/mobile threshold is `{spacing.breakpoint-desktop}` (1024px). EXPERIENCE.md § Responsive & Platform owns the full behavioral breakpoint contract (what reflows, folds, and hands off).

## Elevation & Depth

Azure is nearly flat. Depth is carried by the hairline border and tonal contrast (white surface on cool-gray canvas), not by shadow.

- **Booking panel** — the one element allowed a shadow, and it is barely there: `0 2px 10px rgba(15,37,64,0.05)`. Just enough to say "this floats and follows you," never a drop-shadow slab.
- **Nearby cards, info block, map** — no resting shadow. They are defined by their 1px hairline against white. Nearby cards may lift on hover with a faint sky wash and at most the panel-level shadow.
- **Sticky bottom bar (mobile)** — a `1px` top hairline, no shadow, so it reads as a docked ledge rather than a floating pill.
- **Hero** — depth comes from the photographic scrim gradient (for legibility), not from box-shadow.

## Shapes

Small and sharp. The corner language reads "tool you can trust," not "soft consumer toy."

- `rounded/sm` (4px) — the back control, category eyebrow badge, open-now badge.
- `rounded/md` (6px) — the default: primary button, map block, nearby cards, info block.
- `rounded/lg` (8px) — the booking panel, the largest surface, gets the largest radius (still restrained).
- `rounded/full` — reserved for the map marker dot and small circular glyphs only. No pill-shaped buttons; the primary action is a 6px-cornered rectangle, deliberately not a pill.

Imagery always follows its container's radius: hero is full-bleed (no radius), nearby thumbnails inherit the card's 6px top corners, the image placeholder matches whatever slot it fills.

## Components

→ Visual reference: the canonical Azure desktop + mobile mock at [`mockups/attraction-detail-azure.html`](mockups/attraction-detail-azure.html). These spines win on conflict with the mock.

- **Hero (full-bleed)** — Edge-to-edge photograph, `360px` desktop / `180px` mobile. The legibility scrim (`{components.hero.scrim}`) darkens *both* ends of the frame — a `{colors.scrim-top}` cap over the top eyebrow/back-control zone and a `{colors.scrim-strong}` floor under the bottom title zone — so overlaid text has a guaranteed dark backing at both text bands, not just the very bottom. On top of the scrim, all overlaid hero text (title, category eyebrow, location) carries the `{components.hero.text-shadow}` treatment, which guarantees legibility even over an arbitrarily bright/white photo where the scrim alone would wash out. Overlaid content, bottom-left: a category eyebrow badge on a dark translucent plate (`{components.hero.category-badge-background}` — a dark backing so white text stays legible, not the old wash-prone translucent-white plate), white hairline border, 4px radius, tracked caps; then the attraction name in `{typography.display}` white; then an optional full-opacity `500`-weight white location line. The back control overlays top-left; a small "Photo · …" credit/caption may sit top-right.
- **Photo carousel** — When more than one image exists, the hero is a swipeable carousel: full-bleed frames, dot indicators bottom-center over the scrim, arrow affordances on desktop hover. Single image = static hero. Corners match the hero (none; full-bleed).
- **Open-now badge / pill** — Inline chip beside the hours value: green dot + "Open now" in `{colors.open-now}` on the matching 10%-tint fill (`{components.open-now-badge.background}`), 4px radius, `11px/700`. The green/tint pair clears AA for the 11px text (4.70:1). A "Closed" variant uses the same shape in muted slate with no green. Rendered *only* when the hours string parses confidently (behavioral rule in EXPERIENCE.md); otherwise absent entirely.
- **Info row** — A hairline-divided list inside a bordered white block. Each row: a fixed `{components.info-row.label-width}` (110px) label-caps key in `{colors.label-muted}` at left, value in `{typography.body}` ink at right. Website values render as `{colors.primary}` links, opening in a new tab with a visually-hidden "(opens in new tab)" and `rel="noopener noreferrer"`. Missing values render `Not available` in `{colors.na}` italic — never blank, never a fake value.
- **Interactive map block** — A `210px` bordered (hairline, 6px radius) map rendering OpenStreetMap tiles via Leaflet, with a single `{colors.primary}` marker (white ring) at the attraction's coordinates. Pan/zoom enabled, with focusable zoom (+/−) controls. OSM attribution ("© OpenStreetMap contributors") is mandatory, keyboard-reachable, and sits in the standard bottom-right control, verified legible at AA (do not ship Leaflet's default low-contrast attribution gray).
- **Nearby attraction card** — `200px` wide, 6px radius, hairline border, white. Top: a `108px` thumbnail (or the image placeholder). Body: a teal tracked-caps `kind` label, a `{typography.card-title}` name, then a meta row splitting the rating (left) and a distance string "X km away" (right). The rating renders the ★ glyph in `{components.nearby-card.rating-glyph-color}` (deep gold, a 3:1 meaningful graphic) and the numeric value beside it in `{components.nearby-card.rating-value-color}` (slate, passing text) — the number is never set in gold. Hover: faint sky wash, optional slight lift (suppressed under reduced-motion).
- **Nearby rail** — Horizontal scroll row of nearby cards with a 14px gap. Capped count. Scrolls horizontally on overflow; on mobile it is a touch-swipe rail. Absent entirely (with its heading) when there are no results.
- **Booking panel (desktop)** — Sticky `{components.booking-panel.width}` (340px) white card, 8px radius, hairline border, the system's one soft shadow. Contents top-to-bottom: teal category eyebrow, attraction name in `{typography.panel-title}` (rendered as a non-`<h1>` — the hero name is the page's only `<h1>`), an optional rating/context line in slate, a hairline-divided fact list (label in muted, value bold-right), then the primary *Add to Trip* button, then a one-line note under it. This is the conversion anchor and the emotional climax surface of the page.
- **Sticky bottom action bar (mobile)** — Pinned to the viewport bottom: white, 1px top hairline. Left: a compact context line (e.g. a key fact). Right: the primary *Add to Trip* button. Replaces the desktop panel on phones.
- **Primary button — Add to Trip** — Solid `{colors.primary}` fill, white text (5.72:1), 6px radius, `15px/700`, full-width in panel/bar. There is exactly one primary button per surface. **Logged-out state:** it stays an *enabled, focusable* control — never a dead disabled button. It routes to login and returns here to complete the add, and carries the invitational note "Log in to add to your trip" (the "Log in" text uses `{components.button-primary.gated-note-link}`). This matches the live app and is the accessible pattern: focusable, announced, actionable in one step. The `pending-background` / `pending-foreground` tokens are reserved for a genuinely-pending state (e.g. the add is in flight), not for the logged-out gate.
- **Secondary / back control** — The "← Back" affordance overlaid on the hero (white 92% pill-adjacent 4px chip, ink text), with a `{components.back-control.min-hit}` (44px) minimum hit area even though its visible chip is smaller. It is the only navigational control; it returns to the previous list. Low-emphasis, never competes with the primary button.
- **Focus indicator** — Every interactive element (back control, carousel arrows and dots, the map and its zoom controls, each nearby card, links, and *Add to Trip*) shows a `focus-visible` ring per `{components.focus-ring}`: a 2px solid `{colors.focus-ring}` outline at 2px offset. The offset renders the element's own background between element and ring, so the ink-dark ring always lands on a light surface — clearing ≥3:1 on white/canvas (15:1), on the blue button (the ring sits on the surrounding surface, not on the fill), and over photography where it is paired with the hero text-shadow halo.
- **Touch targets** — Every interactive control has a `{spacing.touch-target-min}` (44×44px) minimum hit area; the hit area may exceed the visible size. This is called out explicitly for the back control, each carousel dot, and all buttons.
- **"Not available" placeholder treatment** — Text-level: `Not available` in `{colors.na}` italic, used for any missing info-row value (address, hours, website). Honest and visibly softer than real content.
- **Image placeholder** — For any image slot (hero or nearby thumbnail) with no photo: a diagonal hairline hatch fill (`{components.image-placeholder.fill}`) with a centered tracked-caps caption ("No photo yet") in `{colors.na}`. Matches the slot's radius. Never a broken-image icon, never blank.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep one solid-blue primary button per surface as *the* decision | Add a second high-emphasis button competing with Add to Trip |
| Use hairline `{colors.hairline}` borders + tonal contrast for structure | Reach for drop shadows to separate cards (panel gets the only soft shadow) |
| Set every heading and title in geometric sans | Introduce a serif for the attraction name "to feel premium" |
| Use teal strictly for taxonomy (category, kind) | Make a teal element the primary clickable action |
| Show `Not available` in muted italic for missing fields | Blank a row, hide a field, or invent placeholder values |
| Render the Open-now badge only on a confident parse | Guess "Open now" from an unparseable hours string |
| Small sharp radii (4/6/8) and tight density | Pill buttons, large rounded cards, or airy editorial gaps |
| Keep green for the single open-now signal only | Repurpose green for success toasts or decoration |
| Full-bleed hero, scrim at BOTH text bands + a text-shadow on overlaid text, so white title/eyebrow/location stay legible over any photo | Rely on a bottom-only scrim and assume it covers the eyebrow, or drop the text-shadow over bright photos |
| Give every interactive element a visible 2px focus ring at 2px offset (`{components.focus-ring}`) | Ship the bare UA outline or remove focus styling because "it looks noisy" |
| Make the logged-out *Add to Trip* an enabled, focusable control that routes to login | Render it as a dead `disabled` button that keyboard/SR users can't reach |
| Give every control a 44×44px hit area (back control, carousel dots, buttons) | Ship a tap target smaller than 44px because the visible chip is small |
| Honor `prefers-reduced-motion` — no auto-advance, no hover-lift under reduced motion | Auto-advance the carousel or animate transitions regardless of the user's motion setting |
