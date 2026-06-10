import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Page3Results } from './Page3Results';
import * as api from '../api';
import type { NpsSummary } from '../types';

vi.mock('../api');

function makeSummary(overrides: Partial<NpsSummary> = {}): NpsSummary {
  return {
    nps: 53,
    total: 46,
    counts: { pro: 30, pas: 11, det: 5 },
    responses: [
      { id: 1, score: 10, comment: 'Amazing!',        when: '3h ago',   you: false },
      { id: 2, score: 8,  comment: 'Pretty good',     when: '6h ago',   you: false },
      { id: 3, score: 3,  comment: 'Too rushed',      when: '1d ago',   you: false },
      { id: 4, score: 9,  comment: '',                when: '2h ago',   you: false },
      { id: 5, score: 6,  comment: '',                when: '5h ago',   you: false },
    ],
    ...overrides,
  };
}

describe('Page3Results', () => {
  beforeEach(() => {
    vi.mocked(api.getResponses).mockResolvedValue(makeSummary());
  });

  it('shows a loading state before data arrives', () => {
    vi.mocked(api.getResponses).mockReturnValue(new Promise(() => {}));
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows NPS number after loading', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('53')).toBeInTheDocument());
  });

  it('does not prefix positive NPS with a plus sign', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByText('+53')).not.toBeInTheDocument();
      expect(screen.getByText('53')).toBeInTheDocument();
    });
  });

  it('shows negative NPS with a minus sign', async () => {
    vi.mocked(api.getResponses).mockResolvedValue(makeSummary({ nps: -12 }));
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('-12')).toBeInTheDocument());
  });

  it('shows "Net Promoter Score" kicker label', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/net promoter score/i)).toBeInTheDocument());
  });

  it('shows Promoters breakdown row', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Promoters')).toBeInTheDocument());
  });

  it('shows Passives breakdown row', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Passives')).toBeInTheDocument());
  });

  it('shows Detractors breakdown row', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Detractors')).toBeInTheDocument());
  });

  it('renders comment text for responded entries', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Amazing!')).toBeInTheDocument());
  });

  it('renders "No comment provided" for empty-comment entries', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    const els = await screen.findAllByText(/no comment provided/i);
    expect(els.length).toBeGreaterThan(0);
  });

  it('shows "You" badge for the current user response', async () => {
    const summary = makeSummary({
      responses: [
        { id: 1, score: 9, comment: 'My response', when: 'Just now', you: true },
        { id: 2, score: 7, comment: 'Other',       when: '1h ago',  you: false },
      ],
    });
    vi.mocked(api.getResponses).mockResolvedValue(summary);
    render(<Page3Results youId={1} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('You')).toBeInTheDocument());
  });

  it('shows "Anonymous" for non-user responses', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText('Anonymous').length).toBeGreaterThan(0));
  });

  it('shows "What people said" section heading', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/what people said/i)).toBeInTheDocument());
  });

  it('shows "Ratings breakdown" section heading', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/ratings breakdown/i)).toBeInTheDocument());
  });

  it('shows "Submit another response" restart button', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /submit another response/i })).toBeInTheDocument());
  });

  it('calls onRestart when restart button is clicked', async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    render(<Page3Results youId={null} onRestart={onRestart} />);
    await waitFor(() => screen.getByRole('button', { name: /submit another response/i }));
    await user.click(screen.getByRole('button', { name: /submit another response/i }));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it('shows an error message when the API fails', async () => {
    vi.mocked(api.getResponses).mockRejectedValue(new Error('Network error'));
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/could not load results/i)).toBeInTheDocument());
  });

  it('shows the total response count', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/based on 46 responses/i)).toBeInTheDocument());
  });

  it('passes youId to the API call', async () => {
    render(<Page3Results youId={42} onRestart={vi.fn()} />);
    await waitFor(() => expect(api.getResponses).toHaveBeenCalledWith(42));
  });

  it('calls getResponses with null when no youId', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(api.getResponses).toHaveBeenCalledWith(null));
  });

  it('shows the correct NPS tag label (Great for 53)', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Great')).toBeInTheDocument());
  });

  it('shows Excellent tag for NPS >= 70', async () => {
    vi.mocked(api.getResponses).mockResolvedValue(makeSummary({ nps: 75 }));
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Excellent')).toBeInTheDocument());
  });

  it('shows Good tag for NPS 0-29', async () => {
    vi.mocked(api.getResponses).mockResolvedValue(makeSummary({ nps: 15 }));
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Good')).toBeInTheDocument());
  });

  it('shows Needs work tag for negative NPS', async () => {
    vi.mocked(api.getResponses).mockResolvedValue(makeSummary({ nps: -20 }));
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Needs work')).toBeInTheDocument());
  });

  it('shows singular "response" when total is 1', async () => {
    vi.mocked(api.getResponses).mockResolvedValue(
      makeSummary({ total: 1, counts: { pro: 1, pas: 0, det: 0 } })
    );
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/based on 1 response[^s]/i)).toBeInTheDocument());
  });

  it('does not show "You" badge when youId is null', async () => {
    render(<Page3Results youId={null} onRestart={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByText('You')).not.toBeInTheDocument();
    });
  });
});
