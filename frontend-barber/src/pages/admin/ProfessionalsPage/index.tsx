import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiRefreshCw, FiScissors } from 'react-icons/fi';
import { AnimatedContainer, Button } from '../../../components/common';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  createBarber,
  fetchBarbers,
  removeBarber,
  updateBarber,
  updateBarberSchedule,
} from '../../../store/slices/barbersSlice';
import { professionalService } from '../../../services/professional.service';
import { getTokenUser } from '../../../utils/token';
import type { DayKey, Professional, ProfessionalPayload, ProfessionalUpdatePayload } from '../../../types/professional';
import {
  createEmptySchedule,
  mapScheduleToForm,
  normalizeServices,
  scheduleFromForm,
  validateSchedule,
  type ScheduleDayForm,
} from '../../admin/utils/schedule-helpers';
import { ProfessionalsList } from './components/ProfessionalsList';
import { ProfessionalForm } from './components/ProfessionalForm';
import { SlotsPanel } from './components/SlotsPanel';

type ProfessionalFormState = {
  email: string;
  password: string;
  name: string;
  lastname: string;
  phone: string;
  services: string;
  age: string;
  photoUrl: string;
  slotDuration: string;
  schedule: Record<DayKey, ScheduleDayForm>;
};

const todayValue = () => new Date().toISOString().slice(0, 10);

const createEmptyForm = (): ProfessionalFormState => ({
  email: '',
  password: '',
  name: '',
  lastname: '',
  phone: '',
  services: '',
  age: '',
  photoUrl: '',
  slotDuration: '30',
  schedule: createEmptySchedule(),
});

export const ProfessionalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { list: professionals } = useAppSelector((state) => state.barbers);
  const authUser = useAppSelector((state) => state.auth.user);

  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfessionalFormState>(createEmptyForm());
  const [searchTerm, setSearchTerm] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [slotsDate, setSlotsDate] = useState(todayValue());
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [viewingAdminSlots, setViewingAdminSlots] = useState(false);

  const currentTokenUser = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return getTokenUser(token);
  }, []);

  const employees = useMemo(
    () => professionals.filter((professional) => professional.id !== currentTokenUser?.id),
    [professionals, currentTokenUser]
  );

  const selectedProfessional = useMemo(
    () => professionals.find((professional) => professional.id === selectedProfessionalId) ?? null,
    [professionals, selectedProfessionalId]
  );

  const filteredProfessionals = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return employees;
    }

    return employees.filter((professional) => {
      return [
        professional.name,
        professional.lastname,
        professional.email,
        professional.phone,
        professional.kind,
        professional.services.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [employees, searchTerm]);

  const activeCount = employees.filter((professional) => professional.isActive).length;

  const syncSelection = useCallback((professional: Professional | null) => {
    setViewingAdminSlots(false);
    if (!professional) {
      setSelectedProfessionalId(null);
      setForm(createEmptyForm());
      setAvailableSlots([]);
      return;
    }

    setSelectedProfessionalId(professional.id);
    setForm({
      email: professional.email,
      password: '',
      name: professional.name,
      lastname: professional.lastname,
      phone: professional.phone,
      services: professional.services.join(', '),
      age: professional.age ? String(professional.age) : '',
      photoUrl: professional.photoUrl ?? '',
      slotDuration: String(professional.slotDuration ?? 30),
      schedule: mapScheduleToForm(professional.schedule),
    });
    setAvailableSlots([]);
    setPageMessage(null);
    setPageError(null);
  }, []);

  const loadProfessionals = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      await dispatch(fetchBarbers()).unwrap();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Error al cargar profesionales');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfessionals();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfessionals]);

  const handleFieldChange = (field: keyof Omit<ProfessionalFormState, 'schedule'>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleDayChange = (day: DayKey, field: keyof ScheduleDayForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((previous) => ({
        ...previous,
        schedule: {
          ...previous.schedule,
          [day]: {
            ...previous.schedule[day],
            [field]: value,
          },
        },
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPageError(null);
    setPageMessage(null);

    const scheduleError = validateSchedule(form.schedule);
    if (scheduleError) {
      setPageError(scheduleError);
      return;
    }

    const slotDuration = Number(form.slotDuration || 30);
    if (!Number.isInteger(slotDuration) || slotDuration < 1) {
      setPageError('La duración del slot debe ser un número entero mayor o igual a 1.');
      return;
    }

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
      schedule: scheduleFromForm(form.schedule),
    };

    if (!selectedProfessionalId && !payload.password) {
      setPageError('La contraseña es obligatoria para crear un barbero.');
      return;
    }

    setIsSaving(true);

    try {
      if (selectedProfessionalId) {
        const updatePayload: ProfessionalUpdatePayload = {
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

        const updatedProfessional = await dispatch(
          updateBarber({ id: selectedProfessionalId, data: updatePayload })
        ).unwrap();
        await dispatch(
          updateBarberSchedule({ id: selectedProfessionalId, schedule: payload.schedule })
        ).unwrap();
        setPageMessage(`Profesional ${updatedProfessional.name} actualizado con éxito.`);
        syncSelection(updatedProfessional);
      } else {
        const createdProfessional = await dispatch(createBarber(payload)).unwrap();
        setPageMessage(`Profesional ${createdProfessional.name} creado con éxito.`);
        syncSelection(createdProfessional);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Error al guardar el profesional');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (professional: Professional) => {
    const confirmed = window.confirm(`¿Eliminar a ${professional.name} ${professional.lastname}?`);
    if (!confirmed) {
      return;
    }

    setPageError(null);
    setPageMessage(null);

    try {
      const result = await dispatch(removeBarber(professional.id)).unwrap();
      setPageMessage(result.message);
      if (selectedProfessionalId === professional.id) {
        syncSelection(null);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Error al desactivar el profesional');
    }
  };

  const handleLoadSlots = async (professionalId: string) => {
    setSlotsLoading(true);
    setSlotsError(null);

    try {
      const response = await professionalService.getSlots(professionalId, slotsDate);
      setAvailableSlots(response.slots);
    } catch (error) {
      setSlotsError(error instanceof Error ? error.message : 'Error al cargar slots');
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleLoadAdminSlots = async () => {
    if (!currentTokenUser?.id) return;
    setViewingAdminSlots(true);
    setSelectedProfessionalId(null);
    await handleLoadSlots(currentTokenUser.id);
  };

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
                Profesionales y horarios
              </div>
              <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-white sm:text-[38px]">
                Gestioná barberos, horarios y slots desde una sola pantalla.
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#8A8A8A] sm:text-[15px]">
                Creá empleados, editá sus datos, ajustá el calendario semanal y revisá la
                disponibilidad por fecha sin salir del panel.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" icon={FiRefreshCw} onClick={() => void loadProfessionals()}>
                Refrescar
              </Button>
              <Button
                icon={FiPlus}
                onClick={() => {
                  syncSelection(null);
                  setPageMessage('Listo para crear un nuevo profesional.');
                }}
              >
                Nuevo profesional
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4">
              <p className="text-[12px] text-[#8A8A8A]">Empleados</p>
              <p className="mt-2 text-[24px] font-bold text-white">{employees.length}</p>
            </div>
            <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4">
              <p className="text-[12px] text-[#8A8A8A]">Activos</p>
              <p className="mt-2 text-[24px] font-bold text-white">{activeCount}</p>
            </div>
          </div>
        </AnimatedContainer>

        {(pageError || pageMessage) && (
          <AnimatedContainer animation="fadeIn" className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] px-4 py-3">
            <p className={`text-[13px] ${pageError ? 'text-red-400' : 'text-green-400'}`}>
              {pageError || pageMessage}
            </p>
          </AnimatedContainer>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.6fr]">
          <div className="grid gap-6">
            <ProfessionalsList
              professionals={filteredProfessionals}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedProfessionalId={selectedProfessionalId}
              onSelect={syncSelection}
              onLoadSlots={handleLoadSlots}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </div>

          <div className="grid gap-6">
            <ProfessionalForm
              professional={selectedProfessional}
              form={form}
              onFieldChange={handleFieldChange}
              onDayChange={handleDayChange}
              onSubmit={handleSubmit}
              onClear={() => syncSelection(null)}
              onDelete={handleDelete}
              isSaving={isSaving}
            />

            <SlotsPanel
              slotsDate={slotsDate}
              onDateChange={setSlotsDate}
              selectedProfessional={selectedProfessional}
              authUser={authUser}
              viewingAdminSlots={viewingAdminSlots}
              onViewSlots={() => {
                if (!selectedProfessionalId) {
                  setSlotsError('Seleccioná un profesional primero.');
                  return;
                }
                setViewingAdminSlots(false);
                void handleLoadSlots(selectedProfessionalId);
              }}
              onViewMySlots={handleLoadAdminSlots}
              slotsLoading={slotsLoading}
              slotsError={slotsError}
              availableSlots={availableSlots}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalsPage;
