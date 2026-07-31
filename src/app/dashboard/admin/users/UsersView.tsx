"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Ban, Search, UserCheck } from "lucide-react";
import { Avatar, Badge } from "@/components/ui/primitives";
import {
  setUserDisabledAction,
  setUserRoleAction,
  type AdminUser,
  type Role,
} from "@/lib/admin/actions";
import { formatDate } from "@/lib/utils";

const ROLES: Role[] = ["student", "institution", "admin"];

export default function UsersView({
  users,
  mode,
  currentUserId,
}: {
  users: AdminUser[];
  mode: "demo" | "live";
  currentUserId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query, roleFilter]);

  const run = (id: string, fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => {
    setBusyId(id);
    setNotice(null);
    startTransition(async () => {
      const result = await fn();
      setNotice(
        result.ok
          ? { tone: "ok", text: result.message ?? "Saved" }
          : { tone: "error", text: result.error ?? "Action failed" }
      );
      setBusyId(null);
      if (result.ok) router.refresh();
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, filter: "blur(9px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      {mode === "demo" && (
        <div className="hairline flex items-center gap-3 px-4 py-3">
          <span className="h-2 w-2 shrink-0 bg-primary" aria-hidden />
          <span className="mono-label text-muted">
            Demo mode — the seeded roster. Changes are not persisted.
          </span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`hairline flex items-center gap-3 px-4 py-3 ${
            notice.tone === "error" ? "border-primary" : ""
          }`}
        >
          <span
            className={`h-2 w-2 shrink-0 ${notice.tone === "error" ? "bg-primary" : "bg-success"}`}
            aria-hidden
          />
          <span
            className={`mono-label ${notice.tone === "error" ? "text-primary" : "text-success"}`}
          >
            {notice.text}
          </span>
        </div>
      )}

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[220px]">
          <span className="sr-only">Search users by name or email</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="input-premium !pl-11"
          />
        </label>
        <div className="flex items-center gap-2" role="group" aria-label="Filter by role">
          {(["all", ...ROLES] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              aria-pressed={roleFilter === r}
              className={`mono-label cursor-pointer border px-3 py-2 transition-colors ${
                roleFilter === r
                  ? "border-foreground text-foreground"
                  : "border-[rgba(21,21,21,0.16)] text-muted hover:border-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* roster */}
      {users.length === 0 ? (
        <div className="hairline p-6">
          <h2 className="font-semibold">No accounts yet</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Profiles appear here as soon as people register.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="hairline p-6">
          <p className="text-sm text-muted">No account matches that search.</p>
        </div>
      ) : (
        <div className="hairline overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Platform accounts with role and access controls
            </caption>
            <thead>
              <tr className="border-b border-[rgba(21,21,21,0.16)]">
                <Th>Account</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId;
                const busy = pending && busyId === u.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-[rgba(21,21,21,0.16)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} hue={258} size={32} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {u.name}
                            {isSelf && (
                              <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-muted">
                                you
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <label>
                        <span className="sr-only">Role for {u.email}</span>
                        <select
                          value={u.role}
                          disabled={busy}
                          onChange={(e) =>
                            run(u.id, () =>
                              setUserRoleAction({
                                userId: u.id,
                                role: e.target.value as Role,
                              })
                            )
                          }
                          className="input-premium !w-auto !py-2 appearance-none"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-[family-name:var(--font-spline-mono)] text-xs text-muted">
                        {formatDate(u.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.disabled ? "danger" : "success"} className="!text-[10px]">
                        {u.disabled ? "disabled" : "active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={busy || (isSelf && !u.disabled)}
                        title={
                          isSelf && !u.disabled
                            ? "You cannot disable your own admin account"
                            : undefined
                        }
                        onClick={() =>
                          run(u.id, () =>
                            setUserDisabledAction({ userId: u.id, disabled: !u.disabled })
                          )
                        }
                        className="mono-label inline-flex cursor-pointer items-center gap-2 border border-[rgba(21,21,21,0.16)] px-3 py-2 text-muted transition-colors hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {u.disabled ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" /> Enable
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5" /> Disable
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Disabling an account blocks its session immediately. Every role change and
        access change is appended to the audit log with the acting admin.
      </p>
    </motion.div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
