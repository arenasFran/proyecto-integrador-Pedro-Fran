import React, { useState } from 'react';
import { FiEdit3, FiPlus, FiPower, FiScissors } from 'react-icons/fi';
import { AnimatedContainer, Button, ConfirmModal, useToast } from '../../../components/common';
import {
    useCreateServiceMutation,
    useGetServicesAdminQuery,
    useUpdateServiceMutation,
} from '../../../services/service.api';
import type { Service, ServiceStatus } from '../../../types/booking';
import ServiceFormModal from './components/ServiceFormModal';
import { formatCurrency } from '../../../utils/formatCurrency';
import AdminPageHeader from '../components/AdminPageHeader';

type ServiceForm = {
  name: string;
  description: string;
  price: string;
};

const emptyForm = (): ServiceForm => ({ name: '', description: '', price: '' });

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    return (err as { data?: string }).data ?? fallback;
  }
  return fallback;
}

const statusLabel: Record<ServiceStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
};

const statusColor: Record<ServiceStatus, string> = {
  active: 'bg-green-500/10 text-green-400',
  inactive: 'bg-red-500/10 text-red-400',
};

export const ServicesPage: React.FC = () => {
  const { showToast } = useToast();
  const { data: services = [], isLoading, isFetching, error } = useGetServicesAdminQuery();
  const [createService, { isLoading: isCreating }] = useCreateServiceMutation();
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ServiceForm, string>>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [confirmToggleService, setConfirmToggleService] = useState<Service | null>(null);

  const isMutating = isCreating || isUpdating;

  const openCreate = () => {
    setEditingService(null);
    setForm(emptyForm());
    setFormErrors({});
    setPageError(null);
    setModalOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description,
      price: String(service.price),
    });
    setFormErrors({});
    setPageError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingService(null);
    setForm(emptyForm());
    setFormErrors({});
  };

  const handleFieldChange = (field: keyof ServiceForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof ServiceForm, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre es obligatorio';
    if (!form.description.trim()) errors.description = 'La descripción es obligatoria';
    const price = Number(form.price);
    if (!form.price.trim() || isNaN(price) || price < 0.01) errors.price = 'Debe ser un número mayor a 0';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setPageError(null);
    try {
      if (editingService) {
        await updateService({
          id: editingService.id,
          data: {
            name: form.name.trim(),
            description: form.description.trim(),
            price: Number(form.price),
          },
        }).unwrap();
      } else {
        await createService({
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
        }).unwrap();
      }
      showToast(editingService ? 'Servicio actualizado' : 'Servicio creado');
      closeModal();
    } catch (err: unknown) {
      setPageError(getApiErrorMessage(err, 'Error al guardar el servicio'));
    }
  };

  const handleToggleStatus = (service: Service) => {
    if (isUpdating) return;
    setConfirmToggleService(service);
  };

  const handleConfirmToggle = async () => {
    if (!confirmToggleService) return;
    if (isUpdating) return;
    setPageError(null);
    try {
      const newStatus: ServiceStatus = confirmToggleService.status === 'active' ? 'inactive' : 'active';
      await updateService({ id: confirmToggleService.id, data: { status: newStatus } }).unwrap();
      setConfirmToggleService(null);
      showToast(newStatus === 'active' ? 'Servicio activado' : 'Servicio desactivado');
    } catch (err: unknown) {
      setPageError(getApiErrorMessage(err, 'Error al actualizar el servicio'));
      setConfirmToggleService(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#FF5C00]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#FF5C00]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-8">
        <AnimatedContainer animation="fadeInDown">
          <AdminPageHeader icon={FiScissors} title="Servicios" description={<><span>Gestioná los servicios que aparecen en las reservas.</span><span className="sr-only">Administrá los servicios ofrecidos.</span></>} action={<Button icon={FiPlus} onClick={openCreate}>Nuevo servicio</Button>} />
        </AnimatedContainer>

<AnimatedContainer animation="fadeInUp">
          <div className="mt-6 grid gap-2 grid-cols-2 sm:grid-cols-3">
            <div className="rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-2 sm:p-4">
              <p className="text-[10px] sm:text-[12px] text-[#8A8A8A]">Total</p>
              <p className="mt-1 text-[16px] sm:text-[24px] font-bold text-white">{services.length}</p>
            </div>
            <div className="rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-2 sm:p-4">
              <p className="text-[10px] sm:text-[12px] text-[#8A8A8A]">Activos</p>
              <p className="mt-1 text-[16px] sm:text-[24px] font-bold text-green-400">{services.filter((s) => s.status === 'active').length}</p>
            </div>
            <div className="rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-2 sm:p-4">
              <p className="text-[10px] sm:text-[12px] text-[#8A8A8A]">Inactivos</p>
              <p className="mt-1 text-[16px] sm:text-[24px] font-bold text-red-400">{services.filter((s) => s.status === 'inactive').length}</p>
            </div>
          </div>
        </AnimatedContainer>

        {!modalOpen && pageError && (
          <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-[13px] text-red-400">{pageError}</p>
          </div>
        )}

        <AnimatedContainer animation="fadeInUp" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          {error ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
              <FiScissors className="text-4xl mb-3" />
              <p className="text-[15px]">Error al cargar servicios</p>
              <p className="text-[12px] mt-1">Verificá la conexión e intentá de nuevo.</p>
            </div>
          ) : isLoading ? (
            <>
              {/* Mobile skeleton */}
               <div className="flex flex-col gap-3 lg:hidden">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 animate-pulse">
                    <div className="h-4 w-32 rounded bg-[#282828] mb-3" />
                    <div className="h-3 w-full rounded bg-[#282828] mb-2" />
                    <div className="h-3 w-3/4 rounded bg-[#282828] mb-3" />
                    <div className="flex justify-between">
                      <div className="h-4 w-12 rounded bg-[#282828]" />
                      <div className="h-4 w-16 rounded bg-[#282828]" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop skeleton */}
               <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#282828] text-[#8A8A8A] text-[12px] uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-medium">Nombre</th>
                      <th className="pb-3 pr-4 font-medium">Descripción</th>
                      <th className="pb-3 pr-4 font-medium">Precio</th>
                      <th className="pb-3 pr-4 font-medium">Estado</th>
                      <th className="pb-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4].map((i) => (
                      <tr key={i} className="border-b border-[#282828]/50">
                        <td className="py-3 pr-4"><div className="h-4 w-24 rounded bg-[#282828] animate-pulse" /></td>
                        <td className="py-3 pr-4"><div className="h-4 w-48 rounded bg-[#282828] animate-pulse" /></td>
                        <td className="py-3 pr-4"><div className="h-4 w-12 rounded bg-[#282828] animate-pulse" /></td>
                        <td className="py-3 pr-4"><div className="h-5 w-16 rounded-full bg-[#282828] animate-pulse" /></td>
                        <td className="py-3"><div className="h-4 w-20 rounded bg-[#282828] animate-pulse" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
              <FiScissors className="text-4xl mb-3" />
              <p className="text-[15px]">No hay servicios registrados.</p>
              <p className="text-[12px] mt-1">Creá el primer servicio para empezar.</p>
              <Button className="mt-4" icon={FiPlus} onClick={openCreate}>
                Nuevo servicio
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              {(isFetching && !isLoading) && (
               <div className="mb-3 text-[12px] text-[#8A8A8A] lg:hidden">Actualizando...</div>
              )}
               <div className="flex flex-col gap-3 lg:hidden">
                {services.map((service) => (
                  <div key={service.id} className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-white">{service.name}</p>
                      <span
                        onClick={() => handleToggleStatus(service)}
                        title={service.status === 'active' ? 'Desactivar' : 'Activar'}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${statusColor[service.status]}`}
                      >
                        {statusLabel[service.status]}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#8A8A8A] line-clamp-2">{service.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[15px] font-bold text-white">{formatCurrency(service.price)}</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(service)}
                          disabled={isUpdating}
                          title={service.status === 'active' ? 'Desactivar' : 'Activar'}
                          className={`rounded-[8px] border p-1.5 text-[#8A8A8A] transition-colors disabled:opacity-50 ${service.status === 'active' ? 'hover:border-red-500/30 hover:text-red-400' : 'hover:border-emerald-500/30 hover:text-emerald-400'}`}
                        >
                          <FiPower className="text-sm" />
                        </button>
                        <button
                          onClick={() => openEdit(service)}
                          className="rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:border-blue-500/30 hover:text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <FiEdit3 className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
               <div className="hidden lg:block overflow-x-auto">
                {(isFetching && !isLoading) && (
                  <div className="mb-3 text-[12px] text-[#8A8A8A]">Actualizando...</div>
                )}
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#282828] text-[#8A8A8A] text-[12px] uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-medium">Nombre</th>
                      <th className="pb-3 pr-4 font-medium">Descripción</th>
                      <th className="pb-3 pr-4 font-medium">Precio</th>
                      <th className="pb-3 pr-4 font-medium">Estado</th>
                      <th className="pb-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr
                        key={service.id}
                        className="border-b border-[#282828]/50 hover:bg-[#1A1A1A]/50 transition-colors"
                      >
                        <td className="py-3 pr-4 font-medium text-white">{service.name}</td>
                        <td className="py-3 pr-4 text-[#8A8A8A] max-w-[200px] truncate">{service.description}</td>
                        <td className="py-3 pr-4 text-white">{formatCurrency(service.price)}</td>
                        <td className="py-3 pr-4">
                          <span
                            onClick={() => handleToggleStatus(service)}
                            title={service.status === 'active' ? 'Desactivar' : 'Activar'}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${statusColor[service.status]}`}
                          >
                            {statusLabel[service.status]}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(service)}
                              disabled={isUpdating}
                              title={service.status === 'active' ? 'Desactivar' : 'Activar'}
                              className={`rounded-[8px] border p-1.5 text-[#8A8A8A] transition-colors disabled:opacity-50 ${service.status === 'active' ? 'border-[#282828] hover:border-red-500/30 hover:text-red-400' : 'border-[#282828] hover:border-emerald-500/30 hover:text-emerald-400'}`}
                            >
                              <FiPower className="text-sm" />
                            </button>
                            <button
                              onClick={() => openEdit(service)}
                              className="rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:border-blue-500/30 hover:text-blue-400 transition-colors"
                              title="Editar"
                            >
                              <FiEdit3 className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </AnimatedContainer>
      </div>

      <ServiceFormModal
        isOpen={modalOpen}
        editingService={editingService}
        form={form}
        formErrors={formErrors}
        pageError={pageError}
        isMutating={isMutating}
        onSubmit={handleSubmit}
        onClose={closeModal}
        onFieldChange={handleFieldChange}
      />

      <ConfirmModal
        isOpen={!!confirmToggleService}
        onClose={() => setConfirmToggleService(null)}
        onConfirm={handleConfirmToggle}
        title="Cambiar estado"
        message={`¿Estás seguro que querés ${confirmToggleService?.status === 'active' ? 'desactivar' : 'activar'} el servicio "${confirmToggleService?.name || ''}"?`}
        confirmText={confirmToggleService?.status === 'active' ? 'Desactivar' : 'Activar'}
        cancelText="Cancelar"
        variant="danger"
        loading={isUpdating}
      />
    </div>
  );
};

export default ServicesPage;
