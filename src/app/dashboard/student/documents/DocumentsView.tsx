"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileCheck2, FileWarning, Hourglass, Loader2, Trash2, Upload } from "lucide-react";
import type { DocumentSummary } from "@/lib/datasource";
import { deleteDocumentAction } from "./actions";

const KINDS = [
  {
    key: "income_cert",
    label: "Income certificate",
    check: "Parsed amount is compared with the family income on your profile (20% tolerance).",
  },
  {
    key: "marksheet",
    label: "Marksheet",
    check: "Parsed CGPA or percentage is compared with the CGPA on your profile.",
  },
  {
    key: "id",
    label: "Photo ID",
    check: "Checked for the name on your profile.",
  },
  {
    key: "resume",
    label: "Resume",
    check: "Text layer is read for the analyzer — no profile claim is verified.",
  },
] as const;

const KIND_LABEL: Record<string, string> = Object.fromEntries(
  KINDS.map((k) => [k.key, k.label])
);

const STATUS_META = {
  verified: { label: "Verified", icon: FileCheck2, tone: "text-success" },
  flagged: { label: "Flagged", icon: FileWarning, tone: "text-primary" },
  pending: { label: "Pending", icon: Hourglass, tone: "text-warning" },
} as const;

const dateFmt = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function DocumentsView({
  documents,
  uploadEnabled,
}: {
  documents: DocumentSummary[];
  uploadEnabled: boolean;
}) {
  const router = useRouter();
  const [busyKind, setBusyKind] = useState<string | null>(null);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (kind: string, file: File) => {
    setBusyKind(kind);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Upload failed");
      else router.refresh();
    } catch {
      setError("Upload failed. Check your connection and retry.");
    }
    setBusyKind(null);
  };

  const remove = async (documentId: string) => {
    setBusyDoc(documentId);
    setError(null);
    const form = new FormData();
    form.append("documentId", documentId);
    const result = await deleteDocumentAction(null, form);
    if (result.error) setError(result.error);
    else router.refresh();
    setBusyDoc(null);
  };

  return (
    <div className="space-y-8">
      {!uploadEnabled && (
        <div
          role="status"
          className="hairline flex items-start gap-3 border-warning px-4 py-3"
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 bg-warning" aria-hidden />
          <span className="mono-label text-warning">
            Connect storage to upload documents. Verification runs on upload.
          </span>
        </div>
      )}

      {error && (
        <div role="alert" className="hairline flex items-start gap-3 border-primary px-4 py-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 bg-primary" aria-hidden />
          <span className="mono-label text-primary">{error}</span>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="mono-label text-muted">Upload</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {KINDS.map((kind) => (
            <div
              key={kind.key}
              className="hairline flex flex-col gap-3 border-[rgba(21,21,21,0.16)] p-5"
            >
              <div>
                <p className="text-sm font-medium">{kind.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{kind.check}</p>
              </div>
              <label
                className={
                  uploadEnabled
                    ? "btn-ghost mt-auto w-fit cursor-pointer text-xs"
                    : "btn-ghost mt-auto w-fit cursor-not-allowed text-xs opacity-50"
                }
              >
                {busyKind === kind.key ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" /> Choose file
                  </>
                )}
                <input
                  type="file"
                  className="sr-only"
                  accept="application/pdf,image/png,image/jpeg"
                  disabled={!uploadEnabled || busyKind !== null}
                  aria-label={`Upload ${kind.label}`}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(kind.key, f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="mono-label text-muted">
          Uploaded ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <div className="hairline border-[rgba(21,21,21,0.16)] px-5 py-10 text-center">
            <p className="text-sm text-muted">
              Nothing uploaded yet. Verification results appear here once you add a
              document.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc, i) => {
              const meta = STATUS_META[doc.verificationStatus];
              const StatusIcon = meta.icon;
              return (
                <motion.li
                  key={doc.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="hairline border-[rgba(21,21,21,0.16)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {KIND_LABEL[doc.kind] ?? doc.kind}
                      </p>
                      <p className="mono-label mt-1 text-muted">
                        {dateFmt.format(new Date(doc.createdAt))}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1.5 ${meta.tone}`}>
                        <StatusIcon className="h-4 w-4" aria-hidden />
                        <span className="mono-label">{meta.label}</span>
                      </span>
                      <button
                        onClick={() => remove(doc.id)}
                        disabled={busyDoc === doc.id}
                        className="btn-ghost text-xs"
                        aria-label={`Delete ${KIND_LABEL[doc.kind] ?? doc.kind}`}
                      >
                        {busyDoc === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {doc.flags.length > 0 && (
                    <ul className="mt-4 space-y-2 border-t border-[rgba(21,21,21,0.12)] pt-4">
                      {doc.flags.map((flag) => (
                        <li key={flag} className="flex items-start gap-2.5">
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-primary"
                            aria-hidden
                          />
                          <span className="text-xs leading-relaxed text-foreground/90">
                            {flag}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
