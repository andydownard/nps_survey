import { useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { Drawer } from './components/Drawer';
import { StepDots } from './components/StepDots';
import { Page1Rating } from './components/Page1Rating';
import { Page2Comment } from './components/Page2Comment';
import { Page3Results } from './components/Page3Results';
import { AdminSignIn } from './components/AdminSignIn';
import { AdminHome } from './components/AdminHome';
import { AdminReport } from './components/AdminReport';
import { postResponse } from './api';
import { getSession, logout } from './adminApi';

type SurveyPage = 1 | 2 | 3;
type View = 'survey' | 'admin-signin' | 'admin-home' | 'admin-report';

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 22,
  padding: '30px 26px',
  boxShadow: '0 8px 28px rgba(31,41,55,.06)',
};

const PAGE_STYLE: React.CSSProperties = { animation: 'rise .32s ease both' };

export function App() {
  const [view, setView] = useState<View>('survey');
  const [page, setPage] = useState<SurveyPage>(1);
  const [score, setScore] = useState<number | null>(null);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminPhone, setAdminPhone] = useState<string | null>(null);

  // Restore an existing admin session on load (so the menu reflects it), but
  // stay on the survey — the admin only navigates in via the menu.
  useEffect(() => {
    getSession().then(s => { if (s.authenticated && s.phone) setAdminPhone(s.phone); }).catch(() => {});
  }, []);

  function handleSelect(s: number) { setScore(s); setSubmittedId(null); setPage(2); }

  async function handleSubmit(comment: string) {
    if (score == null) return;
    try {
      const { id } = await postResponse(score, comment);
      setSubmittedId(id);
    } catch {
      setSubmittedId(null);
    }
    setPage(3);
  }

  function restartSurvey() { setScore(null); setSubmittedId(null); setPage(1); }

  function openAdmin() {
    setDrawerOpen(false);
    setView(adminPhone ? 'admin-home' : 'admin-signin');
  }

  async function signOut() {
    await logout().catch(() => {});
    setAdminPhone(null);
    setView('survey');
    restartSurvey();
  }

  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      <TopBar onMenu={() => setDrawerOpen(true)} />
      {view === 'survey' && <StepDots page={page} />}

      <div style={CARD_STYLE}>
        {view === 'survey' && page === 1 && (
          <div key="p1" style={PAGE_STYLE}><Page1Rating onSelect={handleSelect} /></div>
        )}
        {view === 'survey' && page === 2 && score != null && (
          <div key="p2" style={PAGE_STYLE}>
            <Page2Comment score={score} onContinue={handleSubmit} onSkip={() => handleSubmit('')} onBack={() => setPage(1)} />
          </div>
        )}
        {view === 'survey' && page === 3 && (
          <div key="p3" style={PAGE_STYLE}><Page3Results youId={submittedId} onRestart={restartSurvey} /></div>
        )}

        {view === 'admin-signin' && (
          <div key="signin" style={PAGE_STYLE}>
            <AdminSignIn
              onBack={() => setView('survey')}
              onAuthed={phone => { setAdminPhone(phone); setView('admin-home'); }}
            />
          </div>
        )}
        {view === 'admin-home' && adminPhone && (
          <div key="home" style={PAGE_STYLE}>
            <AdminHome phone={adminPhone} onSignOut={signOut} onOpenReport={() => setView('admin-report')} />
          </div>
        )}
        {view === 'admin-report' && (
          <div key="report" style={PAGE_STYLE}>
            <AdminReport onBack={() => setView('admin-home')} onExpired={() => { setAdminPhone(null); setView('admin-signin'); }} />
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onAdmin={openAdmin} authed={adminPhone != null} />
    </div>
  );
}
