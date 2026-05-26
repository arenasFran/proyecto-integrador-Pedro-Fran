import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders label and input', () => {
    render(<Input label="Email" placeholder="email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('email')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<Input label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid" />);
    expect(screen.getByText('Invalid')).toBeInTheDocument();
  });

  it('shows helper text when no error', () => {
    render(<Input label="Email" helperText="Help" />);
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('forwards ref to input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} label="Email" placeholder="email" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
