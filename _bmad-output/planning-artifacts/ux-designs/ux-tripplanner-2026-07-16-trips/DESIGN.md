---
name: Trip Planner — Trips & Trip Detail (Horizon)
description: Extends the Horizon design language (ux-tripplanner-2026-07-15) to the Trips list (/trips) and Trip detail (/trips/:id) surfaces. The "Boarding Pass" posture — a trip renders as a travel pass; a trip's days render as segments on a journey rail. Same tokens, no new hex, no new data.
status: final
updated: 2026-07-16
extends: ../ux-tripplanner-2026-07-15/DESIGN.md
colors:
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  secondary: '#405f91'
  secondary-container: '#a6c5fe'
  on-secondary-container: '#315182'
  tertiary: '#006577'
  error: '#ba1a1a'
  error-container: '#ffdad6'
  success: '#146c2e'
  success-container: '#d7f2dd'
  background: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-variant: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#414755'
  outline: '#717786'
  outline-variant: '#c1c6d7'
typography:
  display-name: { fontSize: 24px, fontWeight: 800 }
  card-name: { fontSize: 17.6px, fontWeight: 800 }
  stat-value: { fontSize: 16.8px, fontWeight: 800 }
  stat-label: { fontSize: 10px, fontWeight: 800, letterSpacing: 0.09em, textTransform: uppercase }
  status-pill: { fontSize: 10.2px, fontWeight: 800 }
  seg-date: { fontSize: 13.6px, fontWeight: 800, letterSpacing: 0.05em, textTransform: uppercase }
rounded:
  sm: 0.25rem
  md: 0.5rem
  lg: 0.75rem
  full: 999px
spacing:
  pass-accent-w: 6px
  ticket-accent-w: 7px
  rail-gutter: 26px
  rail-line-w: 2px
  node-size: 16px
  notch-size: 14px
components:
  - trips-grid
  - trip-pass
  - status-pill
  - pass-route
  - pass-stub
  - summary-ticket
  - outline-button
  - journey-rail
  - day-segment
  - today-marker
  - destination-row
  - remove-button
  - add-day-button
  - empty-day
---

# Trip Planner — Trips & Trip Detail (Horizon · Boarding Pass)

## Brand & Style

This pair extends **Horizon** — the premium-travel, blue-forward, Material-3-in-spirit token system already shipped app-wide in `FE/src/index.css` and documented in `../ux-tripplanner-2026-07-15/DESIGN.md`. It introduces **no new hex values, no new fonts, and no new data** — every color, radius, shadow, and motion duration below is an existing Horizon production token. Where this document and the Horizon spine ever disagree, the token layer in `index.css` is the arbiter and both spines defer to it.

Where the auth surfaces gave Horizon its split photographic canvas and the home surface gave it a hero band, these two surfaces give it a **motif**: the **Boarding Pass**. A trip is not a generic content card — it is a *pass*, the small paper object you carry toward a journey. On `/trips` each trip is a pass: a colored accent spine down its left edge, the trip name, a departure→return **route line**, and a **perforated stub** carrying the trip's two honest numbers (days, places). On `/trips/:id` the same language rotates into an **itinerary**: a summary "ticket" header, then the trip's days rendered as **segments strung on a vertical journey rail**, each day a node on the line. The metaphor is earned, never literal — no skeuomorphic paper texture, no barcode, no fake airline chrome. It is Horizon's calm white-card-on-blue-canvas system with one structural idea (the spine + perforation + rail) that makes a list of trips feel like a shelf of tickets and a trip feel like a route.

The motif has a job beyond charm: it encodes **time**. Because a trip owns real dates, every pass carries a `{components.status-pill}` computed from today — *In 27 days*, *Ongoing · Day 3*, *Past* — so the list reads as a timeline of what is coming, not an undifferentiated grid. The rail on the detail page does the same at the day scale: today's day, when the trip is underway, is the lit node.

Nothing here requires a backend change. There is **no trip cover image and no city/location field** in the trip payload (`id`, `name`, `startDate`, `endDate`, `tripDays[]`), so this design deliberately builds richness from **structure, derived numbers, and motion** rather than photography — the one place Horizon's "one photographic moment per screen" rule is answered with *zero* photographs and a strong typographic-structural identity instead. Introducing a trip image later would extend this system (a photograph clipped into the pass head above the route line); it is not assumed here, and no placeholder pretends it exists.

→ Reference posture mock (spine-derived, 1:1 offline HTML, both surfaces in their primary states — populated + empty on `/trips`, loaded + empty-day on `/trips/:id`; loading/error/not-found/editing are prose-only): `mockups/key-trips-and-detail.html`. The mock has been aligned to the final tokens (stat labels in `{colors.on-surface-variant}`, past pass de-emphasized without opacity), so it no longer seeds the AA regressions its first draft carried. **The spines win on conflict** regardless.

## Colors

The palette is Horizon's, unchanged. This pair adds no new hue; it only assigns a few existing tokens to new roles. All ratios below are verified against WCAG relative luminance.

- **Accent spine** — the pass's and ticket's signature edge is a vertical `{spacing.pass-accent-w}`/`{spacing.ticket-accent-w}` bar filled with a **`{colors.primary}` → `{colors.tertiary}` gradient** (Horizon blue descending into teal) — the single decorative gradient in the system, small and structural, never a background wash. **Past** trips desaturate this spine to a flat `{colors.outline-variant}` bar (see the status-pill logic): a past pass keeps its shape but loses the live blue, so upcoming trips own the color.
- **Status pill (`{components.status-pill}`)** — three token pairings, each ≥4.5:1:
  - *Upcoming* — `{colors.on-secondary-container}` text on `{colors.secondary-container}` (4.58:1). The calm blue that says "ahead of you".
  - *Ongoing* — `{colors.success}` on `{colors.success-container}` (5.49:1). The one warm-green "now" note, shared with Horizon's success voice.
  - *Past* — `{colors.on-surface-variant}` on `{colors.surface-container}` (7.98:1). Quiet, readable, unmistakably done. **This is a divergence from the mock**, which tinted the past pill with `{colors.outline}` (3.84:1 on that fill — below AA) and dimmed the whole pass to 82% opacity; blanket opacity drags every string in the pass under the contrast floor, so the spine forbids it and de-emphasizes past trips through the muted pill and desaturated spine alone, with all text at full strength.
- **Perforation notch** — the two half-circles biting into the pass at the perforation line are filled with `{colors.background}` (the canvas showing through), so the stub reads as physically torn from the pass head. On the trips grid, where a pass sits on `{colors.background}`, this is exact; the notch color always matches the surface directly behind the pass.
- **Stat values vs. stat labels** — a pass stub and the ticket header stack a big number over a small caption. The **value** (`5`, `9`) is `{colors.on-surface}` ink (17.17:1). The **label** (`Days`, `Places`) is **`{colors.on-surface-variant}`** (8.44:1 on `{colors.surface-container-low}`) — **a divergence from the mock**, which used `{colors.outline}` (4.07:1 on the stub fill — below AA for text). `{colors.outline}` is reserved here, as in Horizon, for hairlines and icon chrome against the 3:1 non-text floor only.
- **Unplanned hint** — the summary ticket's third stat ("2 days" under "Unplanned") renders its value in **`{colors.secondary}`** (6.43:1 on white, 6.12:1 on canvas) rather than ink — a gentle blue nudge, deliberately *not* `{colors.error}`: an unplanned day is an invitation, not a failure. When zero days are unplanned the stat flips to a positive `{colors.success}` "All planned" and never shows a red or scolding state.
- **Segment date & rail node** — `{colors.primary}` (6.73:1 on white) for the day date label and the node's 3px ring; the node fill is `{colors.surface-container-lowest}` white, so an empty ring reads as an ordinary day and a **solid `{colors.primary}` fill** marks *today* when the trip is ongoing, haloed with `{colors.surface-container-high}`.
- **Pass name & route dates** — the pass name (`{typography.card-name}`), the ticket name (`{typography.display-name}`), and the route dates are `{colors.on-surface}` ink on the white pass surface (17.17:1) — the same ink-on-white as every Horizon heading, stated here for completeness.
- **Destination row & chips** — rows sit on `{colors.background}` inside a `{colors.outline-variant}` hairline; the category chip keeps Horizon's metadata pill exactly (`{colors.on-surface-variant}` on `{colors.surface-variant}`, 7.22:1); the star rating keeps its `#b5780f` glyph gold from the shipped `StarRating`.
- **Remove** — Horizon's error voice as a quiet destructive control: `{colors.error}` on `{colors.error-container}` (5.00:1), never a red-filled button.
- **Add destination** — `{colors.primary}` text and a dashed `{colors.primary}` border on transparent (6.40:1 on canvas), hover fill `{colors.surface-container-low}` (6.10:1) — the "not yet, but invited" affordance, dashed to read as an open slot rather than a committed object.

Horizon ships one light theme; this pair introduces no dark mode. Avoid: any hue outside the Horizon ramp, red for unplanned days, filled destructive buttons, and using the accent gradient anywhere but the pass/ticket spine.

## Typography

One family, **Plus Jakarta Sans**, per Horizon — richness comes from weight and tracking, never a second face. Roles used here:

- **`{typography.display-name}` (24px / 800)** — the trip name in the detail `{components.summary-ticket}`. This is Horizon's `headline-md` scale pushed to weight 800 (extra-bold) — the boarding-pass register wants its "passenger name" heavier than a section heading; the tighter -0.01em global tracking stays.
- **`{typography.card-name}` (1.1rem / 800)** — the trip name on a pass in the grid. One extra-bold step above the metadata so a wall of passes scans as a list of *trips*.
- **`{typography.stat-value}` (1.05rem / 800)** and **`{typography.stat-label}` (10px / 800 / +0.09em / uppercase)** — the number-over-caption pairing in the stub and ticket. This is the **one place all-caps is allowed** in Horizon, and only at the micro "stat label" scale: a boarding pass's field captions (SEAT, GATE, ZONE) are its native voice, and the caps + tracking read as *label furniture*, not shouting. Caps never appear above this scale.
- **`{typography.status-pill}` (10.2px / 800)** — mixed-case, not caps: "In 27 days", "Ongoing · Day 3", "Past".
- **`{typography.seg-date}` (13.6px / 800 / +0.05em / uppercase)** — the day date on the rail ("TUE · AUG 12"). Caps again earn their place as the pass's date-field convention, one tier up from stat-label.
- **Body & meta** otherwise follow Horizon: `body-md` (16/400) for the date range and empty-day sentence, `label-sm` (12/500) for the category chip and segment count, all at Horizon's on-surface-variant.

## Layout & Spacing

Both surfaces render **inside `AppLayout`** (sticky header, nav, route transition) in its content column — unlike the auth surfaces, they are never chrome-less. Page padding and the `1.5rem` vertical section gap are the shipped `TripsPage`/`TripPlannerPage` values, kept.

**Trips grid (`{components.trips-grid}`)** — the existing `auto-fill, minmax(16rem, 1fr)` grid with `1rem` gap is kept: passes are wider than they are tall and tile responsively from one column on a phone to three-plus on a desktop. The `New trip` button stays in the header row opposite the "My trips" `<h1>`, and the inline `CreateTripForm` still expands below the header — this pass grid is a drop-in replacement for the flat card grid, not a re-layout.

**Pass anatomy** — a pass is a `{rounded.lg}` white surface with the `{spacing.pass-accent-w}` accent spine flush to its left edge (content padded clear of it), split horizontally by the perforation line into a **head** (name, status pill, route) and a **stub** (the stat row on a `{colors.surface-container-low}` fill). The two `{spacing.notch-size}` notches straddle the perforation at the outer edges.

**Trip detail** stacks in one column at `max-width` matching the page's shipped content width: the `{components.summary-ticket}` header, then the `{components.journey-rail}`. The rail is a single `{spacing.rail-line-w}` `{colors.outline-variant}` vertical line inset `{spacing.rail-gutter}` from the content, with each `{components.day-segment}`'s node straddling it and the day's rows and add-affordance flowing to its right. Segments are separated by generous vertical space (≈22px) so the line reads as a continuous journey, not a set of boxes. Below `md` the rail stays — it is the page's structural identity — but tightens its gutter; destination rows wrap their trailing controls (stars, remove) under the name rather than overflowing.

## Elevation & Depth

Depth is Horizon's: mostly tonal (white object on blue-tinted canvas + hairline), two ink-tinted shadows only.

- Passes rest on **`{shadows.sm}`** (`0 1px 3px rgba(11,28,48,.08)`) and **lift on hover** to `{shadows.lg}` (`0 10px 24px rgba(11,28,48,.12)`) with `translateY(-4px)` — the canonical Horizon card-lift, reused verbatim, and the whole pass is one link target.
- The `{components.summary-ticket}` rests on `{shadows.sm}` and does **not** lift — it is a header, not a control.
- The rail, rows, and add-affordance are **flat** — hairlines and fills carry them; a destination row's only depth cue is its hairline shifting to `{colors.primary}` on hover.
- The **perforation** is drawn with a dashed hairline plus the two canvas-colored notches — geometry, not shadow. It must never gain an inner shadow or bevel.
- Motion is Horizon's: the pass grid keeps the shipped **40ms-stagger entrance** (`{motion.slow}` + `{motion.ease-spring}`); hovers and hairline shifts use `{motion.fast}` (150ms); the pass-lift uses the spring. All motion collapses under `prefers-reduced-motion`, already global in `index.css`.

## Shapes

Horizon's three radii plus the pill, applied consistently:

- **`{rounded.lg}` (0.75rem)** — the pass, the summary ticket (the large containers).
- **`{rounded.md}` (0.5rem)** — destination rows, buttons, the add-destination slot, message banners.
- **`{rounded.full}` (999px)** — every small floating metadatum: the status pill, the segment-count pill, the category chip, the rail node. One silhouette for all "tokens of information," distinct from the rectangular action shapes — the same rule Horizon states.

The perforation notches are `{rounded.full}` circles by construction. The accent spine keeps the pass's own left radius (it lives *inside* the clipped `{rounded.lg}` container). No new radius is introduced; nothing on these surfaces is pill-shaped that is a button or a container.

## Components

New recipes, all built from Horizon tokens. Behavioral rules (links vs. buttons, ARIA, single-announcement) live in `EXPERIENCE.md.Component Patterns`.

- **Trips grid — `{components.trips-grid}`.** The shipped responsive grid, kept: `auto-fill, minmax(16rem, 1fr)`, `1rem` gap, one column on a phone up to three-plus on desktop. It hosts the `{components.trip-pass}`es and, above it in the header row, the "My trips" `<h1>` opposite the "New trip" `{components.outline-button}`-adjacent primary button (the `New trip` control keeps its shipped solid-primary fill, not the outline style). No visual change beyond what the passes bring.
- **Trip pass — `{components.trip-pass}`.** `{rounded.lg}` `{colors.surface-container-lowest}` surface, `{colors.outline-variant}` hairline, `{shadows.sm}`, clipped. Left edge: the accent spine (`{spacing.pass-accent-w}`, `{colors.primary}`→`{colors.tertiary}` gradient; flat `{colors.outline-variant}` when past). **Head:** name in `{typography.card-name}` with the `{components.status-pill}` top-right, then the `{components.pass-route}`. **Perforation:** dashed `{colors.outline-variant}` line with two `{colors.background}` notches. **Stub:** the `{components.pass-stub}` on `{colors.surface-container-low}`. Whole pass is one link to `/trips/:id`; hover lifts with `{shadows.lg}`.
- **Status pill — `{components.status-pill}`.** `{rounded.full}`, `{typography.status-pill}`, three variants (upcoming / ongoing / past) with the token pairings and derived text specified in Colors and in `EXPERIENCE.md.Derived Values`. Sits inline top-right of the pass head and (as text only) in the summary ticket.
- **Pass route — `{components.pass-route}`.** A horizontal line: start date · a dashed `{colors.outline-variant}` connector carrying a small `✈` glyph at its far end in `{colors.primary}` · end date, both dates in `body-md` weight 700. Reads left→right as departure to return. The glyph is decorative (`aria-hidden`); the dates carry the meaning.
- **Pass stub — `{components.pass-stub}`.** A horizontal row of stat pairs on the `{colors.surface-container-low}` fill, each pair a `{typography.stat-value}` number over a `{typography.stat-label}` caption in `{colors.on-surface-variant}`. Exactly two stats: **Days** (= `tripDays.length`) and **Places** (= total destinations). No third stat competes on the small pass.
- **Summary ticket — `{components.summary-ticket}`.** The detail header: `{rounded.lg}` white surface, hairline, `{shadows.sm}`, `{spacing.ticket-accent-w}` accent spine. Top row: trip name in `{typography.display-name}` with the date range in `body-md` `{colors.on-surface-variant}` beneath, and the `Edit trip` button (`{components.button-outline}` from Horizon) top-right. A dashed-hairline divider, then a stat row of **three**: Days, Places, and the **Unplanned hint** (value in `{colors.secondary}`, or `{colors.success}` "All planned" at zero). "Edit trip" uses `{components.outline-button}`.
- **Outline button — `{components.outline-button}`.** The shipped secondary-action button style from `TripPlannerPage`/`TripsPage` (`.edit` / `.retry`): transparent fill, 1px `{colors.primary}` border, `{colors.primary}` `label-lg` text (6.73:1 on white), `{rounded.md}`, hover fill `{colors.surface-container-low}`, active scale 0.98. Used for "Edit trip" and the "Try again" retry actions — restated here because the Horizon parent named only `{components.button-primary}`; this is the app's existing outline counterpart, promoted to a named token so downstream code has one source.
- **Journey rail — `{components.journey-rail}`.** A single `{spacing.rail-line-w}` `{colors.outline-variant}` vertical line, gutter `{spacing.rail-gutter}`, that all `{components.day-segment}`s hang from. Purely structural.
- **Day segment — `{components.day-segment}`.** A `{spacing.node-size}` `{rounded.full}` node on the rail (3px `{colors.primary}` ring, white fill; solid-primary + `{colors.surface-container-high}` halo when it is today). Head: the `{typography.seg-date}` date label, the `{components.today-marker}` when the day is today, and a `{colors.secondary-container}` count pill ("2 places") when non-empty. Body: the day's `{components.destination-row}`s, then the `{components.add-day-button}`. An empty day shows the `{components.empty-day}` treatment in place of rows.
- **Today marker — `{components.today-marker}`.** A small `{rounded.full}` pill reading "Today" in `{typography.status-pill}`, `{colors.on-primary}` on `{colors.primary}` (6.73:1 inverse — the same primary the ongoing context uses), sitting beside the segment date. It is the **text** counterpart to the lit node: today is never signalled by node color alone (accessibility contract in `EXPERIENCE.md`). Present only on the day equal to today while the trip is ongoing.
- **Destination row — `{components.destination-row}`.** `{rounded.md}` row on `{colors.background}`, `{colors.outline-variant}` hairline: name in `body-md` weight 700, the Horizon category chip, the star rating, and the `{components.remove-button}` pushed to the trailing edge. Hover shifts the hairline to `{colors.primary}` and the name to `{colors.primary}` when the row links to an attraction (`xid` present); rows without an `xid` are non-interactive text and do not shift.
- **Remove button — `{components.remove-button}`.** `{rounded.md}`, `{colors.error}` on `{colors.error-container}`, `label-sm` weight 700, quiet — the shipped remove treatment, kept.
- **Add-day button — `{components.add-day-button}`.** A `{rounded.md}` slot with a **dashed** `{colors.primary}` border on transparent, `{colors.primary}` text and a leading `＋`, hover fill `{colors.surface-container-low}`. Dashed = an open slot inviting a destination, visually distinct from the solid committed rows above it. One per day, at the foot of the segment body.
- **Empty day — `{components.empty-day}`.** A `{rounded.md}` `{colors.surface-container-low}` panel with a dashed `{colors.outline-variant}` border holding the sentence "No destinations planned for this day yet." in `{colors.on-surface-variant}`, with the `{components.add-day-button}` beneath — an empty day is a prompt, never a blank.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Reuse only Horizon hex from `FE/src/index.css` | Introduce any new color, or a second gradient beyond the accent spine |
| Let the accent spine + perforation + rail carry the "pass" idea | Add paper texture, barcodes, tear-lines, or airline chrome — no skeuomorphism |
| Compute the status pill and counts from existing trip data | Imply a cover image, city, weather, or price the payload lacks |
| Ink `{colors.on-surface}` stat values; `{colors.on-surface-variant}` stat labels | Use `{colors.outline}` for label text (fails AA on the stub fill) |
| De-emphasize past trips via the muted pill + grey spine | Dim a whole pass with opacity (drags text under the contrast floor) |
| All-caps only at the `stat-label`/`seg-date` micro scale | All-caps on names, headings, buttons, or body |
| `{colors.secondary}` for the unplanned nudge; `{colors.success}` at zero | `{colors.error}` / red for unplanned days — it is an invitation, not an error |
| One link per pass; hover-lift with `{shadows.lg}` | Nested tap targets inside the pass, or lifting the summary ticket |
| Dashed borders for open slots (add-destination, empty day) | Dashed borders on committed objects (rows, the pass itself) |
| Keep both surfaces inside `AppLayout` chrome | Strip the header/nav the way the auth surfaces do |
