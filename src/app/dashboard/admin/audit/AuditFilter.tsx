"use client";

import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

/**
 * Action filter. Navigates with a query param so the page stays a server
 * component and the filtered view is linkable.
 */
export default function AuditFilter({
  actions,
  selected,
}: {
  actions: string[];
  selected: string;
}) {
  const router = useRouter();

  const onChange = (action: string) => {
    // Filtering always returns to page 1 — an offset from the previous
    // filter would land past the end of the new result set.
    router.push(
      action
        ? `/dashboard/admin/audit?action=${encodeURIComponent(action)}`
        : "/dashboard/admin/audit"
    );
  };

  return (
    <label className="flex items-center gap-3">
      <span className="mono-label flex items-center gap-2 text-muted">
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Action
      </span>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={actions.length === 0}
        className="input-premium !w-auto !py-2 appearance-none disabled:opacity-40"
      >
        <option value="">All actions</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </label>
  );
}
