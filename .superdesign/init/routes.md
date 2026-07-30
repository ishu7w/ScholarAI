# Routes — ScholarAI (Next.js 16 App Router)

File-based routing under `src/app/`. No route groups, no nested `layout.tsx` files — only the root layout (`src/app/layout.tsx`). Shells are applied per-page: marketing → `Navbar`, app pages → `DashboardShell`, auth → `AuthShell`.

| URL | Page file | Shell | Type |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Navbar + SmoothScroll | Server (composes client components) |
| `/login` | `src/app/login/page.tsx` | AuthShell | Client |
| `/register` | `src/app/register/page.tsx` | AuthShell | Client |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | AuthShell | Client |
| `/dashboard/student` | `src/app/dashboard/student/page.tsx` | DashboardShell | Client |
| `/dashboard/institution` | `src/app/dashboard/institution/page.tsx` | DashboardShell | Client |
| `/dashboard/admin` | `src/app/dashboard/admin/page.tsx` | DashboardShell | Client |
| `/scholarships` | `src/app/scholarships/page.tsx` | DashboardShell | Client |
| `/scholarships/[id]` | `src/app/scholarships/[id]/page.tsx` → `detail.tsx` | DashboardShell | Server wrapper + client detail |
| `/resume-analyzer` | `src/app/resume-analyzer/page.tsx` | DashboardShell | Client |

## Page summaries

### `/` — Landing (32 lines, composition only)
`src/app/page.tsx`. Wraps everything in `SmoothScroll` (Lenis). Renders LoadingScreen, ScrollProgress, CursorGlow, Navbar, then sections: `Hero` (GSAP intro, magnetic CTAs) → `Stats` (animated counters) → `HowItWorks` → `Features` (tilt cards) → `Testimonials` → `Pricing` → `FAQ` → `FinalCTA` → `Footer`, plus floating `ChatAssistant`.

### `/login` (67 lines)
Email + `PasswordInput` in `AuthShell` ("Welcome back" style card); `useFakeAuth` redirects to `/dashboard/student` after a 900ms demo delay. Links to `/forgot-password` and `/register`.

### `/register` (103 lines)
Role selector (Student / Institution via `GraduationCap`/`Building2` cards), name/email/password fields in `AuthShell`; fake auth redirect.

### `/forgot-password` (71 lines)
Email field in `AuthShell`; success state with `CheckCircle2` confirmation after submit.

### `/dashboard/student` (244 lines) — "Welcome back, Aarya"
AI Profile Score (ScoreRing + factor breakdown from `computeAIScore`), Top AI recommendations (`rankScholarships`), Upcoming deadlines, Document status, AI improvement roadmap (`generateRoadmap`). Uses Framer Motion, StatPill/Badge/ProgressBar/GlassCard, ChatAssistant.

### `/dashboard/institution` (321 lines) — "Institution Command Center"
Recharts dashboards: application volume vs AI-assisted decisions (area/line), category distribution (pie), geographic distribution, fraud alerts (`detectFraud`), AI applicant ranking approval queue (sortable table with Avatars, approve/reject state).

### `/dashboard/admin` (222 lines) — "Platform Administration"
Recharts platform activity chart (`MONTHLY_APPLICATIONS`), system health meters, AI model registry cards, audit log table.

### `/scholarships` (176 lines) — "Scholarship Explorer"
Search + category filter chips over `SCHOLARSHIPS`, AI-ranked (`rankScholarships`) card grid with match %, ProgressBar, deadline countdown; each card links to `/scholarships/[id]`.

### `/scholarships/[id]` (17 + 298 lines)
`page.tsx` is a server component: looks up scholarship by id in `SCHOLARSHIPS` (calls `notFound()` if missing) and renders client `detail.tsx`. Detail shows explainable AI match: "Why the AI recommends this" factor list, score breakdown vs program (`matchScholarship`, `computeAIScore` + ScoreRing), AI match verdict, requirements checklist, apply CTA with multi-step state.

### `/resume-analyzer` (291 lines) — "Resume Analyzer"
Drag/drop upload zone + paste-text area; `analyzeResume` produces ATS scores (ScoreRing trio), extracted skills/education chips, AI suggestions list. Simulated analysis progress states.

## Router config
No custom router config; routing is purely file-based. `next.config.ts` only pins the Turbopack workspace root:

```ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
```
