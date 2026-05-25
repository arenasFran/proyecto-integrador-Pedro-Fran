import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('renders label and input', () => {
    render(<PasswordInput label="Password" />);
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Password" />);

    const input = screen.getByLabelText(/password/i);
    const toggle = screen.getByRole('button');

    expect(input).toHaveAttribute('type', 'password');
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('shows error and helper text', () => {
    const { rerender } = render(<PasswordInput label="Password" error="Invalid" />);
    expect(screen.getByText('Invalid')).toBeInTheDocument();

    rerender(<PasswordInput label="Password" helperText="Help" />);
    expect(screen.getByText('Help')).toBeInTheDocument();
  });
});
