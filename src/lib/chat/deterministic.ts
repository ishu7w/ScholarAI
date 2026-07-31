import "server-only";
import { formatCurrency } from "@/lib/utils";
import type { CopilotContext } from "./context";

// ─────────────────────────────────────────────────────────────
// The deterministic intent matcher — moved server-side from
// ChatAssistant and re-pointed at the caller's real rows.
// The intent patterns and answer shapes are the originals; only
// the data source changed, from the demo seed to CopilotContext.
//
// Every number here is read out of the context. When the context
// has no row for a question, the answer says so.
// ─────────────────────────────────────────────────────────────

const NO_PROFILE =
  "I don't have an academic profile on your account yet, so I can't quote a score or matches. Complete your student profile and I'll answer from your real numbers.";

function monthDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export function deterministicAnswer(q: string, ctx: CopilotContext): string {
  const lower = q.toLowerCase();
  const { score, student, matches, applications, deadlines, roadmap } = ctx;
  const eligibleMatches = matches.filter((m) => m.eligible);

  if (/(score|profile)/.test(lower)) {
    if (!score) return NO_PROFILE;
    const weights = score.components
      .slice(0, 4)
      .map((c) => `${c.label} ${c.weightPercent}%`)
      .join(", ");
    return `Your AI profile score is ${score.total}/100 with ${score.confidence}% confidence. Top strengths: ${score.strengths.join(", ")}. Biggest gaps: ${score.gaps.join(", ") || "none — well balanced!"}. The score is a weighted sum — ${weights}, and so on. Open AI Insights for the full breakdown.`;
  }

  if (/(recommend|match|which scholarship|best scholarship)/.test(lower)) {
    if (!score) return NO_PROFILE;
    const top = eligibleMatches.slice(0, 3);
    if (top.length === 0) {
      return "You aren't currently eligible for any of the scholarships I track, so I have no matches to rank. Ask me why you're blocked on a specific one and I'll quote the exact criteria.";
    }
    return `Based on your profile, your top matches are:\n${top
      .map(
        (m, i) =>
          `${i + 1}. ${m.name} — ${m.matchScore}% match, ~${m.winProbability}% win probability (${formatCurrency(m.amount, m.currency)})`
      )
      .join("\n")}\nEach match is explainable — tap a card to see exactly why it was selected.`;
  }

  if (/(eligib|qualify)/.test(lower)) {
    if (!score) return NO_PROFILE;
    const { eligibleCount, trackedCount } = ctx.eligibility;
    const blockers = [
      ...new Set(
        matches
          .filter((m) => !m.eligible)
          .flatMap((m) => m.missingCriteria)
      ),
    ].slice(0, 2);
    const blockerLine = blockers.length
      ? ` The most common blockers on the rest: ${blockers.join("; ")}.`
      : "";
    const cgpaLine = student ? ` Your CGPA of ${student.cgpa} is on file.` : "";
    return `You're currently eligible for ${eligibleCount} of ${trackedCount} tracked scholarships.${blockerLine}${cgpaLine}`;
  }

  if (/(improve|better|roadmap|suggest)/.test(lower)) {
    if (!score) return NO_PROFILE;
    const rm = roadmap.slice(0, 3);
    if (rm.length === 0) {
      return "Your profile has no outstanding gaps in the roadmap right now — the engine has nothing to recommend.";
    }
    return `Here's your highest-impact plan:\n${rm
      .map((r) => `• ${r.quarter}: ${r.title} (+${r.impact} pts projected)`)
      .join("\n")}\nFull personalized roadmap is on your dashboard.`;
  }

  if (/(sop|statement)/.test(lower)) {
    if (!student) return NO_PROFILE;
    return `Your SOP currently scores ${student.sopQuality}/100. To improve: 1) open with a specific moment, not a generic ambition; 2) quantify outcomes ("built X used by Y people"); 3) name the exact program and why it fits; 4) close with a 5-year goal. Want a paragraph-by-paragraph template? Check Help Center → SOP Guide.`;
  }

  if (/(reject|why not|denied)/.test(lower)) {
    // A real rejected application, with its stored reasons, outranks a
    // hypothetical eligibility gap.
    const rejected = applications.find((a) => a.status === "rejected");
    if (rejected) {
      const reasons = rejected.rejectionReasons.length
        ? rejected.rejectionReasons.join("; ")
        : "no reasons were recorded on the decision";
      const snap = rejected.aiSnapshot
        ? ` Your frozen score at submit time was ${rejected.aiSnapshot.total}/100 with a ${rejected.aiSnapshot.matchScore}% match.`
        : "";
      return `Your application to ${rejected.scholarshipName} was rejected. The recorded reasons: ${reasons}.${snap} That's the full decision record — nothing hidden.`;
    }
    const blocked = matches.find((m) => !m.eligible);
    if (blocked) {
      return `You have no rejected applications right now. But take ${blocked.name}: you're not eligible because — ${blocked.missingCriteria.join("; ")}. That's the full reason; nothing hidden. Fix path: ${blocked.improvements[0] ?? "review criteria on the scholarship page"}.`;
    }
    return "You have no rejected applications right now.";
  }

  if (/(status|applied|application)/.test(lower)) {
    if (applications.length === 0) {
      return "You haven't submitted any applications yet. Once you apply, I can quote each one's status and its frozen score.";
    }
    return `Your applications:\n${applications
      .map(
        (a) =>
          `• ${a.scholarshipName} — ${a.status.replace(/_/g, " ")}${
            a.aiSnapshot ? ` (frozen score ${a.aiSnapshot.total}/100)` : ""
          }`
      )
      .join("\n")}`;
  }

  if (/(deadline|when|date)/.test(lower)) {
    const soon = deadlines[0];
    if (!soon) {
      return "I don't have any scholarship deadlines on file right now.";
    }
    return `Closest deadline: ${soon.name} on ${monthDay(soon.deadline)} — ${soon.daysRemaining} days away. Your dashboard calendar tracks all ${ctx.eligibility.trackedCount} deadlines with reminders.`;
  }

  if (/(fraud|verify|document)/.test(lower)) {
    return "Documents are verified through the OCR pipeline: text extraction → field validation → cross-document consistency checks → anomaly flags. Verification status appears on each document card. Institutions only see the verification result, never your raw documents, unless you apply.";
  }

  if (/(hello|hi|hey)/.test(lower)) {
    const first = (student?.name ?? ctx.viewer.name).split(" ")[0];
    return `Hi ${first}! I'm your scholarship copilot. Ask me about your score, recommendations, eligibility, deadlines, or how to improve your profile.`;
  }

  return `I can help with: "What's my profile score?", "Which scholarships match me?", "Why was I rejected?", "How do I improve?", "What deadlines are coming?", or "How does document verification work?"`;
}
