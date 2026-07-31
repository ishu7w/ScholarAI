"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import {
  getMyNotifications,
  markAllNotificationsReadAction,
  type NotificationFeed,
} from "@/lib/notifications/actions";

const EMPTY: NotificationFeed = { items: [], unread: 0 };

// PHASE 6 will replace this poll with a Supabase Realtime subscription
// (postgres_changes on `notifications` filtered to the caller's
// profile_id). Until then a 30s poll keeps the count fresh; demo mode
// returns an empty feed so nothing is invented.
const POLL_MS = 30_000;

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [feed, setFeed] = useState<NotificationFeed>(EMPTY);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Subscribe to the server's notification state: fetch once on mount, then
  // poll. `cancelled` stops a late response from writing to an unmounted tree.
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const next = await getMyNotifications();
        if (!cancelled) setFeed(next);
      } catch {
        // Offline or signed out mid-poll — keep the last known feed.
      }
    };

    void tick();
    const timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Close on outside click / Escape, the same affordances the shell's
  // mobile drawer offers.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAll = () => {
    startTransition(async () => {
      setFeed(await markAllNotificationsReadAction());
    });
  };

  const label =
    feed.unread > 0
      ? `Notifications — ${feed.unread} unread`
      : "Notifications — none unread";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center text-muted transition-colors hover:bg-[rgba(21,21,21,0.05)] hover:text-foreground"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell className="h-4.5 w-4.5" />
        {feed.unread > 0 && (
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 bg-primary" aria-hidden />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full z-40 mt-2 w-80 border border-[rgba(21,21,21,0.16)] bg-background"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[rgba(21,21,21,0.16)] px-4 py-3">
            <span className="mono-label text-muted">
              Notifications{feed.unread > 0 && ` · ${feed.unread} new`}
            </span>
            {feed.unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={pending}
                className="mono-label flex cursor-pointer items-center gap-1.5 text-primary transition-opacity hover:opacity-70 disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {feed.items.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-6 text-muted">
              <Inbox className="h-4 w-4 shrink-0" aria-hidden />
              <p className="text-xs leading-relaxed">
                Nothing yet. Decisions on your applications and document
                verification results will appear here.
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {feed.items.map((n) => {
                const body = (
                  <>
                    <div className="flex items-baseline gap-2">
                      {!n.read && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-primary" aria-hidden />
                      )}
                      <span className="text-sm leading-snug font-medium">{n.title}</span>
                    </div>
                    {n.body && (
                      <p className="mt-1 text-xs leading-relaxed text-muted">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted">
                      {relative(n.createdAt)}
                    </p>
                  </>
                );
                return (
                  <li
                    key={n.id}
                    role="menuitem"
                    className="border-b border-[rgba(21,21,21,0.16)] last:border-0"
                  >
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 transition-colors hover:bg-[rgba(21,21,21,0.04)]"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
