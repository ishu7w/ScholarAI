import { type NextRequest, NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/session";
import {
  canUpload,
  MAX_UPLOAD_BYTES,
  STORAGE_UNAVAILABLE,
  storeAndVerifyDocument,
  uploadFieldsSchema,
  uploadedFileSchema,
} from "@/lib/documents/actions";

// Uploads read the request body and the session — never prerendered.
export const dynamic = "force-dynamic";

/**
 * POST /api/documents/upload
 * multipart/form-data: file, kind, applicationId?
 *
 * Authenticated students only. Stores the file in the private bucket,
 * records a documents row, runs verification, and returns the ROW —
 * never the file or a storage URL.
 */
export async function POST(request: NextRequest) {
  const me = await getSessionProfile();
  if (!me) {
    return NextResponse.json({ error: "Sign in to upload documents" }, { status: 401 });
  }
  if (me.role !== "student") {
    return NextResponse.json(
      { error: "Only student accounts can upload documents" },
      { status: 403 }
    );
  }

  if (!(await canUpload())) {
    return NextResponse.json({ error: STORAGE_UNAVAILABLE }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart/form-data upload" },
      { status: 400 }
    );
  }

  const fields = uploadFieldsSchema.safeParse({
    kind: form.get("kind"),
    applicationId: form.get("applicationId") || undefined,
  });
  if (!fields.success) {
    return NextResponse.json(
      { error: fields.error.issues[0]?.message ?? "Invalid upload fields" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was attached" }, { status: 400 });
  }

  // Size and type are validated server-side; the client's accept="" is
  // a convenience, not a control.
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
  // Trust the bytes we actually received over the declared size.
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File is larger than the 5MB limit" },
      { status: 413 }
    );
  }

  const result = await storeAndVerifyDocument({
    userId: me.id, // session identity — the client cannot choose an owner
    studentName: me.name,
    kind: fields.data.kind,
    applicationId: fields.data.applicationId ?? null,
    bytes,
    mimeType: meta.data.type,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ document: result.document }, { status: 201 });
}
