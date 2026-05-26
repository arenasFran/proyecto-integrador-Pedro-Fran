import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IconType } from 'react-icons';
import { vi } from 'vitest';
import { Button } from './Button';

const TestIcon: IconType = () => <svg data-testid="icon" />;

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies variant and size classes', () => {
    render(
      <Button variant="secondary" size="lg">
        Action
      </Button>
    );
    const button = screen.getByRole('button', { name: /action/i });
    expect(button.className).toContain('bg-[#242424]');
    expect(button.className).toContain('h-[48px]');
  });

  it('shows loading spinner and disables button', () => {
    render(
      <Button loading>
        Submit
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.queryByText(/submit/i)).not.toBeInTheDocument();
  });

  it('renders icon on the left by default', () => {
    render(<Button icon={TestIcon}>Save</Button>);
    const button = screen.getByRole('button', { name: /save/i });
    expect(button.firstChild).toHaveAttribute('data-testid', 'icon');
  });

  it('renders icon on the right when specified', () => {
    render(
      <Button icon={TestIcon} iconPosition="right">
        Next
      </Button>
    );
    const button = screen.getByRole('button', { name: /next/i });
    expect(button.lastChild).toHaveAttribute('data-testid', 'icon');
  });

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);

    await user.click(screen.getByRole('button', { name: /press/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
