import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth/guard";
import { getAuditPage } from "@/lib/admin/actions";
import AuditFilter from "./AuditFilter";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole(["admin"], "/dashboard/admin/audit");

  const sp = await searchParams;
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const rawAction = Array.isArray(sp.action) ? sp.action[0] : sp.action;

  // getAuditPage zod-validates page/action and re-checks the admin role.
  const data = await getAuditPage({ page: rawPage ?? 1, action: rawAction });

  if (!data) {
    return (
      <DashboardShell title="Audit log" subtitle="Admin access required">
        <div className="hairline max-w-2xl p-6">
          <p className="text-sm text-muted">The audit log could not be read for this account.</p>
        </div>
      </DashboardShell>
    );
  }

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const query = (page: number) => {
    const params = new URLSearchParams();
    if (rawAction) params.set("action", rawAction);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/dashboard/admin/audit?${qs}` : "/dashboard/admin/audit";
  };

  return (
    <DashboardShell
      title="Audit log"
      subtitle="Append-only record of every decision and administrative action"
    >
      <div className="space-y-6">
        {data.mode === "demo" && (
          <div className="hairline flex items-center gap-3 px-4 py-3">
            <span className="h-2 w-2 shrink-0 bg-primary" aria-hidden />
            <span className="mono-label text-muted">
              Demo mode — sample trail. Connect a database for the real log.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <AuditFilter actions={data.actions} selected={rawAction ?? ""} />
          <span className="mono-label text-muted">
            {data.total.toLocaleString()} {data.total === 1 ? "entry" : "entries"}
          </span>
        </div>

        {data.entries.length === 0 ? (
          <div className="hairline p-6">
            <h2 className="font-semibold">Nothing recorded</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {rawAction
                ? "No entry matches that action."
                : "Decisions, weight edits and admin actions are appended here as they happen."}
            </p>
          </div>
        ) : (
          <div className="hairline overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Audit log entries, newest first</caption>
              <thead>
                <tr className="border-b border-[rgba(21,21,21,0.16)]">
                  {["When", "Actor", "Action", "Entity", "Entity id"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-[rgba(21,21,21,0.16)] last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-[family-name:var(--font-spline-mono)] text-xs text-muted">
                      {new Date(e.createdAt).toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-4 py-3 text-xs">{e.actorEmail ?? "system"}</td>
                    <td className="px-4 py-3 text-sm">{e.action}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral" className="!text-[10px]">
                        {e.entity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-[family-name:var(--font-spline-mono)] text-xs text-muted">
                      {e.entityId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <nav className="flex items-center justify-between gap-4" aria-label="Audit log pages">
            {data.page > 1 ? (
              <Link href={query(data.page - 1)} className="btn-ghost !px-4 !py-2">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="mono-label text-muted">
              Page {data.page} of {pages}
            </span>
            {data.page < pages ? (
              <Link href={query(data.page + 1)} className="btn-ghost !px-4 !py-2">
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <p className="text-xs leading-relaxed text-muted">
          Read-only by design — entries cannot be edited or deleted from this view.
        </p>
      </div>
    </DashboardShell>
  );
}
