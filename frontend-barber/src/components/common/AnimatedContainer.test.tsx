import { render, screen } from '@testing-library/react';
import { AnimatedContainer } from './AnimatedContainer';

describe('AnimatedContainer', () => {
  it('renders children', () => {
    render(
      <AnimatedContainer>
        <div>Content</div>
      </AnimatedContainer>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
