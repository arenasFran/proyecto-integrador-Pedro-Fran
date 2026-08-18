import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiUsers } from 'react-icons/fi';
import { AnimatedContainer, Button, ConfirmModal, Pagination, useToast } from '../../../components/common';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  activateBarber,
  createBarber,
  deactivateBarber,
  fetchBarbers,
  fetchBarbersPaginated,
  removeBarber,
  updateBarber,
  updateBarberSchedule,
} from '../../../store/slices/barbersSlice';
import { getTokenUser, getTokenKind } from '../../../utils/token';
import { getAccessToken } from '../../../services/api';
import { Navigate } from 'react-router-dom';
import type { DayKey, Professional, ProfessionalPayload } from '../../../types/professional';
import {
  normalizeServices,
  scheduleFromForm,
  type ScheduleDayForm,
} from '../../admin/utils/schedule-helpers';
import { ProfessionalsList } from './components/ProfessionalsList';
import { ProfessionalModalWizard } from './components/ProfessionalModalWizard';
import AdminPageHeader from '../components/AdminPageHeader';

const PAGE_SIZE = 20;

export const ProfessionalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { list: professionals, totalPages } = useAppSelector((state) => state.barbers);
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Professional | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<{ professional: Professional; action: 'deactivate' | 'activate' } | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editProfessional, setEditProfessional] = useState<Professional | null>(null);

  const currentTokenUser = useMemo(() => getTokenUser(getAccessToken()), []);

  const employees = useMemo(
    () => professionals.filter((p) => p.id !== currentTokenUser?.id),
    [professionals, currentTokenUser]
  );

  const loadProfessionals = useCallback(async (pageNum?: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      await dispatch(fetchBarbersPaginated({ page: pageNum ?? 1, limit: PAGE_SIZE })).unwrap();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar profesionales';
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, showToast]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    setIsLoading(true);
    setLoadError(null);
    dispatch(fetchBarbersPaginated({ page: newPage, limit: PAGE_SIZE }))
      .unwrap()
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Error al cargar profesionales';
        setLoadError(message);
        showToast(message, 'error');
      })
      .finally(() => setIsLoading(false));
  }, [dispatch, showToast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadProfessionals(1), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadProfessionals]);

  const kind = getTokenKind(getAccessToken());
  if (kind !== 'Admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const openCreateModal = () => {
    setEditProfessional(null);
    setModalOpen(true);
  };

  const openEditModal = (professional: Professional) => {
    setEditProfessional(professional);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditProfessional(null);
  };

  const handleSaveProfessional = async ({
    form,
    schedule,
  }: {
    form: {
      name: string;
      lastname: string;
      email: string;
      phone: string;
      password: string;
      age: string;
      slotDuration: string;
      photoUrl: string;
      services: string;
    };
    schedule: Record<DayKey, ScheduleDayForm>;
  }) => {
    const slotDuration = Number(form.slotDuration || 30);
    const payload: ProfessionalPayload = {
      email: form.email.trim(),
      password: form.password.trim() || undefined,
      name: form.name.trim(),
      lastname: form.lastname.trim(),
      phone: form.phone.trim(),
      services: normalizeServices(form.services),
      age: form.age ? Number(form.age) : undefined,
      photoUrl: form.photoUrl.trim() || null,
      slotDuration,
      schedule: scheduleFromForm(schedule),
    };

    if (!editProfessional && !payload.password) {
      showToast('La contraseña es obligatoria para crear un barbero.', 'error');
      throw new Error('Password required');
    }

    try {
      if (editProfessional) {
        const updatePayload = {
          email: payload.email,
          password: payload.password,
          name: payload.name,
          lastname: payload.lastname,
          phone: payload.phone,
          services: payload.services,
          age: payload.age ?? null,
          photoUrl: payload.photoUrl,
          slotDuration: payload.slotDuration,
        };

        const updated = await dispatch(
          updateBarber({ id: editProfessional.id, data: updatePayload })
        ).unwrap();
        await dispatch(
          updateBarberSchedule({ id: editProfessional.id, schedule: payload.schedule })
        ).unwrap();
        await dispatch(fetchBarbers()).unwrap();
        await loadProfessionals(page);
        showToast(`Barbero ${updated.name} actualizado con éxito.`);
      } else {
        const created = await dispatch(createBarber(payload)).unwrap();
        await dispatch(fetchBarbers()).unwrap();
        await loadProfessionals(page);
        showToast(`Barbero ${created.name} creado con éxito.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar';
      showToast(message, 'error');
      throw error;
    }
  };

  const handleDelete = async (professional: Professional) => {
    setIsDeleting(true);
    try {
      const result = await dispatch(removeBarber(professional.id)).unwrap();
      await dispatch(fetchBarbers()).unwrap();
      await loadProfessionals(page);
      showToast(result.message);
      setDeleteTarget(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error al eliminar', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    const { professional, action } = toggleTarget;
    setIsToggling(true);
    try {
      if (action === 'deactivate') {
        const result = await dispatch(deactivateBarber(professional.id)).unwrap();
        showToast(result.message);
      } else {
        const result = await dispatch(activateBarber(professional.id)).unwrap();
        showToast(`${result.name} activado.`);
      }
      await dispatch(fetchBarbers()).unwrap();
      await loadProfessionals(page);
      setToggleTarget(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error';
      showToast(msg, 'error');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="relative mx-auto w-full max-w-[1440px] px-0 pb-8 sm:pb-10">
<AnimatedContainer animation="fadeInDown" className="mb-8">
          <AdminPageHeader
            icon={FiUsers}
            title="Profesionales"
            description="Gestioná profesionales, horarios y disponibilidad desde un solo lugar."
            action={<Button icon={FiPlus} size="md" onClick={openCreateModal} className="w-full shrink-0 sm:w-auto">Nuevo barbero</Button>}
          />
        </AnimatedContainer>

        <div>
          <ProfessionalsList
            professionals={employees}
            onEdit={(p) => openEditModal(p)}
            onToggleActive={(p) =>
              setToggleTarget({
                professional: p,
                action: p.isActive ? 'deactivate' : 'activate',
              })
            }
            onDelete={(p) => setDeleteTarget(p)}
            isLoading={isLoading}
            errorMessage={loadError}
            onRetry={() => void loadProfessionals(page)}
            onCreate={openCreateModal}
          />
        </div>

        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      </div>

      <ProfessionalModalWizard
        isOpen={modalOpen}
        onClose={closeModal}
        professional={editProfessional}
        onSave={handleSaveProfessional}
      />

      <ConfirmModal
        isOpen={toggleTarget !== null}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleActive}
        title={toggleTarget?.action === 'deactivate' ? 'Desactivar barbero' : 'Activar barbero'}
        message={
          toggleTarget
            ? toggleTarget.action === 'deactivate'
              ? `¿Desactivar a ${toggleTarget.professional.name} ${toggleTarget.professional.lastname}? Los turnos futuros no se verán afectados.`
              : `¿Activar a ${toggleTarget.professional.name} ${toggleTarget.professional.lastname}? Volverá a estar disponible para reservas.`
            : ''
        }
        confirmText={toggleTarget?.action === 'deactivate' ? 'Desactivar' : 'Activar'}
        variant="primary"
        loading={isToggling}
      />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        title="Eliminar barbero"
        message={deleteTarget ? `¿Eliminar a ${deleteTarget.name} ${deleteTarget.lastname}? Se cancelarán los turnos futuros.` : ''}
        confirmText="Eliminar"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};

export default ProfessionalsPage;
