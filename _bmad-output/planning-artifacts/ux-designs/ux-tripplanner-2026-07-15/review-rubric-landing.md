# Rubric Walker — Landing pass (pass 3)

Scope: the pass-3 deltas to `DESIGN.md` and `EXPERIENCE.md` — framed editorial hero band, search trigger, search overlay, destination tile rail, recent searches, how-it-works band, chosen-destination collapse, and the Required Defect Fixes section. Auth sections were not re-reviewed; they were unchanged by this pass.

Counts: **0 critical / 3 high / 6 medium / 4 low**

---

## HIGH

### H1 — The trigger and the chosen-destination bar both claim to own the committed destination

`EXPERIENCE.md` Component Patterns → Search trigger states: *"Once a destination is committed the trigger's label shows the committed place name instead of the prompt."*

The same document's Chosen-destination bar row states it is *"the single surface that represents a committed destination."*

Both cannot be true. The committed place name would render twice, roughly 100px apart, and the spine's own justification for the collapse — one fact, one surface — is contradicted on the page that demonstrates it. Worse, it reintroduces in miniature exactly the redundancy this pass removed.

**Resolution:** the trigger keeps `"Search a city…"` permanently. It is a door, not a display. The bar owns the committed fact.

### H2 — The two-state body table does not cover a submitted query that matched nothing

`EXPERIENCE.md` Information Architecture asserts *"exactly two mutually exclusive body states"* (pre-search | committed) and *"There is no third state."*

But Interaction Primitives says the overlay *"closes on … submit"*, and State Patterns retains a page-level `No matches` row reading "No matching places found." A bare submit that matches nothing therefore produces a page with the pre-search body gone, no committed destination, and an error line — a third state the IA denies exists.

**Resolution:** the overlay does **not** close on a submit that produces no commit. No-matches renders inside the overlay, where the field that caused it still lives. The page-level `No matches` state becomes unreachable and is deleted, and "closes on submit" is struck from Interaction Primitives.

### H3 — Committing is specified as searching "the destination's own name", but the location-search API takes a query string

Interaction Primitives requires committing to *"run the search for that destination's own name — never the fragment."* This correctly fixes defect 3. But an overlay option is already a resolved `LocationSearchResult` carrying name, country code, type, latitude and longitude — the attraction lookup needs the coordinates, not another text search round-trip.

Re-searching by name after the user has already picked a resolved object is a wasted request that can also return a *different* top result than the one they chose — silently reintroducing the class of bug this pass exists to kill.

**Resolution:** committing an overlay option, a tile, or a recent chip sets the destination directly from the resolved result; no second location-search request is issued. Text search runs only for a typed submit, where no resolved object exists yet. State this explicitly, since it is the actual fix for defect 3 and the current wording only half-describes it.

---

## MEDIUM

### M1 — `{gradients.ink-scrim-vertical}` and `{gradients.tile-scrim}` are not valid CSS and conflate opacity with position

Both tokens are written in the form `{colors.on-surface} 72% at 45%`, mixing an alpha value and a gradient stop position in one unparseable fragment. A reader cannot tell which number is which, and no implementer can paste it.

**Resolution:** express both as explicit `color-mix` stops with separate opacity and position, matching the form already shipped in `SearchPage.module.css`.

### M2 — `{spacing.hero-band-inset}` duplicates `{spacing.7}`

Both are 2.5rem. A second name for an existing scale value invites the two to drift apart under future edits.

**Resolution:** drop the token; reference `{spacing.7}` and state the intent in prose.

### M3 — Recent searches have no clearing affordance

The spine commits to persisting the visitor's destination history client-side and explicitly says clearing the page does not clear history. It never says how a user removes it. On a shared machine the row silently discloses where someone has been looking.

**Resolution:** specify a quiet "Clear" action on the Recent searches label row. Flag as an open item if a decision is wanted rather than an assumption.

### M4 — "Popular searches" and "Recent searches" now differ in silhouette *and* semantics, but the spine gives them the same activation behavior

Both commit-and-search in one gesture. That is correct, but the Shapes section justifies their different silhouettes as carrying "a difference in kind" — a distinction with no behavioral consequence anywhere in the document.

**Resolution:** acceptable as written, but say plainly that the distinction is informational only, so a future reader does not hunt for the behavioral delta.

### M5 — DESIGN.md `components.suggestion-chip` and `components.hero-search`-era language survive as orphans

`suggestion-chip` is retained "for the wider app" but no surface in scope uses it; the `Suggestion dropdown` and `Location result list` bullets are marked superseded but still carry full visual specs.

**Resolution:** acceptable — these are deliberate preservation notes — but each should say in one clause why it is retained, so the Components list does not read as containing live specs for dead components.

### M6 — Landing/home naming is inconsistent across both spines

Pass 3 renamed the surface "landing" in most places but `DESIGN.md` Do's and Don'ts still says *"Keep the home hero band on every viewport"*, and several Brand & Style sentences still say "home surface".

**Resolution:** settle on "landing surface" for the page and "`/`" for the route; sweep both files.

---

## LOW

- **L1** — `{shadows.xl}` is documented as having "exactly one use". True today; the sentence will age badly. Soften to "currently one use".
- **L2** — The Required Defect Fixes table cites line numbers (`SearchPage.tsx:84`, `:101`, `:103`). These will drift the moment anyone edits the file. Keep them but anchor each to a symbol name as well.
- **L3** — `{components.step-row}` names `numeral: '{typography.headline-md}'`, a 24px/600 heading scale used for a decorative ordinal. Harmless, but a reader may infer the numeral is a heading. Note that it is not.
- **L4** — The how-it-works band's third beat mentions moving places between days. Verified shipped, but the spine should cite where (story 3-6 / the drag-and-drop tests) so a future editor does not soften it as unverified.
