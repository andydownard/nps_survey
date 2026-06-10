import { useEffect, useState } from 'react';
import { getResponses } from '../api';
import { cat, CAT_META, FACE, npsLabel } from '../lib/nps';
import type { NpsSummary, SurveyResponse, Category } from '../types';

interface Props {
  youId: number | null;
  onRestart: () => void;
}

const EMPTY_SHOWN = 5;

function CommentTile({ r }: { r: SurveyResponse }) {
  const k = cat(r.score);
  const m = CAT_META[k];
  const hasText = r.comment.length > 0;
  return (
    <div style={{ border: `1.5px solid ${m.color}`, borderRadius: 14, padding: '12px 14px', background: m.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center',
          flexShrink: 0, background: '#fff', color: m.color,
        }} dangerouslySetInnerHTML={{ __html: FACE[k] }} />
        {r.you
          ? <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--brand)', padding: '2px 9px', borderRadius: 40 }}>You</span>
          : <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>Anonymous</span>
        }
        <span style={{ fontWeight: 700, fontSize: 13, color: m.color }}>{r.score}/10</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{r.when}</span>
      </div>
      {hasText
        ? <p style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.5, color: '#374151' }}>{r.comment}</p>
        : <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.5, color: 'var(--muted)', fontStyle: 'italic', opacity: .85 }}>No comment provided</p>
      }
    </div>
  );
}

export function Page3Results({ youId, onRestart }: Props) {
  const [data, setData] = useState<NpsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResponses(youId)
      .then(setData)
      .catch(() => setError('Could not load results. Please try again.'));
  }, [youId]);

  if (error) {
    return <p style={{ color: 'var(--det)', textAlign: 'center' }}>{error}</p>;
  }
  if (!data) {
    return <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Loading results…</p>;
  }

  const { responses, nps, total, counts } = data;
  const pct = (k: Category) => total > 0 ? Math.round((counts[k] / total) * 100) : 0;
  const tagColor = nps >= 30 ? 'var(--pro)' : nps >= 0 ? 'var(--pas)' : 'var(--det)';
  const tagBg   = nps >= 30 ? 'var(--pro-bg)' : nps >= 0 ? 'var(--pas-bg)' : 'var(--det-bg)';

  // Build comment list: you first, then commented, then interleaved empty examples
  const userResp = responses.find(r => r.you);
  const others = responses.filter(r => !r.you);
  const commented = others.filter(r => r.comment.length > 0);
  const empty = others.filter(r => r.comment.length === 0);

  const byCat: Record<Category, SurveyResponse[]> = { det: [], pas: [], pro: [] };
  empty.forEach(r => byCat[cat(r.score)].push(r));
  const emptyMix: SurveyResponse[] = [];
  let i = 0;
  while (emptyMix.length < empty.length) {
    (['det', 'pas', 'pro'] as Category[]).forEach(k => { if (byCat[k][i]) emptyMix.push(byCat[k][i]); });
    i++;
  }

  const list: SurveyResponse[] = [
    ...(userResp ? [userResp] : []),
    ...commented,
    ...emptyMix.slice(0, EMPTY_SHOWN),
  ];
  const remaining = empty.length - Math.min(EMPTY_SHOWN, empty.length);

  return (
    <div>
      {/* NPS header */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 8px' }}>
          Net Promoter Score
        </p>
        <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1, letterSpacing: '-1.5px', color: tagColor }}>
          {nps < 0 ? nps : String(nps)}
        </div>
        <span style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 40, color: tagColor, background: tagBg }}>
          {npsLabel(nps)}
        </span>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '12px 0 0' }}>
          Based on {total} response{total === 1 ? '' : 's'} · NPS = % promoters − % detractors
        </p>
      </div>

      {/* Stacked bar */}
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '1px', margin: '26px 0 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v8H3zM10 3h2v18h-2zM17 8h2v13h-2z"/></svg>
        Ratings breakdown
      </div>
      <div style={{ display: 'flex', height: 14, borderRadius: 40, overflow: 'hidden', background: '#eef0f2' }}>
        {(['det', 'pas', 'pro'] as Category[]).map(k => (
          <span key={k} style={{ display: 'block', height: '100%', width: `${pct(k)}%`, background: CAT_META[k].color }} />
        ))}
      </div>

      {/* Breakdown rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {(['pro', 'pas', 'det'] as Category[]).map(k => {
          const m = CAT_META[k];
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0, background: m.bg, color: m.color }}
                dangerouslySetInnerHTML={{ __html: FACE[k] }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{m.range} · {counts[k]} {counts[k] === 1 ? 'person' : 'people'}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{pct(k)}%</div>
            </div>
          );
        })}
      </div>

      {/* Comments */}
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '1px', margin: '26px 0 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-5 4V5a1 1 0 0 1 1-1z"/></svg>
        What people said
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map(r => <CommentTile key={r.id} r={r} />)}
        {remaining > 0 && (
          <div style={{ textAlign: 'center', color: 'var(--subtle)', fontSize: 13, fontWeight: 600, padding: '8px 0 2px' }}>
            + {remaining} more response{remaining === 1 ? '' : 's'} without a comment
          </div>
        )}
      </div>

      <button
        onClick={onRestart}
        style={{
          font: 'inherit', fontSize: 15, fontWeight: 600, borderRadius: 11,
          padding: '13px 20px', cursor: 'pointer', border: '1.5px solid transparent',
          width: '100%', marginTop: 22, background: 'var(--brand)', color: '#fff',
          transition: 'background .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-strong)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; }}
      >
        Submit another response
      </button>
      <p style={{ textAlign: 'center', color: 'var(--subtle)', fontSize: 12.5, marginTop: 18 }}>
        Vibe Coding Bootcamp · cohort feedback
      </p>
    </div>
  );
}
