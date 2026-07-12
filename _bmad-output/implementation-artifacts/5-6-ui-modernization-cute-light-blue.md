---
baseline_commit: 22d4621a162ba47d6f2761079ea63254de5a68eb
---

# Story 5-6: UI modernization — cute light-blue design system

Status: review

## Story

As a user, I want the app to have a modern, friendly, "cute" visual style built around a light-blue palette, so browsing and planning trips feels delightful and cohesive. This story establishes the design system (tokens + shared styles) and restyles every screen that already exists; stories 5-3, 5-4, and 5-5 build their new screens on the same system.

## Acceptance Criteria

1. **Design tokens:** `FE/src/index.css` defines CSS custom properties on `:root` for the palette, radii, shadows, and typography (see Dev Notes for the exact token set). All component CSS modules consume tokens via `var(--…)` — no new hard-coded hex colors in module files.
2. **Typography:** the app uses the Nunito font (rounded, friendly) loaded via Google Fonts in `FE/index.html`, falling back to the existing system stack. Headings are bold with slightly tightened letter spacing.
3. **App shell:** the page background is the soft light-blue wash (`--color-bg`); the header becomes a floating rounded "pill" bar (white surface, soft shadow, rounded corners, small margin from viewport edges) with the brand shown as ✈️ + name in the primary color; nav links get a rounded hover background; the logout button is a pill-shaped soft-blue button.
4. **Buttons:** primary actions are pill-shaped (`--radius-full`), filled with the primary sky blue, white text, with a gentle hover lift (slight translateY + shadow) and a pressed state; secondary actions are soft (light-blue background, primary-dark text). Disabled state stays visibly muted with no lift.
5. **Forms (login/register/verify screens):** the auth form sits in a white rounded-2xl card with a soft shadow, centered on the wash background; inputs have rounded corners (`--radius-md`), a light border, and a sky-blue focus ring; error and success messages become rounded soft-tinted callouts (rose tint for errors, mint tint for success) with a small emoji/icon prefix.
6. **Home and NotFound pages:** restyled as friendly centered states on the wash background — a large emoji, a heading, and helper text in muted ink; NotFound offers a pill button back home.
7. **No behavior changes:** routes, form logic, validation, auth flows, and all component APIs are untouched; every existing unit test passes without modification (style-only test updates are allowed only if a test asserts a class name or style detail, and must be noted in the Change Log).
8. `npm run build`, `npm test`, and `npm run lint` are green.

## Tasks / Subtasks

- [x] Task 1: Design tokens + global styles (AC: 1, 2)
  - [x] Add the token set from Dev Notes to `:root` in `index.css`; set body background to `--color-bg` and text to `--color-ink`
  - [x] Add Nunito `<link>` tags to `index.html`; update the `font-family` stack
- [x] Task 2: App shell restyle (AC: 3, 4)
  - [x] Rework `AppLayout.module.css`: wash background, floating rounded header bar, brand with ✈️, rounded nav-link hover, pill logout button
- [x] Task 3: Auth screens restyle (AC: 4, 5)
  - [x] Rework `AuthForm.module.css`: card container, token-based inputs with focus ring, pill submit button with hover/pressed/disabled states, tinted rounded callouts for error/success/hint
- [x] Task 4: Home + NotFound restyle (AC: 6)
  - [x] Centered friendly states with emoji, heading, muted text; NotFound pill link home (extract a shared CSS module if useful)
- [x] Task 5: Verify (AC: 7, 8)
  - [x] Full `npm test` green with no logic changes; `npm run build` and `npm run lint` green; visually sanity-check each screen via `npm run dev`

## Dev Notes

### Design system — "cute sky" (authoritative for ALL Epic 5 stories)

Palette (Tailwind sky/slate-derived, light theme only):

```css
:root {
  --color-primary: #38bdf8;        /* sky-400 — main brand color */
  --color-primary-strong: #0ea5e9; /* sky-500 — hover/active fills */
  --color-primary-dark: #0369a1;   /* sky-700 — text on light-blue tints */
  --color-primary-soft: #e0f2fe;   /* sky-100 — soft fills, hovers, tags */
  --color-bg: #f0f9ff;             /* sky-50 — page wash */
  --color-surface: #ffffff;        /* cards, header */
  --color-ink: #0f172a;            /* slate-900 — primary text */
  --color-ink-muted: #64748b;      /* slate-500 — secondary text */
  --color-border: #bae6fd;         /* sky-200 — borders, dividers */
  --color-danger: #e11d48;         /* rose-600 */
  --color-danger-soft: #ffe4e6;    /* rose-100 */
  --color-success: #059669;        /* emerald-600 */
  --color-success-soft: #d1fae5;   /* emerald-100 */
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1.25rem;
  --radius-full: 999px;
  --shadow-soft: 0 4px 16px rgba(14, 165, 233, 0.12);
  --shadow-lift: 0 8px 24px rgba(14, 165, 233, 0.18);
  --font-sans: 'Nunito', system-ui, 'Segoe UI', Roboto, sans-serif;
}
```

Component conventions:

- **Cards** (auth card, attraction cards, trip cards, day sections): `--color-surface`, `--radius-lg`, `--shadow-soft`, `1px solid --color-border`; interactive cards lift on hover (`translateY(-2px)` + `--shadow-lift`).
- **Primary buttons:** pill (`--radius-full`), `--color-primary` fill, white text, weight 700; hover → `--color-primary-strong` + slight lift; disabled → `#cbd5e1`, no lift.
- **Secondary/ghost buttons:** `--color-primary-soft` fill, `--color-primary-dark` text, pill shape.
- **Inputs:** `--radius-md`, `1px solid --color-border`, focus ring `2px solid --color-primary`.
- **Tags/badges** (kinds, ratings, City/Country labels): pill chips in `--color-primary-soft` with `--color-primary-dark` text, 0.75–0.8rem.
- **Callouts:** error = `--color-danger-soft` bg + `--color-danger` text; success = `--color-success-soft` bg + `--color-success` text; both `--radius-md`, no harsh borders.
- **Empty/loading/error states:** friendly and cute — a large emoji (🔍 empty search, 🗺️ no attractions, 🧳 no trips, ⛅ service unavailable, 🙈 not found), a bold heading, muted helper text, and a pill action when there is one.
- Spacing rhythm: multiples of 0.25rem; page content max-width ~72rem, centered.

### Implementation notes

- Google Fonts Nunito (weights 400/600/700/800) via `<link rel="preconnect">` + stylesheet `<link>` in `index.html` — the standard embed, no npm package.
- Keep CSS modules per component; only `index.css` holds `:root` tokens and element resets. No CSS framework or new dependencies.
- Behavior freeze: JSX changes limited to className/static presentation (e.g. adding the ✈️ emoji, wrapper divs); no logic, routing, or API changes.
- Existing tests query by role/label/text, so restyling should not break them; if one asserts markup incidentally, prefer fixing the test's query.
- Stories 5-3/5-4/5-5 reference this section as their style source of truth — do not restyle their screens here (they don't exist yet).
- Project rules: no comments; braces everywhere; CSS modules.

## Dev Agent Record

### Debug Log

- Baseline before restyle: 46/46 tests green. Re-ran after each task; final run 46/46 green, `npm run build` green, `npm run lint` shows only the pre-existing fast-refresh warning in `AuthContext.tsx` (file untouched by this story).

### Completion Notes

- Added the full "cute sky" token set to `:root` in `index.css` (palette, radii, shadows, `--font-sans`), applied the sky-50 wash as body background, bold tightened headings, and Nunito (400/600/700/800) via Google Fonts links in `index.html`.
- App shell: header is now a floating rounded surface bar with soft shadow and margins; brand renders ✈️ (aria-hidden) + name in sky-500; nav links get pill hover backgrounds; logout is a soft-blue pill with hover lift; content is centered at max-width 72rem.
- Auth screens: `AuthForm.module.css` now renders the form in a white rounded card with soft shadow; inputs use `--radius-md` + sky focus ring; submit is a pill primary button with hover lift, pressed, and muted disabled states; error/success callouts are borderless soft-tinted rounded blocks with 🙈/🎉 prefixes added via CSS `::before` (no JSX changes, so tests untouched).
- Home and NotFound rebuilt as centered friendly states sharing a new `PageState.module.css` (large emoji, bold heading, muted text; NotFound gets a pill "Go back home" link). Copy unchanged.
- Zero behavior changes: only className/static-markup JSX edits (brand emoji span, page-state wrappers); no test was modified. No hard-coded hex remains in module CSS except the spec-sanctioned `#cbd5e1` disabled fill.

## File List

- FE/index.html
- FE/src/index.css
- FE/src/layout/AppLayout.module.css
- FE/src/layout/AppLayout.tsx
- FE/src/pages/AuthForm.module.css
- FE/src/pages/PageState.module.css (new)
- FE/src/pages/HomePage.tsx
- FE/src/pages/NotFoundPage.tsx

## Change Log

- 2026-07-12: Implemented the cute-sky design system and restyled app shell, auth screens, home, and 404. Style-only change; all 46 existing tests pass unmodified. No test updates were needed (AC7 note: none required).
