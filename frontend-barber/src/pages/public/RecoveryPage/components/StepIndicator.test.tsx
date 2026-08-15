import { render, screen } from '@testing-library/react';
import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
  it('renders steps and highlights current step', () => {
    render(
      <StepIndicator
        currentStep={2}
        steps={[{ label: 'Solicitar' }, { label: 'Verificar código' }, { label: 'Nueva contraseña' }]}
      />
    );

    expect(screen.getByText('Solicitar')).toBeInTheDocument();
    expect(screen.getByText('Verificar código')).toBeInTheDocument();
    expect(screen.getByText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
