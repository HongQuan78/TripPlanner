# Spine Pair Review — tripplanner

## Overall verdict

A disciplined, near-contract-ready pair: every `{path.to.token}` reference in both spines resolves to the DESIGN.md frontmatter, all five IA surfaces have states and flows, and the anti-enumeration constraint is carried consistently from backend reality into copy, states, and flows. Two things keep it from clean source-extraction: eleven [ASSUMPTION] tags remain in the spines even though the memlog records them all as accepted (a consumer of the pair alone sees uncommitted decisions), and the Login surface has no client-side validation contract. Fix those two and commit the motion/shadow tokens into the frontmatter, and this pair is a solid contract.

## 1. Flow coverage — strong

Sources frontmatter contains no PRD/UJ document — scope is the memlog decision "three surfaces: Login, Register (incl. registration-received), Verify Email (verifying/verified/failed/resend)". Checked each scoped surface against Key Flows. All three flows have a named protagonist with time/device context (An 22:40 laptop; Minh 07:55 desktop; Thảo 12:15 phone), numbered steps, a marked **Climax** beat, and an explicit failure path. Flow 1 covers register + field-invalid + registration-received + anti-enumeration variant; Flow 2 covers `returnTo`, wrong-password, visibility toggle, and the unverified-account failure; Flow 3 covers verifying, expired token, resend, cooldown double-tap, and verified — the resend surface is exercised inside the flow rather than orphaned.

### Findings
- **low** No flow (and no state row — see §4) exercises a Login-side validation miss, e.g. Minh submitting with an empty password (EXPERIENCE.md Key Flows). *Fix:* one clause in Flow 2 once the Login validation contract (§4) is decided.

## 2. Token completeness — adequate

Extracted all frontmatter tokens (27 colors, 7 typography roles, 4 radii, 9 spacing entries, 7 component objects) and every `{path.to.token}` reference in the prose of both spines. All references resolve, including nested ones (`{typography.body-md.fontFamily}`, `{spacing.auth-card-max}`, `{spacing.7}`). No color token missing a hex. Hex values, radii, shadows, and motion durations verified identical to `FE/src/index.css` — the "existing production values" claim is true.

### Findings
- **medium** `shadow-sm`, `shadow-lg`, `--duration-fast`, `--duration-slow`, `--ease-spring` are load-bearing in both spines (auth-card component references `shadow: 'shadow-sm'`; EXPERIENCE Interaction Primitives cites the durations) but exist only as prose names, not frontmatter tokens. Values for the shadows and durations are stated in DESIGN.md Elevation & Depth, but `--ease-spring`'s curve is never stated anywhere in the pair — it resolves only via `FE/src/index.css`, outside the contract (DESIGN.md Elevation & Depth). *Fix:* add `shadows` / `motion`-style named entries to the frontmatter (or at minimum state the `cubic-bezier(0.34, 1.56, 0.64, 1)` value in prose).
- **medium** No numeric contrast targets anywhere. EXPERIENCE.md Accessibility Floor names the "AA-bearing combinations" but neither file states a ratio or verification. Two combinations deserve explicit treatment: placeholder text in `{colors.outline-variant}` (#c1c6d7 on white ≈ 1.7:1 — fine only because placeholders are non-essential examples, but that exemption should be stated where the placeholder color is specified) and `{colors.on-primary}` on `{colors.primary-container}` hover (≈ 4.6:1 — marginal, unverified) (DESIGN.md Colors; EXPERIENCE.md Accessibility Floor). *Fix:* one sentence in DESIGN.md Colors stating the AA-verified pairs and the placeholder exemption.
- **low** Incomplete on-pairs for the "wider app" families: `on-secondary`, `on-tertiary`, `on-tertiary-container` are absent while their containers are defined; `surface-dim`, `surface-variant`, `on-primary-container` are defined but never explained or used in either spine (DESIGN.md frontmatter). Harmless for auth scope since Colors explicitly reserves these families, but the frontmatter presents itself as the app-wide token table. *Fix:* either complete the pairs from `index.css` or note the table is the auth-relevant subset.

## 3. Component coverage — adequate

Extracted every component name used anywhere in either spine: Auth card, Hero panel, Text input, Password input, Password helper, Field label, Primary button, Error banner, Success banner, Cross-link footer. DESIGN.md Components gives real visual specs (anatomy, tokens, state appearance) for nine; EXPERIENCE.md Component Patterns gives real behavioral rules (not one-worders) for nine. Names are verbatim-identical where they co-occur.

### Findings
- **medium** **Password helper** has a behavioral entry (EXPERIENCE.md Component Patterns: persistent "At least 8 characters." line, replaced by error text) but no DESIGN.md Components entry — its color role is unspecified (only "`{typography.label-sm}`-scale"). A dev must guess between `{colors.on-surface-variant}` and `{colors.outline}` (EXPERIENCE.md Component Patterns, Password helper row). *Fix:* one bullet in DESIGN.md Components.
- **low** **Field label** appears in DESIGN.md Components and frontmatter but has no EXPERIENCE.md Component Patterns row; its only behavior (programmatic `<label>` association) lives in the Accessibility Floor. Defensible for a purely static element, but the row would cost one line. *Fix:* optional row, or leave as is.
- **low** The Verifying "status line" (EXPERIENCE.md State Patterns) is styled inline (`{colors.on-surface-variant}`) rather than being a named component. Acceptable — it is a single-use state treatment — noted for completeness.
- **low** `password-input` and the cross-link footer are specified in DESIGN.md Components prose but absent from the `components` frontmatter object, while smaller pieces (field-label) are present. Frontmatter isn't required to be exhaustive; flagging only the inconsistency of granularity.

## 4. State coverage — adequate

Walked all five IA rows. Login/Register: idle, pending, field-invalid, form-error, offline/unreachable (via "unknown failures" + Flow 1 failure path) — covered; cold-load explicitly waived with rationale ("no data to load"). Register: registration-received terminal state covered including the no-resend-affordance decision. Verify Email: verifying (with double-effect guard), verified, failed-with-inline-recovery, resend-requested (with cooldown indistinguishability and no-countdown rationale), no-token direct visit — all covered. Focus states covered in Accessibility Floor. Permission-denied N/A. This is thorough state work; one real hole:

### Findings
- **medium** Login has no client-side validation contract. "Field invalid" is scoped to "Register (client-side)" only, yet the Primary button rule says buttons are "never disabled merely because fields are empty — submit attempts trigger validation instead" for *every* form. For Login, what does an empty or malformed-email submit do — inline field errors like Register, or straight to the API and the generic banner? Either is defensible; neither is stated (EXPERIENCE.md State Patterns "Field invalid" row vs Component Patterns "Primary button" row). *Fix:* extend the Field invalid row to Login or add a row stating Login validates presence only / defers to the API.
- **low** Hero image load *failure* (as opposed to loading) is implicitly covered by the persistent `{colors.surface-container}` fallback fill; fine, no action.

## 5. Visual reference coverage — thin

Inventory: `imports/sign-in-horizon-travel.html` is the only visual reference (no `mockups/` or `wireframes/` yet — memlog records "key-screen mocks at finalize" and both spines are `status: draft`, so their absence is consistent, not a miss). No orphans: the import is in EXPERIENCE.md sources and exhaustively traced by `reconcile-sign-in-horizon-travel.md` (31 ideas, all accounted for, with the reconcile's two unlogged adaptations subsequently logged in the memlog).

### Findings
- **medium** Neither spine links the import inline by path. DESIGN.md says "the reference mock" 8+ times and EXPERIENCE.md similarly, but the filename `imports/sign-in-horizon-travel.html` appears only in EXPERIENCE.md frontmatter — and the spines-win-on-conflict rule (present in both example spines as "Spine wins on conflict") is stated nowhere. A consumer holding the mock and a diverging spine (e.g., button hover color, focus treatment — both deliberate adaptations) has no stated precedence (DESIGN.md Brand & Style; EXPERIENCE.md Foundation). *Fix:* one line in each Foundation/Brand section: "→ Reference: `imports/sign-in-horizon-travel.html` (Horizon Travel sign-in mock). Spines win on conflict."
- **low** When finalize-stage mocks land, each will need an inline link at the relevant section per the same convention — noting so the gate isn't forgotten.

## 6. Bloat & overspecification — strong

No pixel specs where tokens cover it — every dimension routes through the token table (even the card max-width is a named spacing token). No source restatement: the reconcile doc holds the mock-tracing, not the spines. DESIGN.md's editorial voice ("golden-hour coastline seen from a clean modern lobby") is within its license. EXPERIENCE.md prose is behavioral except inside Climax beats, where narrative is the format.

### Findings
- **low** The "already exists in `FE/src/index.css`" provenance claim is restated in four DESIGN.md sections (Brand & Style, Colors, Typography, Shapes). Once in Brand & Style would carry it (DESIGN.md body). *Fix:* optional trim.

## 7. Inheritance discipline — adequate

`sources` frontmatter resolves: both `imports/sign-in-horizon-travel.html` and `.memlog.md` exist. All EXPERIENCE.md token references resolve to DESIGN.md frontmatter by name. Component names are identical across all sections of both files. Code references verified: `FE/src/index.css` exists with matching values; `AuthForm.module.css` exists (at `FE/src/pages/`); backend copy ("Invalid email or password.", generic register message, 60s cooldown) matches the documented backend contract.

### Findings
- **high** Eleven [ASSUMPTION] tags remain across the pair (2 in DESIGN.md, 9 in EXPERIENCE.md) even though the memlog records "(decision by user) all nine assumptions accepted as drafted" plus two later assumption entries. The ratification lives only in `.memlog.md` — a downstream consumer extracting from the spine pair alone reads eleven decisions as *open*, and may re-litigate or block on them (e.g., the AppLayout routing change, the mobile hero treatment, the inline-SVG icon decision). The spines fail "every load-bearing decision committed" on the letter, not the substance (DESIGN.md Typography + Layout & Spacing; EXPERIENCE.md Foundation, IA, Voice and Tone, Component Patterns, State Patterns). *Fix:* strip the tags on ratified items, keeping the rationale sentences as plain decisions; reserve [ASSUMPTION] for genuinely open questions (of which there appear to be zero).
- **low** Pair-name mismatch: DESIGN.md is `Trip Planner — Horizon` (app-wide token system), EXPERIENCE.md is `Trip Planner Auth — Horizon` (auth scope). The scoping is real and each file explains it, but the names don't pair exactly; a naive consumer matching spines by `name` could stumble. *Fix:* optional — align names or note the pairing explicitly in each frontmatter.
- **low** `FE/src/assets` (named as the hero photo's home in both spines) does not exist yet. Forward-looking is fine, but the implementation story must create it and no story artifact is pointed at. *Fix:* none required in the spines; carry to story creation.

## 8. Shape fit — strong

DESIGN.md body sections are in exact canonical order: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. EXPERIENCE.md carries all eight required defaults in order (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows). Dropped defaults are defensible: Responsive & Platform is folded into Foundation + DESIGN.md Layout & Spacing (a single breakpoint, `md`, fully specified — a table would restate two sentences); Inspiration & Anti-patterns is optional and its work is done by the reconcile doc. No invented sections. IA table adds a Route column beyond the examples' shape — earns its place, since routes are contractual here (`returnTo`, token query param).

### Findings
- **low** DESIGN.md frontmatter carries `status`/`updated` keys not in the design-md-spec table. Harmless (EXPERIENCE convention bleeding over), but a strict resolver might reject them (DESIGN.md frontmatter). *Fix:* leave or move to body; cosmetic.
- **low** Both spines are `status: draft` while presenting as the finalized contract the memlog describes. Honest pre-gate, but the flip to `final` (with mocks) is the release condition — noting so it isn't skipped.

## Mechanical notes

- All `{path.to.token}` cross-references in both files resolve; none dangling. Nested-path references used correctly per spec.
- `EXPERIENCE.md` frontmatter sources use workspace-relative paths (`imports/…`, `.memlog.md`) — both resolve. The examples use `{planning_artifacts}` placeholders; no PRD exists for this run, so the memlog-as-source is the honest substitute.
- Component naming is consistent (kebab-case in frontmatter ↔ title case in prose, 1:1).
- `.working/` is empty; no stray artifacts. `reconcile-sign-in-horizon-travel.md` section-2 items (dark mode, placeholders, icons, hover/focus adaptations, checkbox recipe) were all subsequently resolved in `.memlog.md` — the loop is closed.
- Verified against code: `FE/src/index.css` hex/radii/shadow/motion values are byte-identical to the frontmatter claims; `AuthForm.module.css` lives at `FE/src/pages/` (spines cite it by bare filename — fine); `FE/src/assets` does not exist yet.
- Name pairing: `Trip Planner — Horizon` (DESIGN) vs `Trip Planner Auth — Horizon` (EXPERIENCE) — see §7.
