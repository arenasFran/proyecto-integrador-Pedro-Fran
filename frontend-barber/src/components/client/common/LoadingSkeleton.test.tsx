import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('debe renderizar skeleton card por defecto', () => {
    const { container } = render(<LoadingSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('debe renderizar skeleton text', () => {
    const { container } = render(<LoadingSkeleton variant="text" count={2} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(2);
  });

  it('debe renderizar skeleton circle', () => {
    const { container } = render(<LoadingSkeleton variant="circle" count={4} />);
    const circles = container.querySelectorAll('.rounded-full');
    expect(circles.length).toBe(4);
  });

  it('debe renderizar skeleton rectangle', () => {
    const { container } = render(<LoadingSkeleton variant="rectangle" count={1} />);
    const rectangles = container.querySelectorAll('.animate-pulse');
    expect(rectangles.length).toBe(1);
  });

  it('debe respetar el count por defecto (3)', () => {
    const { container } = render(<LoadingSkeleton />);
    const cards = container.querySelectorAll('.rounded-\\[16px\\]');
    expect(cards.length).toBe(3);
  });
});
