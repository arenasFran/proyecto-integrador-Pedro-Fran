import React, { useState } from 'react';
import { FiEdit3, FiEye, FiEyeOff, FiPlus, FiScissors, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { AnimatedContainer, Button } from '../../../components/common';
import {
  useGetServicesAdminQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useRestoreServiceMutation,
} from '../../../services/service.api';
import type { Service, ServiceStatus } from '../../../types/booking';
import ServiceFormModal from './components/ServiceFormModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';

type ServiceForm = {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
};

const emptyForm = (): ServiceForm => ({ name: '', description: '', price: '', imageUrl: '' });

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    return (err as { data?: string }).data ?? fallback;
  }
  return fallback;
}

const statusLabel: Record<ServiceStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  deleted: 'Eliminado',
};

const statusColor: Record<ServiceStatus, string> = {
  active: 'bg-green-500/10 text-green-400',
  inactive: 'bg-red-500/10 text-red-400',
  deleted: 'bg-gray-500/10 text-gray-400',
};

export const ServicesPage: React.FC = () => {
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data: services = [], isLoading, isFetching, error } = useGetServicesAdminQuery({ includeDeleted });
  const [createService, { isLoading: isCreating }] = useCreateServiceMutation();
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation();
  const [deleteService, { isLoading: isDeleting }] = useDeleteServiceMutation();
  const [restoreService, { isLoading: isRestoring }] = useRestoreServiceMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ServiceForm, string>>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [confirmDeleteService, setConfirmDeleteService] = useState<Service | null>(null);

  const isMutating = isCreating || isUpdating || isDeleting || isRestoring;

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
      imageUrl: service.imageUrl || '',
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
            imageUrl: form.imageUrl.trim() || '',
          },
        }).unwrap();
      } else {
        await createService({
          name: form.name.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          imageUrl: form.imageUrl.trim() || undefined,
        }).unwrap();
      }
      closeModal();
    } catch (err: unknown) {
      setPageError(getApiErrorMessage(err, 'Error al guardar el servicio'));
    }
  };

  const handleDelete = (service: Service) => {
    setConfirmDeleteService(service);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteService) return;
    if (isMutating) return;
    setPageError(null);
    try {
      await deleteService(confirmDeleteService.id).unwrap();
      setConfirmDeleteService(null);
    } catch (err: unknown) {
      setPageError(getApiErrorMessage(err, 'Error al eliminar el servicio'));
      setConfirmDeleteService(null);
    }
  };

  const handleToggleStatus = async (service: Service) => {
    if (isDeleting || isUpdating || isRestoring) return;
    setPageError(null);
    try {
      const newStatus: ServiceStatus = service.status === 'active' ? 'inactive' : 'active';
      await updateService({ id: service.id, data: { status: newStatus } }).unwrap();
    } catch (err: unknown) {
      setPageError(getApiErrorMessage(err, 'Error al actualizar el servicio'));
    }
  };

  const handleRestore = async (service: Service) => {
    if (isMutating) return;
    setPageError(null);
    try {
      await restoreService(service.id).unwrap();
    } catch (err: unknown) {
      setPageError(getApiErrorMessage(err, 'Error al restaurar el servicio'));
    }
  };

  const deletedServices = services.filter((s) => s.status === 'deleted');

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#FF5C00]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#FF5C00]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6 shadow-[0_0_20px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-4 py-2 text-[12px] text-[#8A8A8A]">
                <FiScissors className="text-[#FF5C00]" />
                Servicios
              </div>
              <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-white sm:text-[38px]">
                Administrá los servicios ofrecidos.
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#8A8A8A] sm:text-[15px]">
                Creá, editá y desactivá los servicios que aparecen en el sistema de reservas.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button icon={FiPlus} onClick={openCreate}>
                Nuevo servicio
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-3 sm:p-4">
              <p className="text-[11px] sm:text-[12px] text-[#8A8A8A]">Total</p>
              <p className="mt-1.5 text-[18px] sm:text-[24px] font-bold text-white">{services.length}</p>
            </div>
            <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-3 sm:p-4">
              <p className="text-[11px] sm:text-[12px] text-[#8A8A8A]">Activos</p>
              <p className="mt-1.5 text-[18px] sm:text-[24px] font-bold text-green-400">{services.filter((s) => s.status === 'active').length}</p>
            </div>
            <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-3 sm:p-4">
              <p className="text-[11px] sm:text-[12px] text-[#8A8A8A]">Inactivos</p>
              <p className="mt-1.5 text-[18px] sm:text-[24px] font-bold text-red-400">{services.filter((s) => s.status === 'inactive').length}</p>
            </div>
            <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-3 sm:p-4">
              <p className="text-[11px] sm:text-[12px] text-[#8A8A8A]">Eliminados</p>
              <p className="mt-1.5 text-[18px] sm:text-[24px] font-bold text-gray-400">{deletedServices.length}</p>
            </div>
          </div>
        </AnimatedContainer>

        {!modalOpen && pageError && (
          <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-[13px] text-red-400">{pageError}</p>
          </div>
        )}

        <AnimatedContainer animation="fadeInUp" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex items-center justify-end mb-4 gap-3">
            <span className="text-[11px] text-[#8A8A8A]">{includeDeleted ? 'Eliminados visibles' : 'Eliminados ocultos'}</span>
            <button
              onClick={() => setIncludeDeleted((prev) => !prev)}
              className="flex items-center justify-center rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:border-[#8A8A8A]/30 hover:text-white transition-colors"
              title={includeDeleted ? 'Ocultar eliminados' : 'Mostrar eliminados'}
            >
              {includeDeleted ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
            </button>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
              <FiScissors className="text-4xl mb-3" />
              <p className="text-[15px]">Error al cargar servicios</p>
              <p className="text-[12px] mt-1">Verificá la conexión e intentá de nuevo.</p>
            </div>
          ) : isLoading ? (
            <>
              {/* Mobile skeleton */}
              <div className="flex flex-col gap-3 md:hidden">
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
              <div className="hidden md:block overflow-x-auto">
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
                <div className="mb-3 text-[12px] text-[#8A8A8A] md:hidden">Actualizando...</div>
              )}
              <div className="flex flex-col gap-3 md:hidden">
                {services.map((service) => (
                  <div key={service.id} className={`rounded-[16px] border p-4 flex flex-col gap-3 ${service.status === 'deleted' ? 'border-gray-700/50 bg-[#1A1A1A]/50 opacity-60' : 'border-[#282828] bg-[#1A1A1A]'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-white">{service.name}</p>
                      {service.status !== 'deleted' ? (
                        <span
                          onClick={() => handleToggleStatus(service)}
                          title={service.status === 'active' ? 'Desactivar' : 'Activar'}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${statusColor[service.status]}`}
                        >
                          {statusLabel[service.status]}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor.deleted}`}>
                          {statusLabel.deleted}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#8A8A8A] line-clamp-2">{service.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[15px] font-bold text-white">${service.price}</p>
                      <div className="flex items-center gap-1.5">
                        {service.status !== 'deleted' ? (
                          <>
                            <button
                              onClick={() => openEdit(service)}
                              className="rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:border-blue-500/30 hover:text-blue-400 transition-colors"
                              title="Editar"
                            >
                              <FiEdit3 className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDelete(service)}
                              disabled={isMutating}
                              className="rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:border-red-500/30 hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Eliminar"
                            >
                              <FiTrash2 className="text-sm" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(service)}
                            disabled={isMutating}
                            className="rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:border-green-500/30 hover:text-green-400 transition-colors disabled:opacity-50"
                            title="Restaurar"
                          >
                            <FiRefreshCw className="text-sm" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
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
                        className={`border-b border-[#282828]/50 hover:bg-[#1A1A1A]/50 transition-colors ${service.status === 'deleted' ? 'opacity-50' : ''}`}
                      >
                        <td className="py-3 pr-4 font-medium text-white">{service.name}</td>
                        <td className="py-3 pr-4 text-[#8A8A8A] max-w-[200px] truncate">{service.description}</td>
                        <td className="py-3 pr-4 text-white">${service.price}</td>
                        <td className="py-3 pr-4">
                          {service.status !== 'deleted' ? (
                            <span
                              onClick={() => handleToggleStatus(service)}
                              title={service.status === 'active' ? 'Desactivar' : 'Activar'}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${statusColor[service.status]}`}
                            >
                              {statusLabel[service.status]}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor.deleted}`}>
                              {statusLabel.deleted}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            {service.status !== 'deleted' ? (
                              <>
                                <button
                                  onClick={() => openEdit(service)}
                                  className="rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:border-blue-500/30 hover:text-blue-400 transition-colors"
                                  title="Editar"
                                >
                                  <FiEdit3 className="text-sm" />
                                </button>
                                <button
                                  onClick={() => handleDelete(service)}
                                  disabled={isMutating}
                                  className="rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:border-red-500/30 hover:text-red-400 transition-colors disabled:opacity-50"
                                  title="Eliminar"
                                >
                                  <FiTrash2 className="text-sm" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleRestore(service)}
                                disabled={isMutating}
                                className="rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:border-green-500/30 hover:text-green-400 transition-colors disabled:opacity-50"
                                title="Restaurar"
                              >
                                <FiRefreshCw className="text-sm" />
                              </button>
                            )}
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

      <DeleteConfirmModal
        service={confirmDeleteService}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteService(null)}
      />
    </div>
  );
};

export default ServicesPage;