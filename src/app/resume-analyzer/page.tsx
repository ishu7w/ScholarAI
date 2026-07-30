"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Briefcase,
  FileUp,
  FolderGit2,
  GraduationCap,
  Lightbulb,
  Loader2,
  Medal,
  RotateCcw,
  Wrench,
} from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import ChatAssistant from "@/components/chat/ChatAssistant";
import ScoreRing from "@/components/ui/ScoreRing";
import { Badge, GlassCard } from "@/components/ui/primitives";
import { analyzeResume, type ResumeAnalysis } from "@/lib/ai-engine";
import { cn } from "@/lib/utils";

const SAMPLE_RESUME = `Aarya Sharma
B.Tech Computer Science, State University — CGPA 8.7/10
Delhi, India · aarya@university.edu

EXPERIENCE
Machine Learning Intern, NovaTech Corp — built a churn prediction model in Python improving retention outreach by 23%
Teaching Assistant, Data Structures — supported 120 students across 2 semesters

PROJECTS
Developed ScholarMatch, a scholarship recommender used by 500 students, with React and FastAPI
Built a real-time attendance dashboard with SQL and data analysis pipelines
Created an NLP-based SOP feedback tool using machine learning

ACHIEVEMENTS
Winner, National Smart Hackathon 2025 (team of 4, 3,000 participants)
Rank 2, University Coding Championship
Merit scholarship recipient, 2024

CERTIFICATIONS
AWS Certified Cloud Practitioner
Google Data Analytics Certificate

SKILLS
Python, JavaScript, TypeScript, React, SQL, Machine Learning, TensorFlow, Statistics, Communication, Leadership

VOLUNTEER
Led weekend coding classes for 60 underprivileged students (120 hours)`;

const SECTION_META = [
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "experience", label: "Experience", icon: Briefcase },
  { key: "projects", label: "Projects", icon: FolderGit2 },
  { key: "achievements", label: "Achievements", icon: Medal },
  { key: "certifications", label: "Certifications", icon: Award },
  { key: "skills", label: "Skills", icon: Wrench },
] as const;

export default function ResumeAnalyzerPage() {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const run = useCallback((content: string) => {
    setAnalyzing(true);
    setAnalysis(null);
    // small delay so the scanning state reads as an AI pass
    setTimeout(() => {
      setAnalysis(analyzeResume(content));
      setAnalyzing(false);
    }, 1200);
  }, []);

  const onFile = useCallback(
    (file: File) => {
      file.text().then((content) => {
        setText(content);
        run(content);
      });
    },
    [run]
  );

  return (
    <DashboardShell
      title="Resume Analyzer"
      subtitle="ATS scoring + skill extraction tuned for scholarship review"
    >
      <div className="grid gap-6 xl:grid-cols-2">
        {/* input side */}
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) onFile(f);
            }}
            className={cn(
              "glass flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
              dragOver ? "border-primary bg-primary/10" : "border-[rgba(21,21,21,0.2)]"
            )}
          >
            <FileUp className="h-10 w-10 text-primary-bright" />
            <p className="mt-4 font-medium">Drop your resume here</p>
            <p className="mt-1 text-sm text-muted">.txt / .md — or paste below</p>
            <label className="btn-ghost mt-4 cursor-pointer text-sm">
              Choose file
              <input
                type="file"
                accept=".txt,.md,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </label>
          </div>

          <GlassCard>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Or paste resume text</h2>
              <button
                onClick={() => {
                  setText(SAMPLE_RESUME);
                  run(SAMPLE_RESUME);
                }}
                className="cursor-pointer text-xs text-primary-bright hover:underline"
              >
                Try sample resume
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Paste your resume content…"
              className="input-premium mt-3 resize-y font-[family-name:var(--font-geist-mono)] !text-[13px] leading-relaxed"
              aria-label="Resume text"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => run(text)}
                disabled={!text.trim() || analyzing}
                className="btn-primary flex-1 text-sm"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> AI analyzing…
                  </>
                ) : (
                  "Analyze resume"
                )}
              </button>
              {analysis && (
                <button
                  onClick={() => {
                    setText("");
                    setAnalysis(null);
                  }}
                  className="btn-ghost text-sm"
                  aria-label="Reset"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </GlassCard>
        </div>

        {/* results side */}
        <div className="space-y-6">
          {analyzing && (
            <GlassCard className="space-y-4 py-10">
              <div className="mx-auto h-4 w-2/3 rounded skeleton" />
              <div className="mx-auto h-4 w-1/2 rounded skeleton" />
              <div className="mx-auto h-4 w-3/5 rounded skeleton" />
              <p className="pt-2 text-center text-sm text-muted">
                Extracting sections · scoring keywords · checking ATS readability…
              </p>
            </GlassCard>
          )}

          {!analyzing && !analysis && (
            <GlassCard className="flex flex-col items-center py-16 text-center">
              <BookOpen className="h-10 w-10 text-muted" />
              <p className="mt-4 font-medium">Your analysis will appear here</p>
              <p className="mt-1 max-w-xs text-sm text-muted">
                ATS score, extracted sections, and targeted suggestions for
                scholarship committees.
              </p>
            </GlassCard>
          )}

          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <GlassCard>
                <h2 className="font-semibold">Scores</h2>
                <div className="mt-4 flex justify-center gap-8">
                  <ScoreRing value={analysis.resumeScore} size={130} label="resume score" />
                  <ScoreRing
                    value={analysis.atsScore}
                    size={130}
                    label="ATS score"
                    color="#c4442c"
                  />
                </div>
              </GlassCard>

              <GlassCard>
                <h2 className="font-semibold">Extracted by AI</h2>
                <div className="mt-4 space-y-4">
                  {SECTION_META.map((s) => {
                    const items = analysis.extracted[s.key];
                    return (
                      <div key={s.key}>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <s.icon className="h-4 w-4 text-primary-bright" />
                          {s.label}
                          <span className="text-xs text-muted">({items.length})</span>
                        </div>
                        {items.length > 0 ? (
                          s.key === "skills" ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {items.map((it) => (
                                <Badge key={it} tone="primary" className="!text-[11px]">
                                  {it}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <ul className="mt-2 space-y-1">
                              {items.map((it) => (
                                <li
                                  key={it}
                                  className="truncate text-xs leading-relaxed text-muted"
                                >
                                  · {it}
                                </li>
                              ))}
                            </ul>
                          )
                        ) : (
                          <p className="mt-1.5 text-xs text-warning">Not detected</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-warning" />
                  <h2 className="font-semibold">AI suggestions</h2>
                </div>
                <ul className="mt-4 space-y-3">
                  {analysis.suggestions.map((s) => (
                    <li
                      key={s}
                      className="glass rounded-xl border border-[rgba(21,21,21,0.16)] p-3.5 text-sm leading-relaxed text-foreground/90"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>

      <ChatAssistant />
    </DashboardShell>
  );
}
