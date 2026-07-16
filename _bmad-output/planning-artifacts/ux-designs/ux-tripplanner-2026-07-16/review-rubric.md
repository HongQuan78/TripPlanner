# Spine Pair Review — Trip Planner Attraction Detail (Azure)

## Overall verdict

This is a tight, downstream-ready spine pair: every `{path.to.token}` reference resolves, component names line up across both files, the DESIGN section order is canonical, and all eight EXPERIENCE defaults are present with genuinely load-bearing invented sections (Map / Open-Now / Nearby / Add-to-Trip / Data handling). A consumer can source-extract it cleanly and build. The one finding with real teeth is contrast: the palette is asserted "AA verified" but two load-bearing muted grays (`label-muted`, `na`) fall below AA on white, and downstream code mirrors tokens verbatim. Two required-when-applicable sections triggered by the memlog (Responsive, Inspiration & Anti-patterns) are absent — the breakpoint info exists but is scattered, and DESIGN even points to a "behavioral breakpoint contract" section that EXPERIENCE never formalizes.

## 1. Flow coverage — strong

Extracted UJs/requirements from `.memlog.md`: epic-2 US1/US2 (detail opens with missing fields), US3 map, US4 opening-hours, nearby rail, logged-out Add-to-Trip gate, and the ratified "Linh" journey. Both Key Flows carry numbered steps and failure handling. Flow 1 (Linh, 28, lunch break, laptop, logged in) has an explicit CLIMAX beat and a failure branch (unparseable hours, empty nearby). Flow 2 covers the logged-out gate with a "Resolution" beat. Every load-bearing requirement maps to a flow or an embedded failure branch.

### Findings
- **[low]** Flow 2's protagonist is "anonymous browser" (no named person) and has no explicitly labeled climax — it uses "Resolution" (EXPERIENCE.md § Key Flows, Flow 2). *Fix:* optionally name the visitor and label the return-and-add moment as the climax for parity with Flow 1; the anonymity is defensible, so low.

## 2. Token completeness — adequate

Every frontmatter token type-checks against `design-md-spec.md`, and every `{path.to.token}` reference in the `components` block and prose resolves (spot-checked all ~30 references: `{colors.*}`, `{typography.*}`, `{rounded.*}`, `{spacing.4}`, `{components.nearby-card}`, `{components.button-primary}`, `{components.hero.scrim}`, `{components.image-placeholder.fill}`). All color tokens carry hex or rgba values — no missing-hex criticals. The gap is contrast: targets are asserted qualitatively ("comfortably AA", "verified for AA") but no ratios are stated for load-bearing combos, and two muted grays measurably fail.

### Findings
- **[high]** `label-muted #7a8aa0` on `surface #ffffff` computes to ~3.25:1 and `na #9aa7b6` to ~2.6:1, both below WCAG AA 4.5:1 for normal text — yet these carry load-bearing content: `label-muted` is the info-row keys ("Address"/"Hours"/"Website", set at 12px/700 label-caps, which is *not* large-text) and `na` is the "Not available" / "No photo yet" text. EXPERIENCE.md § Accessibility Floor and § Foundation both assert the palette is AA-verified; downstream will mirror the tokens and ship failing contrast believing it is verified (DESIGN.md frontmatter `colors`; EXPERIENCE.md § Accessibility Floor). *Fix:* darken `label-muted` to ≥ ~#5f7086 and `na` to ≥ ~#6b7a8c to clear 4.5:1 on white, or state the exact ratio + intended text size for each and downgrade any combo deliberately kept below AA.
- **[low]** Recurring fixed pixel values are stated in prose but not tokenized — booking-panel width `340px` (DESIGN.md § Layout & Spacing and EXPERIENCE.md § IA both restate it), info-row label width `110px`, card padding `11–13px` (DESIGN.md § Components / § Layout). *Fix:* add a `components.booking-panel.width` token (and optionally an info-row label-width token) so the two files can't drift.

## 3. Component coverage — strong

Every component named anywhere appears in DESIGN.md.Components (visual) and EXPERIENCE.md § Component Patterns (behavioral), with real rules on both sides: Hero/Photo carousel, Back control, Open-now badge, Info row, Map block, Nearby card, Nearby rail, Booking panel, Sticky action bar, Add to Trip / button-primary, Image placeholder. Names resolve consistently through the token aliases (e.g. "Add to Trip button" ↔ `button-primary`, "Sticky action bar" ↔ `sticky-action-bar`). No orphan components, no one-word rows.

### Findings
- **[low]** The "Not available" text treatment is a standalone Components row in DESIGN.md but has no dedicated Component Patterns row in EXPERIENCE.md — its behavior is instead folded into Info row + Voice and Tone + Data table (DESIGN.md § Components; EXPERIENCE.md § Component Patterns). *Fix:* acceptable as-is (it is a text treatment, not an interactive component); no change needed unless you want strict row-parity.

## 4. State coverage — adequate

Walked every IA surface (Hero, Back, Lead, Map, Info rows, Nearby, Booking panel, Sticky bar). State Patterns + the behavior sections cover Loading, Loaded, Not-found (404, no-retry), Service-unavailable (with Try again), Missing field, No photos, Logged-out, Empty nearby, Map absent (no coords), Nearby load-failed, and map tile-failure degradation. Focus states are handled behaviorally in Accessibility Floor. The walk is near-complete.

### Findings
- **[medium]** No state is defined for a *failed* authenticated Add-to-Trip action. The flow says clicking "adds this attraction and confirms," and the page-level error states cover only the detail *load*, not the add mutation (EXPERIENCE.md § Add-to-Trip Flow, § State Patterns). *Fix:* add a row/beat for add-action failure (e.g. inline "Couldn't add — try again" without navigating away) and, if relevant, an already-added/duplicate treatment, or explicitly delegate both to the downstream add-to-trip context and say so.

## 5. Visual reference coverage — adequate

Only one visual reference exists: `.working/directions-attraction-detail.html` (no `mockups/`, `wireframes/`; `imports/` empty per memlog). EXPERIENCE.md links it inline at § Information Architecture, names what it illustrates ("the Azure desktop + mobile mockups"), correctly disambiguates the chosen direction from the three in the file, and states spines-win-on-conflict once. No orphans.

### Findings
- **[low]** DESIGN.md — the *visual* spine — never links the visual reference; only EXPERIENCE.md does (DESIGN.md § Layout & Spacing / § Components). *Fix:* add one inline "→ Visual reference: `.working/directions-attraction-detail.html` (Azure section)" near Components so the look-and-feel spine points at its own mockup.
- **[low]** The chosen mockup lives in `.working/` (a scratch dir) rather than `mockups/`, so a downstream consumer scanning canonical folders could miss it (repo layout). *Fix:* promote the Azure mockup into `mockups/` if it is meant to be a durable contract reference.

## 6. Bloat & overspecification — strong

DESIGN.md prose carries editorial voice (allowed); EXPERIENCE.md is table-first with prose reserved for behavior contracts (correct). No source restatement of full personas/FRs, no prose where a table would do, no decorative sections. The "fresh standalone identity" paragraph in DESIGN.md § Brand & Style earns its place given the deliberate non-inheritance from Horizon.

### Findings
- (none beyond the un-tokenized pixel values already noted under §2.)

## 7. Inheritance discipline — strong

Confirmed fresh standalone run — no `sources` frontmatter in either file (correct; memlog logs the decision not to inherit Horizon). All EXPERIENCE.md `{token}` references resolve to DESIGN.md frontmatter tokens by name (`{components.*}` for all patterned components, `{colors.na}`). Component and token names are identical across both files. No cross-file naming drift.

### Findings
- (none.)

## 8. Shape fit — adequate

DESIGN.md sections are in exact canonical order: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. EXPERIENCE.md carries all eight required defaults (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows). Invented sections (Data & Missing-Field Handling, Map / Open-Now / Nearby Rail / Add-to-Trip Behavior) each formalize a load-bearing contract and earn their place. The two gaps are required-when-applicable sections that the memlog triggers.

### Findings
- **[medium]** No dedicated **Responsive** section despite an explicitly multi-surface product with a stated `≥1024px` breakpoint. Breakpoint behavior is scattered across EXPERIENCE.md § Foundation, § IA, and per-row "Desktop only"/"Mobile only" notes, while DESIGN.md § Layout & Spacing points to a "behavioral breakpoint contract" in EXPERIENCE that is never formalized as a section (DESIGN.md § Layout & Spacing; EXPERIENCE.md § Foundation). *Fix:* add a Responsive section consolidating the desktop↔mobile transition (two-column → single column + sticky-bar handoff, bottom-padding reservation, breakpoint thresholds) so DESIGN's pointer resolves.
- **[low]** No **Inspiration & Anti-patterns** section, though the memlog names Airbnb as the booking-panel lineage and records rejected modules (share/save) and rejected visual directions (Terra/Lumen) (EXPERIENCE.md; `.memlog.md`). Anti-patterns are partly served by § Interaction Primitives "Banned" and DESIGN's Don'ts, but the positive Airbnb lineage and the share/save rejection rationale are unrecorded. *Fix:* add a short Inspiration & Anti-patterns section capturing the Airbnb booking-panel borrow and the deliberate share/save omission.

## Mechanical notes

- **Cross-references:** all `{path.to.token}` references in both files resolve; no broken paths found.
- **Frontmatter completeness:** DESIGN.md frontmatter is complete (name, description, status, colors, typography, rounded, spacing, components); EXPERIENCE.md frontmatter is complete for a standalone run (no `sources`, correctly).
- **Name consistency:** component names are consistent across DESIGN frontmatter, DESIGN Components prose, and EXPERIENCE Component Patterns via token aliases; no drift.
- **Un-tokenized values:** `340px` (panel width) appears in both files as a literal; `110px`, `11–13px` appear in DESIGN prose only — see §2.
- **DESIGN → EXPERIENCE pointer:** DESIGN.md § Layout & Spacing references a "behavioral breakpoint contract" section in EXPERIENCE that does not exist by that name — see §8.
- **Mermaid:** none present; N/A.
