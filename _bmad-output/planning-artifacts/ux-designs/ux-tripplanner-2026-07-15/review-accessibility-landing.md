# Accessibility Review — Landing pass (pass 3)

Scope: the pass-3 net-new interaction surfaces — search trigger, search overlay (the product's first modal), destination tile rail, recent-search chips, chosen-destination bar, how-it-works band. Reviewed against WCAG 2.2 AA and the ARIA APG combobox and dialog patterns.

Counts: **1 critical / 4 high / 4 medium / 2 low**

Context that raises the stakes: the shipped `SearchPage` combobox **currently passes**. Every finding below is a way this redesign could take a working surface backwards.

---

## CRITICAL

### C1 — The `role="search"` landmark is destroyed

Today the hero holds `<form role="search">` (`SearchPage.tsx:170`), giving screen-reader users a search landmark to jump to on the landing page.

Pass 3 replaces that form with a `<button>` trigger and moves the field into a dialog that only exists after activation. Nothing in either spine restores the landmark. Result: a user navigating by landmarks finds **no search on the search page**, and cannot discover the feature without tabbing the hero. The `/` shortcut does not help — it is undiscoverable by assistive tech and the spine correctly says it must never be the only way in.

**Required:** the trigger sits inside a container carrying `role="search"` with an accessible name, present in the pre-search and committed states alike. The dialog does **not** carry the landmark — landmarks inside `aria-modal` dialogs are not reachable from the page's landmark list.

---

## HIGH

### H1 — Tile-label contrast is overstated by roughly 1.4:1

`DESIGN.md` Colors claims tile labels reach *"≥7.4:1 even composited over the lightest token stop (`{colors.surface-container-low}`)"*.

Recomputed: `{colors.on-surface}` (#0b1c30) at 66% over the lightest stop actually used in the tile recipes (#e5eeff, `{colors.surface-container}`) composites to approximately #55637 6 — white against which yields **≈6.0:1**, not ≥7.4:1.

It still passes AA for both normal and large text, so this is a documentation defect rather than a contrast failure — but a spine that overstates a verified ratio cannot be trusted for the ratios that *are* marginal.

**Required:** correct the figure to ≥6.0:1 and name the exact stop it was computed against.

### H2 — The how-it-works numeral is declared "exempt by design"; no such exemption exists

`DESIGN.md` Colors states the ordinal at `{colors.outline-variant}` computes to 1.62:1 and is *"exempt by design"* because it is decorative and `aria-hidden`.

Hiding text from assistive technology does not exempt it from 1.4.3 — sighted users with low vision still have to read it, and `aria-hidden` makes their situation strictly worse, not better. The redundancy argument (DOM order carries sequence) is a reason the numeral is *low stakes*, not a reason it is exempt.

**Required:** darken the numeral to `{colors.outline}` (#717786). At `{typography.headline-md}`'s 24px/600 it qualifies as large text, floor 3:1, and `{colors.outline}` clears it comfortably on both white and `{colors.background}`. Delete the exemption claim.

### H3 — The overlay's clear button is specified below the touch-target floor

`DESIGN.md` `components.search-overlay` describes a `{rounded.full}` clear button; the rendered direction sizes it at 1.75rem (28px). The spine's own Accessibility Floor mandates *"Touch targets ≥ 44px"*.

**Required:** the clear control's hit area reaches 44px regardless of its visual glyph size — the same allowance already granted to the password-visibility toggle on auth. State it explicitly, since a 28px pill inside a 3.5rem field reads as "done" to an implementer.

### H4 — Moving the combobox into a dialog creates an `aria-activedescendant` ownership hazard the spine does not address

The spine correctly requires focus be **trapped** in the dialog and correctly requires options **not** be tab stops, driven by `aria-activedescendant`. Those two requirements interact: a focus trap implemented by cycling `tabindex` or by focusing list items will break `aria-activedescendant`, because DOM focus must remain on the field while the active option is merely referenced.

**Required:** state that DOM focus stays on the overlay field for the dialog's whole lifetime; the trap constrains Tab among field, clear, and submit only, and never moves focus onto an option.

---

## MEDIUM

### M1 — Reduced-motion is not addressed for the tile rail

The rail uses `scroll-snap` and requires tiles be *"scrolled into view on focus"*. Smooth programmatic scrolling is motion, and the spine's global `prefers-reduced-motion` rule is stated only for entrances and hovers.

**Required:** focus-scrolling uses instant positioning under `prefers-reduced-motion`. Snap itself is fine — it is a layout constraint, not an animation.

### M2 — Scrim click as a dismissal has no keyboard equivalent stated, and "content behind is inert" needs a mechanism

Escape covers keyboard dismissal, so the gap is narrow — but the spine's *"content behind the scrim inert to pointer and assistive tech"* names an outcome without naming how. `aria-modal="true"` alone is not reliably honored for hiding background content across the screen-reader matrix.

**Required:** pair `aria-modal="true"` with either the `inert` attribute on the background container or `aria-hidden` applied to page content while open — and note that whichever is chosen must never be applied to an ancestor of the dialog itself.

### M3 — Committing a destination announces nothing deterministic

The spine says the "Attractions near {name}" heading plus the existing hidden count region *"already carry it"* and warns against a second live region. But the heading is not a live region: inserting it announces nothing. On commit, focus returns to the trigger, and a screen-reader user hears only the trigger's name again — with no confirmation that a destination was set or that a grid is loading below.

**Required:** either return focus to the chosen-destination bar (making it a focusable region whose name states the committed place), or add one `aria-live="polite"` announcement on commit. Pick one; the current text asserts a mechanism that does not fire.

### M4 — The `/` shortcut needs an escape hatch beyond input fields

The guard covers input, textarea, and contenteditable. It does not cover the case of a user whose keyboard layout or IME produces `/` as part of a composition sequence — relevant here, since the product's primary example destinations are Vietnamese and Vietnamese input methods are composition-based.

**Required:** ignore the shortcut during IME composition (`event.isComposing`), not only when focus is in a field.

---

## LOW

- **L1** — The overlay footer's key legend is `aria-hidden`, which is right, but it means keyboard affordances are announced nowhere. Consider a visually hidden sentence describing arrow/enter/escape on the field's description.
- **L2** — "Recent searches" discloses browsing history visually with no clearing affordance (also raised as rubric M3). Worth treating as an accessibility-adjacent privacy concern on shared or assistive-tech-configured machines.
