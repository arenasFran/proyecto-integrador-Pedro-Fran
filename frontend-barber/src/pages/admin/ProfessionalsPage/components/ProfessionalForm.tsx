import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { AnimatedContainer, Button, Input, PasswordInput } from '../../../../components/common';
import type { DayKey, Professional } from '../../../../types/professional';
import { days, type ScheduleDayForm } from '../../../admin/utils/schedule-helpers';

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

type ProfessionalFormProps = {
  professional: Professional | null;
  form: ProfessionalFormState;
  onFieldChange: (field: keyof Omit<ProfessionalFormState, 'schedule'>) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDayChange: (day: DayKey, field: keyof ScheduleDayForm) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClear: () => void;
  onDelete: (professional: Professional) => void;
  isSaving: boolean;
};

const dayLabels: Record<string, string> = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié',
  thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom',
};

const STEPS = [
  { number: 1, title: 'Datos básicos', description: 'Nombre, email y contacto' },
  { number: 2, title: 'Servicios y configuración', description: 'Duración, servicios y edad' },
  { number: 3, title: 'Horarios', description: 'Calendario semanal' },
];

export const ProfessionalForm: React.FC<ProfessionalFormProps> = ({
  professional,
  form,
  onFieldChange,
  onDayChange,
  onSubmit,
  onClear,
  onDelete,
  isSaving,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [scheduleExpanded, setScheduleExpanded] = useState(true);

  const scheduleSummary = days
    .filter((d) => form.schedule[d.key].startTime && form.schedule[d.key].endTime)
    .map((d) => {
      const day = form.schedule[d.key];
      return `${dayLabels[d.key]} ${day.startTime}-${day.endTime}`;
    })
    .join(' · ');

  const isLastStep = currentStep === STEPS.length;

  return (
    <AnimatedContainer animation="slideInRight" className="rounded-[24px] border border-[#282828] bg-[#121212] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-white">
            {professional ? 'Editar profesional' : 'Crear profesional'}
          </h2>
          <p className="text-[13px] text-[#8A8A8A]">
            {professional
              ? 'Actualizá datos, disponibilidad y duración del slot.'
              : 'Completá los datos del empleado y su calendario semanal.'}
          </p>
        </div>

        {professional && (
          <Button variant="ghost" size="sm" icon={FiPlus} onClick={onClear}>
            Nuevo
          </Button>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.number}>
              <button
                type="button"
                onClick={() => setCurrentStep(step.number)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                  currentStep === step.number
                    ? 'bg-[#FF5C00] text-white shadow-[0_0_10px_rgba(255,92,0,0.3)]'
                    : currentStep > step.number
                      ? 'bg-[#22C55E]/20 text-[#22C55E]'
                      : 'bg-[#242424] text-[#555]'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  currentStep === step.number
                    ? 'bg-white/20 text-white'
                    : currentStep > step.number
                      ? 'bg-[#22C55E] text-white'
                      : 'bg-[#1A1A1A] text-[#555]'
                }`}>
                  {step.number}
                </span>
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={`h-px flex-1 ${
                  currentStep > step.number ? 'bg-[#22C55E]/40' : 'bg-[#282828]'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          {currentStep === 1 && (
            <>
              <p className="text-[12px] text-[#8A8A8A]">{STEPS[0].description}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Nombre" value={form.name} onChange={onFieldChange('name')} required placeholder="Juan" />
                <Input label="Apellido" value={form.lastname} onChange={onFieldChange('lastname')} required placeholder="Pérez" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Email" type="email" value={form.email} onChange={onFieldChange('email')} required placeholder="juan@barberia.com" />
                <Input label="Teléfono" value={form.phone} onChange={onFieldChange('phone')} required placeholder="099123456" />
              </div>
              <PasswordInput
                label={professional ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                value={form.password}
                onChange={onFieldChange('password')}
                required={!professional}
                placeholder={professional ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
              />
            </>
          )}

          {currentStep === 2 && (
            <>
              <p className="text-[12px] text-[#8A8A8A]">{STEPS[1].description}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Duración del slot" type="number" min={1} value={form.slotDuration} onChange={onFieldChange('slotDuration')} required placeholder="30" helperText="En minutos. Si no se define, se usa 30" />
                <Input label="Servicios" value={form.services} onChange={onFieldChange('services')} placeholder="corte, barba, color" helperText="Separadas por coma" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Edad" type="number" min={0} value={form.age} onChange={onFieldChange('age')} placeholder="28" />
                <Input label="Foto de perfil" type="url" value={form.photoUrl} onChange={onFieldChange('photoUrl')} placeholder="https://..." helperText="Opcional. Si no hay URL, se guarda null." />
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <p className="text-[12px] text-[#8A8A8A]">{STEPS[2].description}</p>
              <div className="rounded-[20px] border border-[#282828] bg-[#1A1A1A] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[16px] font-semibold text-white">Calendario</h3>
                    <p className="text-[12px] text-[#8A8A8A]">Definí horarios y breaks por día.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={scheduleExpanded ? FiChevronLeft : FiChevronRight}
                    onClick={() => setScheduleExpanded(!scheduleExpanded)}
                  >
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
                          <Input label={`Inicio ${day.label}`} type="time" value={form.schedule[day.key].startTime} onChange={onDayChange(day.key, 'startTime')} />
                          <Input label={`Fin ${day.label}`} type="time" value={form.schedule[day.key].endTime} onChange={onDayChange(day.key, 'endTime')} />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input label={`Break inicio ${day.label}`} type="time" value={form.schedule[day.key].breakStart} onChange={onDayChange(day.key, 'breakStart')} />
                          <Input label={`Break fin ${day.label}`} type="time" value={form.schedule[day.key].breakEnd} onChange={onDayChange(day.key, 'breakEnd')} />
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
                    <p className="mt-2 text-[11px] text-[#555]">{days.filter((d) => form.schedule[d.key].startTime).length}/7 días con horario</p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button type="button" variant="secondary" icon={FiChevronLeft} onClick={() => setCurrentStep((s) => s - 1)}>
                  Anterior
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!isLastStep ? (
                <Button type="button" icon={FiChevronRight} iconPosition="right" onClick={() => setCurrentStep((s) => s + 1)}>
                  Siguiente
                </Button>
              ) : (
                <Button type="submit" icon={FiSave} loading={isSaving}>
                  {professional ? 'Guardar cambios' : 'Crear profesional'}
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={onClear}>
                Limpiar
              </Button>
              {professional && (
                <Button type="button" variant="danger" icon={FiTrash2} onClick={() => void onDelete(professional)}>
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </AnimatedContainer>
  );
};

export default ProfessionalForm;
