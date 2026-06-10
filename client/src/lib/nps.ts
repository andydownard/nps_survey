import type { Category } from '../types';

export function cat(score: number): Category {
  if (score >= 9) return 'pro';
  if (score >= 7) return 'pas';
  return 'det';
}

export const CAT_META: Record<Category, { label: string; range: string; color: string; bg: string }> = {
  det: { label: 'Detractors', range: 'Scored 0–6', color: 'var(--det)', bg: 'var(--det-bg)' },
  pas: { label: 'Passives',   range: 'Scored 7–8', color: 'var(--pas)', bg: 'var(--pas-bg)' },
  pro: { label: 'Promoters',  range: 'Scored 9–10', color: 'var(--pro)', bg: 'var(--pro-bg)' },
};

export function npsLabel(nps: number): string {
  if (nps >= 70) return 'Excellent';
  if (nps >= 30) return 'Great';
  if (nps >= 0)  return 'Good';
  return 'Needs work';
}

export const FACE: Record<Category, string> = {
  det: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.2"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/><path d="M8.3 15.5c1-1.2 2.3-1.8 3.7-1.8s2.7.6 3.7 1.8" fill="none"/></svg>`,
  pas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.2"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/><line x1="8.5" y1="15" x2="15.5" y2="15"/></svg>`,
  pro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.2"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/><path d="M8.3 14c1 1.3 2.3 2 3.7 2s2.7-.7 3.7-2" fill="none"/></svg>`,
};
