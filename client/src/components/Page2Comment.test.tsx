import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Page2Comment } from './Page2Comment';

function renderPage2(props: Partial<Parameters<typeof Page2Comment>[0]> = {}) {
  const defaults = {
    score: 8,
    onContinue: vi.fn(),
    onSkip: vi.fn(),
    onBack: vi.fn(),
  };
  return render(<Page2Comment {...defaults} {...props} />);
}

describe('Page2Comment', () => {
  it('renders the Thank You heading', () => {
    renderPage2();
    expect(screen.getByText(/thanks! want to tell us more/i)).toBeInTheDocument();
  });

  it('shows the chosen score in the pip chip', () => {
    renderPage2({ score: 9 });
    // Score appears in both the pip badge and the "You rated us N out of 10" text
    expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "You rated us N out of 10" with the correct score', () => {
    renderPage2({ score: 6 });
    expect(screen.getByText(/you rated us/i)).toBeInTheDocument();
    expect(screen.getAllByText('6').length).toBeGreaterThanOrEqual(1);
  });

  it('sets placeholder to include the chosen score', () => {
    renderPage2({ score: 7 });
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('7'));
  });

  it('renders a textarea', () => {
    renderPage2();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Continue button is disabled when textarea is empty', () => {
    renderPage2();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('Continue button enables when user types in textarea', async () => {
    const user = userEvent.setup();
    renderPage2();
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Loved it!');
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  it('Continue button stays disabled if only whitespace is typed', async () => {
    const user = userEvent.setup();
    renderPage2();
    await user.type(screen.getByRole('textbox'), '   ');
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('calls onContinue with the trimmed comment when Continue is clicked', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    renderPage2({ onContinue });
    await user.type(screen.getByRole('textbox'), '  Great course!  ');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledWith('Great course!');
  });

  it('calls onSkip when Skip is clicked', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    renderPage2({ onSkip });
    await user.click(screen.getByRole('button', { name: /skip/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('calls onBack when Back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderPage2({ onBack });
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows character count "0 / 500" initially', () => {
    renderPage2();
    expect(screen.getByText(/0 \/ 500/)).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    renderPage2();
    await user.type(screen.getByRole('textbox'), 'hello');
    expect(screen.getByText(/5 \/ 500/)).toBeInTheDocument();
  });

  it('textarea has maxLength of 500', () => {
    renderPage2();
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '500');
  });

  it('renders "Optional" subtext', () => {
    renderPage2();
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  it('renders Skip button as a subtle non-primary button', () => {
    renderPage2();
    const skip = screen.getByRole('button', { name: /skip/i });
    expect(skip).toBeInTheDocument();
    // Skip should not be disabled
    expect(skip).not.toBeDisabled();
  });
});
