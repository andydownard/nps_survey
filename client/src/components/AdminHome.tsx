const Chevron = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
);
const BarsIcon = <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v8H3zM10 3h2v18h-2zM17 8h2v13h-2z" /></svg>;
const MailIcon = <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13zM5 6.4l7 4.7 7-4.7V6H5v.4z" /></svg>;
const DownloadIcon = <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.6l3.3-3.3 1.4 1.4L12 16.4l-4.7-4.7 1.4-1.4L12 13.6V3zM5 19h14v2H5z" /></svg>;
const GearIcon = <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.5-2.4 1a7.5 7.5 0 0 0-1.7-1L14.8 3h-4l-.5 2.9a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.5L4.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.5 2.4-1a7.5 7.5 0 0 0 1.7 1l.5 2.9h4l.5-2.9a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.5L19.4 13zM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" /></svg>;

interface AdminHomeProps {
  phone: string;
  onSignOut: () => void;
  onOpenReport: () => void;
}

export function AdminHome({ phone, onSignOut, onOpenReport }: AdminHomeProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f3f5f4', borderRadius: 12, padding: '6px 6px 6px 8px', marginBottom: 18, fontSize: 13, color: 'var(--muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span aria-hidden style={{ width: 30, height: 30, borderRadius: '50%', flex: 'none', background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'grid', placeItems: 'center' }}>A</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Signed in as <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{phone}</b></span>
        </span>
        <button type="button" onClick={onSignOut} style={{ background: '#fff', border: '1.5px solid var(--line)', color: 'var(--ink)', font: 'inherit', fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 10, cursor: 'pointer', flex: 'none' }}>Sign out</button>
      </div>

      <h1 style={{ fontSize: 23, lineHeight: 1.3, fontWeight: 600, margin: '0 0 4px', letterSpacing: '-.2px' }}>Welcome back</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14.5, margin: '0 0 24px' }}>Pick where you'd like to go.</p>

      <nav aria-label="Admin shortcuts" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Card icon={MailIcon} iconBg="#E0F2FE" iconFg="#0369A1" title="Daily report" sub="Yesterday's NPS, breakdown & comments" onClick={onOpenReport} />
        <Card icon={BarsIcon} iconBg="var(--pro-bg)" iconFg="var(--pro)" title="Cohort dashboard" sub="NPS, trends, response volume" soon />
        <Card icon={DownloadIcon} iconBg="var(--pas-bg)" iconFg="var(--pas)" title="Export responses" sub="CSV — full cohort" soon />
        <Card icon={GearIcon} iconBg="#F3F4F6" iconFg="#4B5563" title="Report settings" sub="Recipients, schedule, alerts" soon />
      </nav>
    </div>
  );
}

function Card({ icon, iconBg, iconFg, title, sub, onClick, soon }: {
  icon: React.ReactNode; iconBg: string; iconFg: string; title: string; sub: string; onClick?: () => void; soon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1.5px solid var(--line)',
        borderRadius: 14, background: '#fff', color: 'var(--ink)', textAlign: 'left', font: 'inherit',
        cursor: onClick ? 'pointer' : 'default', width: '100%', opacity: soon ? 0.62 : 1,
      }}
    >
      <span style={{ width: 42, height: 42, flex: 'none', borderRadius: 11, display: 'grid', placeItems: 'center', background: iconBg, color: iconFg }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, letterSpacing: '-.1px' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>{sub}</span>
      </span>
      {soon
        ? <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Soon</span>
        : <span style={{ color: 'var(--subtle)', flex: 'none' }}>{Chevron}</span>}
    </button>
  );
}
