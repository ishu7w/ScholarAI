# Page Dependency Trees — ScholarAI

Recursive local (`@/`) import trees per page. External packages noted inline where load-bearing (gsap, framer-motion, recharts, lenis, lucide-react). Leaf note: `src/lib/utils.ts` imports only clsx + tailwind-merge; `src/lib/data.ts` and `src/lib/ai-engine.ts` import only `src/lib/types.ts` (types + demo data, no UI).

## / (Landing)
Entry: `src/app/page.tsx`
Dependencies:
- src/components/providers/SmoothScroll.tsx  (lenis, gsap/ScrollTrigger)
- src/components/effects/CursorGlow.tsx  (gsap)
- src/components/effects/LoadingScreen.tsx  (gsap)
- src/components/effects/ScrollProgress.tsx  (gsap/ScrollTrigger)
- src/components/layout/Navbar.tsx
  - src/lib/utils.ts
- src/components/landing/Hero.tsx  (gsap)
  - src/components/effects/MagneticButton.tsx  (gsap)
    - src/lib/utils.ts
  - src/components/ui/primitives.tsx  (Badge)
    - src/lib/utils.ts
- src/components/landing/Sections.tsx  (Features, HowItWorks, Stats; gsap/ScrollTrigger)
  - src/components/effects/AnimatedCounter.tsx  (gsap/ScrollTrigger)
  - src/components/effects/Reveal.tsx  (gsap/ScrollTrigger)
    - src/lib/utils.ts
  - src/components/effects/TextReveal.tsx  (gsap/ScrollTrigger, gsap/SplitText)
    - src/lib/utils.ts
  - src/components/effects/TiltCard.tsx  (gsap)
    - src/lib/utils.ts
  - src/components/ui/primitives.tsx  (GlassCard)
- src/components/landing/Social.tsx  (FAQ, FinalCTA, Footer, Pricing, Testimonials; framer-motion)
  - src/components/effects/Reveal.tsx
  - src/components/effects/TextReveal.tsx
  - src/components/effects/MagneticButton.tsx
  - src/components/ui/primitives.tsx  (Avatar, Badge, GlassCard)
- src/components/chat/ChatAssistant.tsx  (framer-motion)
  - src/lib/data.ts
    - src/lib/types.ts
  - src/lib/ai-engine.ts
    - src/lib/types.ts
  - src/lib/utils.ts

## /login
Entry: `src/app/login/page.tsx`
Dependencies:
- src/components/auth/AuthShell.tsx  (AuthShell, PasswordInput, useFakeAuth; framer-motion)

## /register
Entry: `src/app/register/page.tsx`
Dependencies:
- src/components/auth/AuthShell.tsx  (AuthShell, PasswordInput, useFakeAuth; framer-motion)
- src/lib/utils.ts

## /forgot-password
Entry: `src/app/forgot-password/page.tsx`
Dependencies:
- src/components/auth/AuthShell.tsx  (AuthShell only)

## /dashboard/student
Entry: `src/app/dashboard/student/page.tsx`  (framer-motion)
Dependencies:
- src/components/layout/DashboardShell.tsx
  - src/components/ui/primitives.tsx  (Avatar)
    - src/lib/utils.ts
  - src/lib/utils.ts
- src/components/chat/ChatAssistant.tsx  (framer-motion)
  - src/lib/data.ts
    - src/lib/types.ts
  - src/lib/ai-engine.ts
    - src/lib/types.ts
  - src/lib/utils.ts
- src/components/ui/ScoreRing.tsx  (gsap/ScrollTrigger)
  - src/lib/utils.ts
- src/components/ui/primitives.tsx  (Badge, GlassCard, ProgressBar, StatPill)
- src/lib/ai-engine.ts  (computeAIScore, generateRoadmap, rankScholarships)
- src/lib/data.ts  (DEMO_STUDENT, SCHOLARSHIPS)
- src/lib/utils.ts  (daysUntil, formatCurrency, formatDate)

## /dashboard/institution
Entry: `src/app/dashboard/institution/page.tsx`  (framer-motion, recharts)
Dependencies:
- src/components/layout/DashboardShell.tsx
  - src/components/ui/primitives.tsx
    - src/lib/utils.ts
  - src/lib/utils.ts
- src/components/ui/primitives.tsx  (Avatar, Badge, GlassCard, ProgressBar, StatPill)
- src/lib/ai-engine.ts  (computeAIScore, detectFraud)
  - src/lib/types.ts
- src/lib/data.ts  (CATEGORY_DISTRIBUTION, MONTHLY_APPLICATIONS, REGION_HEAT, generateStudents)
  - src/lib/types.ts
- src/lib/utils.ts  (cn)

## /dashboard/admin
Entry: `src/app/dashboard/admin/page.tsx`  (framer-motion, recharts)
Dependencies:
- src/components/layout/DashboardShell.tsx
  - src/components/ui/primitives.tsx
    - src/lib/utils.ts
  - src/lib/utils.ts
- src/components/ui/primitives.tsx  (Badge, GlassCard, ProgressBar, StatPill)
- src/lib/data.ts  (MONTHLY_APPLICATIONS, SCHOLARSHIPS, generateApplicants)
  - src/lib/types.ts

## /scholarships
Entry: `src/app/scholarships/page.tsx`  (framer-motion)
Dependencies:
- src/components/layout/DashboardShell.tsx
  - src/components/ui/primitives.tsx
    - src/lib/utils.ts
  - src/lib/utils.ts
- src/components/chat/ChatAssistant.tsx  (framer-motion)
  - src/lib/data.ts
    - src/lib/types.ts
  - src/lib/ai-engine.ts
    - src/lib/types.ts
  - src/lib/utils.ts
- src/components/ui/primitives.tsx  (Badge, GlassCard, ProgressBar)
- src/lib/ai-engine.ts  (rankScholarships)
- src/lib/data.ts  (DEMO_STUDENT, SCHOLARSHIPS)
- src/lib/utils.ts  (cn, daysUntil, formatCurrency)
- src/lib/types.ts  (ScholarshipCategory)

## /scholarships/[id]
Entry: `src/app/scholarships/[id]/page.tsx`  (server: notFound lookup)
Dependencies:
- src/lib/data.ts  (SCHOLARSHIPS)
  - src/lib/types.ts
- src/app/scholarships/[id]/detail.tsx  (client; framer-motion)
  - src/components/layout/DashboardShell.tsx
    - src/components/ui/primitives.tsx
      - src/lib/utils.ts
    - src/lib/utils.ts
  - src/components/chat/ChatAssistant.tsx  (framer-motion)
    - src/lib/data.ts
    - src/lib/ai-engine.ts
    - src/lib/utils.ts
  - src/components/ui/ScoreRing.tsx  (gsap/ScrollTrigger)
    - src/lib/utils.ts
  - src/components/ui/primitives.tsx  (Badge, GlassCard, ProgressBar)
  - src/lib/ai-engine.ts  (computeAIScore, matchScholarship)
    - src/lib/types.ts
  - src/lib/data.ts  (DEMO_STUDENT, SCHOLARSHIPS)
  - src/lib/utils.ts  (daysUntil, formatCurrency, formatDate)

## /resume-analyzer
Entry: `src/app/resume-analyzer/page.tsx`  (framer-motion)
Dependencies:
- src/components/layout/DashboardShell.tsx
  - src/components/ui/primitives.tsx
    - src/lib/utils.ts
  - src/lib/utils.ts
- src/components/chat/ChatAssistant.tsx  (framer-motion)
  - src/lib/data.ts
    - src/lib/types.ts
  - src/lib/ai-engine.ts
    - src/lib/types.ts
  - src/lib/utils.ts
- src/components/ui/ScoreRing.tsx  (gsap/ScrollTrigger)
  - src/lib/utils.ts
- src/components/ui/primitives.tsx  (Badge, GlassCard)
- src/lib/ai-engine.ts  (analyzeResume, ResumeAnalysis)
- src/lib/utils.ts  (cn)

## Shared-dependency notes (for context budgeting)
- Every non-landing page depends on `DashboardShell` or `AuthShell` + `primitives.tsx` + `utils.ts` — pass these once.
- `src/lib/ai-engine.ts` (490 lines) and `src/lib/data.ts` (386 lines) are non-visual logic/data; usually droppable from design context except for copy/data shape.
- File sizes: landing sections Hero 221 / Sections 232 / Social 366 lines; detail.tsx 298; institution 321; resume-analyzer 291; student 244; admin 222; scholarships 176; ChatAssistant 192.
