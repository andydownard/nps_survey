import { useEffect, useRef } from 'react';

const UserIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-9 2-9 5v2h18v-2c0-3-5-5-9-5z" /></svg>
);
const InfoIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z" /></svg>
);
const ShieldIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1 3 5v6c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V5l-9-4z" /></svg>
);
const Chevron = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
);

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  onAdmin: () => void;
  /** Whether an admin session is already active (changes the primary item label). */
  authed: boolean;
}

export function Drawer({ open, onClose, onAdmin, authed }: DrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        hidden={!open}
        style={{
          position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(17,24,39,.36)',
          opacity: open ? 1 : 0, transition: 'opacity .22s ease',
          backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 100,
          width: 'min(320px, 86vw)', background: '#fff',
          boxShadow: '-14px 0 34px rgba(17,24,39,.14)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .28s cubic-bezier(.4,.2,.2,1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 14px 14px 18px', borderBottom: '1px solid #f0f1f3' }}>
          <h2 style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: '1.3px', textTransform: 'uppercase', color: 'var(--subtle)' }}>Menu</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close menu" style={iconBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 8px', flex: 1, overflow: 'auto' }}>
          <MenuItem
            primary
            icon={UserIcon}
            title={authed ? 'Admin' : 'Admin sign in'}
            sub="Dashboards, exports, cohort settings"
            chevron
            onClick={onAdmin}
          />
          <MenuItem icon={InfoIcon} title="About this survey" />
          <MenuItem icon={ShieldIcon} title="Privacy" />
        </div>

        <div style={{ padding: '14px 18px 16px', borderTop: '1px solid #f0f1f3', fontSize: 11.5, color: 'var(--subtle)', fontWeight: 500 }}>
          Vibe Coding Bootcamp <b style={{ color: 'var(--muted)', fontWeight: 600 }}>·</b> v1.2
        </div>
      </aside>
    </>
  );
}

const iconBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 9, background: 'transparent', border: 0,
  cursor: 'pointer', color: 'var(--muted)', display: 'grid', placeItems: 'center',
};

function MenuItem({ icon, title, sub, chevron, primary, onClick }: {
  icon: React.ReactNode; title: string; sub?: string; chevron?: boolean; primary?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
        borderRadius: 11, background: 'transparent', border: 0,
        cursor: onClick ? 'pointer' : 'default', textAlign: 'left', font: 'inherit',
        color: 'var(--ink)', width: '100%', opacity: onClick ? 1 : 0.6,
      }}
    >
      <span style={{
        width: 36, height: 36, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center',
        background: primary ? 'rgba(53,100,79,.10)' : '#f3f5f4',
        color: primary ? 'var(--brand)' : 'var(--muted)',
      }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</span>
        {sub && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{sub}</span>}
      </span>
      {chevron && <span style={{ color: 'var(--subtle)', flex: 'none' }}>{Chevron}</span>}
    </button>
  );
}
