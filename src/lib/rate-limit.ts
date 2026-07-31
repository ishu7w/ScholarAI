// ─────────────────────────────────────────────────────────────
// In-memory sliding-window rate limiter.
//
// HONEST LIMITATION: state lives in this Node process's heap. That
// means the limit is PER INSTANCE, not global:
//   • On serverless (Vercel, Lambda) each cold start gets an empty
//     map, and concurrent instances each enforce their own counter,
//     so the effective ceiling is `limit × instances`.
//   • The map is lost on redeploy or scale-to-zero.
// It is a real speed bump against a single-client credential-stuffing
// loop, not a security boundary. A production deployment needs a
// shared store (Upstash/Redis `INCR` + `EXPIRE`, or Postgres) behind
// the same `checkRateLimit` signature — this module is the seam.
// ─────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the oldest hit leaves the window. 0 when allowed. */
  retryAfterMs: number;
}

/** key → ascending timestamps (ms) of the hits still inside the window. */
const hits = new Map<string, number[]>();

/**
 * Sweep keys whose whole window has expired so a long-lived process does
 * not accumulate one array per attacker-supplied key. Runs opportunistically
 * on write, capped so a hot path never pays for a full scan.
 */
const SWEEP_EVERY = 500;
let writesSinceSweep = 0;

function sweep(now: number, windowMs: number) {
  for (const [k, times] of hits) {
    if (!times.length || now - times[times.length - 1] > windowMs) hits.delete(k);
  }
}

/**
 * Records an attempt against `key` and reports whether it is allowed.
 *
 * Sliding window: an attempt is allowed when fewer than `limit` attempts
 * were recorded in the preceding `windowMs`. A rejected attempt is NOT
 * recorded — otherwise a client hammering the endpoint would extend its
 * own lockout indefinitely.
 *
 * @param key       Identity being limited. Callers should namespace it
 *                  (e.g. `signin:alice@example.com`) so unrelated actions
 *                  do not share a bucket.
 * @param limit     Max attempts permitted inside the window.
 * @param windowMs  Window length in milliseconds.
 * @param now       Injectable clock — tests pass an explicit time.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const cutoff = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit) {
    // The window frees a slot when its oldest surviving hit ages out. With
    // `limit <= 0` there is no oldest hit and nothing will ever free a slot,
    // so report 0 rather than arithmetic on an absent timestamp.
    const oldest = recent[0];
    const retryAfterMs =
      oldest === undefined ? 0 : Math.max(0, oldest + windowMs - now);
    hits.set(key, recent);
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  hits.set(key, recent);

  if (++writesSinceSweep >= SWEEP_EVERY) {
    writesSinceSweep = 0;
    sweep(now, windowMs);
  }

  return { allowed: true, retryAfterMs: 0 };
}

/** Test-only: drop all recorded state. */
export function resetRateLimits() {
  hits.clear();
  writesSinceSweep = 0;
}

/** Human-readable cooldown for user-facing copy: "3 minutes", "45 seconds". */
export function formatRetryAfter(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}
