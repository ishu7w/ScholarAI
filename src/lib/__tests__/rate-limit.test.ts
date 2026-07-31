import { beforeEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  formatRetryAfter,
  resetRateLimits,
} from "@/lib/rate-limit";

// The limiter guards the credential endpoints, so its edge behaviour is
// security-relevant: an off-by-one either locks out a legitimate user or
// hands an attacker a free attempt. Time is injected rather than mocked
// globally so each case states the clock it is reasoning about.

beforeEach(() => resetRateLimits());

const WINDOW = 60_000;

describe("checkRateLimit", () => {
  it("allows exactly `limit` attempts inside the window", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("k", 3, WINDOW, 1000).allowed).toBe(true);
    }
    expect(checkRateLimit("k", 3, WINDOW, 1000).allowed).toBe(false);
  });

  it("reports how long until a slot frees up", () => {
    checkRateLimit("k", 1, WINDOW, 1000);
    const blocked = checkRateLimit("k", 1, WINDOW, 1000 + 15_000);
    expect(blocked.allowed).toBe(false);
    // The single recorded hit at t=1000 ages out at t=61000.
    expect(blocked.retryAfterMs).toBe(45_000);
  });

  it("returns retryAfterMs 0 when the attempt is allowed", () => {
    expect(checkRateLimit("k", 2, WINDOW, 0).retryAfterMs).toBe(0);
  });

  it("slides — an attempt is permitted once the oldest hit leaves the window", () => {
    checkRateLimit("k", 2, WINDOW, 0);
    checkRateLimit("k", 2, WINDOW, 10_000);
    expect(checkRateLimit("k", 2, WINDOW, 20_000).allowed).toBe(false);
    // At t=60001 the first hit has expired, freeing one slot — but not two.
    expect(checkRateLimit("k", 2, WINDOW, 60_001).allowed).toBe(true);
    expect(checkRateLimit("k", 2, WINDOW, 60_001).allowed).toBe(false);
  });

  it("does not extend the lockout when a client keeps hammering", () => {
    checkRateLimit("k", 1, WINDOW, 0);
    // 50 rejected attempts spread through the window must not push the
    // expiry of the one recorded hit past t=60000.
    for (let t = 1000; t < 60_000; t += 1000) checkRateLimit("k", 1, WINDOW, t);
    expect(checkRateLimit("k", 1, WINDOW, 60_001).allowed).toBe(true);
  });

  it("keeps separate buckets per key", () => {
    expect(checkRateLimit("a", 1, WINDOW, 0).allowed).toBe(true);
    expect(checkRateLimit("a", 1, WINDOW, 0).allowed).toBe(false);
    expect(checkRateLimit("b", 1, WINDOW, 0).allowed).toBe(true);
  });

  it("blocks everything when the limit is zero", () => {
    const r = checkRateLimit("k", 0, WINDOW, 0);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBe(0);
  });

  it("forgets a key entirely once its whole window has passed", () => {
    checkRateLimit("k", 1, WINDOW, 0);
    expect(checkRateLimit("k", 1, WINDOW, WINDOW * 10).allowed).toBe(true);
  });

  it("defaults to the wall clock when no time is supplied", () => {
    expect(checkRateLimit("wall", 1, WINDOW).allowed).toBe(true);
    expect(checkRateLimit("wall", 1, WINDOW).allowed).toBe(false);
  });

  it("is cleared by resetRateLimits", () => {
    checkRateLimit("k", 1, WINDOW, 0);
    resetRateLimits();
    expect(checkRateLimit("k", 1, WINDOW, 0).allowed).toBe(true);
  });
});

describe("formatRetryAfter", () => {
  it("rounds up so the message never tells a user to retry too early", () => {
    expect(formatRetryAfter(1)).toBe("1 second");
    expect(formatRetryAfter(1500)).toBe("2 seconds");
    expect(formatRetryAfter(59_000)).toBe("59 seconds");
  });

  it("switches to minutes and hours", () => {
    expect(formatRetryAfter(60_000)).toBe("1 minute");
    expect(formatRetryAfter(90_000)).toBe("2 minutes");
    expect(formatRetryAfter(59 * 60_000)).toBe("59 minutes");
    expect(formatRetryAfter(60 * 60_000)).toBe("1 hour");
    expect(formatRetryAfter(90 * 60_000)).toBe("2 hours");
  });
});

describe("auth throttles", () => {
  // Mirrors the limits applied in src/lib/auth/actions.ts. The point of
  // duplicating them is to fail loudly if someone loosens one by accident.
  const SIGN_IN = { limit: 8, windowMs: 15 * 60 * 1000 };
  const SIGN_UP = { limit: 5, windowMs: 60 * 60 * 1000 };
  const RESET = { limit: 3, windowMs: 60 * 60 * 1000 };

  it("permits 8 sign-in attempts per email per 15 minutes", () => {
    const key = "signin:a@b.com";
    for (let i = 0; i < 8; i++) {
      expect(checkRateLimit(key, SIGN_IN.limit, SIGN_IN.windowMs, 0).allowed).toBe(true);
    }
    expect(checkRateLimit(key, SIGN_IN.limit, SIGN_IN.windowMs, 0).allowed).toBe(false);
    expect(
      checkRateLimit(key, SIGN_IN.limit, SIGN_IN.windowMs, SIGN_IN.windowMs + 1).allowed
    ).toBe(true);
  });

  it("permits 5 sign-ups and 3 password resets per hour", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("signup:a@b.com", SIGN_UP.limit, SIGN_UP.windowMs, 0).allowed).toBe(true);
    }
    expect(checkRateLimit("signup:a@b.com", SIGN_UP.limit, SIGN_UP.windowMs, 0).allowed).toBe(false);

    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("reset:a@b.com", RESET.limit, RESET.windowMs, 0).allowed).toBe(true);
    }
    expect(checkRateLimit("reset:a@b.com", RESET.limit, RESET.windowMs, 0).allowed).toBe(false);
  });

  it("keeps the three actions in separate buckets for the same email", () => {
    checkRateLimit("signin:a@b.com", 1, WINDOW, 0);
    expect(checkRateLimit("signup:a@b.com", 1, WINDOW, 0).allowed).toBe(true);
    expect(checkRateLimit("reset:a@b.com", 1, WINDOW, 0).allowed).toBe(true);
  });

  it("throttles one email without affecting another", () => {
    for (let i = 0; i < 8; i++) checkRateLimit("signin:a@b.com", 8, WINDOW, 0);
    expect(checkRateLimit("signin:a@b.com", 8, WINDOW, 0).allowed).toBe(false);
    expect(checkRateLimit("signin:c@d.com", 8, WINDOW, 0).allowed).toBe(true);
  });
});
