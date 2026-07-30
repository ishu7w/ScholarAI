"use client";

// Deterministic AI chat assistant — intent-matched responses driven by the
// same explainable engine that powers scoring, so answers stay consistent.

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DEMO_STUDENT, SCHOLARSHIPS } from "@/lib/data";
import { computeAIScore, generateRoadmap, rankScholarships } from "@/lib/ai-engine";
import { cn, formatCurrency } from "@/lib/utils";

interface Msg {
  role: "user" | "ai";
  text: string;
}

function answer(q: string): string {
  const lower = q.toLowerCase();
  const ai = computeAIScore(DEMO_STUDENT);
  const ranked = rankScholarships(DEMO_STUDENT, SCHOLARSHIPS);
  const top = ranked.filter((r) => r.eligible).slice(0, 3);

  if (/(score|profile)/.test(lower)) {
    return `Your AI profile score is ${ai.total}/100 with ${ai.confidence}% confidence. Top strengths: ${ai.strengths.join(", ")}. Biggest gaps: ${ai.gaps.join(", ") || "none — well balanced!"}. The score is a weighted sum — Academic 22%, Financial Need 18%, Achievements 12%, Research 10%, and so on. Open AI Insights for the full breakdown.`;
  }
  if (/(recommend|match|which scholarship|best scholarship)/.test(lower)) {
    return `Based on your profile, your top matches are:\n${top
      .map(
        (r, i) =>
          `${i + 1}. ${r.scholarship.name} — ${r.matchScore}% match, ~${r.winProbability}% win probability (${formatCurrency(r.scholarship.amount)})`
      )
      .join("\n")}\nEach match is explainable — tap a card to see exactly why it was selected.`;
  }
  if (/(eligib|qualify)/.test(lower)) {
    const eligibleCount = ranked.filter((r) => r.eligible).length;
    return `You're currently eligible for ${eligibleCount} of ${SCHOLARSHIPS.length} tracked scholarships. The most common blockers on the rest: research publication requirements and location restrictions. Your CGPA of ${DEMO_STUDENT.cgpa} clears most merit gates.`;
  }
  if (/(improve|better|roadmap|suggest)/.test(lower)) {
    const rm = generateRoadmap(DEMO_STUDENT).slice(0, 3);
    return `Here's your highest-impact plan:\n${rm
      .map((r) => `• ${r.quarter}: ${r.title} (+${r.impact} pts projected)`)
      .join("\n")}\nFull personalized roadmap is on your dashboard.`;
  }
  if (/(sop|statement)/.test(lower)) {
    return `Your SOP currently scores ${DEMO_STUDENT.sopQuality}/100. To improve: 1) open with a specific moment, not a generic ambition; 2) quantify outcomes ("built X used by Y people"); 3) name the exact program and why it fits; 4) close with a 5-year goal. Want a paragraph-by-paragraph template? Check Help Center → SOP Guide.`;
  }
  if (/(reject|why not|denied)/.test(lower)) {
    const blocked = ranked.find((r) => !r.eligible);
    if (blocked) {
      return `Take ${blocked.scholarship.name}: you're not eligible because — ${blocked.missingCriteria.join("; ")}. That's the full reason; nothing hidden. Fix path: ${blocked.improvements[0] ?? "review criteria on the scholarship page"}.`;
    }
    return "You have no rejected applications right now.";
  }
  if (/(deadline|when|date)/.test(lower)) {
    const soon = [...SCHOLARSHIPS].sort(
      (a, b) => +new Date(a.deadline) - +new Date(b.deadline)
    )[0];
    return `Closest deadline: ${soon.name} on ${new Date(soon.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Your dashboard calendar tracks all ${SCHOLARSHIPS.length} deadlines with reminders.`;
  }
  if (/(fraud|verify|document)/.test(lower)) {
    return "Documents are verified through the OCR pipeline: text extraction → field validation → cross-document consistency checks → anomaly flags. Verification status appears on each document card. Institutions only see the verification result, never your raw documents, unless you apply.";
  }
  if (/(hello|hi|hey)/.test(lower)) {
    return `Hi ${DEMO_STUDENT.name.split(" ")[0]}! I'm your scholarship copilot. Ask me about your score, recommendations, eligibility, deadlines, or how to improve your profile.`;
  }
  return `I can help with: "What's my profile score?", "Which scholarships match me?", "Why was I rejected?", "How do I improve?", "What deadlines are coming?", or "How does document verification work?"`;
}

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: "Hi! I'm your ScholarAI copilot — ask me about your score, matches, or how to improve.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, open]);

  const send = () => {
    const q = input.trim();
    if (!q || typing) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "ai", text: answer(q) }]);
      setTyping(false);
    }, 700);
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 cursor-pointer items-center justify-center bg-foreground text-background transition-colors hover:bg-accent"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-primary" aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 26, filter: "blur(9px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 26, filter: "blur(9px)" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong fixed bottom-24 right-6 z-50 flex h-[480px] w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden"
            role="dialog"
            aria-label="AI chat assistant"
          >
            <div className="flex items-center gap-3 border-b border-[rgba(21,21,21,0.16)] px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center bg-foreground">
                <Bot className="h-4 w-4 text-background" />
              </span>
              <div>
                <div className="mono-label">ScholarAI Copilot</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-success">
                  <span className="h-1.5 w-1.5 bg-success" /> Online
                </div>
              </div>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "rounded-br-md bg-foreground text-background"
                        : "rounded-bl-md border border-[rgba(21,21,21,0.16)] text-foreground"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl rounded-bl-md border border-[rgba(21,21,21,0.16)] px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2 border-t border-[rgba(21,21,21,0.16)] p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about scores, matches, deadlines…"
                className="input-premium !rounded-xl !py-2.5 text-sm"
                aria-label="Chat message"
              />
              <button
                type="submit"
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:bg-ink-2 disabled:opacity-50"
                disabled={!input.trim() || typing}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
