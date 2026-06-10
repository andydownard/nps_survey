import { useState } from 'react';
import { Brand } from './components/Brand';
import { StepDots } from './components/StepDots';
import { Page1Rating } from './components/Page1Rating';
import { Page2Comment } from './components/Page2Comment';
import { Page3Results } from './components/Page3Results';
import { postResponse } from './api';

type Page = 1 | 2 | 3;

interface AppState {
  page: Page;
  score: number | null;
  submittedId: number | null;
}

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 22,
  padding: '30px 26px',
  boxShadow: '0 8px 28px rgba(31,41,55,.06)',
};

const PAGE_STYLE: React.CSSProperties = {
  animation: 'rise .32s ease both',
};

export function App() {
  const [state, setState] = useState<AppState>({ page: 1, score: null, submittedId: null });

  function handleSelect(score: number) {
    setState({ page: 2, score, submittedId: null });
  }

  async function handleSubmit(comment: string) {
    if (state.score == null) return;
    try {
      const { id } = await postResponse(state.score, comment);
      setState(s => ({ ...s, page: 3, submittedId: id }));
    } catch {
      // still advance — show results even if save failed
      setState(s => ({ ...s, page: 3, submittedId: null }));
    }
  }

  function handleSkip() {
    handleSubmit('');
  }

  function handleBack() {
    setState(s => ({ ...s, page: 1 }));
  }

  function handleRestart() {
    setState({ page: 1, score: null, submittedId: null });
  }

  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      <Brand />
      <StepDots page={state.page} />
      <div style={CARD_STYLE}>
        {state.page === 1 && (
          <div key="p1" style={PAGE_STYLE}>
            <Page1Rating onSelect={handleSelect} />
          </div>
        )}
        {state.page === 2 && state.score != null && (
          <div key="p2" style={PAGE_STYLE}>
            <Page2Comment
              score={state.score}
              onContinue={handleSubmit}
              onSkip={handleSkip}
              onBack={handleBack}
            />
          </div>
        )}
        {state.page === 3 && (
          <div key="p3" style={PAGE_STYLE}>
            <Page3Results youId={state.submittedId} onRestart={handleRestart} />
          </div>
        )}
      </div>
    </div>
  );
}
