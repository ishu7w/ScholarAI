"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { deleteOwnDocument } from "@/lib/documents/actions";

const deleteSchema = z.object({ documentId: z.uuid("Unknown document") });

/**
 * Removes the storage object and the row. Ownership is enforced by the
 * session id, not by anything the form sends, so a forged document id
 * belonging to another student simply matches nothing.
 */
export async function deleteDocumentAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const me = await requireRole(["student"], "/dashboard/student/documents");

  const parsed = deleteSchema.safeParse({ documentId: formData.get("documentId") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unknown document" };
  }

  const result = await deleteOwnDocument(me.id, parsed.data.documentId);
  return result.ok ? {} : { error: result.error };
}
