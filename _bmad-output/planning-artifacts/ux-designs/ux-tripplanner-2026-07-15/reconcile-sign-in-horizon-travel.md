---
name: Reconciliation — sign-in-horizon-travel.html
import: imports/sign-in-horizon-travel.html
against:
  - DESIGN.md
  - EXPERIENCE.md
  - .memlog.md
status: complete
updated: 2026-07-15
---

# Reconciliation: Horizon Travel sign-in mock → finalized spines

Every distinct visual/behavioral idea in the imported mock, traced to where it landed (or didn't). "Adapted" means the idea is covered but the spines substituted an equivalent value; the substitution is noted.

## 1. Coverage table

| # | Idea in the mock | Where in the mock | Landed? | Where / decision |
|---|---|---|---|---|
| 1 | 50/50 split viewport — hero left, form right at `md+` (`md:w-1/2` twice) | body layout | **Both** | DESIGN "Layout & Spacing" split viewport; EXPERIENCE "Foundation" |
| 2 | Hero hidden entirely below `md` (`hidden md:flex`), card owns the mobile screen | hero wrapper | **Both** | DESIGN layout + Do/Don't row; EXPERIENCE Foundation — carried with an explicit [ASSUMPTION] tag (mobile treatment not user-confirmed) |
| 3 | Full-bleed cover photo, welcome copy pinned bottom-left inside a 40px inset (`p-margin`) | hero panel | **Both** | DESIGN hero-panel component + layout (40px inset named); EXPERIENCE hero panel row |
| 4 | Bottom-up gradient overlay, ink at 80% → transparent (`from-on-background/80 via-transparent`) | hero overlay | **Both** | DESIGN `{components.hero-panel}` overlay + "Elevation & Depth"; EXPERIENCE references `{components.hero-panel}` |
| 5 | `surface-container` fill behind the hero photo (loading fallback) | hero wrapper bg | **Both** | DESIGN colors section; EXPERIENCE hero panel behavioral rules |
| 6 | Auth card: white surface, `rounded-xl`, `shadow-sm`, hairline `outline-variant/30` border, `max-w-[420px]`, generous padding | card wrapper | **DESIGN** (adapted) | `{components.auth-card}` — max-width adapted from 420px to 26rem (416px, the width `AuthForm.module.css` already establishes); reduced-opacity hairline carried in "Elevation & Depth" |
| 7 | Brand wordmark centered at card top, `headline-lg` bold in primary ("Horizon"), with the mock's comment framing it as the nav fallback | card header | **Both** (extended) | DESIGN auth-card anatomy; EXPERIENCE adds behavior the mock lacks — wordmark links to `/` as the way back |
| 8 | Centered title + one-line muted subtitle ("Sign In" / "Please enter your details to continue.") | card header | **Both** | DESIGN auth-card anatomy; EXPERIENCE Voice and Tone carries the subtitle copy verbatim as a Do example |
| 9 | Input anatomy: 48px height, white fill, `outline-variant` 1px border, leading icon (mail / lock) in `outline`, left padding making room | email + password fields | **DESIGN** | `{components.input}` — 3rem = 48px, same icon color role |
| 10 | Input focus: `focus:border-primary focus:ring-1 focus:ring-primary` | inputs | **DESIGN** (adapted) | Focus carried as the app's existing 2px `{colors.primary}` outline instead of border-swap + 1px ring — normalized to the global `index.css` focus treatment |
| 11 | Password visibility toggle: trailing icon button in `outline`, hover → primary | password field | **Both** | DESIGN password-input component; EXPERIENCE adds full behavior (flips type, preserves value, accessible name + `aria-pressed`) with [ASSUMPTION] tag |
| 12 | "Remember me" custom checkbox (appearance-none, checked fill, overlay check glyph) | form row | **Deliberately dropped** | memlog: "(decision by user) omit reference features the backend cannot honor — no Remember me…; adopt visual language only, no dead UI". EXPERIENCE bans it explicitly in Interaction Primitives; the custom checkbox style falls with it |
| 13 | "Forgot Password?" link | form row | **Deliberately dropped** | Same memlog decision; banned in EXPERIENCE Interaction Primitives |
| 14 | Google / Apple social login buttons (48px outlined, logo + label, hover fill) | below divider | **Deliberately dropped** | Same memlog decision; banned in EXPERIENCE Interaction Primitives |
| 15 | "Or continue with" hairline divider | between form and social | **Deliberately dropped** (dependent) | Exists only to introduce social login; falls with the memlog social-login drop. DESIGN's "one primary action per card" leaves it no role |
| 16 | Primary button: full-width, 48px, `rounded-lg`, tracked `label-lg` text, `shadow-sm` | submit | **DESIGN** | `{components.button-primary}` — 3rem height, same radius/typography roles; height parity with inputs preserved (both 3rem) |
| 17 | Button press feedback `active:scale-[0.98]` | submit | **DESIGN** | button-primary spec: "active → scale 0.98" |
| 18 | Button hover `hover:bg-surface-tint` | submit | **DESIGN** (adapted, unlogged) | DESIGN hovers to `{colors.primary-container}` (#0070eb, "lighter and more saturated") instead of the mock's `surface-tint` (#005bc1). Reasonable, but the substitution is not recorded in the memlog — see section 2 |
| 19 | Link styling: primary color, hover → `primary-container`, semibold action inside a muted sentence ("Don't have an account? Sign Up") | footer | **Both** | DESIGN cross-link footer component; EXPERIENCE cross-link footer rules (one sentence, one link) |
| 20 | Top nav suppressed with rationale comment ("linear/transactional screen") | HTML comment | **EXPERIENCE** | Foundation [ASSUMPTION]: auth routes move outside `AppLayout`; rationale carried, memlog notes the flag |
| 21 | Footer suppressed with rationale comment ("focus purely on authentication") | HTML comment | **EXPERIENCE** | Same Foundation assumption covers both suppressed chrome pieces |
| 22 | `darkMode: "class"` Tailwind hook + `<html class="light">` | tailwind config / html tag | **Silently dropped** | No dark-mode mention in DESIGN, EXPERIENCE, or memlog — see section 2 |
| 23 | Plus Jakarta Sans as the single family | font link + config | **DESIGN** | Typography section: one family everywhere, weight/tracking contrast |
| 24 | Semantic type scale (display-sm 48/700, headline-lg 32/700, headline-md 24/600, body-lg 18, body-md 16, label-lg 14/600/+0.05em, label-sm 12/500) | tailwind config | **DESIGN** | Carried role-for-role; `display-sm` flagged [ASSUMPTION] as net-new (not yet in `index.css`). Mock's unused-on-this-screen `display-lg` (64px) intentionally not carried |
| 25 | Material 3 tonal token palette (surface ramp, on-pairs, outline pair, error pair) | tailwind config colors | **DESIGN** | Full colors frontmatter; memlog insight confirms `index.css` already holds identical hex values. DESIGN extends with a success pair the mock lacks |
| 26 | Spacing tokens (unit-xs 4px … unit-2xl 80px, margin 40px, gutter 24px) | tailwind config | **DESIGN** (adapted) | Renormalized to the app's rem-based 4px-grid scale `{spacing.1}`–`{spacing.8}`; 40px hero inset and gutter intent preserved |
| 27 | Radius tokens (0.25 / 0.5 / 0.75rem / full) | tailwind config | **DESIGN** | Shapes section, identical values from `index.css` |
| 28 | Hero welcome copy "Welcome Back." / "Your next extraordinary journey begins right where you left off." | hero text | **EXPERIENCE** | Voice and Tone — carried verbatim for Login, extended with per-surface variants for Register and Verify Email |
| 29 | `transition-colors` micro-transitions on inputs, buttons, links | throughout | **DESIGN** | Motion paragraph: `--duration-fast` hovers/focus, reduced-motion collapse |
| 30 | Native `required` attributes on inputs | inputs | **EXPERIENCE** (superseded) | Replaced by an explicit validation contract: validate on submit, error under field, focus to first invalid — stronger than the mock's browser-native behavior |
| 31 | Mobile form panel `min-h-screen`, card vertically centered | form panel | **DESIGN** | Layout: single column, vertically centered below `md` |

**Tally:** 31 distinct ideas — 26 covered (across DESIGN and/or EXPERIENCE, including adapted items), 4 deliberately dropped per the memlog decision, 1 silently dropped outright (#22), plus 2 unlogged adaptations flagged below (#10, #18).

## 2. Dropped qualitative ideas

Items the mock carries that the spines neither adopted nor explicitly rejected. Each needs a decision (adopt, or record the rejection in the memlog).

1. **Dark-mode class hook.** The mock configures `darkMode: "class"` and stamps `<html class="light">` — a deliberate seam for a future dark theme. Neither spine mentions dark mode anywhere, and the memlog records no decision. If Horizon is light-only by intent, say so; if not, the token layer should reserve the seam now (a `[data-theme]`/class hook on the CSS custom properties) because retrofitting is costlier than reserving.
2. **Placeholder copy conventions.** The mock establishes a placeholder voice — a friendly example address `hello@example.com` for email, `••••••••` masking dots for password, both in a dedicated muted placeholder color (`placeholder-outline-variant`). EXPERIENCE specifies labels, helper text, and error copy but is silent on placeholders entirely: whether fields have them, what they say, and what color role they use. Undecided.
3. **Icon delivery mechanism.** The mock ships Material Symbols Outlined via Google Fonts with tuned `font-variation-settings`. The spines name the glyphs (mail, lock, visibility) and their color role but never say where icons come from — significant for an app with no component library and no icon dependency today (inline SVG vs. icon font vs. package). Undecided.
4. **Button hover target divergence (unlogged adaptation).** Mock: hover → `surface-tint` (#005bc1, a shade darker than primary). DESIGN: hover → `primary-container` (#0070eb, brighter), with a stated rationale ("catches light"). Likely an improvement, but it contradicts the import and no memlog entry records the choice — worth one line in the memlog so it reads as intent, not drift.
5. **Input focus treatment divergence (unlogged adaptation).** Mock: keep 1px border, swap its color to primary, add a 1px ring. DESIGN: the app's existing 2px primary outline. Normalizing to the global focus style is sound, but the departure from the import is unrecorded.
6. **Custom checkbox visual pattern.** The mock's appearance-none checkbox with an overlaid filled check glyph is a reusable control recipe. It died as collateral of the Remember-me drop (memlog), which is fine for auth — but if checkboxes appear elsewhere in the app later, the recipe was never banked. Optional: note it as future-reference or let it go explicitly.

Items checked and confirmed **not** dropped: `active:scale-[0.98]` press feedback (DESIGN button-primary), 48px input/button height parity (both 3rem in DESIGN), reduced-opacity card hairline (DESIGN Elevation), hero copy verbatim (EXPERIENCE), suppressed nav/footer rationale (EXPERIENCE Foundation).
