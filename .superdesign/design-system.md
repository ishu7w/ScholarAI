# ScholarAI — Design System

## Product context

ScholarAI is an AI-powered scholarship intelligence platform. It matches students with scholarships using a fully explainable, deterministic scoring engine (10 published weights) and gives institutions an auditable applicant ranking. Demo build: fake auth, deterministic seed data, no backend.

**Key pages:** landing `/`, auth (`/login`, `/register`, `/forgot-password`), dashboards (`/dashboard/student`, `/dashboard/institution`, `/dashboard/admin`), scholarship explorer (`/scholarships`, `/scholarships/[id]`), resume analyzer (`/resume-analyzer`).

**JTBD:** students — "find scholarships I can actually win and understand why"; institutions — "rank applicants fairly with an audit trail"; both — trust through explainability.

## Core visual system (site-wide, dark)

Permanently dark, premium glassmorphism. No light mode.

- **Colors:** background `#05060a`, surface `#0a0c14`, surface-2 `#10131f`, foreground `#f4f5f7`, muted `#9299ab`, border `rgba(255,255,255,0.08)`, primary violet `#6d5cff` (bright `#8b7cff`), accent cyan `#22d3ee`, success `#34d399`, warning `#fbbf24`, danger `#f87171`.
- **Gradients:** brand text `linear-gradient(120deg, #8b7cff 0%, #22d3ee 60%, #34d399 100%)`; buttons `linear-gradient(135deg, #6d5cff, #5a3fe0)`; progress `linear-gradient(90deg, #6d5cff, #22d3ee)`.
- **Fonts:** Inter (body), Space Grotesk (display/headings/numbers), Geist Mono (mono/code). Loaded via next/font CSS variables.
- **Radius:** 8px small controls, 12px inputs/buttons, 16px cards/navbar, 24px auth card, pills full.
- **Surfaces:** `.glass` (white 4% + blur 20px + white 8% border), `.glass-strong` (rgba(16,19,31,.75) + blur 28px). Grid background `.grid-bg` (64px lines, white 3.5%, radial mask).
- **Glow/shadow:** violet glows only — `0 0 40px -8px rgba(109,92,255,.5)`; card hover lifts `-4px` with `0 20px 50px -20px rgba(109,92,255,.35)`.
- **Motion:** signature easing `cubic-bezier(0.22,1,0.36,1)`; GSAP + ScrollTrigger + SplitText on landing; Lenis smooth scroll; Framer Motion for micro-interactions; global `prefers-reduced-motion` kill switch.
- **Utility primitives (globals.css):** `.glass`, `.glass-strong`, `.text-gradient`, `.grid-bg`, `.glow-primary`, `.card-hover`, `.input-premium`, `.btn-primary`, `.btn-ghost`, `.badge`.

## Sub-theme: "Editions" paper catalogue (scoped to /catalogue showcase page ONLY)

A deliberate editorial counterpoint to the dark system, used only on the Scholarship Catalogue showcase page. Never mix these tokens into the dark pages.

- **Palette:** ground `#E8E6DF`, secondary ground `#DEDBD2`, ink `#151515`, secondary ink `#494844`, muted `#75736C`, vermilion `#C4442C` (markers, active states, progress spine ONLY — never a filled area), hairlines `rgba(21,21,21,.16)`.
- **Typography:** 'Familjen Grotesk' 500–700 uppercase for headings, letter-spacing -.03em to -.035em; 'Spline Sans Mono' 400–600 at 9.5–11.5px, letter-spacing .12em–.14em for all labels/body/small type.
- **Signature:** every major headline mixes SOLID and OUTLINED words in the same line (outline = `color: transparent` + `-webkit-text-stroke`).
- **Rules:** border-radius 0 everywhere; NO gradients, NO glows, NO bento grids, NO rounded cards, NO drop shadows.
- **Structure:** 2px fixed progress spine across top of viewport (fills vermilion with scroll, runs backwards on scroll-up); 34px vertical rail on left edge with rotated mono text (`writing-mode: vertical-rl`); huge ghost outlined numeral behind the hero subject; inspect controls (vertical mono button stack, `aria-pressed`) that swap the variant everywhere at once; hairline-ruled rows and 1px-gap grids; close section wordmark cropped by page edge.
- **Motion:** blur reveals, not fades — from `{opacity:0, translateY(26px), filter:blur(9px)}` over ~.8s, siblings staggered ~.09s; hero subject from `blur(14px)` no translate. Start states scoped to a JS-added class so reduced-motion/no-JS renders the finished page.

## Motion component: AnimatedStepper (registration wizard)

Multi-step wizard used on /register. Framer Motion: slide transitions (spring stiffness 300, damping 30, x ±20 + opacity), dynamic height (spring damping 25, stiffness 200), step indicator circles (inactive/active/complete states, check icon on complete, layoutId active glow), animated connector lines (scaleX origin-left, ease [0.33,1,0.68,1]). On the dark theme: indicators use primary violet, glass card container, `.btn-primary` for continue.

## Accessibility

- `prefers-reduced-motion` respected everywhere.
- Keyboard navigable, labelled controls, ARIA on gauges/dialogs, `aria-pressed` on toggles.
- Every figure that appears twice must agree (counters, eyebrows, labels).
- No invented evidence: no fake press, awards, or review counts.
