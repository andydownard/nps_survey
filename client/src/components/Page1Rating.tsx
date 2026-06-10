interface Props { onSelect: (score: number) => void }

export function Page1Rating({ onSelect }: Props) {
  return (
    <div>
      <h1 style={{ fontSize: 23, lineHeight: 1.3, fontWeight: 600, margin: '0 0 4px', letterSpacing: '-.2px' }}>
        How likely are you to recommend the Vibe Coding Bootcamp to a friend?
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 14.5, margin: '0 0 24px' }}>Tap a number to continue.</p>

      <div style={{ display: 'flex', gap: 5, justifyContent: 'space-between' }}>
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            aria-label={`Rate ${n} out of 10`}
            onClick={() => onSelect(n)}
            style={{
              flex: '1 1 0', minWidth: 0, height: 54, borderRadius: 10,
              border: '1.5px solid var(--line)', background: '#fff', color: 'var(--ink)',
              fontSize: 'clamp(13px, 3.4vw, 18px)', fontWeight: 600, cursor: 'pointer',
              display: 'grid', placeItems: 'center', padding: 0,
              transition: 'transform .12s, background .15s, color .15s, border-color .15s, box-shadow .15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.background = 'var(--brand)';
              el.style.borderColor = 'var(--brand)';
              el.style.color = '#fff';
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = '0 6px 14px rgba(53,100,79,.28)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.background = '#fff';
              el.style.borderColor = 'var(--line)';
              el.style.color = 'var(--ink)';
              el.style.transform = '';
              el.style.boxShadow = '';
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {n}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, color: 'var(--subtle)', fontSize: 13, fontWeight: 500 }}>
        <span>Not at all likely</span>
        <span>Extremely likely</span>
      </div>
    </div>
  );
}
