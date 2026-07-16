# UX Design Validation Report — Trip Planner — Horizon (home update)

- **DESIGN.md**: `_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-15/DESIGN.md`
- **EXPERIENCE.md**: `_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-15/EXPERIENCE.md`
- **Run**: 2026-07-15

## Overall verdict

The home/search extension grafts cleanly onto the auth spine: the token layer resolves end to end, every hex is real production CSS (verified against `FE/src/index.css`), the contrast table covers the new load-bearing combinations, and every behavioral contract marked "kept" matches the shipped code line for line. The pair is consumable as a contract with one genuine coverage hole — the location result list had behavior but no visual spec anywhere — plus a small cluster of medium ambiguities around controls that now sit on photography. Nothing found was structural; all findings were patchable in place — and all 11 findings (0 critical / 1 high / 4 medium / 6 low) plus the mechanical pair-title note have since been resolved in the spines before finalize. Every finding below carries its resolution.

This update's reviewer gate ran a single lens: the rubric walker (`review-rubric-home-update.md`; the accessibility lens was declined by user decision for this update). The prior auth-run gate — the original rubric review (`review-rubric.md`: assumption-tag cleanup, Login validation contract, motion/shadow token promotion, inline import link and precedence rule) and the WCAG 2.2 AA accessibility review (`review-accessibility.md`: placeholder and pending-button contrast, the ≥65% hero-gradient floor, live-region and toggle-signal corrections) — was fully applied to the spines at the auth finalize step. Those reviews are summarized here as the prior gate, not re-adjudicated.

## Category verdicts

1. Flow coverage — **strong**
2. Token completeness — **strong**
3. Component coverage — **adequate**
4. State coverage — **strong**
5. Visual reference coverage — **strong**
6. Bloat & overspecification — **adequate**
7. Inheritance discipline — **strong**
8. Shape fit — **strong**

## Findings by severity

Counts: Critical 0 · High 1 · Medium 4 · Low 6. All 11 findings resolved in the spines before finalize.

### Critical (0)

None.

### High (1)

- **[Component coverage] Location result list had a behavioral row but no visual spec anywhere in DESIGN** (DESIGN.md Components; EXPERIENCE.md Component Patterns). The result buttons (rest/selected fill for the `aria-pressed` state, country/type pills, partial-match note) sit directly beneath the new hero band; a consumer restyling this page had nothing to build them from and no license to leave them alone.
  **Resolution:** A full DESIGN Components bullet was added — "Existing production styles preserved; restated here so the buttons directly beneath the band have a spec" — covering the centered 32rem column of full-width `{rounded.md}` toggle buttons on `{colors.surface-container-lowest}` with a 1px `{colors.outline-variant}` border, name/pill/partial-match typography, hover (`{shadows.sm}` plus a `{colors.primary}` border), and the selected `aria-pressed` treatment (primary border on a `{colors.surface-container-low}` fill).

### Medium (4)

- **[Token completeness] Clear button in the hero band had no committed appearance or contrast strategy** (DESIGN.md Components → Hero search; `FE/src/pages/SearchPage.module.css:79–101`). The shipped transparent primary-blue ghost would float bare on arbitrary photography — the one band element outside the ink-scrim/solid-white rule DESIGN's own Do's and Don'ts enforce; the spine committed only its typography, not its fill.
  **Resolution:** Committed as a decision: the Clear button drops its transparent ghost inside the band and takes a solid `{colors.surface-container-lowest}` fill behind its `{colors.primary}` 1px border and text (6.73:1 on white), hover → `{colors.surface-container-low}` — a documented divergence from the shipped ghost, forced by the text-over-photography rule.
- **[Token completeness] Disabled Search button had three contradictory treatments (token, prose, shipped code)** (DESIGN.md frontmatter `button-primary` / Components; `FE/src/pages/SearchPage.module.css:74`). EXPERIENCE keeps "Search stays disabled while the input is empty"; the `background-disabled` token said `{colors.disabled}` with `{colors.on-primary}` text (the 1.70:1 combination the Components prose itself calls unreadable); shipped code uses 50% opacity on the primary fill — and this is the resting state of the pre-search hero.
  **Resolution:** The shipped 50%-opacity primary fill is now the committed treatment in the Hero search bullet ("the shipped treatment, now the committed one — never the `{colors.disabled}` gray wash"); the `button-primary.background-disabled` token was updated to match, and `{colors.disabled}` is explicitly reserved for inert chrome elsewhere.
- **[Component coverage] Suggestion dropdown had a full behavioral row but only "unchanged, on white" in DESIGN** (DESIGN.md Components; EXPERIENCE.md Component Patterns → Suggestion dropdown). No option-row anatomy, no active-option highlight color; "unchanged" was an implicit spec decision while every neighboring band element was respecified.
  **Resolution:** A dedicated DESIGN Components bullet now states "Preserved as shipped; restated here so the contract is explicit" with the full anatomy: `{colors.surface-container-lowest}` panel, 1px `{colors.outline-variant}` border, `{rounded.lg}`, `{shadows.lg}`, option-row typography (semibold name, country-code/type pills), and the hovered/keyboard-active fill (`{colors.surface-container-low}`).
- **[Component coverage] Heritage chip had a DESIGN row but no behavioral row and no committed label copy** (EXPERIENCE.md Component Patterns; `FE/src/components/AttractionCard.tsx:42`). Neither spine stated what the chip says ("heritage"? "UNESCO"?) or how it is announced inside the card link — the rating badge received exactly this treatment.
  **Resolution:** Label committed as the shipped lowercase word "heritage" in a new EXPERIENCE Component Patterns row, with the same single-announcement rule as the rating badge: exposed once as part of the card link's text, no duplicate `aria-label`.

### Low (6)

- **[Flow coverage] Flow 4 step 6 compressed the register→verify→login return without committing the route, and claimed an unrestorable hover state** (EXPERIENCE.md Flow 4 step 6). The add-to-trip redirect carries `returnTo`, but login-after-verify starts from `/verify-email` with no `returnTo` and lands on `/trips`; the step also claimed "the heritage card still lifted under her pointer."
  **Resolution:** Step 6 now commits both roads explicitly — `returnTo` drops an existing account straight back on the page; the register/verify detour ends on `/trips` with one tap on the header wordmark returning to home, where the session store restores the page exactly as left. The hover-persistence image was dropped.
- **[Flow coverage] Suggestion chips — the only net-new interactive element on home — were seen but never activated in any flow** (EXPERIENCE.md Key Flows).
  **Resolution:** A variant line was added to Flow 4 step 2: "Had a chip named her daydream — say Đà Nẵng — one tap would have collapsed this step and the next into a single gesture: chips pre-fill and submit at once."
- **[Token completeness] Literal "shadow-sm" instead of `{shadows.sm}` in the auth-card bullet** (DESIGN.md Components → Auth card).
  **Resolution:** Replaced with `{shadows.sm}`; no literal shadow names remain in either spine.
- **[Component coverage] Rating badge's placeholder-case behavior lived only in the visual file** (DESIGN.md Components → Rating badge; EXPERIENCE.md Component Patterns). EXPERIENCE said the badge "floats on the image" while DESIGN said "rendered over image and placeholder alike."
  **Resolution:** "Rendered over image and placeholder alike" is now mirrored into the EXPERIENCE rating-badge row.
- **[State coverage] Typed-but-unsubmitted pre-search state: dropdown/chip-row stacking uncommitted** (EXPERIENCE.md Component Patterns → Suggestion chip / Suggestion dropdown). Chips remain visible until a query is submitted while the dropdown opens directly above them inside the band.
  **Resolution:** Committed in the dropdown row: on the pre-search band the open dropdown overlays the suggestion chip row (absolutely positioned above the page flow); chips neither hide nor reflow while the user types.
- **[Bloat & overspecification] Flow 4's closing prose carried editorial voice and an unimplementable hover beat** (EXPERIENCE.md Flow 4 step 6). "Turned a daydream into an itinerary's first entry" plus the hover-persistence image.
  **Resolution:** The climax was trimmed to the observable contract — either road ends in the same restored state ("hoi" resolved, Hoi An selected, the same grid waiting), with the add-to-trip row one tap away.

## Prior gate (auth run, findings applied at auth finalize)

- **`review-rubric.md`** — judged the auth pair "a disciplined, near-contract-ready pair" with two blockers to clean source-extraction: eleven residual [ASSUMPTION] tags and a missing Login client-side validation contract, plus motion/shadow tokens living only in prose, no numeric contrast targets, a missing password-helper DESIGN entry, and no inline import link or spines-win-on-conflict rule. All applied at auth finalize: tags stripped with rationale kept as plain decisions, the Login validation contract committed, `shadows`/`motion` promoted to frontmatter, contrast ratios stated, import linked inline with precedence declared.
- **`review-accessibility.md`** (WCAG 2.2 AA) — three highs (outline-variant placeholders at 1.70:1; the pending button label rendered in an exempt-but-unreadable disabled style with no live-region announcement; a hero gradient whose 80%→0 ramp could not protect the 18px body line) plus mediums on the double-signaling password toggle, the "decorative" hero copy claim, the non-persistent verify live region, input-border boundary contrast, and the all-net-new ARIA commitments. All applied at auth finalize: placeholders dropped, pending state keeps the full primary fill with an announced label swap, the ≥65%-through-copy gradient floor committed (now reused verbatim by the home hero band), single-signal toggle (changing name, no `aria-pressed`), `aria-hidden` hero copy, persistent `role="status"` container. The accessibility lens was declined for this home update; the home-update rubric verified the new load-bearing contrast combinations numerically in its stead.

## Mechanical notes

- Pair-title drift (DESIGN "Trip Planner — Horizon" vs EXPERIENCE "Trip Planner Auth + Home — Horizon") — **resolved:** both frontmatter names now read "Trip Planner — Horizon".
- DESIGN frontmatter extends the base spec keys with `status`, `updated`, `shadows`, and `motion` — a ratified memlog decision; all `{shadows.*}`/`{motion.*}` references resolve.
- Kept-contract verification against shipped code, all confirmed true: 300ms debounce / min 2 chars / max 5 suggestions / mousedown choose / Escape per-query dismissal / suppression rules, `aria-pressed` result buttons and partial-match note, "Rated N of 3" label, 40ms stagger + `ease-spring`, 4 skeletons + "Loading attractions…", disabled-empty Search, add-to-trip `returnTo` redirect, layout widths, and every frontmatter hex/radius/shadow/motion value against `FE/src/index.css`.
- The attraction payload contract in EXPERIENCE (xid, name, kinds, rating, imageUrl, distanceMeters) matches `FE/src/api/types.ts:21–28` exactly.
- Post-review memlog notes carried forward for implementation: mock chip cities are illustrative only (the curated list is an implementation-story constant); shipped AppLayout header renders "TripPlanner" one word vs the spine's "Trip Planner" — needs fixing at implementation; attraction loading/error/empty and country-notice states stay spine-only as preservation contracts, not new builds.

## Reviewer files

- `review-rubric-home-update.md` — rubric walker, this update's gate (0 critical / 1 high / 4 medium / 6 low; all resolved)
- `review-rubric.md` — rubric walker, prior auth gate (applied at auth finalize)
- `review-accessibility.md` — WCAG 2.2 AA accessibility lens, prior auth gate (applied at auth finalize)
