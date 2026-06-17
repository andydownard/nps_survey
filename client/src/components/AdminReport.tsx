import { useEffect, useRef, useState } from 'react';
import { getReport, AdminApiError } from '../adminApi';
import { BackButton } from './BackButton';
import type { ReportData, ReportQuote, Category } from '../types';

const CAT: Record<Category, { color: string; bg: string; label: string }> = {
  pro: { color: 'var(--pro)', bg: 'var(--pro-bg)', label: 'Promoter' },
  pas: { color: 'var(--pas)', bg: 'var(--pas-bg)', label: 'Passive' },
  det: { color: 'var(--det)', bg: 'var(--det-bg)', label: 'Detractor' },
};

function signed(n: number) { return n > 0 ? `+${n}` : `${n}`; }

interface AdminReportProps {
  onBack: () => void;
  /** Called when the session is no longer valid (so the app can return to sign-in). */
  onExpired: () => void;
}

export function AdminReport({ onBack, onExpired }: AdminReportProps) {
  const [data, setData] = useState<ReportData | null>(null);
  const [err, setErr] = useState('');
  // Keep onExpired in a ref so the fetch effect can run once on mount without
  // re-firing every time the parent re-renders (which changes the callback's identity).
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    let alive = true;
    getReport()
      .then(d => { if (alive) setData(d); })
      .catch(e => {
        if (!alive) return;
        if (e instanceof AdminApiError && e.code === 'unauthenticated') onExpiredRef.current();
        else setErr('Could not load the report.');
      });
    return () => { alive = false; };
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <BackButton onClick={onBack}>Back</BackButton>
      </div>

      {err && <p style={{ color: 'var(--det)', fontWeight: 600 }}>{err}</p>}
      {!data && !err && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

      {data && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 8px' }}>
              Daily report · {data.dateLong}
            </p>
            {data.total === 0 ? (
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>No responses yesterday</div>
            ) : (
              <>
                <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1, letterSpacing: '-1.5px', color: 'var(--brand)' }}>{signed(data.nps)}</div>
                {data.trend !== null && (
                  <div style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 40, background: 'var(--pro-bg)', color: 'var(--pro)' }}>
                    {signed(data.trend)} vs 7-day avg
                  </div>
                )}
                <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '12px 0 0' }}>
                  {data.total} response{data.total === 1 ? '' : 's'} · {data.counts.pro} promoters, {data.counts.pas} passives, {data.counts.det} detractors
                </p>
              </>
            )}
          </div>

          {data.total > 0 && (
            <>
              <SectionLabel>Ratings breakdown</SectionLabel>
              <div style={{ display: 'flex', height: 14, borderRadius: 40, overflow: 'hidden', background: '#eef0f2' }}>
                {(['pro', 'pas', 'det'] as Category[]).map(k => (
                  data.pct[k] > 0 ? <span key={k} style={{ display: 'block', height: '100%', width: `${data.pct[k]}%`, background: CAT[k].color }} /> : null
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                {(['pro', 'pas', 'det'] as Category[]).map(k => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: CAT[k].color, flex: 'none' }} />
                    <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{CAT[k].label}s</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{data.counts[k]} / {data.total}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: CAT[k].color, minWidth: 42, textAlign: 'right' }}>{data.pct[k]}%</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {data.detractors.length > 0 && (
            <>
              <SectionLabel color="var(--det)">Needs attention · {data.detractors.length} detractor{data.detractors.length === 1 ? '' : 's'}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.detractors.map((q, i) => <QuoteCard key={i} q={q} />)}
              </div>
            </>
          )}

          {data.topPromoter && (
            <>
              <SectionLabel color="var(--pro)">Top promoter quote</SectionLabel>
              <QuoteCard q={data.topPromoter} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 700, color: color || 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '1px', margin: '26px 0 12px' }}>
      {children}
    </div>
  );
}

function QuoteCard({ q }: { q: ReportQuote }) {
  const m = CAT[q.category];
  return (
    <div style={{ border: `1.5px solid ${m.color}`, background: m.bg, borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: m.color }}>{q.score}/10</span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: m.color }}>{m.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{q.when}</span>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.5, color: '#374151' }}>{q.comment}</p>
    </div>
  );
}
