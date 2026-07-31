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
import ScoreRing from "@/components/ui/ScoreRing";
import { Badge, GlassCard } from "@/components/ui/primitives";
import type { ResumeAnalysis } from "@/lib/ai-engine";
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

export default function ResumeAnalyzerView({
  uploadEnabled,
}: {
  uploadEnabled: boolean;
}) {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Scoring runs server-side (same engine) so a real PDF and pasted
  // text go through exactly one implementation.
  const runText = useCallback(async (content: string) => {
    setAnalyzing(true);
    setAnalysis(null);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Could not analyze this resume");
      else setAnalysis(data.analysis as ResumeAnalysis);
    } catch {
      setError("Could not reach the analyzer. Check your connection and retry.");
    }
    setAnalyzing(false);
  }, []);

  const onFile = useCallback(async (file: File) => {
    setAnalyzing(true);
    setAnalysis(null);
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/resume/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not analyze this file");
      } else {
        setAnalysis(data.analysis as ResumeAnalysis);
        if (typeof data.text === "string") setText(data.text);
        setNotice("Saved to your documents as a resume.");
      }
    } catch {
      setError("Upload failed. Check your connection and retry.");
    }
    setAnalyzing(false);
  }, []);


  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* input side */}
      <div className="space-y-4">
        <div
          onDragOver={(e) => {
            if (!uploadEnabled) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (!uploadEnabled) return;
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
          }}
          className={cn(
            "glass flex flex-col items-center justify-center border-2 border-dashed p-10 text-center transition-colors",
            dragOver ? "border-primary bg-primary/10" : "border-[rgba(21,21,21,0.2)]"
          )}
        >
          <FileUp className="h-10 w-10 text-primary-bright" />
          <p className="mt-4 font-medium">
            {uploadEnabled ? "Drop your resume here" : "Paste your resume below"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {uploadEnabled
              ? "PDF, PNG or JPEG — up to 5MB"
              : "Connect storage to upload files — pasting works without it"}
          </p>
          {uploadEnabled && (
            <label className="btn-ghost mt-4 cursor-pointer text-sm">
              Choose file
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </label>
          )}
        </div>

        <GlassCard>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Or paste resume text</h2>
            <button
              onClick={() => {
                setText(SAMPLE_RESUME);
                runText(SAMPLE_RESUME);
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
              onClick={() => runText(text)}
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
                  setError(null);
                  setNotice(null);
                }}
                className="btn-ghost text-sm"
                aria-label="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>

          {error && (
            <div role="alert" className="hairline mt-3 flex items-start gap-3 border-primary px-4 py-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 bg-primary" aria-hidden />
              <span className="mono-label text-primary">{error}</span>
            </div>
          )}
          {notice && !error && (
            <p role="status" className="mono-label mt-3 text-success">
              {notice}
            </p>
          )}
        </GlassCard>
      </div>

      {/* results side */}
      <div className="space-y-6">
        {analyzing && (
          <GlassCard className="space-y-4 py-10">
            <div className="mx-auto h-4 w-2/3 skeleton" />
            <div className="mx-auto h-4 w-1/2 skeleton" />
            <div className="mx-auto h-4 w-3/5 skeleton" />
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
            initial={{ opacity: 0, y: 26, filter: "blur(9px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
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
                    className="glass border border-[rgba(21,21,21,0.16)] p-3.5 text-sm leading-relaxed text-foreground/90"
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
  );
}
