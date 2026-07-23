import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ServiceCard } from './ServiceCard';
import type { Service } from '../../../types/booking';

const mockService: Service = {
  id: '1',
  name: 'Corte',
  description: 'Corte clásico',
  price: 1500,
  imageUrl: '',
  status: 'active',
};

describe('ServiceCard', () => {
  it('debe renderizar el nombre, descripción y precio del servicio', () => {
    render(<ServiceCard service={mockService} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('Corte clásico')).toBeInTheDocument();
    expect(screen.getByText('$1500')).toBeInTheDocument();
  });

  it('debe mostrar check cuando está seleccionado', () => {
    const { container } = render(
      <ServiceCard service={mockService} isSelected={true} onSelect={vi.fn()} />
    );
    const button = container.querySelector('button');
    expect(button?.className).toContain('border-[#FF5C00]');
  });

  it('debe llamar onSelect al hacer click', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ServiceCard service={mockService} isSelected={false} onSelect={onSelect} />);
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockService);
  });
});
