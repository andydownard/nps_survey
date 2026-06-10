import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Page1Rating } from './Page1Rating';

describe('Page1Rating', () => {
  it('renders the survey question', () => {
    render(<Page1Rating onSelect={vi.fn()} />);
    expect(screen.getByText(/how likely are you to recommend/i)).toBeInTheDocument();
  });

  it('renders all 11 rating buttons (0–10)', () => {
    render(<Page1Rating onSelect={vi.fn()} />);
    for (let n = 0; n <= 10; n++) {
      expect(screen.getByRole('button', { name: `Rate ${n} out of 10` })).toBeInTheDocument();
    }
  });

  it('renders "Not at all likely" label', () => {
    render(<Page1Rating onSelect={vi.fn()} />);
    expect(screen.getByText('Not at all likely')).toBeInTheDocument();
  });

  it('renders "Extremely likely" label', () => {
    render(<Page1Rating onSelect={vi.fn()} />);
    expect(screen.getByText('Extremely likely')).toBeInTheDocument();
  });

  it('calls onSelect with the correct score when a button is clicked', () => {
    const onSelect = vi.fn();
    render(<Page1Rating onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rate 7 out of 10' }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('calls onSelect with 0 when the 0 button is clicked', () => {
    const onSelect = vi.fn();
    render(<Page1Rating onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rate 0 out of 10' }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('calls onSelect with 10 when the 10 button is clicked', () => {
    const onSelect = vi.fn();
    render(<Page1Rating onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rate 10 out of 10' }));
    expect(onSelect).toHaveBeenCalledWith(10);
  });

  it('renders "Tap a number to continue" instruction', () => {
    render(<Page1Rating onSelect={vi.fn()} />);
    expect(screen.getByText(/tap a number to continue/i)).toBeInTheDocument();
  });

  it('does not call onSelect before a button is clicked', () => {
    const onSelect = vi.fn();
    render(<Page1Rating onSelect={onSelect} />);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
