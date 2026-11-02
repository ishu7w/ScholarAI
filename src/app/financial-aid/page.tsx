"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Check, ExternalLink, HandCoins, Search } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import { Badge, GlassCard } from "@/components/ui/primitives";
import { AID_CHECKLIST, FUNDING_DATE_CHECKED, FUNDING_OPPORTUNITIES } from "@/lib/funding";

const numberField = "input-premium mt-1";
const money = (value: number, currency: string) => new Intl.NumberFormat(undefined, {
  style: "currency", currency, maximumFractionDigits: 0,
}).format(value);

const CHECKLIST_KEY = "scholarai-aid-checklist-v1";
const validTaskIds = new Set(AID_CHECKLIST.map((task) => task.id));

function readChecklist() {
  try {
    return localStorage.getItem(CHECKLIST_KEY);
  } catch {
    return null;
  }
}

function subscribeChecklist(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("scholarai-aid-checklist-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("scholarai-aid-checklist-change", callback);
  };
}

export default function FinancialAidPage() {
  const [currency, setCurrency] = useState("USD");
  const [cost, setCost] = useState(24000);
  const [confirmed, setConfirmed] = useState(4000);
  const [contribution, setContribution] = useState(6000);
  const [query, setQuery] = useState("");
  const checklistRaw = useSyncExternalStore(
    subscribeChecklist,
    readChecklist,
    () => null
  );
  const checked = useMemo(() => {
    try {
      const parsed: unknown = checklistRaw ? JSON.parse(checklistRaw) : [];
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string" && validTaskIds.has(id))
        : [];
    } catch {
      return [];
    }
  }, [checklistRaw]);

  const toggleTask = (id: string) => {
    const next = checked.includes(id) ? checked.filter((item) => item !== id) : [...checked, id];
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next)); } catch { /* Optional persistence. */ }
    window.dispatchEvent(new Event("scholarai-aid-checklist-change"));
  };

  const gap = Math.max(0, cost - confirmed - contribution);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FUNDING_OPPORTUNITIES;
    return FUNDING_OPPORTUNITIES.filter((item) =>
      [item.name, item.provider, item.destination, item.level, item.type, ...item.tags]
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <DashboardShell title="Financial Aid Planner" subtitle="Estimate your funding gap and find official opportunities">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-background"><HandCoins className="h-5 w-5" /></span>
            <div>
              <p className="mono-label text-primary-bright">YOUR STUDY BUDGET</p>
              <h2 className="mt-1 text-xl font-semibold">Where does the funding gap stand?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">Use one currency and one academic year for every amount. This is a planning estimate, not an aid eligibility decision.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Currency (amounts are not converted)
              <select className={numberField} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD · US dollar</option><option value="INR">INR · Indian rupee</option><option value="GBP">GBP · British pound</option><option value="EUR">EUR · euro</option><option value="CAD">CAD · Canadian dollar</option><option value="AUD">AUD · Australian dollar</option>
              </select>
            </label>
            <label className="text-sm">Estimated yearly study cost
              <input className={numberField} type="number" min="0" step="500" value={cost} onChange={(e) => setCost(Math.max(0, Number(e.target.value)))} />
            </label>
            <label className="text-sm">Aid already confirmed
              <input className={numberField} type="number" min="0" step="500" value={confirmed} onChange={(e) => setConfirmed(Math.max(0, Number(e.target.value)))} />
            </label>
            <label className="text-sm">Your planned contribution
              <input className={numberField} type="number" min="0" step="500" value={contribution} onChange={(e) => setContribution(Math.max(0, Number(e.target.value)))} />
            </label>
          </div>

          <div className="mt-6 grid gap-4 border-t border-[rgba(21,21,21,0.16)] pt-5 sm:grid-cols-3">
            <div><p className="mono-label text-muted">ANNUAL COST</p><p className="mt-1 text-xl font-semibold">{money(cost, currency)}</p></div>
            <div><p className="mono-label text-muted">CONFIRMED + CONTRIBUTION</p><p className="mt-1 text-xl font-semibold">{money(confirmed + contribution, currency)}</p></div>
            <div><p className="mono-label text-primary-bright">ESTIMATED GAP</p><p className="mt-1 text-2xl font-bold">{money(gap, currency)}</p></div>
          </div>
          <div className="mt-5 h-2 w-full bg-foreground/10" aria-label="Share of study cost covered">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${cost === 0 ? 100 : Math.min(100, ((confirmed + contribution) / cost) * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">Coverage from confirmed aid and planned contribution: {cost === 0 ? 100 : Math.min(100, Math.round(((confirmed + contribution) / cost) * 100))}%</p>
        </GlassCard>

        <GlassCard>
          <div className="flex items-start justify-between gap-4">
            <div><p className="mono-label text-primary-bright">APPLICATION WORKSPACE</p><h2 className="mt-1 text-xl font-semibold">Financial aid checklist</h2><p className="mt-2 text-sm text-muted">Saved on this device · {checked.length} of {AID_CHECKLIST.length} complete</p></div>
            <Badge tone="neutral">{Math.round((checked.length / AID_CHECKLIST.length) * 100)}%</Badge>
          </div>
          <div className="mt-5 h-1.5 bg-foreground/10"><div className="h-full bg-primary transition-[width]" style={{ width: `${(checked.length / AID_CHECKLIST.length) * 100}%` }} /></div>
          <ul className="mt-5 space-y-1">
            {AID_CHECKLIST.map((task) => {
              const done = checked.includes(task.id);
              return <li key={task.id}><button type="button" aria-pressed={done} onClick={() => toggleTask(task.id)} className="flex w-full cursor-pointer items-start gap-3 py-3 text-left text-sm hover:bg-foreground/[0.03]"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${done ? "border-primary bg-primary text-background" : "border-foreground/30"}`}>{done && <Check className="h-3.5 w-3.5" />}</span><span className={done ? "text-muted line-through" : ""}>{task.label}</span></button></li>;
            })}
          </ul>
        </GlassCard>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="mono-label text-primary-bright">VERIFIED STARTING POINTS</p><h2 className="mt-1 text-2xl font-semibold">Scholarships and aid programs</h2><p className="mt-2 max-w-2xl text-sm text-muted">Official sources only · cycle dates checked {FUNDING_DATE_CHECKED}. Program terms can change by country, university, and application cycle; confirm details before applying.</p></div>
          <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search programs or destinations" className="input-premium !pl-10" aria-label="Search funding opportunities" /></div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {results.map((item) => <GlassCard key={item.name} className="flex h-full flex-col">
            <div className="flex flex-wrap gap-2">{item.tags.slice(0, 2).map((tag) => <Badge key={tag} tone="neutral" className="!text-[10px]">{tag}</Badge>)}</div>
            <h3 className="mt-3 text-lg font-semibold leading-snug">{item.name}</h3>
            <p className="mt-1 text-xs text-muted">{item.provider} · {item.destination}</p>
            <p className="mt-4 text-sm font-medium">{item.coverage}</p>
            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <p><span className="font-semibold">Typical level: </span>{item.level}</p>
              <p><span className="font-semibold">Who it may suit: </span>{item.eligibility}</p>
              <p><span className="font-semibold">Current deadline: </span>{item.deadlineInfo ?? "Check the official program page; this cycle does not have one global date."}</p>
              <p><span className="font-semibold">How to apply: </span>{item.application}</p>
            </div>
            <a href={item.officialUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5 w-full justify-between !px-4 !py-3 text-sm">Visit official program <span className="flex items-center gap-1"><ExternalLink className="h-4 w-4" /><ArrowUpRight className="h-4 w-4" /></span></a>
          </GlassCard>)}
        </div>
        {results.length === 0 && <GlassCard className="mt-4 text-center text-sm text-muted">No programs match that search. Try a country, study level, or funding type.</GlassCard>}
      </section>
      <p className="mt-8 border-t border-[rgba(21,21,21,0.16)] pt-4 text-xs leading-relaxed text-muted">ScholarAI is an information and planning tool, not a funding provider. It does not submit applications or determine eligibility. Never pay an unverified intermediary; use the provider&apos;s official application site.</p>
    </DashboardShell>
  );
}
