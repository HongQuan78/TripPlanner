# Accessibility Review — Trip Planner Attraction Detail

## Overall verdict

The behavioral spine is unusually accessibility-literate for a draft — landmarks, heading order, aria-disabled semantics, "absence is spoken," keyboard reachability and 44px targets are all named in the EXPERIENCE Accessibility Floor. But the DESIGN palette writes checks the floor can't cash: five load-bearing text combinations fail WCAG 2.1 AA for normal text, and two of them (the amber rating value and the "Not available" gray) fail even the 3:1 large/graphic threshold. The self-congratulatory frontmatter claim "Azure palette verified for AA text on its intended surfaces" is false as measured, and the hero's legibility guarantee is asserted, not engineered. Treat contrast and the hero scrim as blockers before build.

## Contrast table

Thresholds: normal text 4.5:1, large text (≥24px, or ≥18.66px bold) 3.0:1, UI components/graphics 3.0:1.

| Combination | Ratio | AA normal | AA large | Verdict / real use |
|---|---|---|---|---|
| ink `#0f2540` on canvas `#f4f7fa` | 14.37 | Pass | Pass | PASS |
| ink `#0f2540` on white `#ffffff` | 15.45 | Pass | Pass | PASS |
| slate `#45566b` on white | 7.51 | Pass | Pass | PASS (lead/meta) |
| label-muted `#7a8aa0` on white | 3.52 | **Fail** | Pass | FAIL — used at 12px/700 caps (info-row keys), not large text |
| na `#9aa7b6` on white | 2.45 | **Fail** | **Fail** | FAIL — "Not available" + "No photo yet" captions |
| primary `#1a73c7` as link on white | 4.86 | Pass | Pass | PASS (barely) |
| white on primary `#1a73c7` button | 4.86 | Pass | Pass | PASS (barely) |
| teal `#12a3a3` text on white | 3.09 | **Fail** | Pass | FAIL — category eyebrow + kind label at 12px, not large |
| open-now `#1f9d5b` text on white | 3.48 | **Fail** | Pass | FAIL — badge text is 11px/700 |
| open-now `#1f9d5b` on 10% tint `#e9f5ef` | 3.11 | **Fail** | Pass | FAIL — actual badge context, 11px, worse than on white |
| star `#f0a92c` on white | 2.02 | **Fail** | **Fail** | FAIL — glyph fails 3:1 graphic; value fails as 12px text |
| disabled fg `#9aa7b6` on disabled surface `#e3eaf1` | 2.02 | **Fail** | **Fail** | Disabled text is 1.4.3-exempt, but see High finding |
| white title over scrim-strong over a WHITE photo | 7.19 | Pass | Pass | PASS only at the darkest gradient stop; see hero finding |
| white title over scrim base solid `#061828` | 17.96 | Pass | Pass | PASS (no-photo/dark-photo case) |
| primary `#1a73c7` marker vs white ring (graphic) | 4.86 | — | — | PASS 3:1 |
| hairline `#d7e1ea` on white (border) | 1.33 | — | — | FAIL 3:1 if border is the sole boundary cue |
| hairline `#d7e1ea` on canvas | 1.23 | — | — | FAIL 3:1 (see Low) |

## Findings

### Critical

- The `na` gray (`#9aa7b6`, 2.45:1) carries "Not available" and "No photo yet" — genuine content the spec explicitly wants read ("absence is spoken, not silent"), yet it's unreadable at any size (DESIGN.md Colors; EXPERIENCE Voice/Data tables). The intent ("visibly softer, honestly absent") is legitimate, but 2.45 defeats the goal by making it invisible, not soft. Fix: darken to ≥4.5:1 (around `#6b7c8f` or darker) and signal "soft" with italic + weight, not with sub-threshold contrast.
- The star rating (`#f0a92c`, 2.02:1) fails both the 3:1 graphic threshold for the ★ glyph and the 4.5:1 text threshold for the numeric value it colors (DESIGN nearby-card `rating-color`, booking panel). A rating is decision-relevant data on the nearby rail, not decoration. Fix: use amber only for the star fill on a darker plate, and render the numeric value in ink/slate; or darken the amber substantially (amber rarely clears 4.5 on white — reserve it for a large glyph paired with a dark value).
- The open-now badge text (`#1f9d5b`) is 3.48:1 on white and 3.11:1 on its own 10% tint (`#e9f5ef`) — its actual rendered background — at 11px/700 (DESIGN open-now-badge). The one status signal on the page fails normal-text AA. Fix: darken the green to ≥4.5:1 on the tint (around `#137a45`), or drop the tint and increase the text size; keep the dot decorative as planned.
- Teal taxonomy text (`#12a3a3`, 3.09:1) is used for the category eyebrow (hero + panel) and the nearby-card `kind` label, both at 12px caps (DESIGN teal usage; typography label-caps). Fails normal AA; the 12px size disqualifies the large-text exemption. Fix: darken teal to ≥4.5:1 (around `#0d7d7d`) for any text role, keeping the brighter teal for non-text accents only.
- Info-row keys in `label-muted` (`#7a8aa0`, 3.52:1) at 12px/700 (DESIGN info-row `label-color`) are the "Address / Hours / Website" labels — the row's meaning depends on them. Fails normal AA. Fix: darken to ≥4.5:1 (around `#5c6b80`).

### High

- The hero legibility guarantee is asserted but not engineered. The scrim is `linear-gradient(scrim-soft 40% → scrim-strong)`, i.e. only the bottom ~60% darkens and the top 40% is near-transparent (0.05 alpha). White title text at 42px/800 is tall and bottom-anchored, but its upper glyph mass — and especially the category eyebrow badge sitting *above* the title — can land in the weak-scrim zone. Over a bright/white photo, white text there approaches 1:1. The claim "darkens the lower third so overlaid text stays AA-legible over any photo" is only true for content pinned to the very bottom. No `text-shadow` and no minimum guaranteed floor are specified. Fix: specify a solid dark gradient floor (e.g. `scrim-strong` reaching the full text band, not 0.05→0.72), add a `text-shadow`/`text-halo` on the title and eyebrow, and set a measurable minimum (white ≥4.5:1) at the top of the text block, not just the bottom.
- The category eyebrow badge actively harms legibility: `rgba(255,255,255,0.16)` fill with white text and a `rgba(255,255,255,0.4)` border (DESIGN hero). A translucent-white plate under white text adds nothing over a light photo and washes the text out. Fix: use a dark translucent plate (e.g. `rgba(6,24,40,0.55)`) behind the eyebrow so white text has a guaranteed dark backing, or ink text on a solid light chip.
- No focus-visible indicator is defined anywhere in DESIGN. EXPERIENCE promises "a visible focus ring" on Back, carousel controls, map, each nearby card, the external link, and Add-to-Trip, but no ring color, width, or offset token exists, so it can't be verified against the 3:1 non-text-contrast rule (WCAG 1.4.11) — and a default UA outline on white/photo/blue-button backgrounds will contrast inconsistently. Fix: define a focus token (e.g. 2px ring + 2px offset in `primary` or a dark ink) and verify ≥3:1 against every surface it lands on, including the blue button and the photo.
- Disabled Add-to-Trip is the wrong pattern for the logged-out gate. DESIGN says "not clickable, cursor: not-allowed," while EXPERIENCE says use `aria-disabled` with a why-name. These conflict: a truly `disabled` button is removed from the tab order and many SR users never encounter it, so the "Log in to add to your trip" rationale is only discoverable if they happen onto the adjacent note. The gate is the whole logged-out conversion path. Fix: make it an *enabled* control (button or link) that routes to login with return-here, labeled "Log in to add to your trip." This is keyboard-focusable, announced, and actionable in one step; reserve visual "disabled" styling only. Tradeoff: it looks inactive but behaves active — acceptable and standard for auth gates, and strictly better than a dead, unfocusable button.

### Medium

- Touch targets are unspecified or too small. The back control is a 13px-text chip with 4px radius and no min-height (DESIGN back-control); carousel dot indicators are inherently small; both will fall short of 44×44px unless padded. EXPERIENCE only asserts the sticky-bar CTA and nearby cards meet 44px. Fix: set explicit ≥44px hit areas (padding/invisible hit slop) for the back control, each carousel dot, and desktop carousel arrows.
- Map keyboard operability is claimed but fragile. Leaflet is keyboard-pannable only when the container has focus and `keyboard: true`, and pinch-zoom/scroll-zoom have no keyboard equivalent unless the +/− zoom control is focusable. Fix: require focusable zoom buttons and a focusable map container in the spec, and confirm the OSM attribution link is in the tab order and legible at AA (verify its rendered color meets 4.5:1 — Leaflet's default attribution gray often doesn't).
- The map has no non-visual alternative for "where it is." The marker's accessible name is just the attraction name (EXPERIENCE) — it conveys no location or distance to a SR user, and the page's spatial value ("gauge how far from my guesthouse," Flow 1) is visual-only. Fix: ensure the Address info row always carries the textual location, and consider an SR-only summary (e.g. "Map showing <name> at <area>").
- Reduced motion is unaddressed. EXPERIENCE bans auto-advance (good) but nothing scopes `prefers-reduced-motion` for the nearby-card hover lift, carousel frame transitions, or sticky-panel motion. Fix: add a reduced-motion clause that disables transitions/lifts and any carousel slide animation.
- New-tab website link lacks a new-context warning (WCAG 3.2.5 / consumer best practice). `rel="noopener noreferrer"` is set, but nothing tells sighted or SR users the link opens a new tab. Fix: add a visible/aria "(opens in new tab)" affordance on the Website value.

### Low

- Card/panel boundaries rely on a `#d7e1ea` hairline at 1.33:1 on white and 1.23:1 on canvas, and the white-surface-on-canvas tonal delta is also tiny. DESIGN leans on "tonal contrast + hairline, not shadow," but neither cue reaches 3:1, so container edges are near-invisible to low-vision users. Not a strict failure (boundaries aren't the only content cue) but weak. Fix: darken the hairline toward ~3:1 or accept the single soft shadow on more surfaces.
- The optional hero location line is white at 92% opacity in 500 weight (DESIGN hero) — small, semi-transparent white over photo compounds the hero-scrim risk above. Fix: full-opacity white and include it in the guaranteed-scrim band, or treat as non-essential.
- Disabled-button text at 2.02:1 is technically 1.4.3-exempt, but if the enabled-control fix above is adopted the styling should still read as clearly interactive-but-gated rather than dead; ensure the paired "Log in" link (`primary`, 4.86:1) remains the focusable, high-contrast affordance.
- Confirm heading hierarchy renders as promised: name = single `<h1>`, section labels ("Location", "Details", "Nearby attractions") = `<h2>` in reading order, and the booking-panel repeated name is not a competing `<h1>` (should be a non-heading or `<h2>`/`<p>`). EXPERIENCE states the intent; DESIGN's `panel-title` must not emit a second `<h1>`.
