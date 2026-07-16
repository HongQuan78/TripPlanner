# Spine Pair Review — Trip Planner · Trips & Trip Detail (Horizon · Boarding Pass)

## Overall verdict

This is a disciplined, downstream-ready extension pair. The Boarding Pass motif is committed with real tokens, verified contrast on every load-bearing text combination, exhaustive derived-value definitions, and both surfaces' full state matrices preserved and restyled — a consumer can source-extract cleanly and build without guessing. One genuine broken reference (`{components.button-outline}`, cited but defined nowhere in this pair or the Horizon parent) is the only high-severity gap; the remaining findings are schema-consistency and completeness nits that a dev works around via the mock. Nothing is broken; the contract holds.

## 1. Flow coverage — strong

Sources (`.memlog.md`, parent `EXPERIENCE.md`) carry a decision log rather than named UJs/FRs; the scope is two surfaces (`/trips`, `/trips/:id`) and both are walked by a Key Flow. Flow 1 (Minh, pre-trip glance) covers the list → detail read path; Flow 2 (An, filling the empty day) covers detail add-handoff and remove. Each has a named protagonist, numbered steps, an explicit `Climax:` beat, and a failure path (list-request failure; removal-call failure). Create-trip and edit-trip are "kept/unchanged" behaviors correctly documented in IA + Component Patterns rather than given redundant flows.

### Findings
- **low** No dedicated flow for the create-trip → navigate-to-detail transition, which is the most common first-run path (EXPERIENCE Flow section). *Fix:* optional — a one-line note that create success is covered by IA + the CreateTripForm pattern would close the loop; not load-bearing.

## 2. Token completeness — adequate

Every color token in the frontmatter carries a hex; inherited tokens (`{shadows.*}`, `{motion.*}`, `{colors.surface-container-high}`, `body-md`, `label-sm`, `headline-md`) all resolve in the Horizon parent — verified. Contrast targets are stated with ratios for every load-bearing combination (pill variants, stat value/label, unplanned hint, seg-date, remove, add). Spacing tokens for the novel structure (accent widths, rail gutter/line, node/notch) are all defined.

### Findings
- **high** `{components.button-outline}` is referenced for the "Edit trip" control ("`{components.button-outline}` from Horizon", DESIGN.md Components → summary-ticket) but is defined **nowhere** — not in this pair's frontmatter and not in the parent Horizon `DESIGN.md`, whose only button token is `button-primary`. A consumer extracting by reference resolves nothing. *Fix:* either add a `button-outline` recipe (the mock's `.btnG` gives the values: transparent fill, 1px `{colors.primary}` border, `{colors.primary}` text, `{rounded.md}`) or point the Edit button at an existing token and drop the "from Horizon" claim.
- **medium** Typography tokens use a different key schema than the parent — `{ size, weight, tracking, case }` here vs. the parent's `{ fontSize, fontWeight, letterSpacing }`. Values are legible to a human but a mechanical token mirror/codegen that consumes both spines sees two incompatible shapes. *Fix:* align the new typography tokens to the parent's `fontSize`/`fontWeight`/`letterSpacing` keys (add `textTransform` for the uppercase roles).
- **low** `rounded.xl` (1rem) is declared in frontmatter but never referenced in the prose or any component — a dead token. *Fix:* drop it, or note where it applies.

## 3. Component coverage — adequate

Eleven of twelve frontmatter components have both a DESIGN.md Components visual row and an EXPERIENCE.md Component Patterns behavioral row with real rules (links-vs-buttons, single-announcement, derived text). Create/Edit forms are behaviorally covered as kept components.

### Findings
- **high** (same as §2) `button-outline` has no visual or behavioral row in either spine.
- **medium** `{components.trips-grid}` is in the frontmatter component list and has an EXPERIENCE Component Patterns row, but has **no row in DESIGN.md Components** — its visual spec lives only in Layout & Spacing. A consumer scanning the Components section for it finds nothing. *Fix:* add a one-line Components row cross-linking to Layout, or accept it as a layout primitive and remove it from the `components` list.
- **low** Naming drift: `pass-stub`'s "Use" column reads "Pass head" in EXPERIENCE, while DESIGN places the stub *below* the perforation as a region distinct from the head. *Fix:* change the Use cell to "Pass stub".

## 4. State coverage — strong

Both surfaces' full state sets are enumerated and each is restyled rather than dropped. `/trips`: loading skeleton (pass-silhouette geometry), error (⛅ + retry), empty (🧳 + CTA), populated, creating-inline. `/trips/:id`: invalid/not-found (privacy-preserving copy kept verbatim), loading, service error, loaded, editing-inline, remove pending/error (ConfirmDialog + banner), empty-day, all-unplanned. Focus/keyboard states are covered in Accessibility Floor. Auth-gate (RequireAuth redirect) is inherited, not re-litigated. No offline state, appropriate for an authenticated CRUD web surface.

### Findings
- None.

## 5. Visual reference coverage — strong

The single `mockups/` file (`key-trips-and-detail.html`) is linked inline in both spines at the relevant section, named for what it illustrates, and "the spines win on conflict" is stated in each. The three deliberate divergences (past-pass opacity dimming, stat-label color, past-pill color) are called out inline with the failing ratios that justify them — and the mock indeed still carries the rejected treatments (`opacity:.82`, `st-past{color:var(--outline)}`), so the spine-over-mock arbitration is doing real work. No orphan artifacts; no `wireframes/` or `imports/` folders.

### Findings
- **low** The mock reference text claims "both surfaces with their load-bearing states," but the rendered HTML shows only populated + empty (`/trips`) and loaded + empty-day (`/trips/:id`) — loading, error, not-found, and editing states are spec'd in prose but not visualized. *Fix:* soften the caption to "primary states" or note that the remaining states are prose-only.

## 6. Bloat & overspecification — strong

DESIGN.md carries editorial voice appropriately (the motif rationale earns its length). EXPERIENCE.md stays behavioral outside the Key Flows, where narrative is expected. Pixel values in prose are limited to genuinely structural specifics (rail line/ring widths, ≈22px segment gap) that no token covers. No source dumps, no prose-where-a-table-works.

### Findings
- **low** The exact trip payload shape is restated in full in both DESIGN.md (Brand & Style) and EXPERIENCE.md (Foundation, "Hard data constraint"). Load-bearing in both, but one authoritative statement with a cross-reference would cut the duplication. *Fix:* keep the EXPERIENCE statement as canonical; shorten the DESIGN mention to a pointer.

## 7. Inheritance discipline — adequate

Both `extends:` targets resolve to the Horizon parent; `sources` (`.memlog.md`, parent EXPERIENCE) resolve. Kept copy is quoted verbatim ("No destinations planned for this day yet.", "Trip not found" + ownership line). EXPERIENCE `{token}` references resolve to DESIGN tokens by name, with the sole exception noted below. Glossary/component names are consistent across both files.

### Findings
- **high** (same as §2) `{components.button-outline}` does not resolve in the parent it claims to inherit from — the one broken inheritance link.
- **medium** (same as §2) Typography token schema diverges from the parent's, weakening "token references resolve by name" for any tool treating the two spines as one system.
- **low** The component is named `add-day-button` but is *always* labeled "＋ Add destination" (never "Add day"); the name implies day-creation, the behavior adds a destination to an existing day. Documented, but the name/label mismatch can mislead a skimming implementer. *Fix:* consider renaming to `add-destination-button`, or add a half-line noting the name refers to its per-day placement.

## 8. Shape fit — strong

DESIGN.md sections are in canonical order and all present: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. EXPERIENCE.md carries every required default (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows) plus a well-earned invented section, Derived Values, which is the crux of a "richness from existing data" redesign and enumerates every edge case. Responsive rules are embedded inline in both spines (below-`md` rail/gutter/wrap behavior) — consistent with the parent, which also has no standalone Responsive section.

### Findings
- **low** No Inspiration section, though `.memlog.md` records explored-and-rejected directions (Editorial Calm, Dashboard) alongside the chosen Boarding Pass. The rationale for the *chosen* motif lives in Brand & Style, but the rejects — useful context for a future redesign — aren't captured. *Fix:* optional one-paragraph Inspiration note listing the two rejected directions and why Boarding Pass won.
- **low** The `components` frontmatter is a bare list of names rather than the spec's canonical name→token-object map that the parent uses; machine-readable per-component tokens exist only as prose. *Fix:* acceptable for an extension pair, but converting to the object form (even with mostly `{path.to.token}` references) would match the parent and let a resolver flatten them.

## Mechanical notes

- **Frontmatter completeness:** both files have `name`, `description`, `status: final`, `updated`, `extends`; EXPERIENCE adds `sources`. Complete.
- **Broken cross-ref:** `{components.button-outline}` (DESIGN.md Components → summary-ticket) — resolves nowhere. The only dangling reference in the pair.
- **Schema inconsistency:** typography token keys (`size`/`weight`/`tracking`/`case`) differ from the parent Horizon spine (`fontSize`/`fontWeight`/`letterSpacing`).
- **Dead token:** `rounded.xl` declared, unreferenced.
- **Name consistency:** component names match across both spines except the `pass-stub` "Use"-cell label ("Pass head") noted in §3.
- **No Mermaid diagrams** in either file — none required.
- **Inherited tokens verified present in parent:** `{shadows.sm|lg}`, `{motion.fast|slow|ease-spring}`, `{colors.surface-container-high}`, `body-md`, `label-sm`, `headline-md`. All resolve.
