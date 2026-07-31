"use server";

// ─────────────────────────────────────────────────────────────
// Notification reads + mark-read, scoped to the signed-in profile.
// The bell polls getMyNotifications() every 30s.
//
// PHASE 6: replace the client poll with a Supabase Realtime
// subscription on `notifications` filtered to profile_id=eq.<id>
// (postgres_changes INSERT/UPDATE) via the shared useRealtime hook.
// These functions stay as the initial fetch + mutation path.
// ─────────────────────────────────────────────────────────────

import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { hasDatabase } from "@/lib/env";
import { getSessionProfile } from "@/lib/auth/session";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationFeed {
  items: NotificationItem[];
  unread: number;
}

/** Shape written by other features into notifications.payload. */
const payloadSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(500).optional(),
  message: z.string().max(500).optional(),
  href: z.string().max(300).optional(),
});

const EMPTY: NotificationFeed = { items: [], unread: 0 };

/** Fallback title when a payload predates the title convention. */
function titleFor(type: string): string {
  switch (type) {
    case "application.approved":
      return "Application approved";
    case "application.rejected":
      return "Application decided";
    case "application.under_review":
      return "Application under review";
    case "document.verified":
      return "Document verified";
    case "document.flagged":
      return "Document flagged";
    default:
      return type.replace(/[._]/g, " ");
  }
}

/**
 * Recent notifications for the caller. Demo mode (no DB) has no
 * notification store — an empty feed, so the bell shows no marker.
 */
export async function getMyNotifications(): Promise<NotificationFeed> {
  const me = await getSessionProfile();
  if (!me) return EMPTY;
  if (!hasDatabase()) return EMPTY;

  const rows = await db()
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.profileId, me.id))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(12);

  const items: NotificationItem[] = rows.map((r) => {
    const parsed = payloadSchema.safeParse(r.payload ?? {});
    const p = parsed.success ? parsed.data : {};
    return {
      id: r.id,
      type: r.type,
      title: p.title ?? titleFor(r.type),
      body: p.body ?? p.message ?? null,
      href: p.href ?? null,
      read: r.readAt !== null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return { items, unread: items.filter((i) => !i.read).length };
}

export async function markAllNotificationsReadAction(): Promise<NotificationFeed> {
  const me = await getSessionProfile();
  if (!me) return EMPTY;
  if (!hasDatabase()) return EMPTY;

  await db()
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.profileId, me.id),
        isNull(schema.notifications.readAt)
      )
    );

  return getMyNotifications();
}

const markOneSchema = z.object({ id: z.uuid("Invalid notification id") });

export async function markNotificationReadAction(
  input: unknown
): Promise<NotificationFeed> {
  const me = await getSessionProfile();
  if (!me) return EMPTY;

  const parsed = markOneSchema.safeParse(input);
  if (!parsed.success) return getMyNotifications();
  if (!hasDatabase()) return EMPTY;

  // Scoped by profile_id as well as id — a caller can only mark their own.
  await db()
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.id, parsed.data.id),
        eq(schema.notifications.profileId, me.id)
      )
    );

  return getMyNotifications();
}
