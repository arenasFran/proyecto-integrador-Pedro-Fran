import { render, screen } from '@testing-library/react';
import { PasswordStrength } from './PasswordStrength';

describe('PasswordStrength', () => {
  it('renders nothing for empty password label', () => {
    render(<PasswordStrength password="" />);
    expect(screen.queryByText(/débil|regular|buena|fuerte/i)).not.toBeInTheDocument();
  });

  it('shows weak strength', () => {
    render(<PasswordStrength password="abc" />);
    expect(screen.getByText('Débil')).toBeInTheDocument();
  });

  it('shows regular strength', () => {
    render(<PasswordStrength password="abcdef1" />);
    expect(screen.getByText('Regular')).toBeInTheDocument();
  });

  it('shows good strength', () => {
    render(<PasswordStrength password="Abcdef1" />);
    expect(screen.getByText('Buena')).toBeInTheDocument();
  });

  it('shows strong strength', () => {
    render(<PasswordStrength password="Abcdef1!" />);
    expect(screen.getByText('Fuerte')).toBeInTheDocument();
  });
});
