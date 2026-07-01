import { render, screen } from '@testing-library/react';
import { PasswordStrength } from './PasswordStrength';

describe('PasswordStrength', () => {
  it('shows requirements hint even for empty password', () => {
    render(<PasswordStrength password="" />);
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Una mayúscula')).toBeInTheDocument();
  });

  it('does not show strength label for empty password', () => {
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

  it('marks requirements as met when password is strong', () => {
    render(<PasswordStrength password="Abcdef1!" />);
    const chars = screen.getByText('Mínimo 8 caracteres');
    expect(chars).toBeInTheDocument();
    expect(screen.getByText('Una mayúscula')).toBeInTheDocument();
    expect(screen.getByText('Una minúscula')).toBeInTheDocument();
    expect(screen.getByText('Un número')).toBeInTheDocument();
  });
});
