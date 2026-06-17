// Shared NPS math, used by both the live API (routes/responses.ts) and the
// daily digest email (digest.ts) so the two can never drift.

export type Category = 'pro' | 'pas' | 'det';

/** Bucket a 0–10 score: 9–10 promoter, 7–8 passive, 0–6 detractor. */
export function cat(score: number): Category {
  if (score >= 9) return 'pro';
  if (score >= 7) return 'pas';
  return 'det';
}

export interface Counts {
  pro: number;
  pas: number;
  det: number;
}

/** Tally promoters/passives/detractors for a set of scores. */
export function countScores(scores: number[]): Counts {
  const counts: Counts = { pro: 0, pas: 0, det: 0 };
  for (const s of scores) counts[cat(s)]++;
  return counts;
}

/** NPS = %promoters − %detractors, rounded. 0 when there are no responses. */
export function npsFromCounts(counts: Counts): number {
  const total = counts.pro + counts.pas + counts.det;
  if (total === 0) return 0;
  return Math.round((counts.pro / total) * 100 - (counts.det / total) * 100);
}
