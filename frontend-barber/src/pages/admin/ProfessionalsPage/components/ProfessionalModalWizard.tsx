import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiClock, FiPlus, FiSave, FiTrash2, FiUser } from 'react-icons/fi';
import { uploadAvatar } from '../../../../services/upload.service';
import { ImageUpload, Modal, Button, Input, PasswordInput, useToast } from '../../../../components/common';
import type { DayKey, Professional } from '../../../../types/professional';
import {
  createEmptyDay,
  createEmptySchedule,
  days,
  mapScheduleToForm,
  validateSchedule,
  type ScheduleDayForm,
} from '../../utils/schedule-helpers';

const STEPS = [
  { number: 1, title: 'Datos personales', description: 'Identidad y contacto' },
  { number: 2, title: 'Turnos y horarios', description: 'Duración del turno y horario semanal' },
];

const dayLabels: Record<string, string> = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié',
  thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom',
};

type WizardFormState = {
  name: string;
  lastname: string;
  email: string;
  phone: string;
  password: string;
  age: string;
  slotDuration: string;
  photoFile: File | null;
  photoUrl: string;
  schedule: Record<DayKey, ScheduleDayForm>;
};

type ProfessionalModalWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  professional: Professional | null;
  onSave: (data: {
    form: {
      name: string;
      lastname: string;
      email: string;
      phone: string;
      password: string;
      age: string;
      slotDuration: string;
      photoUrl: string;
    };
    schedule: Record<DayKey, ScheduleDayForm>;
  }) => Promise<void>;
};

const createEmptyWizardForm = (): WizardFormState => ({
  name: '',
  lastname: '',
  email: '',
  phone: '',
  password: '',
  age: '',
  slotDuration: '30',
  photoFile: null,
  photoUrl: '',
  schedule: createEmptySchedule(),
});

const wizardFormFromProfessional = (p: Professional): WizardFormState => ({
  name: p.name,
  lastname: p.lastname,
  email: p.email,
  phone: p.phone,
  password: '',
  age: p.age ? String(p.age) : '',
  slotDuration: String(p.slotDuration ?? 30),
  photoFile: null,
  photoUrl: p.photoUrl ?? '',
  schedule: p.schedule ? mapScheduleToForm(p.schedule) : createEmptySchedule(),
});

export const ProfessionalModalWizard: React.FC<ProfessionalModalWizardProps> = ({
  isOpen,
  onClose,
  professional,
  onSave,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormState>(
    professional ? wizardFormFromProfessional(professional) : createEmptyWizardForm()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setStep(1);
      setFormError(null);
      setForm(
        professional ? wizardFormFromProfessional(professional) : createEmptyWizardForm()
      );
    }
  }

  const handleFieldChange = (field: keyof Omit<WizardFormState, 'schedule' | 'photoFile'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleDayChange = (day: DayKey, field: keyof ScheduleDayForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: { ...prev.schedule[day], [field]: value },
        },
      }));
    };

  const toggleDay = (day: DayKey) => {
    setForm((prev) => {
      const current = prev.schedule[day];
      const isActive = Boolean(current.startTime) && Boolean(current.endTime);
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: isActive
            ? createEmptyDay()
            : {
                startTime: current.startTime || '09:00',
                endTime: current.endTime || '18:00',
                breakStart: current.breakStart,
                breakEnd: current.breakEnd,
              },
        },
      };
    });
  };

  const toggleBreak = (day: DayKey) => {
    setForm((prev) => {
      const current = prev.schedule[day];
      const hasBreak = Boolean(current.breakStart) && Boolean(current.breakEnd);
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: {
            ...current,
            breakStart: hasBreak ? '' : (current.breakStart || '12:00'),
            breakEnd: hasBreak ? '' : (current.breakEnd || '13:00'),
          },
        },
      };
    });
  };

  const applyPreset = (preset: 'weekdays' | 'saturday' | 'clear') => {
    setForm((prev) => {
      const newSchedule = { ...prev.schedule };
      if (preset === 'weekdays') {
        days.forEach((d) => {
          if (d.key !== 'saturday' && d.key !== 'sunday') {
            newSchedule[d.key] = { startTime: '09:00', endTime: '18:00', breakStart: '', breakEnd: '' };
          }
        });
      } else if (preset === 'saturday') {
        newSchedule['saturday'] = { startTime: '09:00', endTime: '14:00', breakStart: '', breakEnd: '' };
      } else {
        days.forEach((d) => {
          newSchedule[d.key] = createEmptyDay();
        });
      }
      return { ...prev, schedule: newSchedule };
    });
  };

  const handlePhotoFileSelect = (file: File | null) => {
    setForm((prev) => ({ ...prev, photoFile: file, photoUrl: file ? '' : prev.photoUrl }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.name.trim() || !form.lastname.trim() || !form.email.trim() || !form.phone.trim()) {
      const message = 'Completá nombre, apellido, email y teléfono para continuar.';
      setFormError(message);
      showToast(message, 'error');
      return;
    }

    const scheduleError = validateSchedule(form.schedule);
    if (scheduleError) {
      setFormError(scheduleError);
      showToast(scheduleError, 'error');
      return;
    }

    const slotDuration = Number(form.slotDuration || 30);
    if (!Number.isInteger(slotDuration) || slotDuration < 1) {
      const message = 'La duración de turnos debe ser un número entero mayor o igual a 1.';
      setFormError(message);
      showToast(message, 'error');
      return;
    }

    setIsSaving(true);
    try {
      let photoUrl = form.photoUrl;

      if (form.photoFile) {
        photoUrl = await uploadAvatar(form.photoFile, form.photoUrl || undefined);
      }

      await onSave({
        form: {
          name: form.name.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password.trim(),
          age: form.age,
          slotDuration: form.slotDuration,
          photoUrl,
        },
        schedule: form.schedule,
      });
      onClose();
    } catch {
      setFormError('No se pudieron guardar los cambios. Revisá el mensaje de error y volvé a intentar.');
    } finally {
      setIsSaving(false);
    }
  };

  const isLastStep = step === STEPS.length;
  const title = professional ? 'Editar barbero' : 'Nuevo barbero';

  const activeDaysCount = days.filter(
    (d) => form.schedule[d.key].startTime && form.schedule[d.key].endTime
  ).length;

  const scheduleSummary = days
    .filter((d) => form.schedule[d.key].startTime && form.schedule[d.key].endTime)
    .map((d) => `${dayLabels[d.key]} ${form.schedule[d.key].startTime}-${form.schedule[d.key].endTime}`)
    .join(' · ');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="mb-5 rounded-[12px] border border-[#242424] bg-[#171717] px-4 py-3">
        <p className="text-[12px] font-medium text-[#B9B9B9]">Configurá la información del profesional en dos pasos.</p>
        <p className="mt-1 text-[11px] text-[#707070]">Podés volver a cualquier paso anterior sin perder los cambios.</p>
      </div>

      {formError && (
        <div className="mb-5 rounded-[12px] border border-red-500/25 bg-red-500/[0.07] px-4 py-3" role="alert">
          <p className="text-[12px] font-medium text-red-200">Revisá la información antes de guardar</p>
          <p className="mt-1 text-[11px] text-red-200/70">{formError}</p>
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-7 flex items-center gap-0" aria-label="Pasos del formulario">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.number}>
            <button
              type="button"
              onClick={() => s.number <= step && setStep(s.number)}
              disabled={s.number > step}
              aria-current={step === s.number ? 'step' : undefined}
              className={`flex min-w-0 items-center gap-2 rounded-full px-2 py-1.5 text-[11px] font-medium transition-all duration-200 sm:px-3 ${
                step === s.number
                  ? 'bg-[#FF5C00] text-white shadow-[0_0_10px_rgba(255,92,0,0.3)]'
                  : step > s.number
                    ? 'bg-[#22C55E]/20 text-[#22C55E]'
                    : 'cursor-not-allowed bg-[#242424] text-[#555]'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step === s.number
                  ? 'bg-white/20 text-white'
                  : step > s.number
                    ? 'bg-[#22C55E] text-white'
                    : 'bg-[#1A1A1A] text-[#555]'
              }`}>
                {s.number}
              </span>
              <span className="hidden truncate sm:inline">{s.title}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 ${
                step > s.number ? 'bg-[#22C55E]/40' : 'bg-[#282828]'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      {step === 1 && (
        <div className="grid gap-4" aria-label="Datos personales">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-white">
            <FiUser className="h-4 w-4 text-[#FF8A4C]" aria-hidden="true" />
            Información básica
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nombre" value={form.name} onChange={handleFieldChange('name')} required placeholder="Juan" />
            <Input label="Apellido" value={form.lastname} onChange={handleFieldChange('lastname')} required placeholder="Pérez" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Email" type="email" value={form.email} onChange={handleFieldChange('email')} required placeholder="juan@barberia.com" />
            <Input label="Teléfono" value={form.phone} onChange={handleFieldChange('phone')} required placeholder="598 91 234 567" />
          </div>
          <PasswordInput
            label={professional ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            value={form.password}
            onChange={handleFieldChange('password')}
            required={!professional}
            placeholder={professional ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres, mayúscula, minúscula y número'}
          />
          <Input label="Edad" type="number" min={0} value={form.age} onChange={handleFieldChange('age')} placeholder="28" />

          <div>
            <p className="mb-2 text-[13px] font-medium text-white">Foto de perfil</p>
            <ImageUpload
              currentUrl={form.photoUrl}
              onFileSelect={handlePhotoFileSelect}
              helperText={form.photoFile ? 'Archivo seleccionado.' : 'Arrastrá una imagen o hacé clic para subir'}
            />
          </div>
          <p className="-mt-2 text-[11px] text-[#666]">La foto ayuda a reconocer rápidamente al profesional en el calendario.</p>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4" aria-label="Turnos y horarios">
          <div className="rounded-[12px] border border-[#242424] bg-[#171717] p-4">
            <div className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-white">
              <FiClock className="h-4 w-4 text-[#FF8A4C]" aria-hidden="true" />
              Configuración de reservas
            </div>
            <Input
              label="Duración del turno"
              type="number"
              min={1}
              value={form.slotDuration}
              onChange={handleFieldChange('slotDuration')}
              required
              placeholder="30"
              helperText="En minutos. Define cuánto dura cada turno disponible."
            />
          </div>

          <div className="rounded-[12px] border border-[#242424] bg-[#171717] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FiClock className="h-4 w-4 text-[#FF5C00]" aria-hidden="true" />
                <div>
                  <h3 className="text-[14px] font-semibold text-white">Horario semanal</h3>
                  <p className="text-[11px] text-[#707070]">
                    <span className="font-semibold text-[#FF5C00]">{activeDaysCount}</span> de {days.length} días con horario
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('weekdays')}
                  className="rounded-[8px] border border-[#282828] px-3 py-1.5 text-[11px] text-[#8A8A8A] transition-colors hover:border-[#FF5C00]/40 hover:text-[#FF5C00]"
                >
                  Lun a Vie
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('saturday')}
                  className="rounded-[8px] border border-[#282828] px-3 py-1.5 text-[11px] text-[#8A8A8A] transition-colors hover:border-[#FF5C00]/40 hover:text-[#FF5C00]"
                >
                  Sábado
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('clear')}
                  className="rounded-[8px] border border-[#282828] px-3 py-1.5 text-[11px] text-red-400/80 transition-colors hover:border-red-500/40 hover:text-red-400"
                >
                  Limpiar todo
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {days.map((day) => {
                const isActive = Boolean(form.schedule[day.key].startTime) && Boolean(form.schedule[day.key].endTime);
                const hasBreak = Boolean(form.schedule[day.key].breakStart) && Boolean(form.schedule[day.key].breakEnd);
                return (
                  <div key={day.key} className="overflow-hidden rounded-[14px] border border-[#282828] bg-[#151515]">
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-bold ${
                          isActive ? 'bg-[#FF5C00]/15 text-[#FF5C00]' : 'bg-[#242424] text-[#8A8A8A]'
                        }`}>
                          {dayLabels[day.key]}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-white">{day.label}</p>
                          {isActive && (
                            <p className="truncate text-[11px] text-[#8A8A8A]">
                              {form.schedule[day.key].startTime} - {form.schedule[day.key].endTime}
                              {hasBreak && ` · Break ${form.schedule[day.key].breakStart} - ${form.schedule[day.key].breakEnd}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        aria-label={`${isActive ? 'Desactivar' : 'Activar'} horario de ${day.label}`}
                        onClick={() => toggleDay(day.key)}
                        className={`relative inline-flex h-[24px] w-[44px] shrink-0 items-center rounded-full transition-colors ${
                          isActive ? 'bg-[#FF5C00]' : 'bg-[#282828]'
                        }`}
                      >
                        <span className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform ${
                          isActive ? 'translate-x-[23px]' : 'translate-x-[3px]'
                        }`} />
                      </button>
                    </div>

                    {isActive && (
                      <div className="border-t border-[#282828] px-4 py-3">
                        <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
                          <span className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">Horario</span>
                          <input
                            type="time"
                            aria-label={`Inicio ${day.label}`}
                            value={form.schedule[day.key].startTime}
                            onChange={handleDayChange(day.key, 'startTime')}
                            className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 py-2 text-[13px] text-white outline-none transition-colors focus:border-[#FF5C00]"
                          />
                          <input
                            type="time"
                            aria-label={`Fin ${day.label}`}
                            value={form.schedule[day.key].endTime}
                            onChange={handleDayChange(day.key, 'endTime')}
                            className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 py-2 text-[13px] text-white outline-none transition-colors focus:border-[#FF5C00]"
                          />
                        </div>

                        <div className="mt-3">
                          {hasBreak ? (
                            <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center">
                              <span className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">Break</span>
                              <input
                                type="time"
                                aria-label={`Break inicio ${day.label}`}
                                value={form.schedule[day.key].breakStart}
                                onChange={handleDayChange(day.key, 'breakStart')}
                                className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 py-2 text-[13px] text-white outline-none transition-colors focus:border-[#FF5C00]"
                              />
                              <input
                                type="time"
                                aria-label={`Break fin ${day.label}`}
                                value={form.schedule[day.key].breakEnd}
                                onChange={handleDayChange(day.key, 'breakEnd')}
                                className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 py-2 text-[13px] text-white outline-none transition-colors focus:border-[#FF5C00]"
                              />
                              <button
                                type="button"
                                onClick={() => toggleBreak(day.key)}
                                className="inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-red-500/30 px-2.5 py-2 text-[11px] text-red-400 transition-colors hover:border-red-500/60 hover:text-red-300"
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                                Quitar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleBreak(day.key)}
                              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#282828] px-3 py-2 text-[12px] text-[#8A8A8A] transition-colors hover:border-[#FF5C00]/40 hover:text-[#FF5C00]"
                            >
                              <FiPlus className="h-3.5 w-3.5" />
                              Agregar break
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-[12px] text-[#8A8A8A]">
              {scheduleSummary || 'Todavía no configuraste ningún horario. Usá los accesos rápidos o activá cada día.'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-7 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#282828] pt-5 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          {step > 1 && (
            <Button type="button" variant="secondary" icon={FiChevronLeft} onClick={() => setStep((s) => s - 1)}>
              Anterior
            </Button>
          )}
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
          </Button>
          {!isLastStep ? (
            <Button type="button" icon={FiChevronRight} iconPosition="right" onClick={() => setStep((s) => s + 1)}>
              Siguiente
            </Button>
          ) : (
            <Button icon={FiSave} loading={isSaving} onClick={handleSubmit}>
              {professional ? 'Guardar cambios' : 'Crear barbero'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
