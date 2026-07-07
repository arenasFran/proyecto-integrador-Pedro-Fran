import React, { useState, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight, FiSave } from 'react-icons/fi';
import { uploadAvatar } from '../../../../services/upload.service';
import { ImageUpload, Modal, Button, Input, PasswordInput, useToast } from '../../../../components/common';
import type { DayKey, Professional } from '../../../../types/professional';
import {
  createEmptySchedule,
  days,
  mapScheduleToForm,
  validateSchedule,
  type ScheduleDayForm,
} from '../../utils/schedule-helpers';

const STEPS = [
  { number: 1, title: 'Datos personales' },
  { number: 2, title: 'Servicios' },
  { number: 3, title: 'Horarios' },
];

const dayKeys: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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
      services: string;
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
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setStep(1);
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

  const handleScheduleShortcut = useCallback(
    (action: 'copyToNext' | 'copyToAll' | 'copyToWeekdays', sourceDay: DayKey) => {
      setForm((prev) => {
        const source = prev.schedule[sourceDay];
        if (!source) return prev;
        const newSchedule = { ...prev.schedule };
        const weekdays: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        if (action === 'copyToNext') {
          const idx = dayKeys.indexOf(sourceDay);
          const nextKey = dayKeys[idx + 1];
          if (nextKey) newSchedule[nextKey] = { ...source };
        } else {
          const targetDays = action === 'copyToAll' ? dayKeys : weekdays;
          targetDays.forEach((day) => { newSchedule[day] = { ...source }; });
        }
        return { ...prev, schedule: newSchedule };
      });
    },
    []
  );

  const applyPreset = (preset: 'weekdays' | 'saturday' | 'clear') => {
    setForm((prev) => {
      const newSchedule = { ...prev.schedule };
      if (preset === 'weekdays') {
        const weekdays: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        weekdays.forEach((day) => {
          newSchedule[day] = { startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' };
        });
      } else if (preset === 'saturday') {
        newSchedule['saturday'] = { startTime: '09:00', endTime: '13:00', breakStart: '', breakEnd: '' };
      } else if (preset === 'clear') {
        dayKeys.forEach((day) => {
          newSchedule[day] = { startTime: '', endTime: '', breakStart: '', breakEnd: '' };
        });
      }
      return { ...prev, schedule: newSchedule };
    });
  };

  const handlePhotoFileSelect = (file: File | null) => {
    setForm((prev) => ({ ...prev, photoFile: file, photoUrl: file ? '' : prev.photoUrl }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.lastname.trim() || !form.email.trim() || !form.phone.trim()) {
      showToast('Completá todos los campos obligatorios.', 'error');
      return;
    }

    const scheduleError = validateSchedule(form.schedule);
    if (scheduleError) {
      showToast(scheduleError, 'error');
      return;
    }

    const slotDuration = Number(form.slotDuration || 30);
    if (!Number.isInteger(slotDuration) || slotDuration < 1) {
      showToast('La duración de turnos debe ser un número entero mayor o igual a 1.', 'error');
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
          services: '',
        },
        schedule: form.schedule,
      });
      onClose();
    } catch {
      // handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const isLastStep = step === STEPS.length;
  const title = professional ? 'Editar barbero' : 'Nuevo barbero';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.number}>
            <button
              type="button"
              onClick={() => setStep(s.number)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                step === s.number
                  ? 'bg-[#FF5C00] text-white shadow-[0_0_10px_rgba(255,92,0,0.3)]'
                  : step > s.number
                    ? 'bg-[#22C55E]/20 text-[#22C55E]'
                    : 'bg-[#242424] text-[#555]'
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
              <span className="hidden sm:inline">{s.title}</span>
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
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nombre" value={form.name} onChange={handleFieldChange('name')} required placeholder="Juan" />
            <Input label="Apellido" value={form.lastname} onChange={handleFieldChange('lastname')} required placeholder="Pérez" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Email" type="email" value={form.email} onChange={handleFieldChange('email')} required placeholder="juan@barberia.com" />
            <Input label="Teléfono" value={form.phone} onChange={handleFieldChange('phone')} required placeholder="099123456" />
          </div>
          <PasswordInput
            label={professional ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            value={form.password}
            onChange={handleFieldChange('password')}
            required={!professional}
            placeholder={professional ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
          />
          <Input label="Edad" type="number" min={0} value={form.age} onChange={handleFieldChange('age')} placeholder="28" />

          <ImageUpload
            currentUrl={form.photoUrl}
            onFileSelect={handlePhotoFileSelect}
            helperText={form.photoFile ? 'Archivo seleccionado.' : 'Arrastrá una imagen o hacé clic para subir'}
          />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <Input
            label="Duración de turnos"
            type="number"
            min={1}
            value={form.slotDuration}
            onChange={handleFieldChange('slotDuration')}
            required
            placeholder="30"
            helperText="En minutos. Define cada cuánto tiempo se genera un slot disponible."
          />
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => applyPreset('clear')}>
              Limpiar todo
            </Button>
          </div>

          {/* Schedule table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#282828]">
                  <th className="text-left py-2 pr-3 text-[#8A8A8A] font-medium">Día</th>
                  <th className="text-left py-2 px-2 text-[#8A8A8A] font-medium">Inicio</th>
                  <th className="text-left py-2 px-2 text-[#8A8A8A] font-medium">Fin</th>
                  <th className="text-left py-2 px-2 text-[#8A8A8A] font-medium">Break inicio</th>
                  <th className="text-left py-2 px-2 text-[#8A8A8A] font-medium">Break fin</th>
                  <th className="py-2 pl-2" />
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.key} className="border-b border-[#282828]/50 hover:bg-[#1A1A1A]/50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className="text-white font-medium">{day.label}</span>
                      <span className="ml-1.5 text-[10px] text-[#555]">{dayLabels[day.key]}</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="time"
                        value={form.schedule[day.key].startTime}
                        onChange={handleDayChange(day.key, 'startTime')}
                        className="w-full bg-[#1A1A1A] border border-[#282828] rounded-[8px] px-2 py-1.5 text-[13px] text-white outline-none focus:border-[#FF5C00] transition-colors"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="time"
                        value={form.schedule[day.key].endTime}
                        onChange={handleDayChange(day.key, 'endTime')}
                        className="w-full bg-[#1A1A1A] border border-[#282828] rounded-[8px] px-2 py-1.5 text-[13px] text-white outline-none focus:border-[#FF5C00] transition-colors"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="time"
                        value={form.schedule[day.key].breakStart}
                        onChange={handleDayChange(day.key, 'breakStart')}
                        className="w-full bg-[#1A1A1A] border border-[#282828] rounded-[8px] px-2 py-1.5 text-[13px] text-white outline-none focus:border-[#FF5C00] transition-colors"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="time"
                        value={form.schedule[day.key].breakEnd}
                        onChange={handleDayChange(day.key, 'breakEnd')}
                        className="w-full bg-[#1A1A1A] border border-[#282828] rounded-[8px] px-2 py-1.5 text-[13px] text-white outline-none focus:border-[#FF5C00] transition-colors"
                      />
                    </td>
                    <td className="py-2.5 pl-2">
                      {day.key !== 'sunday' && (
                        <button
                          type="button"
                          onClick={() => handleScheduleShortcut('copyToNext', day.key)}
                          className="text-[11px] text-[#555] hover:text-[#FF5C00] transition-colors whitespace-nowrap"
                          title={`Copiar a ${dayLabels[dayKeys[dayKeys.indexOf(day.key) + 1]]}`}
                        >
                          Copiar →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-between gap-3 pt-6 border-t border-[#282828]">
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
