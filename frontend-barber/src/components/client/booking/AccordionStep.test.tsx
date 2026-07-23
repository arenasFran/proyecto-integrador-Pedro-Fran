import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AccordionStep } from './AccordionStep';

const renderAccordion = (props: Partial<Parameters<typeof AccordionStep>[0]> = {}) => {
  const defaultProps = {
    stepNumber: 1,
    title: 'Barbero',
    isExpanded: false,
    isCompleted: false,
    isLocked: false,
    onToggle: vi.fn(),
    children: <div data-testid="children">Content</div>,
  };
  return render(<AccordionStep {...defaultProps} {...props} />);
};

describe('AccordionStep', () => {
  it('debe renderizar el título y el número de paso', () => {
    renderAccordion({ stepNumber: 2, title: 'Servicio' });
    expect(screen.getByText('Servicio')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('debe mostrar el check cuando está completado', () => {
    renderAccordion({ isCompleted: true, summary: 'Corte' });
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('· Corte')).toBeInTheDocument();
  });

  it('debe deshabilitar el botón cuando está bloqueado', () => {
    renderAccordion({ isLocked: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('debe mostrar children cuando está expandido', () => {
    renderAccordion({ isExpanded: true });
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });

  it('debe llamar onToggle al hacer click', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    renderAccordion({ onToggle });
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
