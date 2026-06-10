import { useState, useEffect } from 'react';
import { cat, CAT_META } from '../lib/nps';

interface Props {
  score: number;
  onContinue: (comment: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function Page2Comment({ score, onContinue, onSkip, onBack }: Props) {
  const [text, setText] = useState('');
  const k = cat(score);
  const m = CAT_META[k];

  // Reset text when score changes (new survey flow)
  useEffect(() => { setText(''); }, [score]);

  const atLimit = text.length >= 500;

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 0' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 18, padding: '7px 13px 7px 7px', borderRadius: 40, background: '#f3f5f4', border: '1px solid var(--line)' }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 16, background: m.color }}>
          {score}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--muted)' }}>
          You rated us <b style={{ color: 'var(--ink)' }}>{score}</b> out of 10
        </span>
      </div>

      <h1 style={{ fontSize: 23, lineHeight: 1.3, fontWeight: 600, margin: '0 0 4px', letterSpacing: '-.2px' }}>
        Thanks! Want to tell us more?
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 14.5, margin: '0 0 20px' }}>Optional — your feedback helps us improve.</p>

      <textarea
        maxLength={500}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Tell us more about why you chose ${score}…`}
        style={{
          width: '100%', minHeight: 120, resize: 'vertical',
          font: 'inherit', fontSize: 15,
          border: '1.5px solid var(--line)', borderRadius: 12,
          padding: '13px 14px', color: 'var(--ink)', background: '#fff', lineHeight: 1.5,
          outline: 'none',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(53,100,79,.14)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = ''; }}
      />
      <div style={{ textAlign: 'right', fontSize: 12, color: atLimit ? 'var(--det)' : 'var(--subtle)', marginTop: 6, fontWeight: 500 }}>
        {text.length} / 500
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12, marginTop: 20 }}>
        <button
          disabled={text.trim().length === 0}
          onClick={() => onContinue(text.trim())}
          style={{
            font: 'inherit', fontSize: 15, fontWeight: 600, borderRadius: 11,
            padding: '13px 20px', cursor: text.trim().length === 0 ? 'default' : 'pointer',
            border: '1.5px solid transparent', width: '100%',
            background: text.trim().length === 0 ? '#EAECED' : 'var(--brand)',
            color: text.trim().length === 0 ? '#9ca3af' : '#fff',
            transition: 'background .15s',
          }}
        >
          Continue
        </button>
        <button
          onClick={onSkip}
          style={{
            background: 'none', border: 'none', color: 'var(--subtle)', fontSize: 14,
            fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
            textUnderlineOffset: 3, padding: 6, alignSelf: 'center',
          }}
        >
          Skip this question
        </button>
      </div>
    </div>
  );
}
