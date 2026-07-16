---
name: Trip Planner — Trips & Trip Detail
description: IA, behavior, states, derived values, accessibility, and flows for /trips and /trips/:id. Extends the Horizon experience spine; cross-references the Boarding Pass DESIGN.md by {token}.
status: final
updated: 2026-07-16
extends: ../ux-tripplanner-2026-07-15/EXPERIENCE.md
sources:
  - .memlog.md
  - ../ux-tripplanner-2026-07-15/EXPERIENCE.md
---

# Trip Planner — Trips & Trip Detail Experience Spine

> Scope: the **Trips list** (`/trips` → `TripsPage`) and the **Trip detail / planner** (`/trips/:id` → `TripPlannerPage`), including every load-bearing state each already ships (loading, error, empty, not-found, remove-confirmation). Paired with this run's `DESIGN.md` (Horizon · Boarding Pass), which owns every visual token referenced here by `{path.to.token}`. Both surfaces extend the Horizon experience spine (`../ux-tripplanner-2026-07-15/EXPERIENCE.md`); its Voice, Accessibility, and Motion rules are inherited and only the deltas are stated here.

## Foundation

Responsive web, desktop-first, **inside `AppLayout`** — sticky header, nav, and the shipped route transition wrap both surfaces (unlike the chrome-less auth screens). Both are **authenticated-only**: the `/trips` group requires authorization, and an unauthenticated visit is redirected to `/login?returnTo=…` by the existing `RequireAuth`, then returned here on success. This spine does not touch that gate; it inherits it.

The redesign is **refine-and-elevate, not re-architect** (the explicit working-mode decision). The information architecture, routes, data hooks (`useTrips`, `useTrip`, `useRemoveDestinationFromDay`, `useAddDestinationToDay`), and every state already present are **preserved**; what changes is the *visual structure and the reading order* — a flat card grid becomes a grid of `{components.trip-pass}`es, and a flat day/row list becomes a `{components.journey-rail}` under a `{components.summary-ticket}`.

**Hard data constraint, non-negotiable for all copy and layout here:** the trip payload is exactly `id`, `name`, `startDate`, `endDate`, and `tripDays[]` (each `{ day, destinations[] }`); a destination is `id`, `name`, `rating` (integer), `category`, `xid` (nullable), `openingHours`, `cuisineType`, `isHalalFriendly`. **There is no trip cover image and no city/location field.** No surface may imply one. Every richer element on these pages — status pill, countdown, day/place counts, the unplanned-days hint, today's lit node — is **derived from that payload plus the current date** (see Derived Values); nothing is fetched or faked.

UI system: hand-rolled CSS Modules over the Horizon token layer in `FE/src/index.css`. No component library. Light theme only.

→ Mockup (spine-derived, both surfaces with their load-bearing states): `mockups/key-trips-and-detail.html`. **The spines win on conflict.**

## Information Architecture

| Surface | Route | Reached from | Purpose |
|---|---|---|---|
| Trips list | `/trips` | Header nav, post-login landing, `AddToTripDialog` "Create a trip" link, create/edit success | See every trip as a pass; open one; start a new one |
| Create trip (inline) | `/trips` (in-place) | "New trip" button, empty-state CTA | Name + date range; on success navigate to the new trip's detail |
| Trip detail | `/trips/:id` | Tapping a pass; navigate-after-create; bookmark/deep link | Read and manage the itinerary day by day |
| Edit trip (inline) | `/trips/:id` (in-place) | "Edit trip" button | Change name/date range; on save collapse back to the ticket |
| Remove destination (dialog) | `/trips/:id` (modal) | A row's "Remove" | Confirm removing one destination from one day |

Neither surface nests navigation beyond this. The detail page's per-day **`{components.add-day-button}`** is a *sixth* exit added by this redesign: it hands off to the discovery flow rather than opening a nested editor (see Component Patterns → Add-day button, and Flow 2). The `/trips` list preserves the **API's returned order** — this redesign does **not** sort or group the passes (a considered decision: sorting was offered and declined to keep the change lean and the render deterministic against the existing query). The status pill makes chronology legible without reordering.

## Voice and Tone

Inherits Horizon's front-desk voice — warm, brief, never chirpy, never blaming. Deltas and new strings for these surfaces:

| Do | Don't |
|---|---|
| "My trips" (page `<h1>`, kept) | "Your Adventures ✈️" |
| "New trip" / "Create your first trip" (kept) | "Add a new trip record" |
| "In 27 days" · "Tomorrow" · "Ongoing · Day 3" · "Past" (pass); "Today" marker on the current day segment | "Starts 2026-08-12" / "Trip #2" / "Expired" |
| "5 days" · "9 places" (singular "1 day" / "1 place") | "5 day(s)" / hard-coded plurals |
| "2 days unplanned" (hint) · "All days planned" (at zero) | "2 empty days!" / "Incomplete itinerary" / any red-scold |
| "No destinations planned for this day yet." (kept) | "This day is empty." |
| "＋ Add destination" | "Add item" / "＋" alone with no label |
| "Remove {name} from this day?" (confirm, kept) | "Delete destination?" |
| "Could not load your trips. Please try again." (kept) | "Error 500" |
| "Trip not found" + "it may not exist or it may belong to someone else." (kept) | "Access denied" / anything confirming another user's trip exists |

Counts are always spelled with their unit and correctly singularized. The status pill is the trip's *tense*, in human words. The unplanned hint is phrased as an opportunity, never a defect.

## Component Patterns

Behavioral only; visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Trip pass | Trips grid | The **whole pass is one `<a>`** to `/trips/:id` — no nested interactive elements inside it (the status pill, route, and stub are all presentational text within the link). Accessible name is the trip name; the status and counts are read as part of the link text in reading order ("Đà Nẵng escape, In 27 days, 12 Aug to 16 Aug, 5 days, 9 places"). Keeps the shipped 40ms staggered entrance and hover-lift. |
| Status pill | Pass head; ticket header (text) | Presentational. Its text is derived at render from dates vs. today (see Derived Values) and is part of the pass link's accessible text — **not** given a separate `aria-label`, so it announces once. Recomputed on mount/refetch; no live ticking. |
| Pass route | Pass head | Presentational. The `✈` connector glyph is `aria-hidden`; the two dates are real text joined by a visually-hidden "to" (or the shipped `formatDateRange` string used as the source text) so the composed link name reads "12 Aug to 16 Aug", a range, not two loose dates. |
| Pass stub | Pass stub | Presentational text pairs. "Days" = `tripDays.length`; "Places" = summed destination count. Both singularized. |
| Trips grid | `/trips` | Renders `useTrips().data` in **API order**, unchanged. The "New trip" button toggles the inline `CreateTripForm` (kept); on create success, navigate to the new `/trips/:id` (kept). |
| Summary ticket | `/trips/:id` header | Presentational header holding the page `<h1>` (trip name), the date range, the Days/Places/Unplanned stats, and the "Edit trip" button. "Edit trip" toggles the inline `EditTripForm` (kept behavior); while editing, the form replaces the ticket body and the button is hidden, exactly as today. |
| Journey rail | `/trips/:id` body | Structural wrapper around the day segments; presentational. Renders `tripDays` in payload order (chronological as the API returns them). |
| Day segment | Per `tripDays[]` entry | The day's `date` heading (kept as an `<h2>`), a count pill when non-empty, the destination rows, and the add-day button. The node is decorative (`aria-hidden`). When the day equals today (trip ongoing), the `{components.today-marker}` "Today" pill renders beside the date **and** the word "Today" is folded into the `<h2>`'s accessible text (e.g. "Thursday, Aug 14 — Today") so the current day is announced, never signalled by node color alone. |
| Destination row | Per destination in a day | If `xid !== null` the name is a link to `/attractions/:xid` (kept); if `xid === null` it is plain non-interactive text (kept). The row is **not** itself a link — the name link and the Remove button are the only targets, no nesting. Star rating keeps its "Rated N of 3" accessible name from the shipped `StarRating`. |
| Remove button | Per destination row | Real button, `aria-label` "Remove {name}" (kept). Opens the shipped `ConfirmDialog` ("Remove {name} from this day?", danger, pending state) — this redesign does not change the removal contract, only the row's look. On a **successful** removal the triggering button is destroyed with its row, so focus must move to a **deterministic** anchor — the parent day segment's `<h2>` (made programmatically focusable) or, if the day is now empty, its `{components.add-day-button}` — never left to fall to `<body>`. On a **failed** removal, focus returns to the still-present Remove button and the failure surfaces per the removal-failure state below. |
| Add-day button | Foot of each day segment | Real button labeled "＋ Add destination". (Its token name `add-day-button` refers to its per-day *placement*, not to creating a day — it adds a destination to an existing day.) Because a destination is only ever added *from an attraction* (the `AddToTripDialog` needs an `xid`), this affordance **routes the user to the discovery surface to find a place** — it does not open a nested picker. Baseline honest behavior: navigate to `/` (home/search). **Optional, no-backend enhancement** (implementation-story choice, must not ship as dead UI): deep-link the search surface with the trip id and this `day` so the subsequent `AddToTripDialog` can pre-select this trip and day — a pure FE wiring nicety, omitted rather than faked if not built. |
| Empty day | A day with zero destinations | Shows the kept sentence "No destinations planned for this day yet." with the add-day button beneath — never a bare blank. |
| Create / Edit trip forms | Inline on each surface | Unchanged — same fields, validation, pending, and cancel behavior already shipped (`CreateTripForm`, `EditTripForm`, `tripFormValidation`). This run restyles their container to sit comfortably among passes/ticket but does not alter their logic. |

## State Patterns

Every state below already ships on these surfaces; this redesign **preserves each and restyles it** into the Boarding Pass language. None is removed; none is newly invented except the empty-day-within-a-populated-trip treatment (already present as text, now a defined component).

| State | Surface | Treatment |
|---|---|---|
| Loading | `/trips` | The shipped 4 `aria-hidden` skeleton cards, geometry updated to the pass silhouette so the swap to real passes does not jump; visually hidden "Loading your trips…" kept. |
| Error | `/trips` | The shared state pattern — ⛅ emoji, `{colors.on-surface-variant}` text "Could not load your trips. Please try again.", primary "Try again" button calling `refetch` (kept). |
| Empty (no trips) | `/trips` | The shipped 🧳 empty state — "No trips yet" heading, invitation copy, "Create your first trip" primary button that opens the inline create form (kept), restyled to Horizon. Hidden while the create form is open (kept). |
| Populated | `/trips` | Grid of `{components.trip-pass}`es in API order, staggered entrance. "New trip" button in the header. |
| Creating (inline) | `/trips` | `CreateTripForm` expands under the header; "New trip" button hidden while open (kept). |
| Invalid / not-found id | `/trips/:id` | Non-integer or `≤0` id, or a 404 from the scoped query, renders the shipped 🙈 "Trip not found" state with "it may not exist or it may belong to someone else." — the copy that preserves ownership-scoping privacy (kept verbatim). |
| Loading | `/trips/:id` | "Loading trip…" line in `{colors.on-surface-variant}` (kept); may be upgraded to a ticket+rail skeleton at implementation discretion, matching the `/trips` skeleton convention. |
| Error (service) | `/trips/:id` | Shared state pattern with ⛅, "Something went wrong while loading this trip. Please try again.", scoped "Try again" (kept). |
| Loaded | `/trips/:id` | Summary ticket + journey rail. Days in chronological payload order. |
| Editing (inline) | `/trips/:id` | `EditTripForm` replaces the ticket body; "Edit trip" hidden; on save collapse back (kept). |
| Remove pending / error | `/trips/:id` | The shipped `ConfirmDialog` with its pending state; a failed removal surfaces the kept `{components.banner-error}` line above the rail ("… Please try again."), which carries **`role="alert"`** so screen-reader users hear the failure on insertion (inherited from the Horizon parent's error-banner contract; restated here because the failure is otherwise a silent inline text node). |
| Empty day | `/trips/:id` | `{components.empty-day}` in the segment (see Component Patterns). |
| All-unplanned trip | `/trips/:id` | Every segment shows its empty-day treatment; the ticket's unplanned hint reads "N days unplanned" — the page reads as an itinerary waiting to be filled, with an add affordance on every day. |

## Interaction Primitives

- **One tap opens a trip.** The entire pass is the target; there is nothing else to hit inside it.
- **Add is a handoff, not an inline editor.** The add-day button leaves for discovery and returns via the existing add-to-trip flow; no destination is ever created from raw text on this page. This preserves the invariant that every planned destination originates from a real attraction (`xid`).
- **Removal is always confirmed.** No optimistic delete; the shipped `ConfirmDialog` gates every removal, with a pending state and inline error on failure.
- **One pending mutation at a time**, mirroring Horizon's auth surfaces — the confirm dialog blocks close while its mutation is in flight (kept).
- **No reordering.** Days render in payload order and passes in API order; drag-to-reorder is explicitly out of scope (it would need persistence the backend does not offer). Chronology is conveyed, not edited.
- **Derived values never tick.** The status pill and "today" node are computed once per render/refetch from the local date; there is no per-second countdown timer (honest to a date-only payload and cheap).
- **Motion & reduced-motion** follow Horizon: stagger + spring for entrances, `{motion.fast}` for hovers, all collapsing under `prefers-reduced-motion` (global).

## Accessibility Floor

Behavioral; visual contrast and the verified AA ratios live in `DESIGN.md.Colors`. These surfaces today implement standard semantics; the redesign must **not regress** them and must honor the additions below.

- **The pass is a single link** with an accessible name composed of its visible text in reading order (name → status → route dates → stats). Status and counts are plain text inside the link — never a duplicate `aria-label`, so each fact announces exactly once. Decorative glyphs (`✈`, the accent spine, the rail node) are `aria-hidden`.
- **Heading outline:** `/trips` keeps its single `<h1>` "My trips"; `/trips/:id` keeps the trip name as `<h1>` and each day date as `<h2>`. The summary ticket adds no competing heading. Day-count/place-count stats are not headings.
- **Status is not color-only.** Each state carries a **word** ("In 27 days" / "Ongoing · Day 3" / "Past"), so the upcoming/ongoing/past distinction never depends on the pill's fill hue or the spine's color alone.
- **The "today" node** is never color-only: the same day carries the visible `{components.today-marker}` "Today" pill and the "— Today" suffix in its `<h2>` accessible name, satisfying 1.4.1 and 1.3.1. The lit node is `aria-hidden` decoration on top of that text signal.
- **Remove** keeps its explicit `aria-label` "Remove {name}" and routes through a focus-trapped `ConfirmDialog` (shipped `Modal` semantics). Focus management is **deterministic** (2.4.3): dialog-open traps focus; **cancel** returns focus to the Remove button; **successful delete** destroys that button, so focus moves to the parent day `<h2>` (made focusable) or the day's add-day button when the day is now empty — never to `<body>`; **failed delete** returns focus to the Remove button, and the inline `role="alert"` banner announces the failure.
- **Add-day button** has a self-sufficient accessible name — "Add destination" plus its day context where the DOM allows (e.g. `aria-label="Add a destination to {date}"`) — so it is not an unlabeled "＋".
- **Star rating** keeps the shipped "Rated N of 3" name; the category chip and count pill are plain text, read inline.
- **Skeletons** stay `aria-hidden` behind the visually hidden "Loading your trips…" / "Loading trip…" live text.
- **Touch targets:** the pass, "New trip", and "Edit trip" are large. The **Remove** control and the **add-day** button take a **44px goal** and a **hard ≥24px AA floor (2.5.8)** via padding — the compact row must not let Remove render at its ~21px mock height; on narrow viewports the row wraps its trailing controls (stars, Remove) below the name rather than shrinking them under the floor. The **attraction-name link** inside a row is an **inline text target** and claims the WCAG 2.5.8 inline exemption; it need not reach 44px, but keeps the visible focus outline and generous line-height.
- **Keyboard focus always visible** — the global 2px `{colors.primary}` outline from `index.css`, never suppressed, on passes, the name links, remove, add-day, and the ticket's Edit button. Tab order: `/trips` — "New trip" → passes in DOM order; `/trips/:id` — Edit → per segment (name link → remove, per row) → add-day, top to bottom.

## Derived Values

The whole point of the redesign is legible richness from the payload we already have. Every computed value, defined once:

- **`today`** — the user's local calendar date (date-only; times are irrelevant to a day-granular itinerary).
- **Status + label** (per trip, from `startDate`/`endDate` vs. `today`):
  - `endDate < today` → **Past** (pill: past variant; accent spine desaturated).
  - `startDate ≤ today ≤ endDate` → **Ongoing · Day k**, where `k = daysBetween(startDate, today) + 1` (1-indexed; "Day 1" on the start date).
  - `startDate > today` → **Upcoming**, labeled by `n = daysBetween(today, startDate)`: `n === 1` → "Tomorrow", `n === 0` handled by Ongoing, otherwise "In n days".
  - `Today` is used as the ongoing label when `startDate === today` and the trip is a single day, at implementation discretion; the ongoing rule above already covers it as "Day 1".
- **Days** = `tripDays.length` (the number of planned day-slots the trip owns), singularized.
- **Places** = `sum(tripDays[].destinations.length)`, singularized.
- **Unplanned hint** = `count(tripDays where destinations.length === 0)`. `> 0` → "N days unplanned" in `{colors.secondary}`; `=== 0` → "All days planned" in `{colors.success}`.
- **Segment count pill** (per day) = `destinations.length`, shown only when `> 0`, singularized ("1 place" / "N places").
- **Today node + marker** (per day) = `day === today`, applied only while the trip is ongoing. Drives both the lit node (visual) and the `{components.today-marker}` "Today" pill + the "— Today" suffix folded into the day `<h2>` accessible name (non-visual), so the signal is never color-only.

All derivations are pure functions of loaded data + `today`; none requires a request. `daysBetween` uses date-only arithmetic consistent with the shipped `lib/dates` helpers; edge cases (trip spanning today, single-day trip, zero destinations) are enumerated above so implementation has no ambiguity.

## Key Flows

### Flow 1 — The pre-trip glance (Minh, 08:10 Monday, office desktop, checking where things stand before a 1:1 about his Đà Nẵng trip)

1. Minh opens `/trips` from the header. The page is a small shelf of passes, and his eye sorts them without reading a word: one wears a green **"Ongoing · Day 3"** pill, two wear calm blue **"In 27 days" / "In 80 days"**, one sits quiet and grey — **"Past"**, its accent spine drained of color.
2. He wants the upcoming Đà Nẵng one. Its pass shows the route line "12 Aug ✈ 16 Aug" and a stub: **5 Days · 9 Places**. He already knows, before clicking, that it is a five-day trip with nine spots — the numbers live on the shelf.
3. He clicks the pass; it lifts under his cursor for the 150ms before the route change.
4. **Climax:** `/trips/2` opens as a ticket, not a form. "Đà Nẵng escape" in bold, "12 – 16 August 2026", and one line of truth he came for — **Days 5 · Places 9 · Unplanned 2 days**, that last number in quiet blue. In a single glance he has the answer for his 1:1: the trip is mostly built, two days still open. Below, the journey rail lays the five days out as a route he can read top to bottom.

Failure path: the list request fails → the ⛅ state with "Could not load your trips. Please try again." and a retry; nothing else on the page pretends to have loaded.

### Flow 2 — Filling the empty day (An, 21:30, sofa, laptop, finishing the Đà Nẵng itinerary the night before she books)

1. An is on `/trips/2`. The rail shows Aug 12 with two places and a count pill, Aug 13 with one, and then **Aug 14 — a segment with no rows**, just the line "No destinations planned for this day yet." and a dashed **"＋ Add destination"** slot beneath it. The ticket's "2 days unplanned" had already told her two of these existed; the rail shows her exactly which.
2. She taps "＋ Add destination" on Aug 14. The app carries her to the search surface — the same discovery flow she used to build the rest of the trip — rather than dropping a blank text field in front of her, because a real place, not a typed string, is what belongs on the rail.
3. She searches Đà Nẵng, finds the Hải Vân Pass viewpoint, and taps its card's "Add to trip" row; the shipped `AddToTripDialog` opens. (Because the add-day button carried her trip and day, the dialog offers "Đà Nẵng escape" and "Aug 14" already in reach — the optional deep-link nicety; without it she picks them in two taps, and either way nothing is faked.)
4. **Climax:** she lands back on `/trips/2` and Aug 14 is no longer a gap — a destination row has appeared under it, the count pill now reads "1 place", and the ticket's hint has ticked down to **"1 day unplanned"**. The itinerary visibly filled in as she worked; the number she is trying to drive to zero moved, on its own, in the right direction.

Failure path: she changes her mind and taps a row's "Remove" → the shipped confirm dialog asks "Remove Hải Vân Pass from this day?"; on confirm the row leaves and the counts recompute; if the removal call fails, the inline error line appears above the rail and the row stays, nothing lost.
