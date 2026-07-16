# Accessibility Review — Trip Planner Trips & Detail

## Overall verdict

This is a strong, contrast-literate spine: every load-bearing color pairing in `DESIGN.md.Colors` carries a stated ratio, the numbers I re-derived hold (on-secondary-container/secondary-container = 4.58:1 checks out), and the pair makes two genuinely good a11y calls — rejecting the mock's blanket 82%-opacity dimming and refusing `{colors.outline}` for label text, both of which would have dragged strings under the AA floor. Status is conveyed by a word (`Upcoming`/`Ongoing`/`Past`), the pass is a single clean link with no nested targets, and singularization/units are handled. The gaps are behavioral, not chromatic: post-removal focus return is underspecified, the inline removal error has no committed live region, and the "today" node leans on color with no text equivalent — none catastrophic, all fixable inside the spine.

## Findings

### High

- **[high]** Post-removal focus return is underspecified — the spine says focus "returns to a sensible anchor on close" (`EXPERIENCE.md.Accessibility Floor`, Remove bullet; `Component Patterns` → Remove button), but on a *successful* removal the triggering Remove button and its row are destroyed, so there is no element to return to and focus can silently drop to `<body>` (WCAG 2.4.3 Focus Order). *Fix:* name a deterministic post-delete target in the spine — the parent day-segment `<h2>` or that day's "＋ Add destination" button — distinct from the cancel/dismiss case where focus does return to the Remove button.
- **[high]** The inline removal-failure error line has no stated live-region semantics — `State Patterns` ("a failed removal surfaces the kept `{components.banner-error}` line above the rail") and `EXPERIENCE.md.Accessibility Floor` never commit `role="alert"`/`aria-live` for it, so a keyboard/SR user who confirms a removal that then fails may get no announcement (WCAG 4.1.3 Status Messages). The parent Horizon spine already requires `role="alert"` on `banner-error`; this pair should restate it. *Fix:* commit `role="alert"` on the detail-page removal-error banner in the Accessibility Floor.

### Medium

- **[medium]** The "today" node is effectively color-only — it is distinguished on the rail solely by a solid `{colors.primary}` fill + `{colors.surface-container-high}` halo versus the empty ring (`DESIGN.md.Components` → Day segment; `Colors` → Segment date & rail node), the node is `aria-hidden`, and the day `<h2>` carries only the calendar date, not the word "Today." `EXPERIENCE.md` claims it is "announced via its date heading," but the heading announces a date, not tense, so no assistive-tech user and no low-vision user gets an explicit "today" signal (WCAG 1.4.1 Use of Color; 1.3.1). The ticket's `Ongoing · Day k` text mitigates but does not mark *which* segment. *Fix:* add a small visible "Today" marker on the current segment and fold "Today" into that segment's heading accessible name.
- **[medium]** The pass route line announces as a bare date pair — the `✈` connector is correctly `aria-hidden`, but the two dates are separate text nodes with no joining word, so the composed link name reads "…12 Aug 16 Aug…" rather than the "12 Aug to 16 Aug" shown in `EXPERIENCE.md.Component Patterns`; a range reads as two loose dates (WCAG 1.3.1). *Fix:* emit a visually-hidden "to"/"–" between the dates, or use the shipped `formatDateRange` string as the link text so the range relationship survives.
- **[medium]** Target sizes are committed at 44px in the spine but the reference mock renders the Remove button at roughly 21px tall and the add-destination button at roughly 25px — Remove is below even the 24px AA floor (WCAG 2.5.8), and the compact `padding:9px 12px` destination row makes a true 44px control non-trivial. The spine wins, but the commitment and the layout are in tension. *Fix:* keep the 44px goal, hold a hard ≥24px AA floor on Remove and add-day via padding, and verify it survives the narrow-viewport control-wrapping described in `DESIGN.md.Layout & Spacing`.
- **[medium]** The mock (`mockups/key-trips-and-detail.html`) still contains three sub-AA treatments the spine explicitly overrides — `.st-past` using `{colors.outline}` (3.84:1), `.stub`/`.tkStat` labels using `{colors.outline}` (4.07:1), and `opacity:.82` on the past pass (line 135). The spine corrects all three (`Colors`; `.memlog.md` decisions), but an implementer building from the mock rather than the spine would ship three AA failures. *Fix:* annotate the mock as non-authoritative for these three, or align it to the spine tokens so it can't seed a regression.

### Low

- **[low]** The pass name (`{typography.card-name}`) and the route dates have no explicitly stated ratio in `DESIGN.md.Colors` — they are load-bearing text and evidently `{colors.on-surface}` on white (17.17:1, well clear), but every other combo is stated, so completeness argues for listing them. *Fix:* add the ink-on-white pass-name/route-date row to Colors.
- **[low]** The `·` middot separator in "Ongoing · Day 3" and "Tue · Aug 12" is read inconsistently by screen readers (often dropped, sometimes "middle dot"). *Fix:* rely on the surrounding words to carry meaning, or substitute a comma/visually-hidden separator if testing shows an odd read.
- **[low]** The attraction-name link inside a destination row is inline text (~20px tall); it is arguably exempt from 2.5.8 as an inline target, but the spine asserts it "meets 44px," which an inline link does not without layout change. *Fix:* either claim the inline exemption explicitly or give the link block padding to the floor.
- **[low]** After add/remove, the ticket's unplanned hint and the segment count pill recompute (Flow 2 climax) but sit in no live region — acceptable as a user-initiated visible change, though a `aria-live="polite"` on the unplanned hint would make the "2 → 1 days unplanned" tick perceivable non-visually. *Fix:* optional polite live region on the unplanned hint only (avoid over-announcing).

## Handled well

- Status tense is a **word**, never hue alone — `Upcoming`/`Ongoing · Day k`/`Past` satisfy 1.4.1 at the pass level.
- The pass is a **single `<a>` with no nested interactives**; the composed accessible name is in sensible, non-duplicated reading order (name → status → dates → stats), and decorative glyphs/spine/node are `aria-hidden`.
- **Rejecting the mock's blanket 82% opacity** on past passes and the `{colors.outline}` label color — both documented as deliberate AA-preserving divergences (`.memlog.md`, `Colors`). This is exactly the right instinct.
- Correct **singularization and explicit units** ("1 day"/"1 place"), and counts announced once as part of the link text.
- **Skeletons `aria-hidden`** behind visually-hidden "Loading…" live text, inherited cleanly.
- **Heading outline preserved** — single `<h1>` per surface, day dates as `<h2>`, no competing ticket heading.
- Remove keeps its explicit `aria-label="Remove {name}"` and a focus-trapped `ConfirmDialog`; add-day carries a self-sufficient day-scoped label; star rating keeps "Rated N of 3."
- **Reduced motion** collapses via the global `index.css` rule; every stated pairing is verified and the two mock divergences are corrected to ≥4.5:1.
