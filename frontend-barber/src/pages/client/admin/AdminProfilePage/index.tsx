import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiSave, FiScissors, FiShield } from 'react-icons/fi';
import { AnimatedContainer, Button, Input, PasswordInput } from '../../../../components/common';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchUserProfile } from '../../../../store/slices/authSlice';
import { updateBarber, updateBarberSchedule } from '../../../../store/slices/barbersSlice';
import type { DayKey, Professional, ProfessionalUpdatePayload } from '../../../../types/professional';
import {
  createEmptySchedule,
  days,
  mapScheduleToForm,
  normalizeServices,
  scheduleFromForm,
  validateSchedule,
  type ScheduleDayForm,
} from '../../admin/utils/schedule-helpers';

export const AdminProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [formData, setFormData] = useState<Professional | null>(null);
  const [password, setPassword] = useState('');
  const [schedule, setSchedule] = useState<Record<DayKey, ScheduleDayForm>>(createEmptySchedule());
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(user);
      setSchedule(mapScheduleToForm(user.schedule));
      setIsLoading(false);
    } else {
      dispatch(fetchUserProfile());
    }
  }, [user, dispatch]);

  const handleFieldChange = (field: keyof Pick<Professional, 'name' | 'lastname' | 'email' | 'phone'>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!formData) return;
      setFormData({ ...formData, [field]: event.target.value });
    };

  const handleDayChange = (day: DayKey, field: keyof ScheduleDayForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSchedule((prev) => ({
        ...prev,
        [day]: { ...prev[day], [field]: value },
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData) return;

    setPageError(null);
    setPageMessage(null);

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

    setIsSaving(true);

    try {
      const updatePayload: ProfessionalUpdatePayload = {
        email: formData.email.trim(),
        password: password.trim() || undefined,
        name: formData.name.trim(),
        lastname: formData.lastname.trim(),
        phone: formData.phone.trim(),
        services: formData.services,
        age: formData.age ?? null,
        photoUrl: formData.photoUrl ?? null,
        slotDuration,
      };

      await dispatch(updateBarber({ id: formData.id, data: updatePayload })).unwrap();
      await dispatch(updateBarberSchedule({ id: formData.id, schedule: scheduleFromForm(schedule) })).unwrap();
      await dispatch(fetchUserProfile());
      setPassword('');
      setPageMessage('Perfil actualizado con éxito.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Error al guardar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-[#8A8A8A]">Cargando perfil...</p>
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

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#FF5C00]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#FF5C00]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6 shadow-[0_0_20px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#FF5C00]/10 overflow-hidden">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt={`${formData.name} ${formData.lastname}`}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="p-3">
                    <FiShield className="text-[#FF5C00] text-xl" />
                  </div>
                )}
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-4 py-2 text-[12px] text-[#8A8A8A]">
                  <FiScissors className="text-[#FF5C00]" />
                  Mi perfil
                </div>
                <h1 className="mt-2 text-[32px] font-extrabold tracking-[-0.02em] text-white sm:text-[38px]">
                  {formData.name} {formData.lastname}
                </h1>
                <p className="text-[14px] text-[#8A8A8A]">Administrador de la barbería</p>
              </div>
            </div>

            <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/profesionales')}>
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
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nombre"
                value={formData.name}
                onChange={handleFieldChange('name')}
                required
                placeholder="Admin"
              />
              <Input
                label="Apellido"
                value={formData.lastname}
                onChange={handleFieldChange('lastname')}
                required
                placeholder="Barber"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleFieldChange('email')}
                required
                placeholder="admin@barberia.com"
              />
              <Input
                label="Teléfono"
                value={formData.phone}
                onChange={handleFieldChange('phone')}
                required
                placeholder="099000000"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PasswordInput
                label="Nueva contraseña (opcional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar vacío para no cambiar"
              />
              <Input
                label="Duración del slot"
                type="number"
                min={1}
                value={String(formData.slotDuration ?? 30)}
                onChange={(e) =>
                  setFormData({ ...formData, slotDuration: Number(e.target.value) || 30 })
                }
                required
                placeholder="30"
                helperText="En minutos"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Servicios"
                value={formData.services.join(', ')}
                onChange={(e) =>
                  setFormData({ ...formData, services: normalizeServices(e.target.value) })
                }
                placeholder="corte, barba, color"
                helperText="Separadas por coma"
              />
              <Input
                label="Edad"
                type="number"
                min={0}
                value={formData.age ? String(formData.age) : ''}
                onChange={(e) =>
                  setFormData({ ...formData, age: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="30"
              />
            </div>

            <Input
              label="Foto de perfil"
              type="url"
              value={formData.photoUrl ?? ''}
              onChange={(e) =>
                setFormData({ ...formData, photoUrl: e.target.value.trim() || null })
              }
              placeholder="https://..."
              helperText="Opcional"
            />

            <div className="mt-2 rounded-[20px] border border-[#282828] bg-[#1A1A1A] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-white">Calendario</h3>
                  <p className="text-[12px] text-[#8A8A8A]">Definí horarios y breaks por día.</p>
                </div>
                <div className="rounded-full bg-[#242424] px-3 py-1 text-[11px] text-[#8A8A8A]">
                  <FiClock className="mr-2 inline-block text-[#FF5C00]" />
                  Mi horario
                </div>
              </div>

              <div className="mt-4 grid gap-4">
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
                        value={schedule[day.key].startTime}
                        onChange={handleDayChange(day.key, 'startTime')}
                      />
                      <Input
                        label={`Fin ${day.label}`}
                        type="time"
                        value={schedule[day.key].endTime}
                        onChange={handleDayChange(day.key, 'endTime')}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label={`Break inicio ${day.label}`}
                        type="time"
                        value={schedule[day.key].breakStart}
                        onChange={handleDayChange(day.key, 'breakStart')}
                      />
                      <Input
                        label={`Break fin ${day.label}`}
                        type="time"
                        value={schedule[day.key].breakEnd}
                        onChange={handleDayChange(day.key, 'breakEnd')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" icon={FiSave} loading={isSaving}>
                Guardar perfil
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/admin/profesionales')}
              >
                Volver
              </Button>
            </div>
          </form>
        </AnimatedContainer>
      </div>
    </div>
  );
};

export default AdminProfilePage;
