import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCalendar, FiChevronDown, FiChevronUp, FiSave, FiSettings, FiUser } from 'react-icons/fi';
import { AnimatedContainer, BarberAvatar, Button, ImageUpload, Input, PasswordInput, Spinner } from '../../../components/common';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { updateCurrentUser } from '../../../store/slices/authSlice';
import { fetchBarbers, updateBarberMe } from '../../../store/slices/barbersSlice';
import type { DayKey } from '../../../types/professional';
import {
  createEmptySchedule,
  days,
  mapScheduleToForm,
  normalizeServices,
  scheduleFromForm,
  validateSchedule,
  type ScheduleDayForm,
} from '../../admin/utils/schedule-helpers';

const roleTitle: Record<string, string> = {
  Admin: 'Administrador',
  Empleado: 'Barbero',
  Registrado: 'Mi perfil',
};

const dayLabels: Record<string, string> = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié',
  thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom',
};

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const barbers = useAppSelector((state) => state.barbers.list);
  const barbersLoading = useAppSelector((state) => state.barbers.isLoading);

  const role = authUser?.kind;
  const isBarber = role === 'Admin' || role === 'Empleado';

  const barberData = useMemo(() => {
    if (!authUser || !isBarber) return null;
    return barbers.find((b) => b.id === authUser.id) ?? null;
  }, [authUser, barbers, isBarber]);

  const [activeTab, setActiveTab] = useState<'personal' | 'agenda'>('personal');
  const [password, setPassword] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [editedFields, setEditedFields] = useState<Record<string, unknown>>({});
  const [editedSchedule, setEditedSchedule] = useState<Record<DayKey, ScheduleDayForm> | null>(null);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [barberConfigExpanded, setBarberConfigExpanded] = useState(false);

  useEffect(() => {
    if (isBarber && barbers.length === 0 && !barbersLoading) {
      dispatch(fetchBarbers());
    }
  }, [dispatch, isBarber, barbers.length, barbersLoading]);

  const formData = useMemo(() => {
    if (!authUser) return null;

    if (isBarber) {
      if (!barberData) return null;
      return { ...barberData, ...editedFields } as Record<string, unknown>;
    }

    return {
      id: authUser.id,
      name: editedFields.name ?? authUser.name,
      lastname: editedFields.lastname ?? authUser.lastname,
      email: editedFields.email ?? authUser.email,
      phone: editedFields.phone ?? authUser.phone,
      photoUrl: editedFields.photoUrl ?? authUser.photoUrl ?? null,
    };
  }, [authUser, barberData, editedFields, isBarber]);

  const schedule = useMemo(() => {
    if (!isBarber) return createEmptySchedule();
    if (editedSchedule) return editedSchedule;
    if (barberData?.schedule) return mapScheduleToForm(barberData.schedule);
    return createEmptySchedule();
  }, [isBarber, editedSchedule, barberData]);

  const isLoading = !authUser || (isBarber && barbers.length === 0 && barbersLoading);

  const scheduleSummary = isBarber ? days
    .filter((d) => schedule[d.key].startTime && schedule[d.key].endTime)
    .map((d) => {
      const day = schedule[d.key];
      return `${dayLabels[d.key]} ${day.startTime}-${day.endTime}`;
    })
    .join(' · ') : '';

  const handleFieldChange = (field: string) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEditedFields((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleDayChange = (day: DayKey, field: keyof ScheduleDayForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      const base = editedSchedule ?? (barberData?.schedule ? mapScheduleToForm(barberData.schedule) : createEmptySchedule());
      setEditedSchedule({
        ...base,
        [day]: {
          ...base[day],
          [field]: value,
        },
      });
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData) return;

    setPageError(null);
    setPageMessage(null);

    if (isBarber) {
      const scheduleError = validateSchedule(schedule);
      if (scheduleError) {
        setPageError(scheduleError);
        return;
      }

      const slotDuration = Number(formData.slotDuration || 30);
      if (!Number.isInteger(slotDuration) || slotDuration < 1) {
        setPageError('La duración del slot debe ser un número entero mayor o igual a 1.');
        return;
      }
    }

    setIsSaving(true);

    try {
      if (isBarber) {
        const payload: Record<string, unknown> = {
          email: String(formData.email ?? '').trim(),
          password: password.trim() || undefined,
          name: String(formData.name ?? '').trim(),
          lastname: String(formData.lastname ?? '').trim(),
          phone: String(formData.phone ?? '').trim(),
          services: formData.services,
          age: formData.age ?? null,
          photoUrl: formData.photoUrl ?? null,
          slotDuration: Number(formData.slotDuration ?? 30),
          maxAdvanceDays: formData.maxAdvanceDays,
        };

        if (editedSchedule) {
          payload.schedule = scheduleFromForm(editedSchedule);
        }

        await dispatch(updateBarberMe(payload)).unwrap();
        setPassword('');
        setPageMessage('Perfil actualizado con éxito.');
      } else {
        await dispatch(updateCurrentUser({
          email: String(formData.email ?? '').trim() || undefined,
          password: password.trim() || undefined,
          name: String(formData.name ?? '').trim() || undefined,
          lastname: String(formData.lastname ?? '').trim() || undefined,
          phone: String(formData.phone ?? '').trim() || undefined,
          photoUrl: formData.photoUrl != null ? String(formData.photoUrl).trim() || null : undefined,
        })).unwrap();
        setPassword('');
        setPageMessage('Perfil actualizado con éxito.');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al guardar el perfil';
      if (msg.includes('409') || msg.toLowerCase().includes('email en uso')) {
        setPageError('El email ya está en uso');
      } else {
        setPageError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-red-400">No se pudo cargar el perfil.</p>
      </div>
    );
  }

  const title = role ? roleTitle[role] ?? 'Perfil' : 'Perfil';
  const displayName = isBarber
    ? `${String(formData.name ?? '')} ${String(formData.lastname ?? '')}`
    : `${String(formData.name ?? '')} ${String(formData.lastname ?? '')}`;

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6 shadow-[0_0_20px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <BarberAvatar
                name={String(formData.name ?? '')}
                lastname={String(formData.lastname ?? '')}
                photoUrl={formData.photoUrl ? String(formData.photoUrl) : null}
                size="lg"
              />
              <div>
                <h1 className="text-[32px] font-extrabold tracking-[-0.02em] text-white sm:text-[38px]">
                  {displayName}
                </h1>
                <p className="text-[14px] text-[#8A8A8A]">{title}</p>
              </div>
            </div>

            <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate(-1)}>
              Volver
            </Button>
          </div>
        </AnimatedContainer>

        {(pageError || pageMessage) && (
          <AnimatedContainer animation="fadeIn" className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] px-4 py-3">
            <p className={`text-[13px] ${pageError ? 'text-red-400' : 'text-green-400'}`}>
              {pageError || pageMessage}
            </p>
          </AnimatedContainer>
        )}

        <AnimatedContainer animation="fadeInUp" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex gap-1 mb-6 rounded-[12px] bg-[#1A1A1A] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-[12px] font-medium transition-all duration-200 ${
                activeTab === 'personal' ? 'bg-[#FF5C00] text-white shadow-sm' : 'text-[#8A8A8A] hover:text-white'
              }`}
            >
              <FiUser className="w-4 h-4" />
              Información personal
            </button>
            {isBarber && (
              <button
                type="button"
                onClick={() => setActiveTab('agenda')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-[12px] font-medium transition-all duration-200 ${
                  activeTab === 'agenda' ? 'bg-[#FF5C00] text-white shadow-sm' : 'text-[#8A8A8A] hover:text-white'
                }`}
              >
                <FiCalendar className="w-4 h-4" />
                Configuración de agenda
              </button>
            )}
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            {activeTab === 'personal' && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Nombre" value={String(formData.name ?? '')} onChange={handleFieldChange('name')} required placeholder="Nombre" />
                  <Input label="Apellido" value={String(formData.lastname ?? '')} onChange={handleFieldChange('lastname')} required placeholder="Apellido" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Email" type="email" value={String(formData.email ?? '')} onChange={handleFieldChange('email')} required placeholder="email@ejemplo.com" />
                  <Input label="Teléfono" value={String(formData.phone ?? '')} onChange={handleFieldChange('phone')} required placeholder="099000000" />
                </div>
                <PasswordInput label="Nueva contraseña (opcional)" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Dejar vacío para no cambiar" />
                <ImageUpload
                  currentUrl={formData.photoUrl ? String(formData.photoUrl) : null}
                  onFileSelect={(file) => {
                    if (file) setEditedFields((prev) => ({ ...prev, photoUrl: null }));
                  }}
                  helperText="Arrastrá una imagen o hacé clic para subir"
                />
              </>
            )}

            {activeTab === 'agenda' && isBarber && (
              <div className="grid gap-4">
                <div className="rounded-[20px] border border-[#282828] bg-[#1A1A1A] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FiSettings className="w-4 h-4 text-[#FF5C00]" />
                      <div>
                        <h3 className="text-[14px] font-semibold text-white">Configuración de barbero</h3>
                        <p className="text-[11px] text-[#8A8A8A]">{barberConfigExpanded ? 'Duración, servicios y datos personales' : 'Slot, servicios, edad y más'}</p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" icon={barberConfigExpanded ? FiChevronUp : FiChevronDown} onClick={() => setBarberConfigExpanded(!barberConfigExpanded)}>
                      {barberConfigExpanded ? 'Colapsar' : 'Expandir'}
                    </Button>
                  </div>

                  {barberConfigExpanded && (
                    <div className="mt-4 grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input label="Duración del slot" type="number" min={1} value={String(formData.slotDuration ?? 30)} onChange={(e) => setEditedFields((prev) => ({ ...prev, slotDuration: Number(e.target.value) || 30 }))} required placeholder="30" helperText="En minutos" />
                        <Input label="Días máximos para reservar" type="number" min={1} value={String(formData.maxAdvanceDays ?? 30)} onChange={(e) => setEditedFields((prev) => ({ ...prev, maxAdvanceDays: Number(e.target.value) || 30 }))} required placeholder="30" helperText="Anticipación máxima" />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input label="Servicios" value={String(formData.services ? (formData.services as string[]).join(', ') : '')} onChange={(e) => setEditedFields((prev) => ({ ...prev, services: normalizeServices(e.target.value) }))} placeholder="corte, barba, color" helperText="Separadas por coma" />
                        <Input label="Edad" type="number" min={0} value={formData.age ? String(formData.age) : ''} onChange={(e) => setEditedFields((prev) => ({ ...prev, age: e.target.value ? Number(e.target.value) : undefined }))} placeholder="30" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] border border-[#282828] bg-[#1A1A1A] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[14px] font-semibold text-white">Calendario</h3>
                      <p className="text-[11px] text-[#8A8A8A]">{scheduleExpanded ? 'Definí horarios y breaks por día.' : 'Horario semanal.'}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" icon={scheduleExpanded ? FiChevronUp : FiChevronDown} onClick={() => setScheduleExpanded(!scheduleExpanded)}>
                      {scheduleExpanded ? 'Colapsar' : 'Expandir'}
                    </Button>
                  </div>

                  {scheduleExpanded ? (
                    <div className="mt-4 grid gap-4">
                      {days.map((day) => (
                        <div key={day.key} className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 grid gap-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-[14px] font-semibold text-white">{day.label}</p>
                              <p className="text-[11px] text-[#8A8A8A]">Horario y breaks del día</p>
                            </div>
                            <span className="rounded-full bg-[#242424] px-3 py-1 text-[11px] text-[#FF5C00]">{day.key}</span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input label={`Inicio ${day.label}`} type="time" value={schedule[day.key].startTime} onChange={handleDayChange(day.key, 'startTime')} />
                            <Input label={`Fin ${day.label}`} type="time" value={schedule[day.key].endTime} onChange={handleDayChange(day.key, 'endTime')} />
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input label={`Break inicio ${day.label}`} type="time" value={schedule[day.key].breakStart} onChange={handleDayChange(day.key, 'breakStart')} />
                            <Input label={`Break fin ${day.label}`} type="time" value={schedule[day.key].breakEnd} onChange={handleDayChange(day.key, 'breakEnd')} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4">
                      {scheduleSummary ? (
                        <p className="text-[13px] text-[#8A8A8A] leading-relaxed">{scheduleSummary}</p>
                      ) : (
                        <p className="text-[13px] text-[#8A8A8A] italic">Sin horarios cargados.</p>
                      )}
                      <p className="mt-2 text-[11px] text-[#555]">{days.filter((d) => schedule[d.key].startTime).length}/7 días con horario</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" icon={FiSave} loading={isSaving}>
                Guardar perfil
              </Button>
            </div>
          </form>
        </AnimatedContainer>
      </div>
    </div>
  );
};

export default ProfilePage;
