import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StepDots } from './StepDots';

describe('StepDots', () => {
  it('renders 3 dots', () => {
    const { container } = render(<StepDots page={1} />);
    const dots = container.querySelectorAll('span');
    expect(dots).toHaveLength(3);
  });

  it('on page 1: only first dot is active (brand color)', () => {
    const { container } = render(<StepDots page={1} />);
    const dots = Array.from(container.querySelectorAll('span'));
    // First dot should have brand background
    expect(dots[0].style.background).toContain('var(--brand)');
    expect(dots[1].style.background).not.toContain('var(--brand)');
    expect(dots[2].style.background).not.toContain('var(--brand)');
  });

  it('on page 2: first two dots are active', () => {
    const { container } = render(<StepDots page={2} />);
    const dots = Array.from(container.querySelectorAll('span'));
    expect(dots[0].style.background).toContain('var(--brand)');
    expect(dots[1].style.background).toContain('var(--brand)');
    expect(dots[2].style.background).not.toContain('var(--brand)');
  });

  it('on page 3: all three dots are active', () => {
    const { container } = render(<StepDots page={3} />);
    const dots = Array.from(container.querySelectorAll('span'));
    expect(dots[0].style.background).toContain('var(--brand)');
    expect(dots[1].style.background).toContain('var(--brand)');
    expect(dots[2].style.background).toContain('var(--brand)');
  });
});
