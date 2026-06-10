import React from 'react';
import { FiClock, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { AnimatedContainer, Button, Input, PasswordInput } from '../../../../../components/common';
import type { DayKey, Professional } from '../../../../../types/professional';
import { days, type ScheduleDayForm } from '../../../admin/utils/schedule-helpers';

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

      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nombre"
            value={form.name}
            onChange={onFieldChange('name')}
            required
            placeholder="Juan"
          />
          <Input
            label="Apellido"
            value={form.lastname}
            onChange={onFieldChange('lastname')}
            required
            placeholder="Pérez"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={onFieldChange('email')}
            required
            placeholder="juan@barberia.com"
          />
          <Input
            label="Teléfono"
            value={form.phone}
            onChange={onFieldChange('phone')}
            required
            placeholder="099123456"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <PasswordInput
            label={professional ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            value={form.password}
            onChange={onFieldChange('password')}
            required={!professional}
            placeholder={professional ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
          />
          <Input
            label="Duración del slot"
            type="number"
            min={1}
            value={form.slotDuration}
            onChange={onFieldChange('slotDuration')}
            required
            placeholder="30"
            helperText="En minutos. Si no se define, se usa 30"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Especialidades"
            value={form.specialties}
            onChange={onFieldChange('specialties')}
            placeholder="corte, barba, color"
            helperText="Separadas por coma"
          />
          <Input
            label="Edad"
            type="number"
            min={0}
            value={form.age}
            onChange={onFieldChange('age')}
            placeholder="28"
          />
        </div>

        <Input
          label="Foto de perfil"
          type="url"
          value={form.photoUrl}
          onChange={onFieldChange('photoUrl')}
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
              {professional ? 'Edición' : 'Nuevo'}
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
                    value={form.schedule[day.key].startTime}
                    onChange={onDayChange(day.key, 'startTime')}
                  />
                  <Input
                    label={`Fin ${day.label}`}
                    type="time"
                    value={form.schedule[day.key].endTime}
                    onChange={onDayChange(day.key, 'endTime')}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    label={`Break inicio ${day.label}`}
                    type="time"
                    value={form.schedule[day.key].breakStart}
                    onChange={onDayChange(day.key, 'breakStart')}
                  />
                  <Input
                    label={`Break fin ${day.label}`}
                    type="time"
                    value={form.schedule[day.key].breakEnd}
                    onChange={onDayChange(day.key, 'breakEnd')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" icon={FiSave} loading={isSaving}>
            {professional ? 'Guardar cambios' : 'Crear profesional'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClear}>
            Limpiar formulario
          </Button>
          {professional && (
            <Button type="button" variant="ghost" icon={FiTrash2} onClick={() => void onDelete(professional)}>
              Eliminar
            </Button>
          )}
        </div>
      </form>
    </AnimatedContainer>
  );
};

export default ProfessionalForm;
