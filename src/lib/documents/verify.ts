import "server-only";

// ─────────────────────────────────────────────────────────────
// Document verification pipeline.
//
// Extract text → parse the fields the document is supposed to
// evidence → compare them against the student's own DB row. Every
// flag string is derived from an actual parse and names both figures
// and the size of the gap, because these strings are shown verbatim
// to students and to institutions. When nothing could be read (a
// scanned photo), the status stays `pending` — a document we could
// not read is never reported as verified.
// ─────────────────────────────────────────────────────────────

export type DocumentKind = "resume" | "income_cert" | "marksheet" | "id";
export type VerificationStatus = "pending" | "verified" | "flagged";

/** A parsed money figure and the line it came from. */
export interface AmountCandidate {
  value: number;
  raw: string;
  line: string;
  /** The source line mentions income/salary — a labelled figure beats a stray number. */
  labelled: boolean;
}

/** A parsed academic result normalised onto the profile's 10-point scale. */
export interface ScoreCandidate {
  /** Value on a 0–10 scale, comparable to student_profiles.cgpa. */
  normalized: number;
  raw: string;
  line: string;
  basis: "cgpa" | "cgpa-ratio" | "percentage";
  /** Stated when the source scale was inferred rather than printed. */
  assumedScale: string | null;
}

export interface VerificationInput {
  kind: DocumentKind;
  mimeType: string;
  bytes: Uint8Array;
  studentName: string;
  /** student_profiles.family_income — null when the student hasn't declared one. */
  declaredIncome: number | null;
  /** student_profiles.cgpa — null when the student hasn't declared one. */
  declaredCgpa: number | null;
}

export interface VerificationOutcome {
  status: VerificationStatus;
  flags: string[];
  extractedFields: Record<string, unknown>;
  /** Extracted text, reused by the resume analyzer so we parse once. */
  text: string;
}

/** Income cert is accepted when it lands within this share of the declared figure. */
const INCOME_TOLERANCE = 0.2;
/** Marksheet is accepted within this many CGPA points on the 10-point scale. */
const CGPA_TOLERANCE = 0.2;

// ---------- text extraction ----------

/**
 * Text layer of a PDF, or "" for anything without one (images, scans,
 * corrupt files). Never throws — an unreadable file is a `pending`
 * verification, not a request failure.
 */
export async function extractDocumentText(
  bytes: Uint8Array,
  mimeType: string
): Promise<string> {
  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    return new TextDecoder().decode(bytes).trim();
  }
  if (mimeType !== "application/pdf") return "";

  try {
    const { extractText } = await import("unpdf");
    // Copy: pdf.js transfers/detaches the buffer it is handed.
    const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
    return text.trim();
  } catch {
    return "";
  }
}

// ---------- parsers ----------

const SCALE_WORDS: Record<string, number> = {
  thousand: 1e3,
  lakh: 1e5,
  lakhs: 1e5,
  lac: 1e5,
  lacs: 1e5,
  crore: 1e7,
  crores: 1e7,
};

const AMOUNT_PATTERN =
  /(?:(₹|\$|rs\.?|inr|usd)\s*)?(\d[\d,]*(?:\.\d{1,2})?)(?:\s*(thousand|lakhs?|lacs?|crores?))?/gi;

const INCOME_LABEL = /income|salary|earnings|remuneration|per annum|annually/i;

/**
 * Every plausible money figure in the text. A bare number needs to be
 * >= 1000 (and not look like a year) to count; a currency symbol or a
 * lakh/crore suffix is enough on its own.
 */
export function parseCurrencyAmounts(text: string): AmountCandidate[] {
  const found: AmountCandidate[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const labelled = INCOME_LABEL.test(line);

    AMOUNT_PATTERN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = AMOUNT_PATTERN.exec(line)) !== null) {
      const [matched, symbol, digits, scaleWord] = m;
      const base = Number(digits.replace(/,/g, ""));
      if (!Number.isFinite(base) || base <= 0) continue;

      const scale = scaleWord ? (SCALE_WORDS[scaleWord.toLowerCase()] ?? 1) : 1;
      const value = base * scale;

      if (!symbol && !scaleWord) {
        if (value < 1000) continue;
        // "2024" is a year, not an income.
        const plain = digits.replace(/,/g, "");
        if (plain.length === 4 && base >= 1900 && base <= 2100) continue;
      }

      found.push({ value, raw: matched.trim(), line, labelled });
    }
  }

  return found;
}

/** The figure most likely to be the stated income: largest labelled, else largest. */
export function pickIncomeAmount(candidates: AmountCandidate[]): AmountCandidate | null {
  const pool = candidates.filter((c) => c.labelled);
  const from = pool.length ? pool : candidates;
  if (!from.length) return null;
  return from.reduce((best, c) => (c.value > best.value ? c : best));
}

const CGPA_LABELLED =
  /(?:cgpa|sgpa|gpa|cpi|grade point average)\s*[:=-]?\s*(\d{1,2}(?:\.\d{1,3})?)\s*(?:\/\s*(\d{1,2}(?:\.\d{1,2})?))?/i;
const RATIO_ONLY = /(\d{1,2}(?:\.\d{1,3})?)\s*\/\s*(10|10\.0|4|4\.0)(?!\d)/;
const PERCENT_ONLY =
  /(?:percentage|percent|marks|aggregate|total)?\s*[:=-]?\s*(\d{1,3}(?:\.\d{1,2})?)\s*%/i;

/**
 * Academic results normalised to the 10-point scale the profile uses.
 * A printed "/4" or "/10" denominator is honoured; otherwise the scale
 * is inferred and the assumption recorded so flag text stays truthful.
 */
export function parseAcademicScores(text: string): ScoreCandidate[] {
  const found: ScoreCandidate[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const labelled = CGPA_LABELLED.exec(line);
    if (labelled) {
      const value = Number(labelled[1]);
      const denom = labelled[2] ? Number(labelled[2]) : null;
      if (Number.isFinite(value) && value > 0) {
        if (denom && denom > 0) {
          found.push({
            normalized: (value / denom) * 10,
            raw: labelled[0].trim(),
            line,
            basis: "cgpa-ratio",
            assumedScale: null,
          });
          continue;
        }
        if (value <= 10) {
          found.push({
            normalized: value,
            raw: labelled[0].trim(),
            line,
            basis: "cgpa",
            assumedScale: "out of 10 (denominator not printed)",
          });
          continue;
        }
        if (value <= 100) {
          found.push({
            normalized: value / 10,
            raw: labelled[0].trim(),
            line,
            basis: "percentage",
            assumedScale: "read as a percentage and divided by 10",
          });
          continue;
        }
      }
    }

    const ratio = RATIO_ONLY.exec(line);
    if (ratio) {
      const value = Number(ratio[1]);
      const denom = Number(ratio[2]);
      if (Number.isFinite(value) && denom > 0 && value <= denom) {
        found.push({
          normalized: (value / denom) * 10,
          raw: ratio[0].trim(),
          line,
          basis: "cgpa-ratio",
          assumedScale: null,
        });
        continue;
      }
    }

    const pct = PERCENT_ONLY.exec(line);
    if (pct) {
      const value = Number(pct[1]);
      if (Number.isFinite(value) && value > 0 && value <= 100) {
        found.push({
          normalized: value / 10,
          // Trim any leading separator the pattern swallowed so the quoted
          // excerpt in a flag reads as the figure itself.
          raw: pct[0].replace(/^[\s:—–-]+/, "").trim(),
          line,
          basis: "percentage",
          assumedScale: "percentage divided by 10 to compare with CGPA",
        });
      }
    }
  }

  return found;
}

/** Labelled CGPA/ratio beats a loose percentage when both appear. */
export function pickAcademicScore(candidates: ScoreCandidate[]): ScoreCandidate | null {
  return (
    candidates.find((c) => c.basis === "cgpa-ratio") ??
    candidates.find((c) => c.basis === "cgpa") ??
    candidates[0] ??
    null
  );
}

/** Name tokens worth matching on — initials and honorifics are noise. */
const NAME_NOISE = new Set(["mr", "mrs", "ms", "dr", "shri", "smt", "the", "and"]);

export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3 && !NAME_NOISE.has(t));
}

/** Which of the student's name tokens appear in the document text. */
export function matchName(
  text: string,
  name: string
): { tokens: string[]; matched: string[]; missing: string[] } {
  // PDF text layers break words across runs — compare on a flattened form.
  const haystack = text.toLowerCase().replace(/\s+/g, " ");
  const tokens = nameTokens(name);
  const matched = tokens.filter((t) => haystack.includes(t));
  return { tokens, matched, missing: tokens.filter((t) => !matched.includes(t)) };
}

// ---------- formatting (flag strings) ----------

const money = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

// ---------- pipeline ----------

const OCR_FLAG =
  "No machine-readable text could be extracted from this file, so nothing has been verified — re-upload a text-based PDF, or an OCR pass is required.";

export async function verifyDocument(
  input: VerificationInput
): Promise<VerificationOutcome> {
  const text = await extractDocumentText(input.bytes, input.mimeType);

  const base: Record<string, unknown> = {
    mimeType: input.mimeType,
    byteSize: input.bytes.byteLength,
    characters: text.length,
    words: text ? text.split(/\s+/).filter(Boolean).length : 0,
  };

  if (!text) {
    return {
      status: "pending",
      flags: [OCR_FLAG],
      extractedFields: { ...base, textExtracted: false },
      text: "",
    };
  }
  base.textExtracted = true;

  switch (input.kind) {
    case "income_cert":
      return { ...verifyIncomeCert(text, input.declaredIncome, base), text };
    case "marksheet":
      return { ...verifyMarksheet(text, input.declaredCgpa, base), text };
    case "id":
      return { ...verifyIdentity(text, input.studentName, base), text };
    case "resume":
      // A resume evidences nothing about the profile — "verified" here
      // means only that the text layer parsed and is ATS-readable.
      return {
        status: "verified",
        flags: [],
        extractedFields: base,
        text,
      };
  }
}

function verifyIncomeCert(
  text: string,
  declared: number | null,
  base: Record<string, unknown>
): Omit<VerificationOutcome, "text"> {
  const candidates = parseCurrencyAmounts(text);
  const picked = pickIncomeAmount(candidates);

  const extractedFields = {
    ...base,
    incomeFound: picked?.value ?? null,
    incomeRaw: picked?.raw ?? null,
    incomeSourceLine: picked?.line ?? null,
    declaredIncome: declared,
    amountCandidates: candidates.slice(0, 8).map((c) => c.value),
  };

  if (!picked) {
    return {
      status: "flagged",
      flags: [
        "No income amount could be parsed from this certificate, so it could not be checked against the income on your profile.",
      ],
      extractedFields,
    };
  }

  if (declared === null || declared <= 0) {
    return {
      status: "flagged",
      flags: [
        `An income of ${money(picked.value)} was read from this certificate, but your profile has no declared family income to compare it against.`,
      ],
      extractedFields,
    };
  }

  const diff = Math.abs(picked.value - declared);
  const share = diff / declared;

  if (share > INCOME_TOLERANCE) {
    const direction = picked.value > declared ? "higher" : "lower";
    return {
      status: "flagged",
      flags: [
        `Income certificate states ${money(picked.value)} but your profile declares ${money(declared)} — ${money(diff)} ${direction}, a ${Math.round(share * 100)}% difference (tolerance is ${INCOME_TOLERANCE * 100}%).`,
      ],
      extractedFields,
    };
  }

  return {
    status: "verified",
    flags: [],
    extractedFields: {
      ...extractedFields,
      differencePercent: Math.round(share * 100),
    },
  };
}

function verifyMarksheet(
  text: string,
  declared: number | null,
  base: Record<string, unknown>
): Omit<VerificationOutcome, "text"> {
  const candidates = parseAcademicScores(text);
  const picked = pickAcademicScore(candidates);

  const extractedFields = {
    ...base,
    cgpaFound: picked ? Number(picked.normalized.toFixed(2)) : null,
    cgpaRaw: picked?.raw ?? null,
    cgpaBasis: picked?.basis ?? null,
    cgpaScaleAssumption: picked?.assumedScale ?? null,
    cgpaSourceLine: picked?.line ?? null,
    declaredCgpa: declared,
  };

  if (!picked) {
    return {
      status: "flagged",
      flags: [
        "No CGPA or percentage could be parsed from this marksheet, so it could not be checked against the CGPA on your profile.",
      ],
      extractedFields,
    };
  }

  const found = Number(picked.normalized.toFixed(2));
  const scaleNote = picked.assumedScale ? ` (${picked.assumedScale})` : "";

  if (declared === null || declared <= 0) {
    return {
      status: "flagged",
      flags: [
        `A result of ${found.toFixed(2)}/10 was read from "${picked.raw}"${scaleNote}, but your profile has no declared CGPA to compare it against.`,
      ],
      extractedFields,
    };
  }

  const diff = Math.abs(found - declared);
  if (diff > CGPA_TOLERANCE) {
    const direction = found > declared ? "higher" : "lower";
    return {
      status: "flagged",
      flags: [
        `Marksheet shows ${found.toFixed(2)}/10 (read from "${picked.raw}"${scaleNote}) but your profile declares ${declared.toFixed(2)}/10 — ${diff.toFixed(2)} points ${direction} (tolerance is ${CGPA_TOLERANCE.toFixed(2)}).`,
      ],
      extractedFields,
    };
  }

  return {
    status: "verified",
    flags: [],
    extractedFields: { ...extractedFields, differencePoints: Number(diff.toFixed(2)) },
  };
}

function verifyIdentity(
  text: string,
  studentName: string,
  base: Record<string, unknown>
): Omit<VerificationOutcome, "text"> {
  const { tokens, matched, missing } = matchName(text, studentName);

  const extractedFields = {
    ...base,
    nameSearched: studentName,
    nameTokensMatched: matched,
    nameTokensMissing: missing,
  };

  if (!tokens.length) {
    return {
      status: "flagged",
      flags: [
        `Your profile name ("${studentName}") has no name part long enough to search for, so this ID could not be matched.`,
      ],
      extractedFields,
    };
  }

  if (missing.length) {
    return {
      status: "flagged",
      flags: [
        `The name on your profile ("${studentName}") was not fully found in this ID: ${missing.length} of ${tokens.length} name parts are missing (${missing.join(", ")}).`,
      ],
      extractedFields,
    };
  }

  return { status: "verified", flags: [], extractedFields };
}
