# Spine Pair Review — tripplanner (home update)

## Overall verdict

The home/search extension grafts cleanly onto the auth spine: the token layer resolves end to end, every hex is real production CSS (verified against `FE/src/index.css`), the contrast table covers the new load-bearing combinations, and every behavioral contract marked "kept" matches the shipped code line for line. The pair is consumable as a contract with one genuine coverage hole — the location result list has behavior but no visual spec anywhere — plus a small cluster of medium ambiguities around controls that now sit on photography. Nothing found is structural; all findings are patchable in place.

## 1. Flow coverage — strong

Extracted journeys: register (Flow 1), returning login with `returnTo` (Flow 2), verify/expired/resend (Flow 3), and the update's home journey — first visit, typeahead search, skeleton→grid, add-to-trip handoff, session restore (Flow 4). All four have a named protagonist, numbered steps, a climax beat, and failure paths. Flow 4's failure path covers both attractions-error (retry preserves state) and empty results. Every update requirement from the memlog (hero band, first-visit state, richer cards, add-to-trip row) is exercised.

### Findings
- **low** Flow 4 step 6 compresses register→verify→login→return into "back from registering" without committing the return route: the add-to-trip redirect carries `returnTo` (`FE/src/trips/AddToTripContext.tsx:26`), but login-after-verify starts from `/verify-email` with no `returnTo` and the IA says login lands on `/trips` — Vy would reach home via the wordmark, not automatically. It also claims "the heritage card still lifted under her pointer," a hover state no implementation restores (EXPERIENCE.md, Flow 4 step 6). *Fix:* state the return path explicitly (returnTo when it exists, else wordmark → home + session restore) and drop the hover-persistence image.
- **low** Suggestion chips — the only net-new interactive element on home — are seen in Flow 4 step 1 but never activated in any flow (EXPERIENCE.md, Key Flows). *Fix:* one variant line in Flow 4 ("had she tapped the Đà Nẵng chip, steps 2–3 collapse into one gesture") or nothing if deemed too minor.

## 2. Token completeness — strong

Extracted all frontmatter tokens (33 colors, 8 typography roles, 4 radii, 12 spacing entries, 2 shadows, 3 motion values, 16 component objects) and every `{path.to.token}` reference in the prose of both files. All references resolve; no color token lacks a hex; all values match `FE/src/index.css` as the Brand & Style section claims. Contrast is stated for every new load-bearing combination: kind tag 8.44:1, heritage chip 5.49:1, rating-badge scrim ≥9.13:1, add-to-trip 6.73:1 rest / 6.11:1 hover, plus the ≥65% gradient rule extended verbatim to the hero band. The two hairline exceptions are documented with rationale.

### Findings
- **medium** The Clear button inside the hero band has no committed appearance or contrast strategy: today it is a transparent ghost with `{colors.primary}` border and text (`FE/src/pages/SearchPage.module.css:79–101`), and DESIGN's hero-search bullet commits only "Search-button and Clear-button siblings in their current `{typography.label-lg}` styles" (DESIGN.md, Components → Hero search) — typography, not fill. A transparent primary-blue control floating on arbitrary photography is the one band element outside the ink-scrim/solid-white rule that DESIGN's own Do's and Don'ts enforce ("Text over photography only behind an ink layer"). *Fix:* give Clear a solid `{colors.surface-container-lowest}` fill in the band (chip treatment) or state it sits on/joins the search bar's white surface.
- **medium** The disabled Search button's appearance is contradictory and uncommitted: EXPERIENCE keeps "Search stays disabled while the input is empty" (Interaction Primitives), DESIGN's `button-primary.background-disabled` is `{colors.disabled}` with `{colors.on-primary}` text — the exact 1.70:1 white-on-gray combination the Components prose itself calls unreadable — while shipped code uses `opacity: 0.5` on the primary fill (`FE/src/pages/SearchPage.module.css:74`). This disabled button is the resting state of the pre-search hero, the page's most prominent moment. WCAG exempts disabled controls, but a consumer cannot tell which of three treatments to build. *Fix:* commit one disabled treatment for the Search button in DESIGN (the shipped 50%-opacity primary is the least-change candidate) and reconcile it with the `background-disabled` token.
- **low** DESIGN's auth-card bullet writes literal "`shadow-sm`" instead of `{shadows.sm}` (DESIGN.md, Components → Auth card) — resolves by inference but breaks the reference syntax every other bullet uses. *Fix:* replace with `{shadows.sm}`.

## 3. Component coverage — adequate

Extracted every component named anywhere in either file and cross-checked for a DESIGN visual spec and an EXPERIENCE behavioral row. Covered on both sides: auth card, hero panel, hero band, hero search, suggestion chip, attraction card, rating badge, kind tag, add-to-trip row, text input, password input, password helper, field label*, primary button, error/success banner, cross-link footer (*field label has a DESIGN row and its behavior is folded into the input rows — acceptable, pre-update). Three home-side components are lopsided:

### Findings
- **high** Location result list has a behavioral row (EXPERIENCE.md, Component Patterns) and appears in the IA and State Patterns, but no visual spec exists anywhere in DESIGN — no Components bullet, no frontmatter entry, and no explicit "current visuals kept" statement. The result buttons (rest/selected fill for the `aria-pressed` state, country/type pills, partial-match note) sit directly beneath the new hero band; a consumer restyling this page has nothing to build them from and no license to leave them alone. *Fix:* add one DESIGN Components bullet — even "existing production styles preserved; selected state uses X on Y" closes the hole.
- **medium** Suggestion dropdown: full behavioral row in EXPERIENCE (ARIA listbox contract, verified against `FE/src/components/SuggestionDropdown.tsx`), but DESIGN carries only "the suggestion dropdown anchors below it on white, unchanged" plus a `{shadows.lg}` mention in Elevation & Depth — no option-row anatomy, no active-option highlight color. If "unchanged" means production CSS wins, that is a spec decision worth one explicit sentence, since every neighboring element in the band was respecified. *Fix:* a DESIGN Components bullet or an explicit "visuals preserved as shipped" clause.
- **medium** Heritage chip has a DESIGN row but no behavioral row and no committed copy: the shipped chip renders the visible word "heritage" in the meta row (`FE/src/components/AttractionCard.tsx:42`); the redesign floats it on the photograph, but neither spine states what the chip says ("heritage"? "UNESCO"?) or how it is announced inside the card link — the rating badge received exactly this treatment (EXPERIENCE.md, Component Patterns → Rating badge). *Fix:* commit the chip's label text in Voice and Tone or the card row, and add its accessible-exposure rule alongside the rating badge's.
- **low** EXPERIENCE says the rating badge "floats on the image when a 1–3 rating exists" while DESIGN says "rendered over image and placeholder alike" (DESIGN.md, Components → Rating badge). Not a conflict — DESIGN is a superset — but the placeholder case lives only in the visual file, where a behavior-extracting consumer may not look. *Fix:* mirror "over image and placeholder alike" into the EXPERIENCE card row.

## 4. State coverage — strong

Walked both surface families. Home: pre-search / first visit, restored session, searching, search error (incl. 503/network wording, verified against `errorMessage` in `FE/src/pages/SearchPage.tsx:19–24`), no matches, country selected, attractions loading (skeletons + SR text), attractions error, attractions empty, populated grid, per-card image loading/failed, focus (Accessibility Floor), reduced motion. Auth states unchanged from the prior review and still complete. All verbatim "kept" copy strings match the shipped code exactly.

### Findings
- **low** The typed-but-unsubmitted pre-search state is unspecified at one seam: chips remain visible (they disappear only "once a query has been submitted") while the suggestion dropdown opens directly above them inside the band — stacking/overlap between dropdown and chip row is uncommitted (EXPERIENCE.md, Component Patterns → Suggestion chip vs. Suggestion dropdown). *Fix:* one line — dropdown overlays the chip row, or chips hide once the input reaches 2 characters.

## 5. Visual reference coverage — strong

Inventory: `imports/sign-in-horizon-travel.html`; `mockups/key-login.html`, `mockups/key-register.html`, `mockups/key-verify-email.html`. (`.working/` duplicates are scratch, not references.) The import is linked inline in both spines with what it is, and spines-win-on-conflict is stated once per file (DESIGN.md Brand & Style; EXPERIENCE.md Foundation). All three mockups are linked in both files with the states each illustrates. Both files correctly state that home/search mockups land at this update's finalize step — no stale references to nonexistent home mocks, no orphans, no unspecific references.

### Findings
- None.

## 6. Bloat & overspecification — adequate

DESIGN's editorial voice is within its license; the restated production values are declared as such and serve as the token source of truth. The contrast paragraph is dense but every ratio is load-bearing. Tables are used where tables work.

### Findings
- **low** Flow 4's closing prose carries editorial voice in the file that should stay clinical: "turned a daydream into an itinerary's first entry" and the unimplementable hover-persistence beat (EXPERIENCE.md, Flow 4 step 6). *Fix:* trim the climax to the observable contract — state restored exactly as left.

## 7. Inheritance discipline — strong

Component names are identical across DESIGN frontmatter (kebab-case), DESIGN Components prose, and EXPERIENCE Component Patterns rows (hero band / `hero-band`, add-to-trip row / `add-to-trip-row`, etc.). Every token reference in EXPERIENCE resolves to a DESIGN frontmatter token by exact name. No drifted or aliased names found in the update.

### Findings
- None (pair-title drift noted under Mechanical notes).

## 8. Shape fit — strong

DESIGN body sections are in canonical order: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. EXPERIENCE carries all required defaults (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows); Inspiration & Anti-patterns is omitted, which the mobile example shows is legitimate. Frontmatter is complete in both files.

### Findings
- None.

## Mechanical notes

- Pair-title drift: DESIGN frontmatter `name: Trip Planner — Horizon` vs EXPERIENCE `name: Trip Planner Auth + Home — Horizon`. Harmless but the pair should agree on one system name.
- DESIGN frontmatter extends the base spec keys with `status`, `updated`, `shadows`, and `motion`. The shadows/motion promotion is a ratified memlog decision and all `{shadows.*}`/`{motion.*}` references resolve — fine, just note it is a spec extension.
- One literal `shadow-sm` where `{shadows.sm}` syntax is expected (finding 2, low).
- Kept-contract verification against code, all confirmed true: 300ms debounce / min 2 chars / max 5 suggestions / mousedown choose / Escape per-query dismissal / suppression rules (`FE/src/pages/SearchPage.tsx`), `aria-pressed` result buttons and partial-match note (`FE/src/components/LocationResultList.tsx`), "Rated N of 3" label (`FE/src/components/StarRating.tsx:6`), 40ms stagger + `ease-spring` + current 9rem image (`FE/src/components/AttractionCard.module.css`), 4 skeletons + "Loading attractions…", disabled-empty Search, add-to-trip `returnTo` redirect (`FE/src/trips/AddToTripContext.tsx:26`), 60rem page / 32rem form / 14rem grid minimum (`FE/src/pages/SearchPage.module.css`), and every frontmatter hex/radius/shadow/motion value against `FE/src/index.css`.
- The attraction payload contract in EXPERIENCE (xid, name, kinds, rating, imageUrl, distanceMeters) matches `FE/src/api/types.ts:21–28` exactly.
