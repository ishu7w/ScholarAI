# Extractable Components — ScholarAI

Menu of components suitable for extraction as Superdesign `DraftComponent` entities. Full source: layout components in `layouts.md`, basic/effect components in `components.md`.

## Layout Components

### Navbar
- Source: `src/components/layout/Navbar.tsx`
- Category: layout
- Description: Fixed floating glass top nav (marketing) with logo, 5 anchor links, Sign in / Get started CTAs, mobile drawer
- Extractable props: none per-page (scrolled/open are internal state; no activeItem concept)
- Hardcoded: GraduationCap logo icon, "ScholarAI" wordmark with `.text-gradient` on "AI", LINKS array (Features/How it works/Scholarships/Pricing/FAQ), `/login` and `/register` hrefs, all CSS (`glass-strong`, `btn-primary`, `btn-ghost`)

### DashboardShell
- Source: `src/components/layout/DashboardShell.tsx`
- Category: layout
- Description: App shell — fixed 256px sidebar (logo, 5 nav links with active state, user card) + sticky topbar (title, bell, CTA) + mobile drawer
- Extractable props: title (string, required), subtitle (string, optional); active nav item derived from `usePathname()` — for static drafts expose activeItem (string, default: "/dashboard/student")
- Hardcoded: NAV array (Student Dashboard, Scholarships, Resume Analyzer, Institution, Admin + lucide icons), user card "Aarya Sharma / aarya@university.edu" (Avatar hue 258), bell notification dot (always on), "Browse scholarships" CTA → `/scholarships`, all CSS

### AuthShell
- Source: `src/components/auth/AuthShell.tsx`
- Category: layout
- Description: Centered max-w-md glass-strong auth card on grid background with violet top glow and Framer Motion entrance
- Extractable props: title (string), subtitle (string), footer (ReactNode — per-page cross-links), children (form slot)
- Hardcoded: logo block, grid-bg + radial glow, card radius/padding, motion timing (0.6s, [0.22,1,0.36,1])

## Basic Components

### ChatAssistant
- Source: `src/components/chat/ChatAssistant.tsx`
- Category: basic
- Description: Floating bottom-right AI chat widget (Framer Motion popover) with rule-based replies from `lib/ai-engine`; appears on landing + all app pages
- Extractable props: none (fully self-contained; open state internal)
- Hardcoded: Bot/Sparkles/Send/X icons, greeting copy, demo student data source, position/z-index, all CSS

### ScoreRing
- Source: `src/components/ui/ScoreRing.tsx`
- Category: basic
- Description: Animated circular SVG score gauge with GSAP count-up on scroll into view
- Extractable props: value (number 0-100, required), label (string, optional), size (number, default: 120), strokeWidth (number, default: 8), color (string, optional — auto by value tier)
- Hardcoded: tier colors (#34d399 / #8b7cff / #fbbf24), track `rgba(255,255,255,0.08)`, drop-shadow glow, Space Grotesk number font, animation timing

### GlassCard
- Source: `src/components/ui/primitives.tsx`
- Category: basic
- Description: Base card — `.glass` background, rounded-2xl, p-6; optional hover lift
- Extractable props: hover (boolean, default: false)
- Hardcoded: `.glass` styling, radius, padding

### Badge
- Source: `src/components/ui/primitives.tsx`
- Category: basic
- Description: Pill badge with 6 tonal variants (primary/success/warning/danger/neutral/accent)
- Extractable props: tone (string enum, default: "primary")
- Hardcoded: `.badge` base class (12px/600, 999px radius), tone color map

### ProgressBar
- Source: `src/components/ui/primitives.tsx`
- Category: basic
- Description: 6px rounded track with animated gradient fill (width transition)
- Extractable props: value (number 0-100, required), color (string, default: "linear-gradient(90deg, #6d5cff, #22d3ee)")
- Hardcoded: height (h-1.5), track `bg-white/8`, transition timing

### StatPill
- Source: `src/components/ui/primitives.tsx`
- Category: basic
- Description: Compact stat block — large Space Grotesk value over xs muted label, tonal background
- Extractable props: label (string), value (string|number), tone (string enum, default: "default")
- Hardcoded: tone color map, radius/padding, fonts

### Avatar
- Source: `src/components/ui/primitives.tsx`
- Category: basic
- Description: Initials avatar with deterministic hue-based dual-tone gradient
- Extractable props: name (string, required), hue (number 0-360, required), size (number, default: 40)
- Hardcoded: gradient formula (hsl hue → hue+50), circle shape, white text

### PasswordInput
- Source: `src/components/auth/AuthShell.tsx`
- Category: basic
- Description: `.input-premium` password field with show/hide eye toggle
- Extractable props: id (string, required), placeholder (string, default: "••••••••")
- Hardcoded: Eye/EyeOff icons, minLength 8, `.input-premium` styling

### MagneticButton
- Source: `src/components/effects/MagneticButton.tsx`
- Category: basic (effect wrapper)
- Description: Button that magnetically follows the cursor on hover (GSAP quickTo); wraps CTAs on landing
- Extractable props: strength (number, default: 0.35), onClick
- Hardcoded: animation duration/ease, touch-device opt-out

### TiltCard
- Source: `src/components/effects/TiltCard.tsx`
- Category: basic (effect wrapper)
- Description: 3D cursor-tilt wrapper used around feature cards on landing
- Extractable props: max (number degrees, default: 8)
- Hardcoded: perspective 900, ease, touch/reduced-motion opt-outs

### Reveal / TextReveal / AnimatedCounter / ScrollProgress / CursorGlow / LoadingScreen
- Source: `src/components/effects/*.tsx`
- Category: basic (effects)
- Description: Scroll-entrance fade/slide (Reveal: delay/y/stagger), SplitText line reveal (TextReveal: text/as/delay), count-up number (AnimatedCounter: value/prefix/suffix/decimals), scroll progress bar, cursor glow, and brand loader — all GSAP-driven, all colors/timings hardcoded to brand gradient (#6d5cff → #22d3ee → #34d399)

## Landing section components (page-specific, reusable as draft sections)
- `Hero` — `src/components/landing/Hero.tsx` — GSAP intro hero with magnetic CTAs, badge, product mockup; no props
- `Stats`, `HowItWorks`, `Features` — `src/components/landing/Sections.tsx` — counters band, 3-step process, tilt-card feature grid; no props
- `Testimonials`, `Pricing`, `FAQ`, `FinalCTA`, `Footer` — `src/components/landing/Social.tsx` — social proof, 3-tier pricing, accordion FAQ, CTA band, site footer; no props
