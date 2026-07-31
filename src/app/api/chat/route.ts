import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getSessionProfile } from "@/lib/auth/session";
import { hasAnthropic } from "@/lib/env";
import { buildCopilotContext, type CopilotContext } from "@/lib/chat/context";
import { deterministicAnswer } from "@/lib/chat/deterministic";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_CHARS = 2_000;
const MAX_HISTORY_TURNS = 12;
const MAX_HISTORY_CHARS = 4_000;

const bodySchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Ask a question first")
    .max(MAX_MESSAGE_CHARS, "That message is too long — keep it under 2,000 characters"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "ai"]),
        content: z.string().trim().max(MAX_HISTORY_CHARS),
      })
    )
    .max(MAX_HISTORY_TURNS)
    .optional(),
});

const SYSTEM_PROMPT = `You are the ScholarAI copilot, answering ONE signed-in student about their own scholarship data.

You are given a JSON context object containing that student's real rows: their profile, their explainable AI score (total, confidence and the weighted component breakdown), their ranked scholarship matches with eligibility and match scores, their actual applications with statuses, frozen ai_snapshot scores and recorded rejection reasons, their upcoming deadlines, and their improvement roadmap.

Rules, in order of importance:
1. Answer ONLY from the provided context. It is the single source of truth.
2. Cite the actual numbers from the context — scores, match percentages, amounts, dates, day counts. Quote them exactly as given; never round, adjust, extrapolate or average them.
3. If the context does not contain what was asked, say so plainly — for example "I don't have that on file" or "you have no rejected applications recorded" — and say what would put it there. Never guess and never fill a gap with a plausible-sounding figure.
4. Never invent a scholarship name, provider, score, deadline, application status, or rejection reason. If a name or number is not in the context, it does not exist for the purposes of this answer.
5. The context describes exactly one student — the caller. Never speculate about, compare against, or reference any other student, applicant or cohort; that data is not yours to discuss.
6. Rejection reasons must be quoted from the application's recorded reasons. Eligibility blockers must be quoted from that match's missingCriteria. Do not paraphrase them into something stronger or softer.
7. Be concise and concrete — a few sentences or a short list. Plain text only, no markdown headings or bold.`;

function toReply(text: string): string {
  return text.trim();
}

/** Ask Claude, grounded in the caller's context. Returns null on any
 *  failure so the caller can fall back to the deterministic matcher
 *  rather than surfacing an error. */
async function anthropicAnswer(
  message: string,
  history: { role: "user" | "ai"; content: string }[],
  ctx: CopilotContext
): Promise<string | null> {
  try {
    const client = new Anthropic();

    // The Messages API requires the first turn to be `user`. The widget seeds
    // its transcript with an assistant greeting, so a verbatim replay would be
    // rejected and silently drop every keyed request to the fallback. Trim any
    // leading assistant turns, and drop empty ones (also rejected).
    const turns = history
      .filter((h) => h.content.length > 0)
      .map((h) => ({
        role: h.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: h.content,
      }));
    while (turns.length > 0 && turns[0].role === "assistant") turns.shift();

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: `${SYSTEM_PROMPT}\n\nGROUNDING CONTEXT (the caller's real data):\n${JSON.stringify(ctx)}`,
        },
      ],
      messages: [...turns, { role: "user" as const, content: message }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return text.length > 0 ? text : null;
  } catch {
    // Rate limits, network failures, refusals, missing credentials — the
    // deterministic path still answers, so never fail the request here.
    return null;
  }
}

/**
 * POST /api/chat
 *
 * Authenticated only. The student whose data grounds the answer is taken
 * from the session — the client cannot name a user id, so one caller can
 * never read another's rows.
 */
export async function POST(request: NextRequest) {
  const me = await getSessionProfile();
  if (!me) {
    return NextResponse.json(
      { error: "Sign in to ask the copilot about your scholarships" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid message" },
      { status: 400 }
    );
  }

  const { message, history = [] } = parsed.data;

  // Grounding is built from the session identity, never from the body.
  const ctx = await buildCopilotContext(me);

  if (hasAnthropic()) {
    const reply = await anthropicAnswer(message, history, ctx);
    if (reply) {
      return NextResponse.json({ reply: toReply(reply), source: "anthropic" });
    }
  }

  return NextResponse.json({
    reply: toReply(deterministicAnswer(message, ctx)),
    source: "deterministic",
  });
}
