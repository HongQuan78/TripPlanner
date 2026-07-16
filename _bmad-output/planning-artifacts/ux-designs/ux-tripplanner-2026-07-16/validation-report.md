# UX Design Validation Report — tripplanner

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-16/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-tripplanner-2026-07-16/EXPERIENCE.md`
- **Run at:** 2026-07-16

## Overall verdict

This is a tight, downstream-ready spine pair: every `{path.to.token}` reference resolves, component names line up across both files, the DESIGN section order is canonical, and all eight EXPERIENCE defaults are present with genuinely load-bearing invented sections (Map / Open-Now / Nearby / Add-to-Trip / Data handling). A consumer can source-extract it cleanly and build. Flow, component, bloat, and inheritance discipline are all strong; token, state, visual-reference, and shape-fit coverage are adequate with fixable gaps. The one rubric finding with real teeth is contrast: the palette is asserted "AA verified" but two load-bearing muted grays (`label-muted`, `na`) fall below AA on white, and downstream code mirrors tokens verbatim. Two required-when-applicable sections triggered by the memlog (Responsive, Inspiration & Anti-patterns) are absent.

The accessibility lens sharpens that one crack into the report's dominant story. Where the rubric flagged two failing grays, the adversarial contrast audit measures **five** load-bearing text combinations below WCAG 2.1 AA — the `na` gray (2.45:1) and the amber star rating (2.02:1) fail even the 3:1 large/graphic threshold, and the teal taxonomy text, the open-now status badge, and the info-row keys all fail normal-text AA at 12px or smaller. The frontmatter's "Azure palette verified for AA text" claim is false as measured. Beyond contrast, the hero's legibility guarantee is asserted rather than engineered, the logged-out Add-to-Trip uses a `disabled` pattern that removes the whole conversion path from the tab order, and no focus-visible token exists to verify against 1.4.11. The spine is structurally sound but should be treated as **build-blocked on contrast and the hero scrim**.

## Category verdicts

- 1. Flow coverage — **strong**
- 2. Token completeness — **adequate**
- 3. Component coverage — **strong**
- 4. State coverage — **adequate**
- 5. Visual reference coverage — **adequate**
- 6. Bloat & overspecification — **strong**
- 7. Inheritance discipline — **strong**
- 8. Shape fit — **adequate**

## Findings by severity

### Critical (5)

1. **"Not available" / "No photo yet" gray unreadable at 2.45:1** — `na #9aa7b6` carries content the spec explicitly wants read ("absence is spoken"), yet it's invisible at any size. (DESIGN.md Colors; EXPERIENCE Voice/Data tables) *Fix:* darken to ≥4.5:1 (~`#6b7c8f`) and signal "soft" with italic + weight, not sub-threshold contrast.
2. **Star rating amber fails both graphic (3:1) and text (4.5:1)** — `#f0a92c` at 2.02:1; a rating is decision-relevant data on the nearby rail, not decoration. (DESIGN nearby-card rating-color; booking panel) *Fix:* amber only for the star fill on a darker plate, render the value in ink/slate; or darken the amber substantially.
3. **Open-now badge — the one status signal — fails AA on its own tint** — `#1f9d5b` is 3.48:1 on white, 3.11:1 on its actual 10% tint `#e9f5ef`, at 11px/700. (DESIGN open-now-badge) *Fix:* darken to ≥4.5:1 on the tint (~`#137a45`), or drop the tint and increase text size.
4. **Teal taxonomy text fails AA at 12px caps** — `#12a3a3` at 3.09:1 for the category eyebrow and nearby-card `kind` label; 12px disqualifies the large-text exemption. (DESIGN teal usage; typography label-caps) *Fix:* darken to ≥4.5:1 (~`#0d7d7d`) for text roles.
5. **Info-row keys in label-muted fail AA** — `#7a8aa0` at 3.52:1, 12px/700, are the "Address / Hours / Website" labels the row depends on. (DESIGN info-row label-color) *Fix:* darken to ≥4.5:1 (~`#5c6b80`).

### High (5)

1. **Load-bearing muted grays asserted AA-verified but fail AA on white** (rubric §2 Token completeness) — `label-muted` (~3.25:1) and `na` (~2.6:1) below AA 4.5:1 for normal text; both § Accessibility Floor and § Foundation assert the palette is AA-verified and downstream will mirror the tokens. (DESIGN.md frontmatter colors; EXPERIENCE.md § Accessibility Floor) *Fix:* darken `label-muted` to ≥ ~#5f7086 and `na` to ≥ ~#6b7a8c, or state exact ratios + text sizes and explicitly downgrade.
2. **Hero legibility guarantee is asserted, not engineered** — scrim darkens only the bottom ~60%; upper glyph mass and the eyebrow above the title land in the 0.05-alpha zone; no `text-shadow`, no minimum floor. (DESIGN hero scrim; EXPERIENCE Accessibility Floor) *Fix:* solid dark gradient floor across the text band, add text-shadow/halo, set white ≥4.5:1 at the top of the text block.
3. **Category eyebrow badge actively harms legibility** — `rgba(255,255,255,0.16)` fill + white text + `rgba(255,255,255,0.4)` border washes out over a light photo. (DESIGN hero) *Fix:* dark translucent plate (e.g. `rgba(6,24,40,0.55)`) or ink text on a solid light chip.
4. **No focus-visible indicator defined anywhere in DESIGN** — EXPERIENCE promises a ring on six controls but no color/width/offset token exists, so 1.4.11 can't be verified. (DESIGN; EXPERIENCE Accessibility Floor) *Fix:* define a focus token (2px ring + 2px offset) and verify ≥3:1 on every surface, including the blue button and photo.
5. **Disabled Add-to-Trip is the wrong pattern for the logged-out gate** — DESIGN "not clickable" vs EXPERIENCE `aria-disabled` conflict; a truly disabled button leaves the tab order and hides the whole conversion path from SR users. (DESIGN CTA; EXPERIENCE Add-to-Trip Flow) *Fix:* make it an enabled control routing to login with return-here, labeled "Log in to add to your trip"; visual-disabled styling only.

### Medium (7)

1. **No state for a failed authenticated Add-to-Trip action** (rubric §4 State coverage) — page-level errors cover only the detail load, not the add mutation. (EXPERIENCE.md § Add-to-Trip Flow, § State Patterns) *Fix:* add an add-failure beat (inline "Couldn't add — try again") and an already-added/duplicate treatment, or explicitly delegate downstream.
2. **No dedicated Responsive section despite a multi-surface product** (rubric §8 Shape fit) — breakpoint behavior is scattered and DESIGN points to a "behavioral breakpoint contract" section that doesn't exist. (DESIGN.md § Layout & Spacing; EXPERIENCE.md § Foundation) *Fix:* add a Responsive section consolidating the desktop↔mobile transition so DESIGN's pointer resolves.
3. **Touch targets unspecified or too small** — back control (13px chip, no min-height) and carousel dots fall short of 44×44px. (DESIGN back-control; carousel dots) *Fix:* explicit ≥44px hit areas for the back control, each carousel dot, and desktop arrows.
4. **Map keyboard operability claimed but fragile** — Leaflet needs container focus + `keyboard:true`; zoom has no keyboard equivalent unless +/− is focusable. (EXPERIENCE Map behavior) *Fix:* require focusable zoom buttons and container; verify OSM attribution link is tabbable and AA-legible.
5. **Map has no non-visual alternative for "where it is"** — marker's accessible name is just the attraction name; the spatial value is visual-only. (EXPERIENCE Map marker; Flow 1) *Fix:* ensure the Address row always carries the textual location; consider an SR-only summary.
6. **Reduced motion is unaddressed** — nothing scopes `prefers-reduced-motion` for hover lift, carousel transitions, or sticky-panel motion. (EXPERIENCE Interaction Primitives) *Fix:* add a reduced-motion clause disabling transitions/lifts and carousel slide animation.
7. **New-tab website link lacks a new-context warning** — `rel="noopener noreferrer"` set, but nothing announces the new tab (WCAG 3.2.5). (EXPERIENCE Website value) *Fix:* add a visible/aria "(opens in new tab)" affordance.

### Low (10)

1. **Flow 2 protagonist unnamed, no labeled climax** (rubric §1 Flow coverage) — uses "Resolution" instead. (EXPERIENCE.md § Key Flows, Flow 2) *Fix:* optionally name the visitor and label the return-and-add climax for parity; anonymity is defensible.
2. **Recurring fixed pixel values in prose, not tokenized** (rubric §2 Token completeness) — `340px` panel width (both files), `110px` label width, `11–13px` padding (DESIGN only). (DESIGN.md § Layout / § Components; EXPERIENCE.md § IA) *Fix:* add `components.booking-panel.width` (and optionally a label-width token) so files can't drift.
3. **"Not available" text treatment has no dedicated EXPERIENCE pattern row** (rubric §3 Component coverage) — behavior folded into Info row + Voice/Tone + Data table. (DESIGN.md § Components; EXPERIENCE.md § Component Patterns) *Fix:* acceptable as-is (text treatment, not interactive); no change needed unless strict row-parity is wanted.
4. **DESIGN.md never links the visual reference** (rubric §5 Visual reference coverage) — only EXPERIENCE.md does. (DESIGN.md § Layout / § Components) *Fix:* add an inline "→ Visual reference: `.working/directions-attraction-detail.html` (Azure section)" near Components.
5. **Chosen mockup lives in scratch `.working/`, not `mockups/`** (rubric §5) — a consumer scanning canonical folders could miss it. (repo layout) *Fix:* promote the Azure mockup into `mockups/` if it's a durable contract reference.
6. **No Inspiration & Anti-patterns section despite named lineage and rejections** (rubric §8 Shape fit) — Airbnb booking-panel lineage and share/save + Terra/Lumen rejections unrecorded. (EXPERIENCE.md; .memlog.md) *Fix:* add a short Inspiration & Anti-patterns section.
7. **Card/panel boundaries rely on a sub-3:1 hairline** — `#d7e1ea` at 1.33:1 on white, 1.23:1 on canvas; edges near-invisible to low-vision users. (DESIGN hairline) *Fix:* darken toward ~3:1 or accept a soft shadow on more surfaces.
8. **Optional hero location line is small semi-transparent white over photo** — 92% opacity, 500 weight, compounds the hero-scrim risk. (DESIGN hero) *Fix:* full-opacity white in the guaranteed-scrim band, or treat as non-essential.
9. **Disabled-button text is 1.4.3-exempt but should read gated, not dead** — at 2.02:1; if the enabled-control fix is adopted styling should read interactive-but-gated. (DESIGN disabled state) *Fix:* keep the paired "Log in" link (`primary`, 4.86:1) as the focusable, high-contrast affordance.
10. **Confirm heading hierarchy renders as promised** — name = single `<h1>`, section labels = `<h2>`, booking-panel repeated name must not compete as `<h1>`. (DESIGN panel-title; EXPERIENCE heading intent) *Fix:* ensure `panel-title` emits a non-heading or `<h2>`/`<p>`.

## Reviewer files

- `review-rubric.md` — eight-category spine-pair rubric walk
- `review-accessibility.md` — adversarial WCAG 2.1 AA accessibility review
