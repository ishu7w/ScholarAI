"use client";

// AI chat assistant — answers come from POST /api/chat, which grounds every
// figure in the caller's own rows (their score, matches, applications and
// deadlines). The server picks Claude or the deterministic intent matcher;
// this component just renders whatever reply comes back.

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "ai";
  text: string;
}

const SIGN_IN_PROMPT =
  "Please sign in to ask about your scholarships — I answer from your own profile, matches and applications, so I need to know who you are.";

const GENERIC_ERROR =
  "I couldn't reach the copilot just now. Please try that again in a moment.";

/** Recent turns give the copilot conversational continuity. The server caps
 *  and validates this too — it is never trusted as a source of facts. */
const HISTORY_TURNS = 8;

async function askCopilot(
  message: string,
  history: Msg[]
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: history.slice(-HISTORY_TURNS).map((m) => ({
          role: m.role,
          content: m.text,
        })),
      }),
    });
  } catch {
    return GENERIC_ERROR;
  }

  if (res.status === 401) return SIGN_IN_PROMPT;

  let data: { reply?: string; error?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    return GENERIC_ERROR;
  }

  if (!res.ok) return data?.error ?? GENERIC_ERROR;
  return data?.reply ?? GENERIC_ERROR;
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

  const send = (question?: string) => {
    const q = (question ?? input).trim();
    if (!q || typing) return;
    const history = msgs;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTyping(true);
    void askCopilot(q, history).then((reply) => {
      setMsgs((m) => [...m, { role: "ai", text: reply }]);
      setTyping(false);
    });
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
