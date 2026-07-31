import { describe, expect, it } from "vitest";
import {
  matchName,
  nameTokens,
  parseAcademicScores,
  parseCurrencyAmounts,
  pickAcademicScore,
  pickIncomeAmount,
} from "@/lib/documents/verify";

// These parsers decide whether a student's uploaded certificate is treated
// as evidence, and their output is quoted verbatim in flag text shown to
// students and institutions. A misparse is a false accusation, so the cases
// below are the Indian-document formats the pipeline actually meets.

describe("parseCurrencyAmounts", () => {
  it("reads the rupee symbol with lakh-grouped digits", () => {
    const [found] = parseCurrencyAmounts("Annual income: ₹4,50,000");
    expect(found.value).toBe(450_000);
    expect(found.raw).toBe("₹4,50,000");
    expect(found.labelled).toBe(true);
  });

  it("reads 'Rs.' with a lakh scale word", () => {
    const [found] = parseCurrencyAmounts("Total salary Rs. 2.5 lakh per annum");
    expect(found.value).toBe(250_000);
    expect(found.labelled).toBe(true);
  });

  it("reads crore, lac and thousand scale words", () => {
    expect(parseCurrencyAmounts("Net worth 1.2 crore")[0].value).toBe(12_000_000);
    expect(parseCurrencyAmounts("Income Rs 3 lacs")[0].value).toBe(300_000);
    expect(parseCurrencyAmounts("Amount 40 thousand")[0].value).toBe(40_000);
  });

  it("reads INR and dollar prefixes", () => {
    expect(parseCurrencyAmounts("Income INR 300000")[0].value).toBe(300_000);
    expect(parseCurrencyAmounts("Fee $12,000 annually")[0].value).toBe(12_000);
  });

  it("accepts a bare number only at 1000 or above", () => {
    expect(parseCurrencyAmounts("Amount 50000")[0].value).toBe(50_000);
    expect(parseCurrencyAmounts("Serial 42")).toEqual([]);
    expect(parseCurrencyAmounts("Page 3 of 4")).toEqual([]);
  });

  it("does not mistake a four-digit year for an income", () => {
    expect(parseCurrencyAmounts("Issued in 2024")).toEqual([]);
    expect(parseCurrencyAmounts("Valid 1999 to 2026")).toEqual([]);
    // ...but a currency symbol overrides the year heuristic.
    expect(parseCurrencyAmounts("Paid ₹2024")[0].value).toBe(2024);
  });

  it("marks only income-labelled lines as labelled", () => {
    const rows = parseCurrencyAmounts(
      "Annual income: Rs. 200000\nProperty value 900000"
    );
    expect(rows.find((r) => r.value === 200_000)!.labelled).toBe(true);
    expect(rows.find((r) => r.value === 900_000)!.labelled).toBe(false);
  });

  it("records the source line for every candidate", () => {
    const [found] = parseCurrencyAmounts("  Annual income: ₹450000  ");
    expect(found.line).toBe("Annual income: ₹450000");
  });

  it("returns an empty list for text with no figures", () => {
    expect(parseCurrencyAmounts("")).toEqual([]);
    expect(parseCurrencyAmounts("To whom it may concern")).toEqual([]);
  });
});

describe("pickIncomeAmount", () => {
  it("prefers the largest labelled figure over a larger unlabelled one", () => {
    const picked = pickIncomeAmount(
      parseCurrencyAmounts("Fee 99999\nAnnual income: Rs. 2.5 lakh\nOther 700000")
    );
    expect(picked!.value).toBe(250_000);
    expect(picked!.labelled).toBe(true);
  });

  it("falls back to the largest figure when nothing is labelled", () => {
    const picked = pickIncomeAmount(parseCurrencyAmounts("12000\n340000\n5000"));
    expect(picked!.value).toBe(340_000);
  });

  it("returns null when there is nothing to pick", () => {
    expect(pickIncomeAmount([])).toBeNull();
  });
});

describe("parseAcademicScores", () => {
  it("honours a printed /10 denominator", () => {
    const [found] = parseAcademicScores("CGPA: 8.7/10");
    expect(found.normalized).toBeCloseTo(8.7, 6);
    expect(found.basis).toBe("cgpa-ratio");
    expect(found.assumedScale).toBeNull();
  });

  it("rescales a printed /4 denominator onto the 10-point scale", () => {
    const [found] = parseAcademicScores("GPA 3.6/4");
    expect(found.normalized).toBeCloseTo(9, 6);
    expect(found.basis).toBe("cgpa-ratio");
  });

  it("assumes a 10-point scale for a bare CGPA and says so", () => {
    const [found] = parseAcademicScores("CGPA 8.7");
    expect(found.normalized).toBeCloseTo(8.7, 6);
    expect(found.basis).toBe("cgpa");
    expect(found.assumedScale).toMatch(/out of 10/i);
  });

  it("reads a labelled value above 10 as a percentage and records the assumption", () => {
    const [found] = parseAcademicScores("CGPA: 87");
    expect(found.normalized).toBeCloseTo(8.7, 6);
    expect(found.basis).toBe("percentage");
    expect(found.assumedScale).toMatch(/percentage/i);
  });

  it("converts explicit percentages", () => {
    expect(parseAcademicScores("Percentage: 87.5%")[0].normalized).toBeCloseTo(8.75, 6);
    const [aggregate] = parseAcademicScores("Aggregate marks 87%");
    expect(aggregate.normalized).toBeCloseTo(8.7, 6);
    expect(aggregate.basis).toBe("percentage");
  });

  it("reads an unlabelled x/10 ratio", () => {
    const [found] = parseAcademicScores("Result 9/10");
    expect(found.normalized).toBe(9);
    expect(found.basis).toBe("cgpa-ratio");
  });

  it("ignores a raw marks total that is not a grade scale", () => {
    // 450/500 is a marks tally, not a CGPA — reading it as one would
    // manufacture a mismatch flag against the declared CGPA.
    expect(parseAcademicScores("Total: 450/500")).toEqual([]);
  });

  it("returns an empty list for text with no scores", () => {
    expect(parseAcademicScores("")).toEqual([]);
    expect(parseAcademicScores("Certificate of participation")).toEqual([]);
  });

  it("never emits a normalized score outside 0–10", () => {
    const text = [
      "CGPA: 8.7/10", "GPA 3.6/4", "CGPA 10", "Percentage: 100%",
      "Percentage: 0.5%", "CGPA: 99", "Result 4/4",
    ].join("\n");
    for (const c of parseAcademicScores(text)) {
      expect(c.normalized).toBeGreaterThanOrEqual(0);
      expect(c.normalized).toBeLessThanOrEqual(10);
    }
  });
});

describe("pickAcademicScore", () => {
  it("prefers a printed ratio over a loose percentage", () => {
    const picked = pickAcademicScore(
      parseAcademicScores("Aggregate 87%\nCGPA: 8.7/10")
    );
    expect(picked!.basis).toBe("cgpa-ratio");
  });

  it("prefers a labelled CGPA over a percentage when no ratio is printed", () => {
    const picked = pickAcademicScore(parseAcademicScores("Aggregate 87%\nCGPA 9.1"));
    expect(picked!.basis).toBe("cgpa");
    expect(picked!.normalized).toBeCloseTo(9.1, 6);
  });

  it("returns null when there is nothing to pick", () => {
    expect(pickAcademicScore([])).toBeNull();
  });
});

describe("nameTokens", () => {
  it("drops honorifics and single initials", () => {
    expect(nameTokens("Dr. A. Aarya Sharma")).toEqual(["aarya", "sharma"]);
    expect(nameTokens("Shri Ram Kumar")).toEqual(["ram", "kumar"]);
  });

  it("lowercases and splits on non-letters", () => {
    expect(nameTokens("MEERA-DEVI  Nair")).toEqual(["meera", "devi", "nair"]);
  });

  it("returns nothing for a name made only of noise", () => {
    expect(nameTokens("Mr. K. B.")).toEqual([]);
  });
});

describe("matchName", () => {
  it("matches across irregular whitespace and casing", () => {
    const r = matchName("This certifies AARYA  SHARMA of Delhi", "Aarya Sharma");
    expect(r.matched).toEqual(["aarya", "sharma"]);
    expect(r.missing).toEqual([]);
  });

  it("reports the specific token that is missing", () => {
    const r = matchName("This certifies Aarya Verma", "Aarya Sharma");
    expect(r.matched).toEqual(["aarya"]);
    expect(r.missing).toEqual(["sharma"]);
  });

  it("reports every token missing when the document names someone else", () => {
    const r = matchName("Issued to Rohan Patel", "Aarya Sharma");
    expect(r.matched).toEqual([]);
    expect(r.missing).toEqual(["aarya", "sharma"]);
  });

  it("always returns the token list it judged against", () => {
    const r = matchName("anything", "Dr. Aarya Sharma");
    expect(r.tokens).toEqual(["aarya", "sharma"]);
    expect([...r.matched, ...r.missing].sort()).toEqual(r.tokens.sort());
  });
});
