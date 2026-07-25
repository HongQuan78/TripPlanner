# Validation Report — Landing pass (pass 3)

> **Superseded in part.** After this gate ran, the user cut the modal search overlay and the chosen-destination bar in favour of the shipped one-bar-plus-dropdown architecture. Findings **C1, H1, H2, H6 and H7** below, plus accessibility **M2** and **M4**, addressed the overlay design and are now moot — the surfaces they concerned do not exist. They are retained as the record of why that design was abandoned rather than deleted. Every other finding still stands and remains applied. See `.memlog.md` § "Pass 3b" and the note at the end of this file.

Run: `ux-tripplanner-2026-07-15` · Date: 2026-07-25 · Intent: Update
Scope: the pass-3 landing deltas only. Auth sections were unchanged and not re-reviewed.

Lenses run: **rubric walker** + **accessibility**.
Prior gates on this run: pass 1 ran rubric + accessibility (all findings applied); pass 2 ran rubric only (all findings applied).

## Totals

| Severity | Rubric | Accessibility | Total | Resolved |
|---|---|---|---|---|
| Critical | 0 | 1 | **1** | 1 |
| High | 3 | 4 | **7** | 7 |
| Medium | 6 | 4 | **10** | 10 |
| Low | 4 | 2 | **6** | 6 |
| **Total** | **13** | **11** | **24** | **24** |

All 24 findings were resolved in the spines before finalization. No finding was deferred or accepted-as-is.

## The critical one

**The `role="search"` landmark was being destroyed.** Today's hero holds `<form role="search">`. Replacing it with a trigger button plus a dialog — as this pass does — would have left the landing page with **no search landmark on the search page**, making the product's primary feature undiscoverable by landmark navigation. The `/` shortcut does not mitigate this; it is invisible to assistive technology.

Resolved: a `role="search"` container with an accessible name wraps the trigger and is present in both body states. It is explicitly forbidden from the dialog, since landmarks inside an `aria-modal` dialog do not appear in the page's landmark list.

## The high findings, and what each changed

1. **Trigger and chosen-destination bar both claimed the committed destination.** The spine said the trigger's label switches to the committed place name *and* said the bar is the single surface representing it. → Trigger label is now permanently "Search a city…"; it is a door, not a display.
2. **The two-state body model had an uncovered third state.** A bare submit matching nothing would have produced a page with the pre-search body gone, nothing committed, and an error line. → The overlay no longer closes on a fruitless submit; the page-level no-matches state is deleted.
3. **Committing was specified as re-searching by name.** That is a wasted round-trip that can resolve to a *different* top result than the one the user picked — rebuilding the exact bug class this pass exists to kill. → Committing uses the resolved `LocationSearchResult` directly and issues no second location-search request.
4. **Tile-label contrast was overstated by ~1.4:1.** Claimed ≥7.4:1; recomputed at ≈6.03:1 against the lightest stop any tile recipe reaches. → Figure corrected, the computation stop named, and lighter tile stops forbidden.
5. **The how-it-works numeral was declared WCAG-"exempt".** No such exemption exists — `aria-hidden` helps screen-reader users while making sighted low-vision readers strictly worse off. → Numeral moved from `{colors.outline-variant}` (1.62:1) to `{colors.outline}` (4.27:1 on background, large-text floor 3:1); the exemption claim deleted.
6. **The overlay clear button was specified below the touch-target floor.** 28px glyph against the spine's own ≥44px rule. → Hit area must reach 44px whatever the glyph size, matching the auth password-toggle allowance.
7. **Focus trap vs `aria-activedescendant` ownership hazard.** Trapping focus by moving it onto list items would silently destroy the combobox contract the shipped surface already satisfies. → DOM focus stays on the field for the dialog's whole lifetime; the trap constrains Tab among field, clear, and submit only.

## Medium and low, in brief

Resolved: gradient tokens rewritten as valid `color-mix` stops (they previously conflated opacity with stop position and were unparseable); `hero-band-inset` dropped as a duplicate of `{spacing.7}`; a "Clear" action added to Recent searches, since the row discloses browsing history and had no removal path; background inertness given a concrete mechanism (`inert` or `aria-hidden`, never on a dialog ancestor); commit made to announce deterministically by returning focus to the bar as a named region, replacing an asserted mechanism that would not have fired; `/` shortcut guarded against IME composition — material here, since the product's own primary example destinations are Vietnamese; reduced-motion applied to rail focus-scrolling; a visually hidden keyboard description added to the overlay field; retired components (`Location result list`) distinguished in prose from dormant ones (`Suggestion dropdown`, `Suggestion chip`); defect-table line references anchored to symbol names; `shadows.xl`'s "exactly one use" softened; the step numeral clarified as borrowing a heading *scale* only; the how-it-works third beat cited to story 3-6 and the drag-and-drop tests; landing/home naming swept.

## Standing risk, recorded not resolved

**Gradient stand-ins were blessed as shippable at the user's explicit direction**, after the facilitator flagged that this is the same permission pass 2 granted and that pass 2's outcome — photography never shipped, home still reads as plain — is precisely why pass 3 exists. Mitigation applied: the gradient is specified as a designed deliverable with a committed recipe (`{gradients.hero-stand-in}`) rather than a placeholder, so "gradients forever" is an acceptable outcome rather than a permanent regression. The 7-asset photography budget (1 hero + 6 tiles) remains unfunded and `FE/src/assets` still does not exist.

## Open items carried forward

- Photography assets unsourced; `FE/src/assets` must be created by the implementation story whether or not real images land.
- The shipped `searchState.ts` persists `input`, `submittedQuery`, and `selected` as three independently settable fields — the drift that allowed defects 2 and 3. The committed state is one fact and the restore contract should carry that fact, not three strings that can disagree. Flagged in the spine; the refactor is an implementation-story decision.
- `AppLayout` still renders the wordmark as "TripPlanner" (one word) against the spine's committed "Trip Planner". Carried over unresolved from pass 2.

## Postscript — the overlay was cut after this gate

The reviewer gate found seven separate problems that existed *only* because the search field had been moved into a modal: a destroyed search landmark, a trigger and a summary row both claiming to display the chosen city, an uncovered third body state, a sub-44px control inside the dialog, and a focus-trap-versus-`aria-activedescendant` hazard. All seven were resolved in the spines, and then the user cut the overlay entirely — which removed them at the root instead.

That is worth recording as a lesson rather than an embarrassment: **the volume of accessibility obligation a design generates is a signal about the design.** Seven findings clustered on one mechanism, and the mechanism turned out to be unnecessary. Reverting to the shipped bar-and-dropdown deleted the entire dialog obligation set (focus trapping, focus restoration, background inertness, scroll locking) rather than requiring it to be implemented correctly, and restored the `role="search"` landmark for free by simply leaving the bar as a form.

What survived the reversal, and still stands: the Framed Editorial hero composition, the gradient stand-in recipe, the tile rail, recent searches with its Clear action, the how-it-works band, every card decision, and every contrast correction — including the overstated tile ratio (H4) and the bogus numeral exemption (H5). The three shipped defects in `SearchPage.tsx` remain the substance of the implementation work, and are now more central than before, since this pass keeps the component rather than replacing it.
