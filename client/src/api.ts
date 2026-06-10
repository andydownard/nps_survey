import type { NpsSummary } from './types';

export async function postResponse(score: number, comment: string): Promise<{ id: number }> {
  const res = await fetch('/api/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, comment }),
  });
  if (!res.ok) throw new Error('Failed to submit response');
  return res.json();
}

export async function getResponses(youId: number | null): Promise<NpsSummary> {
  const url = youId != null ? `/api/responses?youId=${youId}` : '/api/responses';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load results');
  return res.json();
}
