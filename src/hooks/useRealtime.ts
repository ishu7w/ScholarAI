"use client";

// ─────────────────────────────────────────────────────────────
// Phase 6 — the single Supabase Realtime subscription primitive.
//
// One hook, used by the notification bell and both dashboards. It
// deliberately does NOT re-query anything client-side: the default
// reaction is router.refresh(), which re-runs the server components
// that already own the query logic. That keeps "every figure shown
// twice agrees" true — there is still exactly one source for each
// number, and realtime only decides *when* to re-read it.
//
// Demo mode (no Supabase env) has no socket to open: getSupabaseBrowser()
// returns null and the effect no-ops, so the app keeps working with zero
// env vars exactly as before.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/** A row as it arrives over the wire — column names, unknown values. */
export type RealtimeRow = Record<string, unknown>;

export type RealtimeChange = RealtimePostgresChangesPayload<RealtimeRow>;

/** Postgres CDC events, as Realtime names them. */
export type RealtimeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

export interface UseRealtimeOptions {
  /**
   * Which CDC events to listen for. Default: every event.
   * Readonly so callers can pass a module-level `as const` tuple — the
   * stable-reference pattern that keeps the channel from being rebuilt.
   */
  events?: readonly RealtimeEvent[];
  /** Postgres schema holding the table. Default: "public". */
  schema?: string;
  /**
   * Set false to stay unsubscribed — e.g. while the signed-in user id
   * needed to build `filter` is not known yet. Prevents subscribing to
   * an unscoped stream by accident.
   */
  enabled?: boolean;
}

/**
 * Coalesce window for the default refresh. A single institution decision
 * or a bulk insert can emit several events back to back; refreshing once
 * per event would stampede the server component render.
 */
const COALESCE_MS = 300;

/**
 * Subscribe to postgres_changes on `table`, reacting to each change.
 *
 * @param table  table name, e.g. "applications"
 * @param filter Realtime filter string (`student_id=eq.<uuid>`), or null
 *               for no filter — RLS still scopes what actually arrives.
 * @param onChange optional reaction. Omit it to get the default
 *               router.refresh(), which is what most callers want.
 */
export function useRealtime(
  table: string,
  filter: string | null,
  onChange?: (payload: RealtimeChange) => void,
  options: UseRealtimeOptions = {}
): void {
  const { events = ["*"], schema = "public", enabled = true } = options;

  const router = useRouter();
  const instanceId = useId();

  // The callback lives in a ref so a caller passing an inline arrow
  // (the normal case) does not re-create the channel on every render.
  // The subscribe effect below therefore never depends on its identity.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Same reasoning for the events array: an inline `["INSERT","UPDATE"]`
  // literal is a new reference each render, so the effect keys off a
  // stable string instead and reads the array through a ref.
  const eventsKey = events.join(",");
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      router.refresh();
    }, COALESCE_MS);
  }, [router]);

  // Stable topic per hook instance. Two components subscribing to the
  // same table must not share a topic, or unmounting one would tear
  // down the other's subscription.
  const topic = useMemo(
    () => `rt:${table}:${instanceId.replace(/[^a-zA-Z0-9]/g, "")}`,
    [table, instanceId]
  );

  useEffect(() => {
    if (!enabled) return;

    // Demo mode: no client, no socket, no error.
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channel = supabase.channel(topic);

    for (const event of eventsRef.current) {
      channel.on(
        "postgres_changes",
        filter
          ? { event, schema, table, filter }
          : { event, schema, table },
        (payload: RealtimeChange) => {
          const handler = onChangeRef.current;
          if (handler) handler(payload);
          else scheduleRefresh();
        }
      );
    }

    channel.subscribe();

    // Unsubscribe + drop the channel from the client's registry. Without
    // removeChannel the channel object survives the unmount and keeps
    // rejoining on socket reconnect — the classic leak.
    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
      void supabase.removeChannel(channel);
    };
    // Every dep is a primitive: the channel is rebuilt only when the
    // subscription itself genuinely changes, never on a re-render.
  }, [enabled, topic, table, filter, schema, eventsKey, scheduleRefresh]);
}

export default useRealtime;
