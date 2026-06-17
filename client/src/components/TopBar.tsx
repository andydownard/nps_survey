// Brand bar with a hamburger menu button on the right (per the v2 design).
export function TopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 34, height: 34, borderRadius: 9, background: 'var(--brand)',
          display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0,
        }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8 7 3 12 8 17" /><polyline points="16 7 21 12 16 17" />
          </svg>
        </span>
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '.2px' }}>Vibe Coding Bootcamp</span>
      </div>
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        aria-haspopup="dialog"
        style={{
          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
          width: 38, height: 38, borderRadius: 10, background: 'transparent',
          border: '1.5px solid var(--line)', color: 'var(--ink)', cursor: 'pointer',
          display: 'grid', placeItems: 'center',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>
    </div>
  );
}
