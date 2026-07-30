# Master execution prompt

Paste the block below into Claude Code (run from `scholarai/`). Run one phase per session for best results: replace the last line with "Execute Phase N now."

---

Read FULLSTACK_PLAN.md in the repo root — it is the authoritative plan. Your job is to execute it phase by phase, converting this Next.js 16 demo into the fully functional product it describes, with a real Postgres database (Supabase), real auth, real-time updates, working document/resume pipelines, and Vercel deployability.

Non-negotiable constraints:

1. Do not change the visual design. The "Editions" paper UI (globals.css, editions.css, all component styling) stays exactly as it is. You are wiring data and behavior, not redesigning.
2. Do not rewrite src/lib/ai-engine.ts scoring semantics. The 10 published WEIGHTS and deterministic scoring are the product's core claim ("fully explainable"). Move where it runs (server-side on real rows), never what it computes.
3. Demo mode must keep working. With no env vars set, the app runs exactly as today (in-memory seed data, fake auth). All DB/auth code goes behind the DataSource abstraction defined in Phase 0. Never let a missing env var crash a page.
4. Security is not optional: RLS policies on every table, role checks in middleware AND in every route handler, zod validation on every input, no service-role key on the client, signed URLs for documents, no cross-user data leakage in the copilot.
5. Every figure shown twice must agree — scores, counts, and statuses shown to students and institutions must come from the same queries/engine outputs. Snapshot scores into applications.ai_snapshot at submit time for auditability.
6. This project's AGENTS.md warns the Next.js version has breaking changes: read the relevant guides in node_modules/next/dist/docs/ before using an API you haven't verified in this codebase (middleware, route handlers, server actions, cookies).
7. After each phase: npm run build must pass, the phase's acceptance checks (listed in the plan) must be demonstrated, and you commit with a descriptive message before starting the next phase. If the repo has no proper git root yet, git init inside scholarai/ first.
8. If a phase needs something from me (Supabase project keys, Vercel login, Anthropic key), stop and tell me exactly what to create and which values to paste into .env.local — do not fake or skip the integration silently.

Workflow per phase: read the phase's section in FULLSTACK_PLAN.md → read the existing files it touches → implement → run build + acceptance checks → show me proof (command output) → commit → summarize what changed and what I should verify by hand.

Start by reading FULLSTACK_PLAN.md and the current src/lib/{data,types,ai-engine}.ts, then execute Phase 0 now.
