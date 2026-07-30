# ScholarAI — AI-Powered Scholarship Intelligence

A premium, dark-themed SaaS platform that matches deserving students with the right scholarships using a **fully explainable AI engine** — and gives institutions a fair, auditable ranking of every applicant.

Built with Next.js App Router, GSAP + Lenis cinematic animations, and a deterministic scoring engine that runs entirely offline (no API keys required — perfect for demos and judging).

## ✨ Highlights

| Area | What's inside |
|------|---------------|
| **Landing page** | GSAP hero reveal, SplitText line masks, orbiting AI visualization, scroll-storytelling timeline, animated counters, 3D tilt cards, magnetic buttons, cursor glow, premium loader, scroll progress bar, Lenis smooth scroll |
| **AI engine** (`src/lib/ai-engine.ts`) | Weighted scoring model (10 published weights), eligibility gates, match score + winning probability, plain-language explanations, fraud heuristics, personalized roadmap, resume/ATS analyzer |
| **Student dashboard** | AI profile score ring, explainable sub-scores, top recommendations, deadlines, document verification status, quarterly improvement roadmap |
| **Institution dashboard** | AI applicant ranking with approve/reject queue, fraud alerts, category pie, geographic bars, application trend charts, exportable reports |
| **Admin dashboard** | AI model registry, system health, audit log, platform analytics |
| **Scholarship explorer** | 12 categories, smart search, eligible-only filter, per-program explainability (why selected / why rejected / how to improve / fairness note) |
| **Resume analyzer** | Drag-and-drop upload, section extraction, ATS + resume scores, targeted suggestions |
| **AI copilot** | Floating chat assistant answering score, match, eligibility, deadline, and rejection questions — powered by the same engine, so answers never contradict the UI |

## 🧠 The Explainable AI model

Every number in the UI traces back to a published weight:

| Signal | Weight |
|--------|--------|
| Academic Performance | 22% |
| Financial Need | 18% |
| Achievements | 12% |
| Research Output | 10% |
| Leadership | 8% |
| Projects & Skills | 8% |
| Statement of Purpose | 8% |
| Community Service | 7% |
| Recommendations | 4% |
| Behaviour & Integrity | 3% |

Demographic fields (gender, community, disability) are used **only** for inclusion preferences on scholarships that explicitly target those groups — never as penalties. Each match includes a fairness note documenting this.

## 🚀 Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

**Demo flow:** Landing page → *Get started* → any credentials → Student dashboard → Scholarships → open a match to see the explainability report → Resume Analyzer → *Try sample resume* → Institution dashboard → approve/reject from the AI-ranked queue.

## 🗂 Structure

```
src/
├─ app/                    # routes (landing, auth, dashboards, explorer, analyzer)
├─ components/
│  ├─ effects/             # GSAP: TextReveal, TiltCard, MagneticButton, counters…
│  ├─ landing/             # hero + sections
│  ├─ layout/              # navbar + dashboard shell
│  ├─ chat/                # AI copilot
│  └─ ui/                  # ScoreRing, GlassCard, Badge, ProgressBar…
└─ lib/
   ├─ ai-engine.ts         # scoring, matching, fraud, roadmap, resume analysis
   ├─ data.ts              # scholarships + deterministic seed data
   └─ types.ts             # domain types
```

## 🛠 Stack

Next.js · React · TypeScript · Tailwind CSS v4 · GSAP (ScrollTrigger, SplitText) · Lenis · Framer Motion · Recharts · Lucide

## ♿ Accessibility & performance

- `prefers-reduced-motion` respected everywhere (loader, smooth scroll, tilt, glow all disable)
- Keyboard-navigable, labelled controls, ARIA on gauges/dialogs
- Transform/opacity-only animations; charts and heavy sections render client-side only

## 📄 Note

This is a demo build: authentication is simulated and all data is deterministic seed data — by design, so the product can be demonstrated anywhere with zero setup, keys, or network.
