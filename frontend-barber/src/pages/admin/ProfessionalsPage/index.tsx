import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiClock, FiEdit3, FiPlus, FiRefreshCw, FiSave, FiSearch, FiScissors, FiTrash2, FiUser } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { AnimatedContainer, Button, Input, PasswordInput } from '../../../components/common';
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
import type {
  BarberSchedule,
  DayKey,
  Professional,
  ProfessionalPayload,
  ProfessionalUpdatePayload,
} from '../../../types/professional';

type ScheduleDayForm = {
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
};

type ProfessionalFormState = {
  email: string;
  password: string;
  name: string;
  lastname: string;
  phone: string;
  specialties: string;
  age: string;
  photoUrl: string;
  slotDuration: string;
  schedule: Record<DayKey, ScheduleDayForm>;
};

const days: Array<{ key: DayKey; label: string }> = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const todayValue = () => new Date().toISOString().slice(0, 10);

const createEmptyDay = (): ScheduleDayForm => ({
  startTime: '',
  endTime: '',
  breakStart: '',
  breakEnd: '',
});

const createEmptySchedule = (): Record<DayKey, ScheduleDayForm> => ({
  monday: createEmptyDay(),
  tuesday: createEmptyDay(),
  wednesday: createEmptyDay(),
  thursday: createEmptyDay(),
  friday: createEmptyDay(),
  saturday: createEmptyDay(),
  sunday: createEmptyDay(),
});

const createEmptyForm = (): ProfessionalFormState => ({
  email: '',
  password: '',
  name: '',
  lastname: '',
  phone: '',
  specialties: '',
  age: '',
  photoUrl: '',
  slotDuration: '30',
  schedule: createEmptySchedule(),
});

const mapScheduleToForm = (schedule: BarberSchedule): Record<DayKey, ScheduleDayForm> => {
  return days.reduce((acc, day) => {
    const current = schedule[day.key];
    const firstBreak = current.breaks[0];
    acc[day.key] = {
      startTime: current.startTime ?? '',
      endTime: current.endTime ?? '',
      breakStart: firstBreak?.startTime ?? '',
      breakEnd: firstBreak?.endTime ?? '',
    };
    return acc;
  }, createEmptySchedule());
};

const isTimeRangeValid = (startTime: string, endTime: string) => {
  return startTime.length === 5 && endTime.length === 5 && startTime < endTime;
};

const validateSchedule = (schedule: Record<DayKey, ScheduleDayForm>) => {
  for (const day of days) {
    const current = schedule[day.key];
    const hasStart = Boolean(current.startTime.trim());
    const hasEnd = Boolean(current.endTime.trim());

    if (hasStart !== hasEnd) {
      return `En ${day.label} completá inicio y fin del horario o dejalos vacíos.`;
    }

    if (hasStart && !isTimeRangeValid(current.startTime, current.endTime)) {
      return `En ${day.label} el horario debe ser válido y el inicio menor al fin.`;
    }

    const hasBreakStart = Boolean(current.breakStart.trim());
    const hasBreakEnd = Boolean(current.breakEnd.trim());

    if (hasBreakStart !== hasBreakEnd) {
      return `En ${day.label} completá inicio y fin del break o dejalo vacío.`;
    }

    if (hasBreakStart && !isTimeRangeValid(current.breakStart, current.breakEnd)) {
      return `En ${day.label} el break debe ser válido y el inicio menor al fin.`;
    }
  }

  return null;
};

const normalizeSpecialties = (value: string) => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const scheduleFromForm = (schedule: Record<DayKey, ScheduleDayForm>): BarberSchedule => {
  return days.reduce((acc, day) => {
    const current = schedule[day.key];
    const breakStart = current.breakStart.trim();
    const breakEnd = current.breakEnd.trim();
    acc[day.key] = {
      startTime: current.startTime.trim() ? current.startTime.trim() : null,
      endTime: current.endTime.trim() ? current.endTime.trim() : null,
      breaks: breakStart && breakEnd ? [{ startTime: breakStart, endTime: breakEnd }] : [],
    };
    return acc;
  }, {} as BarberSchedule);
};

const selectedBadgeClass = (isSelected: boolean) =>
  isSelected
    ? 'border-[#FF5C00] shadow-[0_0_15px_rgba(255,92,0,0.2)]'
    : 'border-[#282828] hover:border-[#FF5C00]/50';

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
    () => professionals.filter((professional) => professional._id !== currentTokenUser?.id),
    [professionals, currentTokenUser]
  );

  const selectedProfessional = useMemo(
    () => professionals.find((professional) => professional._id === selectedProfessionalId) ?? null,
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
        professional.specialties.join(' '),
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

    setSelectedProfessionalId(professional._id);
    setForm({
      email: professional.email,
      password: '',
      name: professional.name,
      lastname: professional.lastname,
      phone: professional.phone,
      specialties: professional.specialties.join(', '),
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
      specialties: normalizeSpecialties(form.specialties),
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
          specialties: payload.specialties,
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

      await loadProfessionals();
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
      const result = await dispatch(removeBarber(professional._id)).unwrap();
      setPageMessage(result.message);
      if (selectedProfessionalId === professional._id) {
        syncSelection(null);
      }
      await loadProfessionals();
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

  const renderScheduleEditor = () => (
    <div className="grid gap-4">
      {days.map((day) => (
        <div
          key={day.key}
          className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 grid gap-3"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-semibold text-white">{day.label}</p>
              <p className="text-[11px] text-[#8A8A8A]">Horario y breaks del día</p>
            </div>
            <span className="rounded-full bg-[#242424] px-3 py-1 text-[11px] text-[#FF5C00]">
              {day.key}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
                label={`Inicio ${day.label}`}
              type="time"
              value={form.schedule[day.key].startTime}
              onChange={handleDayChange(day.key, 'startTime')}
            />
            <Input
                label={`Fin ${day.label}`}
              type="time"
              value={form.schedule[day.key].endTime}
              onChange={handleDayChange(day.key, 'endTime')}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
                label={`Break inicio ${day.label}`}
              type="time"
              value={form.schedule[day.key].breakStart}
              onChange={handleDayChange(day.key, 'breakStart')}
            />
            <Input
                label={`Break fin ${day.label}`}
              type="time"
              value={form.schedule[day.key].breakEnd}
              onChange={handleDayChange(day.key, 'breakEnd')}
            />
          </div>
        </div>
      ))}
    </div>
  );

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
            <AnimatedContainer animation="slideInLeft" className="rounded-[24px] border border-[#282828] bg-[#121212] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-bold text-white">Empleados</h2>
                  <p className="text-[13px] text-[#8A8A8A]">Seleccioná un profesional para editarlo.</p>
                </div>
                <span className="rounded-full bg-[#242424] px-3 py-1 text-[11px] text-[#FF5C00]">
                  {filteredProfessionals.length} visibles
                </span>
              </div>

              <div className="mt-4">
                <Input
                  label="Buscar"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nombre, email, teléfono o especialidad"
                  helperText="Filtrá rápido la lista antes de editar"
                />
              </div>

              <div className="mt-4 grid gap-3">
                {isLoading ? (
                  <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 text-[13px] text-[#8A8A8A]">
                    Cargando profesionales...
                  </div>
                ) : filteredProfessionals.length === 0 ? (
                  <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 text-[13px] text-[#8A8A8A]">
                    No hay empleados cargados todavía.
                  </div>
                ) : (
                  filteredProfessionals.map((professional) => {
                    const isSelected = selectedProfessionalId === professional._id;
                    return (
                      <motion.div
                        key={professional._id}
                        layout
                        className={`rounded-[18px] border bg-[#1A1A1A] p-4 transition-all ${selectedBadgeClass(isSelected)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-[16px] font-semibold text-white">
                                {professional.name} {professional.lastname}
                              </h3>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] ${professional.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#242424] text-[#8A8A8A]'}`}>
                                {professional.isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <p className="mt-1 text-[12px] text-[#8A8A8A]">{professional.email}</p>
                            <p className="text-[12px] text-[#8A8A8A]">{professional.phone}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-[#8A8A8A]">Slot</p>
                            <p className="text-[14px] font-semibold text-white">{professional.slotDuration} min</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {professional.specialties.slice(0, 4).map((specialty) => (
                            <span
                              key={specialty}
                              className="rounded-full bg-[#242424] px-3 py-1 text-[11px] text-[#8A8A8A]"
                            >
                              {specialty}
                            </span>
                          ))}
                          {professional.specialties.length === 0 && (
                            <span className="rounded-full bg-[#242424] px-3 py-1 text-[11px] text-[#8A8A8A]">
                              Sin especialidades
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" icon={FiEdit3} onClick={() => syncSelection(professional)}>
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={FiCalendar}
                            onClick={() => void handleLoadSlots(professional._id)}
                          >
                            Slots
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={FiTrash2}
                            onClick={() => void handleDelete(professional)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </AnimatedContainer>
          </div>

          <div className="grid gap-6">
            <AnimatedContainer animation="slideInRight" className="rounded-[24px] border border-[#282828] bg-[#121212] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-bold text-white">
                    {selectedProfessional ? 'Editar profesional' : 'Crear profesional'}
                  </h2>
                  <p className="text-[13px] text-[#8A8A8A]">
                    {selectedProfessional
                      ? 'Actualizá datos, disponibilidad y duración del slot.'
                      : 'Completá los datos del empleado y su calendario semanal.'}
                  </p>
                </div>

                {selectedProfessional && (
                  <Button variant="ghost" size="sm" icon={FiPlus} onClick={() => syncSelection(null)}>
                    Nuevo
                  </Button>
                )}
              </div>

              <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Nombre"
                    value={form.name}
                    onChange={handleFieldChange('name')}
                    required
                    placeholder="Juan"
                  />
                  <Input
                    label="Apellido"
                    value={form.lastname}
                    onChange={handleFieldChange('lastname')}
                    required
                    placeholder="Pérez"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={handleFieldChange('email')}
                    required
                    placeholder="juan@barberia.com"
                  />
                  <Input
                    label="Teléfono"
                    value={form.phone}
                    onChange={handleFieldChange('phone')}
                    required
                    placeholder="099123456"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <PasswordInput
                    label={selectedProfessional ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                    value={form.password}
                    onChange={handleFieldChange('password')}
                    required={!selectedProfessional}
                    placeholder={selectedProfessional ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                  />
                  <Input
                    label="Duración del slot"
                    type="number"
                    min={1}
                    value={form.slotDuration}
                    onChange={handleFieldChange('slotDuration')}
                    required
                    placeholder="30"
                    helperText="En minutos. Si no se define, se usa 30"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Especialidades"
                    value={form.specialties}
                    onChange={handleFieldChange('specialties')}
                    placeholder="corte, barba, color"
                    helperText="Separadas por coma"
                  />
                  <Input
                    label="Edad"
                    type="number"
                    min={0}
                    value={form.age}
                    onChange={handleFieldChange('age')}
                    placeholder="28"
                  />
                </div>

                <Input
                  label="Foto de perfil"
                  type="url"
                  value={form.photoUrl}
                  onChange={handleFieldChange('photoUrl')}
                  placeholder="https://..."
                  helperText="Opcional. Si no hay URL, se guarda null."
                />

                <div className="mt-2 rounded-[20px] border border-[#282828] bg-[#1A1A1A] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[16px] font-semibold text-white">Calendario</h3>
                      <p className="text-[12px] text-[#8A8A8A]">
                        Definí horarios y breaks por día.
                      </p>
                    </div>
                    <div className="rounded-full bg-[#242424] px-3 py-1 text-[11px] text-[#8A8A8A]">
                      <FiClock className="mr-2 inline-block text-[#FF5C00]" />
                      {selectedProfessional ? 'Edición' : 'Nuevo'}
                    </div>
                  </div>

                  <div className="mt-4">{renderScheduleEditor()}</div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" icon={FiSave} loading={isSaving}>
                    {selectedProfessional ? 'Guardar cambios' : 'Crear profesional'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => syncSelection(null)}
                  >
                    Limpiar formulario
                  </Button>
                  {selectedProfessional && (
                    <Button
                      type="button"
                      variant="ghost"
                      icon={FiTrash2}
                      onClick={() => void handleDelete(selectedProfessional)}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </form>
            </AnimatedContainer>

            <AnimatedContainer animation="fadeInUp" className="rounded-[24px] border border-[#282828] bg-[#121212] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-bold text-white">Slots disponibles</h2>
                  <p className="text-[13px] text-[#8A8A8A]">
                    Consultá la disponibilidad diaria de un profesional.
                  </p>
                </div>
                <FiCalendar className="text-[#FF5C00]" />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                <Input
                  label="Fecha"
                  type="date"
                  value={slotsDate}
                  onChange={(event) => setSlotsDate(event.target.value)}
                />
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    icon={FiSearch}
                    disabled={!selectedProfessionalId}
                    loading={slotsLoading}
                    onClick={() => {
                      if (!selectedProfessionalId) {
                        setSlotsError('Seleccioná un profesional primero.');
                        return;
                      }
                      setViewingAdminSlots(false);
                      void handleLoadSlots(selectedProfessionalId);
                    }}
                  >
                    Ver slots
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    icon={FiUser}
                    loading={slotsLoading}
                    onClick={() => void handleLoadAdminSlots()}
                  >
                    Mis slots
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-[18px] border border-[#282828] bg-[#1A1A1A] p-4">
                <p className="text-[12px] text-[#8A8A8A]">Profesional seleccionado</p>
                <p className="mt-1 text-[15px] font-semibold text-white">
                  {viewingAdminSlots && authUser
                    ? `${authUser.name} ${authUser.lastname}`
                    : selectedProfessional
                      ? `${selectedProfessional.name} ${selectedProfessional.lastname}`
                      : 'Elegí uno de la lista'}
                </p>
                <p className="text-[12px] text-[#8A8A8A]">
                  {viewingAdminSlots && authUser
                    ? authUser.email
                    : selectedProfessional
                      ? selectedProfessional.email
                      : 'Sin selección'}
                </p>
              </div>

              {slotsError && (
                <p className="mt-4 text-[12px] text-red-400">{slotsError}</p>
              )}

              {availableSlots.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {availableSlots.map((slot) => (
                    <div
                      key={slot}
                      className="rounded-[14px] border border-[#282828] bg-[#1A1A1A] px-3 py-2 text-center text-[13px] text-white"
                    >
                      {slot}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[18px] border border-dashed border-[#282828] bg-[#1A1A1A] p-4 text-[13px] text-[#8A8A8A]">
                  {slotsLoading
                    ? 'Buscando slots...'
                    : 'Todavía no cargaste slots para esta fecha.'}
                </div>
              )}
            </AnimatedContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalsPage;
