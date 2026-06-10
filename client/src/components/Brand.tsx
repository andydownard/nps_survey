export function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
      <span style={{
        width: 34, height: 34, borderRadius: 9, background: 'var(--brand)',
        display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0,
      }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="8 7 3 12 8 17"/>
          <polyline points="16 7 21 12 16 17"/>
        </svg>
      </span>
      <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '.2px' }}>Vibe Coding Bootcamp</span>
    </div>
  );
}
