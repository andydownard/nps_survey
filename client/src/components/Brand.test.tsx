import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Brand } from './Brand';

describe('Brand', () => {
  it('renders the brand name', () => {
    render(<Brand />);
    expect(screen.getByText('Vibe Coding Bootcamp')).toBeInTheDocument();
  });

  it('renders an SVG logo', () => {
    const { container } = render(<Brand />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('logo container uses the brand color as background', () => {
    const { container } = render(<Brand />);
    const logoSpan = container.querySelector('span[style*="--brand"]');
    expect(logoSpan).toBeInTheDocument();
  });
});
