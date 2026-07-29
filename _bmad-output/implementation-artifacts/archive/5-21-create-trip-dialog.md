---
baseline_commit: ff0beb11ec5ecfb8113e28048255b0d4dc522940
---

# Story 5-21: Create Trip as a Modal Dialog

Status: review

## Story

As a **signed-in traveller on the Trips page**,
I want clicking **New trip** to open the create-trip form in a **popup over the page**,
so that **I keep my existing trips in view while I fill the form, and dismissing the popup returns me exactly where I was** — instead of the form taking over the page body and hiding the boarding-pass grid.

> **Current state (verified at `ff0beb1`):** create-trip is **not** a separate route — `FE/src/app/routes.tsx` has no `/trips/new`. It is an **inline panel** on the Trips page: `TripsPage.tsx:60` holds `const [creating, setCreating] = useState(false)`, and `:112-114` renders `<CreateTripForm>` inline in the page flow. It behaves *like* a page because the surrounding UI hides itself around it — the **New trip** button is gated on `hasTrips && !creating` (`:105`) and the whole empty state is gated on `!creating` (`:123`). `CreateTripForm.tsx` renders its own card (`.form` in `TripForm.module.css:1-11` supplies background, border, shadow, padding, `max-width: 26rem`). `CreateTripForm` has exactly **one** consumer (`TripsPage.tsx:4`).

## Decisions

- **D1 — Reuse the shared `Modal`, do not hand-roll an overlay.** `FE/src/shared/ui/Modal.tsx` already provides the whole dialog contract this app has standardised on: `role="dialog"` + `aria-modal="true"` + `aria-label`, initial focus onto the dialog, focus **restored to the previously focused element** on unmount, `body { overflow: hidden }` scroll lock, Escape-to-close, and a Tab focus trap. `AddToTripDialog.tsx:64` is the precedent.
- **D2 — `CreateTripForm.tsx` is replaced by `CreateTripDialog.tsx`, not wrapped.** Nesting the existing form inside `Modal` would double-frame it — `TripForm.module.css .form` and `Dialog.module.css .dialog` both paint a card (background + border + radius + shadow + 1.5rem padding). Following the `AddToTripDialog` convention, the new component composes `Modal` + `Dialog.module.css` chrome (`.title`, `.error`, `.actions`, `.confirm`, `.cancel`) and borrows only the **field** classes (`.field`, `.label`, `.input`, `.dates`) from `TripForm.module.css`. `CreateTripForm.tsx` is then deleted — it has no other consumer. `TripForm.module.css` **stays** (still consumed by `EditTripForm.tsx:9`), and `EditTripForm` is **out of scope**.
- **D3 — Zero new CSS file.** Composing `Dialog.module.css` + the existing `TripForm.module.css` field classes covers the layout completely. `TripsPage.module.css` loses nothing: `.newTrip` and `.emptyAction` are both still used.
- **D4 — The page body no longer hides itself.** With the form floating above the page, the `!creating` gates are wrong by construction: the grid and empty state should stay visible behind the overlay, and **New trip** should be present whenever the list has loaded — including on an empty list. This is not scope creep; leaving the gates in place would blank the page behind a popup.
- **D6 — `Modal` renders through a portal to `document.body`** (added during implementation, from live-browser evidence). `AppLayout.module.css:199` applies `animation: route-fade-in … both` to the route container, and that keyframe animates `transform` — with `fill-mode: both` the computed transform sticks permanently, making the container a **containing block for every `position: fixed` descendant**. The overlay therefore measured **1120×240 at (160, 80)** in a 1440×900 viewport instead of covering it: the dim stopped at the content column, the header stayed bright, and `elementFromPoint` outside that box returned the page behind — a traveller could click **Logout** or a trip pass through an `aria-modal="true"` dialog. `createPortal(…, document.body)` escapes the transformed ancestor; the overlay now measures **1440×900** and intercepts clicks everywhere. This is a **pre-existing** defect that equally affected `AddToTripDialog` (same `Modal`, same transformed ancestor) — fixed here because a popup you can click behind is not a popup, and because AC 10's modality floor cannot hold without it.
- **D7 — The calendar popover positions itself against the *viewport*, not its field** (added after the bug report that reopened this story). `DateField.module.css .popover` was `position: absolute; left: 0` under a `position: relative` field, with a `max-width: 32rem` media query that re-anchored it to `left: 50%; translateX(-50%)`. Both are field-relative and neither knows how wide the screen is, so on a 390 px phone the popover ran 57 px (start) and 216 px (end) past the right edge — the days a traveller needs are physically off-screen, and the dialog clips nothing, so there is nothing to scroll to reach them. The fix measures the control and the popover with `getBoundingClientRect()` and writes an explicit `position: fixed` `top`/`left`, clamped into the viewport with an 8 px gutter and flipped above the control when there is no room below, recomputed on `resize` and on capture-phase `scroll`. **Why `fixed` rather than clamping the absolute offset:** the popover must be free of every ancestor's box — under `absolute` it stays subject to the dialog's padding box and to any future `overflow` on it, and the clamp would have to be re-derived from the field's own offset parent each time. `fixed` makes the clamp arithmetic the *same* arithmetic as the constraint being satisfied. This is safe here only because `Modal` already portals to `document.body` (D6) — with the old transformed ancestor a fixed popover would have been clipped in exactly the way D6 describes.

- **D5 — Escape inside `DateField`'s calendar must not close the dialog.** `DateField` opens a `react-day-picker` popover and closes it on Escape via a **native `document` keydown listener** (`DateField.tsx:59-68`). `Modal`'s Escape handler is a **React** `onKeyDown` on the dialog element, and it calls `event.stopPropagation()` — which halts the native event at React's root container, **before** it can reach `document`. Inside the dialog, one Escape press would therefore destroy the whole form instead of just closing the calendar. Fixed locally in `DateField` with a React `onKeyDown` on its container that consumes Escape (and stops propagation) **only while the calendar is open**, leaving the document listener as-is for every other case.

## Acceptance Criteria

1. On `/trips`, activating **New trip** opens the create-trip form inside a modal dialog: an element with `role="dialog"`, `aria-modal="true"`, and the accessible name `Create a trip`.
2. The trips grid (or, on an empty list, the empty state) **remains rendered** while the dialog is open — the page body no longer blanks itself.
3. **New trip** is available whenever the trips list has loaded successfully, including when the traveller has zero trips. The empty state keeps its **Create your first trip** button, and it opens the same dialog.
4. The dialog contains the same three inputs as the shipped inline form, reachable by the same accessible labels — `Trip name`, `Start date`, `End date` — with the same `min` constraints (start ≥ today; end ≥ start, falling back to today).
5. Client-side validation is unchanged and its message renders inside the dialog: an empty name reports `Trip name is required.`; a start date after the end date reports `Start date must be on or before the end date.`; neither case calls the API.
6. A successful create closes the dialog and navigates to `/trips/{id}` — the shipped behaviour, unchanged.
7. A server error keeps the dialog open and renders the API's message inside it (e.g. `Start date cannot be in the past.`); a non-`ApiError` failure renders `Something went wrong. Please try again.`
8. The dialog is dismissable three ways — the **Cancel** button, and the Escape key — and dismissing it leaves the trips list exactly as it was, with no create request sent.
9. While the create request is in flight the dialog cannot be dismissed (Cancel and Escape are inert) and the submit button is disabled, so a trip cannot be created twice or orphaned mid-flight.
10. Keyboard and screen-reader floor, inherited from `Modal` and asserted: focus moves into the dialog on open, page scroll is locked while it is open, and focus returns to the control that opened it (**New trip** / **Create your first trip**) when it closes.
11. Pressing Escape while `DateField`'s calendar popover is open closes **only the calendar**; the dialog and all entered values survive. Pressing Escape again closes the dialog. Closing the calendar (by Escape or by picking a day) returns focus to the calendar trigger, so keyboard focus never escapes the dialog.
12. The dialog overlay covers the whole viewport and intercepts pointer events across it, including over the app header — nothing behind the dialog is clickable while it is open.
13. Automated tests cover ACs 1-12. `CreateTripForm.tsx` no longer exists and nothing imports it.
14. **The calendar popover is fully visible on a small screen.** Opening either date field's calendar — start or end — renders a popover whose whole box lies inside the viewport: its left edge ≥ the gutter, its right edge ≤ viewport width − gutter, its top edge ≥ the gutter, and its bottom edge ≤ viewport height − gutter. This holds for a field near the right edge (the popover shifts left instead of overflowing), for a field near the bottom (it flips above the control), and after the viewport is resized while the calendar is open. On a viewport too short to hold the calendar at all, the popover scrolls internally rather than spilling. Every existing `DateField` behaviour — labels, `min`/`max`, `onChange`, Escape isolation, focus return — is unchanged.

## Tasks / Subtasks

- [x] **Task 1: Fix the `DateField` Escape collision** (AC: 11)
  - [x] Write a FAILING test first in `DateField.test.tsx`: render `DateField` inside a wrapper whose own `onKeyDown` records Escape, open the calendar, fire `keyDown` with `{ key: 'Escape' }` **on the popover** (not `document`), and assert the calendar closed **and** the outer handler was not called. **RED verified:** 1 failed / 6 passed — the calendar *did* close (the document listener still fired) but `outerKeyDown` was called once, exactly the leak D5 predicts.
  - [x] Add `onKeyDown` to `DateField`'s container `div`: when `open` and `event.key === 'Escape'`, close and `event.stopPropagation()`. The existing `document` listener is untouched — `DateField.test.tsx`'s original Escape test fires on `document` and stays green, plus a new test pins that Escape still reaches an enclosing handler when the calendar is **closed**.
  - [x] Keep the whole `min`/`max`/`onChange`/pick-a-day contract byte-for-byte.
  - [x] **Added after live-browser evidence:** `closePopover()` also returns focus to the calendar trigger (`triggerRef`), on both the Escape path and the day-pick path. Without it focus fell to `document.body` when the popover unmounted, which made the **next** Escape a no-op — see Debug Log D2.

- [x] **Task 2: Add `CreateTripDialog`** (AC: 1, 4, 5, 6, 7, 9)
  - [x] Write FAILING tests first (Task 5) before this component exists. **RED verified:** 7 failed / 9 passed.
  - [x] New `FE/src/features/trips/CreateTripDialog.tsx` taking `{ onCreated, onClose }`, rendering `<Modal label="Create a trip" onClose={handleClose}>`.
  - [x] Moved `CreateTripForm`'s logic across verbatim: `name`/`startDate`/`endDate`/`validationError` state, `useCreateTrip()`, `todayISO()`, `validateTripForm(name, startDate, endDate)` on submit, `createTrip.mutate({ name: name.trim(), startDate, endDate }, { onSuccess: onCreated })`, and the `ApiError`-vs-generic `serverError` derivation. No behaviour change — a relocation.
  - [x] Input ids `create-trip-name` / `create-trip-start` / `create-trip-end` and labels `Trip name` / `Start date` / `End date` preserved (AC 4).
  - [x] Chrome from `Dialog.module.css` (`.title`, `.error`, `.actions`, `.confirm`, `.cancel`); fields from `TripForm.module.css` (`.field`, `.label`, `.input`, `.dates`). `.form` deliberately **not** used (D2). **Deviation:** one new class, `.fields`, was added to `TripForm.module.css` — see Debug Log D1.
  - [x] `handleClose` returns early while `createTrip.isPending`, so the `Modal` Escape path and Cancel are both inert in flight; `disabled={createTrip.isPending}` on submit **and** Cancel (AC 9). Mirrors `AddToTripDialog.tsx:21-26`.

- [x] **Task 3: Rewire `TripsPage`** (AC: 1, 2, 3, 6, 8, 10)
  - [x] Swapped the `CreateTripForm` import for `CreateTripDialog`; rendered as an overlay sibling **after** the grid/empty state, still gated on `creating`.
  - [x] Removed both the `!creating` and `hasTrips &&` gates from the **New trip** button (AC 3).
  - [x] Removed the `!creating` gate wrapping the empty state (AC 2).
  - [x] `handleCreated` (`setCreating(false)` + `navigate(/trips/{id})`) and the `useTrips` pending/error branches untouched.

- [x] **Task 4: Delete `CreateTripForm.tsx`** (AC: 13)
  - [x] File deleted; `CreateTripForm` returns zero hits under `FE/src`.
  - [x] `TripForm.module.css` still imported by `EditTripForm.tsx` (unmodified apart from the additive `.fields` class); `.newTrip`/`.emptyAction` still referenced by `TripsPage.tsx`.

- [x] **Task 5: Tests** (AC: 13)
  - [x] Extended `TripsPage.test.tsx`. All 9 pre-existing tests survive **unmodified**, including the five create-flow ones.
  - [x] Selected the modal by accessible name throughout (`getByRole('dialog', { name: /create a trip/i })`) to avoid colliding with `DateField`'s own `role="dialog"` calendar.
  - [x] AC 1 (`aria-modal="true"` + name + all three labelled fields), AC 2 (both trip names still in the document with the dialog open), AC 3 (**New trip** present and functional with zero trips).
  - [x] AC 8: Cancel closes with `createTrip` never called; Escape closes with `createTrip` never called; the grid survives both.
  - [x] AC 9: with the create promise left unresolved, submit is disabled and neither Cancel nor Escape closes; `createTrip` called exactly once.
  - [x] AC 10: `document.body.style.overflow === 'hidden'` while open and restored after close; focus returns to the **New trip** button.
  - [x] AC 11 at the page level: calendar Escape leaves the dialog and the typed name intact, focus stays **inside** the dialog (asserted explicitly, not `document.body`), and a second Escape fired **on the focused element** closes the dialog.
  - [x] AC 12: asserted the overlay is a direct child of `document.body`, so it can never be re-trapped inside the transformed route container.
  - [x] Task 1's two DateField tests plus a third pinning focus-return after a day is picked.

- [x] **Task 6: Validation** (AC: 1-13)
  - [x] `npm test` — **331/331 across 28 files** (+10 net), no regressions.
  - [x] `npm run lint` — the 2 pre-existing warnings only, nothing new.
  - [x] `npm run build` — type-check + production build green (the >500 kB chunk notice is pre-existing).
  - [x] Live browser check at **1440×900 and 390×844** against the running dev server with the trips API stubbed — all assertions passed on both, zero console errors. See Debug Log.

- [x] **Task 7: Viewport-aware calendar positioning** (AC: 14) — reopened from `review` on the user's bug report
  - [x] Write FAILING tests first in `DateField.test.tsx`: stub `window.innerWidth`/`innerHeight` and `getBoundingClientRect` for the control and the popover, then assert the popover box lies inside the viewport for (a) a control near the right edge, (b) a control near the bottom edge, and (c) after a `resize` while the calendar is open. **RED verified:** 3 failed / 8 passed.
  - [x] Compute `top`/`left` in a layout effect from the control rect + popover rect, clamped to the viewport with flip-above; apply as inline style on a `position: fixed` popover. `useLayoutEffect` (not `useEffect`) so the position is written before paint and the calendar never flashes at the origin.
  - [x] Re-measure on `resize` and on capture-phase `scroll`; tear both listeners down when the calendar closes.
  - [x] `DateField.module.css`: `.popover` becomes `position: fixed` with `max-width`/`max-height`/`overflow-y` for short viewports; the superseded `max-width: 32rem` centring hack is dropped; day cells shrink under 22.5 rem so the calendar itself fits a 320 px phone (live-measured 304 px wide there).
  - [x] `Dialog.module.css`: overlay gets `overflow-y: auto` and the dialog `margin: auto`, so a dialog taller than a short (landscape-phone) viewport scrolls instead of clipping. `margin: auto` rather than relying on `align-items: center` alone — a centred flex item taller than its scroll container has its overflowing top clipped and unreachable.
  - [x] **Added after live-browser evidence:** the popover is measured with `offsetWidth`/`offsetHeight`, not the bounding rect — see Debug Log D4.
  - [x] No regression: `DateField` 12/12, full FE suite 335/335 across 28 files.

## Dev Notes

- **Frontend-only.** No backend, DTO, endpoint, API-client, or hook change. `useCreateTrip` and `createTrip` are called with the identical payload — the wire request is byte-for-byte what ships today.
- **"Instead of a page" is about perceived takeover, not routing.** There is no create-trip route to delete. The inline panel *reads* as a page because `TripsPage` hides the button and the empty state around it; the popup fixes that by floating above a body that stays put (D4).
- **Why not `<dialog>`/`showModal()`:** the app already standardises on the `Modal` component (`AddToTripDialog`, and the `Dialog.module.css` chrome), and it carries the focus-restore + scroll-lock + focus-trap contract that a bare `<dialog>` in jsdom does not exercise reliably. Consistency beats novelty here.
- **The `DateField` Escape collision is real, not theoretical (D5).** Verified by reading both handlers: `Modal.tsx:33-36` calls `event.stopPropagation()` on the React synthetic Escape event, which prevents the native event from propagating past React's root container to the `document` listener at `DateField.tsx:60-63`. Without Task 1, a traveller who opens the calendar and presses Escape loses the entire half-filled form. Fix it **before** Task 3 so no intermediate state ships the defect.
- **Nested `role="dialog"`:** the calendar popover being a `role="dialog"` inside the modal is pre-existing (`DateField.tsx:110`) and out of scope; it only matters here as a **test selector hazard** — filter by accessible name.
- **`z-index`:** `Dialog.module.css .overlay` is `z-index: 20`; `DateField.module.css .popover` is `z-index: 30` but sits *inside* the dialog's stacking context, so the calendar renders above the dialog surface with no change needed.
- **Focus restore is `Modal`'s, not ours.** `Modal.tsx:20-29` captures `document.activeElement` on mount and refocuses it on unmount — which is why AC 10 works for free, and why the opening control must remain mounted while the dialog is open (another reason the `!creating` gates in D4 must go: hiding the **New trip** button would destroy its own focus target).

## Dev Agent Record

### Implementation Plan

Sequenced so no intermediate state ships a keyboard trap: (1) fix `DateField`'s Escape collision, (2) write the failing page-level dialog tests, (3) add `CreateTripDialog`, (4) rewire `TripsPage` and remove the self-hiding gates, (5) delete `CreateTripForm`, (6) validate — unit, lint, build, then a real browser.

### Debug Log

**D1 — One new CSS class was needed (`TripForm.module.css .fields`).** `Dialog.module.css .dialog` supplies `gap: 1rem` between its *own* children, but the form is a single child, so its fields collapsed with no vertical rhythm. `.form` could not be reused: it paints the card (background + border + shadow + `padding: 1.5rem` + `max-width: 26rem`) and would have double-framed inside the dialog, which is exactly what D2 forbids. Added an additive 3-line `.fields` (flex column + `gap: 1rem`) beside the other field classes. `EditTripForm` does not use it and is unaffected. D3's "zero new CSS **file**" still holds.

**D2 — The live browser found a defect four green unit tests had missed.** The first Playwright run failed at `waiting for getByRole('dialog', { name: 'Create a trip' }) to be detached`: after the calendar popover closed, the **second Escape did nothing**. Cause: `react-day-picker` runs with `autoFocus`, so focus lives inside the popover; when the popover unmounts the browser resets `document.activeElement` to `document.body`, which is **outside** the dialog element that owns `Modal`'s React `onKeyDown` — so Escape had no handler to reach and the traveller was stuck with a dialog only the mouse could close. jsdom hid this because my test fired `keyDown` directly on the dialog node, a target the real browser never produces. Fixed by returning focus to the calendar trigger on every keyboard close path (`closePopover()`), and the test was **strengthened to model the browser**: it now asserts focus is inside the dialog and fires the second Escape on `document.activeElement` rather than on a hand-picked node.

**D3 — The overlay was not covering the viewport (pre-existing, see D6).** Measured with `getBoundingClientRect` in a 1440×900 viewport: `1120×240 at (160, 80)`. Walking the ancestor chain found `DIV._routeTransition_*` with a computed `transform: matrix(1,0,0,1,0,0)` and `animationName: route-fade-in` — `AppLayout.module.css:199` uses `animation: … both`, so the keyframe's `transform` sticks forever and the element becomes a containing block for `position: fixed` descendants. `elementFromPoint(700, 25)` returned `DIV._headerInner_*` and `elementFromPoint(700, 800)` returned `MAIN._content_*`: the app header and the page below the dim were both **clickable through an `aria-modal="true"` dialog** (including **Logout**). After `createPortal(…, document.body)`: overlay `1440×900 at (0, 0)`, zero containing-block candidates, and both probe points return `DIV._overlay_*`. This equally affected the shipped `AddToTripDialog`, which uses the same `Modal` on pages inside the same transformed container.

**Live verification** (dev server + `page.route` stub of `GET /api/trips` + a seeded `tripplanner.auth` session, since no Postgres or Docker is available in this environment, so the real API cannot serve `/trips`). Identical results at **1440×900 and 390×844**: grid visible behind `true`, `body.overflow` `hidden` while open and `""` after, focus inside dialog on open `true`, dialog survives the calendar Escape `true`, typed name preserved (`"Rome in autumn"`), second Escape closes, focus restored to `New trip`, **console errors: none**.

**~~Deferred~~ RESOLVED in Task 7 — the calendar popover overflowed the viewport at 390 px.** Measured inside the dialog at 390 px: start-date popover right edge 447 (**57 px** past the viewport), end-date 606 (**216 px**). `DateField.module.css .popover` was `position: absolute; left: 0` with no collision detection or flip. It was not a regression — the box math is unchanged from the inline form, and it affected `EditTripForm` on the planner page identically — so it was booked as its own story. The user then hit it as a **blocking** bug (the days are physically off-screen, so no date can be picked and no trip can be created on a phone), which reopened this story; see D7 and D4 below. Fixing it in `DateField` repairs `EditTripForm` for free.

**D4 — The live browser found a second measurement defect, again invisible to jsdom.** The first Playwright run passed the inside-the-viewport assertion but the numbers were wrong: at 390 px the end-date popover landed at `left: 55`, right edge **389** — a 1 px gutter where the code asks for 8. Cause: the popover is measured in a layout effect that runs while `popIn` is animating, and that keyframe starts at `scale(0.98)`. `getBoundingClientRect()` reports the **transformed** box, so the width came back 327 instead of 334, the clamp computed a `maxLeft` 7 px too permissive, and the popover was pushed that far past its intended stop. The error scales with the popover's size, so a larger calendar or a stronger entry scale would push it clean off the edge. Fixed by taking the size from `offsetWidth`/`offsetHeight`, which report the untransformed layout box (position still comes from the control's rect, which carries no transform), with a fallback to the rect so jsdom — where `offsetWidth` is always 0 — still exercises the clamp. A unit test now pins it: the popover's rect reports the animated 327 while `offsetWidth` reports 334, and the assertion holds the full gutter.

**Live verification of Task 7** (same harness as before: dev server + `page.route` stub of `GET /api/trips` + a seeded `tripplanner.auth` session). Both calendars opened inside the create-trip dialog at **four** viewports, asserting the popover's whole box is inside the viewport and the **Create trip** button is fully on screen:

| Viewport | Start-date popover | End-date popover | Inside viewport | Create button on screen | Console errors |
| --- | --- | --- | --- | --- | --- |
| 390×844 (phone portrait) | 334×323 at (41, 502), right 375 | 334×323 at (48, 502), right **382** | yes | yes | none |
| 320×568 (small phone) | 304×323 at (8, 237) | 304×323 at (8, 237) | yes | yes | none |
| 844×390 (phone landscape) | 334×323 at (239, 59), bottom 382 | 334×323 at (428, 59), bottom 382 | yes | yes | none |
| 1440×900 (desktop) | 334×323 at (537, 530) | 334×323 at (726, 530) | yes | yes | none |

The end-date popover at 390 px — the worst case, previously 216 px off-screen — now stops exactly on the 8 px gutter (382 = 390 − 8). At 320 px both popovers clamp to the left gutter and the calendar itself narrows to 304 px via the 22.5 rem day-cell rule. At 844×390 the short viewport forces the clamp to the vertical gutter (bottom 382 = 390 − 8) and the popover overlaps its control, which is the correct trade when the viewport cannot hold both.

### Completion Notes

- **Create-trip is now a modal popup over the Trips page.** Clicking **New trip** (or **Create your first trip**) opens `CreateTripDialog` on the shared `Modal`; the boarding-pass grid or the empty state stays rendered behind it, and dismissing returns the traveller — and their keyboard focus — exactly where they were.
- **There was no create-trip *page* to remove.** Verified at `ff0beb1`: no `/trips/new` route exists. Create-trip was an inline panel that only *read* as a page because `TripsPage` hid the **New trip** button (`hasTrips && !creating`) and the whole empty state (`!creating`) around it. Both gates are gone, which is what makes the popup a popup rather than a floating card over a blank page. Hiding the opener would also have destroyed `Modal`'s own focus-restore target.
- **Form behaviour is a relocation, not a rewrite.** Same state, same `validateTripForm`, same `createTrip.mutate` payload, same `ApiError`-vs-generic error derivation, same field ids and labels. The wire request is byte-for-byte what shipped. Zero backend, DTO, endpoint, API-client, or hook change.
- **Two defects fixed that the request did not ask for, both of which would have made the popup wrong:**
  1. `DateField`'s Escape reached `Modal` instead of the calendar, so one Escape destroyed a half-filled form (D5); and once fixed, focus fell to `document.body` and left the dialog closeable only by mouse (Debug Log D2).
  2. `Modal`'s overlay was trapped inside the route-transition container's sticky animated `transform`, so it covered 1120×240 of a 1440×900 viewport and everything outside that box — the header's **Logout** included — stayed clickable behind an `aria-modal` dialog (D6 / Debug Log D3). Fixed with a portal to `document.body`; this also repairs the shipped `AddToTripDialog`.
- **Reopened from `review` and fixed: the calendar was unusable on a phone (AC 14).** The story had knowingly deferred this as pre-existing; the user hit it as a blocker — the popover ran up to 216 px past the right edge of a 390 px screen, so the days were physically off-screen and no trip could be created. `DateField` now positions the popover against the **viewport** instead of its own field: `position: fixed`, `top`/`left` computed from the control's rect, clamped into the viewport with an 8 px gutter, flipped above the control when there is no room below, and recomputed on `resize` and capture-phase `scroll` (D7). Because the fix lives in `DateField`, `EditTripForm` on the planner page is repaired by the same change. The dialog itself also now scrolls rather than clipping on a viewport too short to hold it, so **Cancel**/**Create trip** can never sit off-screen.
- **The live browser again caught what jsdom could not** — for the second time in this story. The popover was being measured mid-entry-animation, and `getBoundingClientRect()` reports the *transformed* box, so `scale(0.98)` silently ate 7 px of the 8 px gutter. Switched to `offsetWidth`/`offsetHeight` and pinned it with a unit test that reproduces the animated-vs-layout size split (Debug Log D4).
- **Noted for review:** the `Modal` portal change is a **shared-component** fix reaching beyond this story's surface (it also affects `AddToTripDialog` on Search and Destination Details). Its unit tests pass unchanged, but a reviewer may want to eyeball those two dialogs live. Also carried forward: the 390 px calendar-popover overflow documented above, and the nested `role="dialog"` (calendar inside modal), which is pre-existing and only matters as a test-selector hazard.

## File List

| File | Change |
| --- | --- |
| `FE/src/features/trips/CreateTripDialog.tsx` | **Added** — create-trip form on the shared `Modal`, with in-flight dismissal guard. |
| `FE/src/features/trips/CreateTripForm.tsx` | **Deleted** — replaced by `CreateTripDialog`; had a single consumer. |
| `FE/src/features/trips/TripsPage.tsx` | Renders the dialog as an overlay sibling; both `!creating` self-hiding gates and the `hasTrips &&` gate on **New trip** removed. |
| `FE/src/features/trips/TripForm.module.css` | Added the additive `.fields` layout class (Debug Log D1); every existing rule untouched. |
| `FE/src/features/trips/DateField.tsx` | Escape while the calendar is open is consumed locally (`stopPropagation`) and returns focus to the trigger; day-pick closes through the same path. **Task 7:** the popover is positioned against the viewport in a layout effect — clamped `top`/`left` with flip-above, measured via `offsetWidth`/`offsetHeight`, recomputed on `resize`/`scroll`. |
| `FE/src/features/trips/DateField.module.css` | **Task 7:** `.popover` is `position: fixed` with `max-width`/`max-height`/`overflow-y`; the `max-width: 32rem` centring hack is replaced by a 22.5 rem rule that shrinks the day cells so the calendar fits a 320 px phone. |
| `FE/src/shared/ui/Dialog.module.css` | **Task 7:** overlay scrolls (`overflow-y: auto`) and the dialog takes `margin: auto`, so a dialog taller than the viewport stays fully reachable. Shared with `AddToTripDialog`. |
| `FE/src/shared/ui/Modal.tsx` | Renders through `createPortal(…, document.body)` so the fixed overlay escapes the route container's sticky animated transform (D6). |
| `FE/src/features/trips/TripsPage.test.tsx` | +7 tests: dialog identity/portal, grid visible behind, New trip with zero trips, Cancel and Escape dismissal, in-flight lock, calendar-Escape isolation. |
| `FE/src/features/trips/DateField.test.tsx` | +3 tests: Escape consumed while open (with focus return), Escape passes through while closed, focus return after a day is picked. **Task 7:** +4 positioning tests — narrow-viewport clamp, flip-above, untransformed measurement, reposition on resize. |
| `_bmad-output/implementation-artifacts/archive/5-21-create-trip-dialog.md` | **Added** — this story. |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Registered `5-21-create-trip-dialog` and its status transitions. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-07-26 | Story created from the user's request to turn create-trip into a popup. |
| 2026-07-26 | Implemented: `CreateTripDialog` on the shared `Modal`, `CreateTripForm` deleted, `TripsPage` self-hiding gates removed. |
| 2026-07-26 | Fixed the `DateField`/`Modal` Escape collision plus the focus-loss the live browser exposed (AC 11). |
| 2026-07-26 | Fixed the pre-existing `Modal` overlay containing-block bug via a portal to `document.body` (AC 12, D6) — also repairs `AddToTripDialog`. |
| 2026-07-26 | Validation: FE 331/331 across 28 files, lint at the 2 pre-existing warnings, build green, live checks at 1440×900 and 390×844. Status → review. |
| 2026-07-26 | Reopened from review on the user's bug report: the calendar popover is cut off on a small screen, blocking trip creation. Added AC 14 + Task 7 (D7). |
| 2026-07-26 | Fixed: viewport-aware `DateField` popover positioning (fixed position, clamped with flip-above, recomputed on resize/scroll) plus a scrollable dialog on short viewports — also repairs `EditTripForm`. |
| 2026-07-26 | Fixed the animated-transform measurement error the live browser exposed (D4): size now read from `offsetWidth`/`offsetHeight`. |
| 2026-07-26 | Validation: FE 335/335 across 28 files (+4), lint at the 2 pre-existing warnings, build green, live checks at 390×844, 320×568, 844×390 and 1440×900 — all popovers inside the viewport, zero console errors. Status → review. |
