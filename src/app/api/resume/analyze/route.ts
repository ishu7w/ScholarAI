import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeResume } from "@/lib/ai-engine";
import { getSessionProfile } from "@/lib/auth/session";
import {
  canUpload,
  MAX_UPLOAD_BYTES,
  STORAGE_UNAVAILABLE,
  storeAndVerifyDocument,
  uploadedFileSchema,
} from "@/lib/documents/actions";
import { extractDocumentText } from "@/lib/documents/verify";

export const dynamic = "force-dynamic";

// Pasted text is analyzed but never stored — only uploaded files become
// documents rows.
const textSchema = z.object({
  text: z
    .string()
    .trim()
    .min(40, "Add more resume content before analyzing")
    .max(200_000, "Resume text is too long to analyze"),
});

/**
 * POST /api/resume/analyze
 *
 * multipart/form-data with `file` → the PDF is stored as a `resume`
 * document, its text layer extracted, and scored.
 * application/json `{ text }` → scored only (the paste / sample path).
 *
 * Scoring is `analyzeResume` from the engine, unchanged.
 */
export async function POST(request: NextRequest) {
  const me = await getSessionProfile();
  if (!me) {
    return NextResponse.json({ error: "Sign in to analyze a resume" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return handleFile(request, me);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const parsed = textSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid resume text" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    analysis: analyzeResume(parsed.data.text),
    source: "text",
    document: null,
  });
}

async function handleFile(
  request: NextRequest,
  me: { id: string; name: string; role: string }
) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart/form-data upload" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was attached" }, { status: 400 });
  }

  const meta = uploadedFileSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!meta.success) {
    return NextResponse.json(
      { error: meta.error.issues[0]?.message ?? "Unsupported file" },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File is larger than the 5MB limit" },
      { status: 413 }
    );
  }

  // Demo mode has nowhere to put the file. The paste and sample paths
  // still work, so say exactly what is missing instead of failing vaguely.
  if (!(await canUpload())) {
    return NextResponse.json({ error: STORAGE_UNAVAILABLE }, { status: 503 });
  }
  if (me.role !== "student") {
    return NextResponse.json(
      { error: "Only student accounts can upload a resume" },
      { status: 403 }
    );
  }

  const stored = await storeAndVerifyDocument({
    userId: me.id,
    studentName: me.name,
    kind: "resume",
    bytes,
    mimeType: meta.data.type,
  });
  if (!stored.ok) {
    return NextResponse.json({ error: stored.error }, { status: 500 });
  }

  // storeAndVerifyDocument already parsed the text; fall back only if a
  // future code path stops returning it.
  const text = stored.text || (await extractDocumentText(bytes, meta.data.type));
  if (!text) {
    return NextResponse.json(
      {
        error:
          "No text could be read from this file — image-only PDFs and photos need an OCR pass. Paste the text instead.",
        document: stored.document,
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    analysis: analyzeResume(text),
    source: "file",
    text,
    document: stored.document,
  });
}
