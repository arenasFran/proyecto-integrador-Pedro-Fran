import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ServiceSelectionStep } from './ServiceSelectionStep';
import type { Service } from '../../../types/booking';

const mockService1: Service = {
  id: 'srv1',
  name: 'Corte',
  description: 'Corte de cabello clásico',
  price: 1500,
  imageUrl: '',
};

const mockService2: Service = {
  id: 'srv2',
  name: 'Barba',
  description: 'Arreglo de barba',
  price: 800,
  imageUrl: '',
};

const mockServices = [mockService1, mockService2];
const defaultProps = {
  services: mockServices,
  selectedService: null,
  isLoading: false,
  error: null,
  onSelect: vi.fn(),
};

describe('ServiceSelectionStep', () => {
  it('renders loading skeleton when loading with no services', () => {
    const { container } = render(
      <ServiceSelectionStep {...defaultProps} services={[]} isLoading={true} />
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error message when error and no services', () => {
    render(
      <ServiceSelectionStep
        {...defaultProps}
        services={[]}
        error="Error al cargar servicios"
      />
    );
    expect(screen.getByText('Error al cargar servicios')).toBeInTheDocument();
    expect(screen.getByText('Intentá de nuevo más tarde')).toBeInTheDocument();
  });

  it('renders empty state when no services', () => {
    render(<ServiceSelectionStep {...defaultProps} services={[]} />);
    expect(screen.getByText('No hay servicios disponibles')).toBeInTheDocument();
  });

  it('renders services list when services provided', () => {
    render(<ServiceSelectionStep {...defaultProps} />);
    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('$1500')).toBeInTheDocument();
    expect(screen.getByText('$800')).toBeInTheDocument();
    expect(
      screen.getByText(/Seleccioná el servicio que querés/i)
    ).toBeInTheDocument();
  });

  it('renders error banner alongside services when error and services exist', () => {
    render(
      <ServiceSelectionStep {...defaultProps} error="Error parcial al cargar" />
    );
    expect(screen.getByText('Error parcial al cargar')).toBeInTheDocument();
    expect(screen.getByText('Corte')).toBeInTheDocument();
  });

  it('calls onSelect when a service card is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ServiceSelectionStep {...defaultProps} onSelect={onSelect} />);

    await user.click(screen.getByText('Corte'));
    expect(onSelect).toHaveBeenCalledWith(mockService1);
  });
});
