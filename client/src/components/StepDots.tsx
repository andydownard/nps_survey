interface Props { page: 1 | 2 | 3 }

export function StepDots({ page }: Props) {
  return (
    <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 18 }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{
          width: 30, height: 5, borderRadius: 40,
          background: i <= page ? 'var(--brand)' : '#dfe2e6',
          transition: 'background .25s',
        }} />
      ))}
    </div>
  );
}
