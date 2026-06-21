// Lead scoring engine (STEP 3).
//
// Hybrid approach: deterministic caps + AI judgment. The AI proposes a score per
// dimension; we clamp each to its cap so a hallucinated number can never blow up
// the total. This keeps scores explainable and bounded 0-100.

export const SCORE_CAPS = {
  industryMatch: 30,
  companySizeMatch: 20,
  websiteQuality: 10,
  socialActivity: 15,
  technologyMatch: 15,
  painPointMatch: 25,
} as const;

export type ScoreDimensions = {
  -readonly [K in keyof typeof SCORE_CAPS]: number;
};

export interface ScoreResult extends ScoreDimensions {
  total: number;
  reasoning?: string;
}

function clamp(value: number, cap: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.round(value), cap);
}

/** Clamp raw (possibly AI-produced) dimensions and compute the total. */
export function normalizeScore(
  raw: Partial<ScoreDimensions> & { reasoning?: string },
): ScoreResult {
  const dims = {} as ScoreDimensions;
  let total = 0;
  for (const key of Object.keys(SCORE_CAPS) as (keyof typeof SCORE_CAPS)[]) {
    const v = clamp(Number(raw[key] ?? 0), SCORE_CAPS[key]);
    dims[key] = v;
    total += v;
  }
  return { ...dims, total: Math.min(total, 100), reasoning: raw.reasoning };
}

export const DEFAULT_THRESHOLD = 80;

export function isQualified(total: number, threshold = DEFAULT_THRESHOLD) {
  return total >= threshold;
}
