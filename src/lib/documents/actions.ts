import "server-only";

// ─────────────────────────────────────────────────────────────
// Document storage + persistence.
//
// Files live in a PRIVATE Supabase Storage bucket, namespaced per
// user (`${userId}/…`). The owning user id always comes from the
// session — a client-declared id is never trusted. Institutions read
// verification results through RLS; no storage path or signed URL is
// ever handed to a non-owner.
// ─────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { hasDatabase } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { verifyDocument, type DocumentKind, type VerificationStatus } from "./verify";

export const DOCUMENTS_BUCKET = "documents";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/** Shown in demo mode and whenever storage is not configured. */
export const STORAGE_UNAVAILABLE =
  "Connect storage to upload — file uploads need a Supabase project (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) and DATABASE_URL.";

export const documentKindSchema = z.enum([
  "resume",
  "income_cert",
  "marksheet",
  "id",
]);

/** Form fields accepted by the upload route (the file itself is checked separately). */
export const uploadFieldsSchema = z.object({
  kind: documentKindSchema,
  applicationId: z.uuid().optional().nullable(),
});

export const uploadedFileSchema = z.object({
  name: z.string().min(1),
  size: z
    .number()
    .int()
    .positive("The uploaded file is empty")
    .max(MAX_UPLOAD_BYTES, "File is larger than the 5MB limit"),
  type: z.enum(ALLOWED_MIME_TYPES, {
    error: "Only PDF, PNG and JPEG files are accepted",
  }),
});

/** What the UI is allowed to see. Never includes a URL or the file itself. */
export interface DocumentRecord {
  id: string;
  kind: DocumentKind;
  storagePath: string;
  verificationStatus: VerificationStatus;
  flags: string[];
  extractedFields: Record<string, unknown> | null;
  createdAt: string;
}

export type DocumentActionResult =
  | { ok: true; document: DocumentRecord }
  | { ok: false; error: string };

type DocumentRow = typeof schema.documents.$inferSelect;

export function rowToDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    kind: row.kind,
    storagePath: row.storagePath,
    verificationStatus: row.verificationStatus,
    flags: row.flags,
    extractedFields: (row.extractedFields as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** True when both a storage backend and a database are configured. */
export async function canUpload(): Promise<boolean> {
  return Boolean(getSupabaseAdmin()) && hasDatabase();
}

/**
 * Idempotently ensure the private `documents` bucket exists. Uses the
 * service role — bucket creation is not an anon-key operation. Safe to
 * call on every upload; a pre-existing bucket is not an error.
 */
export async function ensureDocumentsBucket(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: STORAGE_UNAVAILABLE };

  const { data, error } = await admin.storage.getBucket(DOCUMENTS_BUCKET);
  if (data && !error) return { ok: true };

  const { error: createError } = await admin.storage.createBucket(DOCUMENTS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_UPLOAD_BYTES,
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  });
  // A concurrent request may have won the race — that is success too.
  if (createError && !/exist/i.test(createError.message)) {
    return { ok: false, error: `Could not create the documents bucket: ${createError.message}` };
  }
  return { ok: true };
}

/** `${userId}/${kind}-${timestamp}.${ext}` — the user id is the namespace. */
export function buildStoragePath(
  userId: string,
  kind: DocumentKind,
  mimeType: string
): string {
  const ext = EXTENSION_BY_MIME[mimeType] ?? "bin";
  return `${userId}/${kind}-${Date.now()}.${ext}`;
}

/** Uploads to the private bucket. `userId` must come from the session. */
export async function putDocumentObject(
  userId: string,
  kind: DocumentKind,
  bytes: Uint8Array,
  mimeType: string
): Promise<{ ok: true; storagePath: string } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: STORAGE_UNAVAILABLE };

  const bucket = await ensureDocumentsBucket();
  if (!bucket.ok) return bucket;

  const storagePath = buildStoragePath(userId, kind, mimeType);
  const { error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

  if (error) return { ok: false, error: `Upload failed: ${error.message}` };
  return { ok: true, storagePath };
}

/**
 * The full upload path: store the file, insert a `pending` row, run the
 * verification pipeline against the student's own DB profile, then
 * update the row with the verdict. Returns the row plus the extracted
 * text so the resume analyzer can score without re-parsing.
 *
 * `userId` and `studentName` must come from the session.
 */
export async function storeAndVerifyDocument(args: {
  userId: string;
  studentName: string;
  kind: DocumentKind;
  applicationId?: string | null;
  bytes: Uint8Array;
  mimeType: string;
}): Promise<
  | { ok: true; document: DocumentRecord; text: string }
  | { ok: false; error: string }
> {
  if (!(await canUpload())) return { ok: false, error: STORAGE_UNAVAILABLE };

  const put = await putDocumentObject(
    args.userId,
    args.kind,
    args.bytes,
    args.mimeType
  );
  if (!put.ok) return put;

  const inserted = await db()
    .insert(schema.documents)
    .values({
      studentId: args.userId,
      applicationId: args.applicationId ?? null,
      storagePath: put.storagePath,
      kind: args.kind,
      verificationStatus: "pending",
    })
    .returning();

  const row = inserted[0];
  if (!row) return { ok: false, error: "Could not record the uploaded document" };

  // Compare against the student's real row — the profile is the claim
  // being checked, so it is read from the DB, never from the request.
  const profileRows = await db()
    .select({
      familyIncome: schema.studentProfiles.familyIncome,
      cgpa: schema.studentProfiles.cgpa,
    })
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.profileId, args.userId))
    .limit(1);
  const profile = profileRows[0] ?? null;

  const outcome = await verifyDocument({
    kind: args.kind,
    mimeType: args.mimeType,
    bytes: args.bytes,
    studentName: args.studentName,
    declaredIncome: profile?.familyIncome ?? null,
    declaredCgpa: profile?.cgpa ?? null,
  });

  const updated = await db()
    .update(schema.documents)
    .set({
      verificationStatus: outcome.status,
      flags: outcome.flags,
      extractedFields: outcome.extractedFields,
    })
    .where(eq(schema.documents.id, row.id))
    .returning();

  revalidatePath("/dashboard/student/documents");
  return {
    ok: true,
    document: rowToDocument(updated[0] ?? row),
    text: outcome.text,
  };
}

/** Documents owned by the caller. Never call with an id from the client. */
export async function listMyDocuments(): Promise<DocumentRecord[]> {
  const me = await getSessionProfile();
  if (!me || !hasDatabase()) return [];

  const rows = await db()
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.studentId, me.id))
    .orderBy(desc(schema.documents.createdAt));

  return rows.map(rowToDocument);
}

/**
 * Deletes the storage object and the row. The `where` clause is scoped
 * by `ownerId` (which callers must take from the session), so a guessed
 * document id belonging to someone else matches nothing.
 */
export async function deleteOwnDocument(
  ownerId: string,
  documentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z.uuid().safeParse(documentId);
  if (!parsed.success) return { ok: false, error: "Invalid document id" };

  if (!hasDatabase()) return { ok: false, error: STORAGE_UNAVAILABLE };

  const rows = await db()
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.id, parsed.data),
        eq(schema.documents.studentId, ownerId)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return { ok: false, error: "Document not found" };

  const admin = getSupabaseAdmin();
  if (admin) {
    // Storage first: a failed delete here must not leave an orphaned file
    // that no row points at any more.
    const { error } = await admin.storage
      .from(DOCUMENTS_BUCKET)
      .remove([row.storagePath]);
    if (error) {
      return { ok: false, error: `Could not remove the stored file: ${error.message}` };
    }
  }

  await db().delete(schema.documents).where(eq(schema.documents.id, row.id));

  revalidatePath("/dashboard/student/documents");
  return { ok: true };
}
