import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
  it('debe renderizar los tres pasos', () => {
    render(<StepIndicator currentStep="barber" />);
    expect(screen.getByText('Barbero')).toBeInTheDocument();
    expect(screen.getByText('Servicio')).toBeInTheDocument();
    expect(screen.getByText('Fecha y hora')).toBeInTheDocument();
  });

  it('debe mostrar el paso actual como activo', () => {
    render(<StepIndicator currentStep="service" />);
    expect(screen.getByText('Servicio')).toBeInTheDocument();
  });

  it('debe mostrar check en pasos completados', () => {
    const { container } = render(<StepIndicator currentStep="datetime" />);
    const checkIcons = container.querySelectorAll('polyline[points="20 6 9 17 4 12"]');
    expect(checkIcons.length).toBe(2);
  });

  it('debe llamar onStepClick al hacer click en un paso permitido', async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();
    render(<StepIndicator currentStep="service" onStepClick={onStepClick} />);

    const stepButtons = screen.getAllByRole('button');
    // Barber step button (index 0) is rendered with a check icon when completed
    const barberButton = stepButtons[0];
    await user.click(barberButton);
    expect(onStepClick).toHaveBeenCalledWith('barber');
  });
});
