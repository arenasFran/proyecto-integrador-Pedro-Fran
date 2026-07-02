import React, { useState, useEffect } from 'react';
import { FiUser, FiPhone, FiMail } from 'react-icons/fi';
import { Modal, Select, Input, Button } from '../../../components/common';
import type { SelectOption } from '../../../components/common';
import { useGetServicesQuery } from '../../../services/service.api';
import { professionalService } from '../../../services/professional.service';
import { useCreateAppointmentMutation } from '../../../services/appointmentApi';
import type { BarberPublic } from '../../../types/booking';

interface QuickCreateModalProps {
  dateStr: string;
  onClose: () => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ dateStr, onClose }) => {
  const [barbers, setBarbers] = useState<BarberPublic[]>([]);
  const [barberId, setBarberId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientLastname, setClientLastname] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: services = [] } = useGetServicesQuery();
  const [createAppointment, { isLoading: isSubmitting }] = useCreateAppointmentMutation();

  useEffect(() => {
    professionalService.getPublic().then(setBarbers).catch(() => {});
  }, []);

  const handleBarberChange = (id: string) => {
    setBarberId(id);
    setServiceId('');
    setSelectedTime('');
    setAvailableSlots([]);
    if (id && dateStr) {
      professionalService
        .getSlots(id, dateStr)
        .then((res) => setAvailableSlots(res.slots))
        .catch(() => setAvailableSlots([]));
    }
  };

  const barberOptions: SelectOption[] = barbers.map((b) => ({
    value: b.id,
    label: `${b.name} ${b.lastname}`,
  }));
  const serviceOptions: SelectOption[] = services.map((s) => ({
    value: s.id,
    label: `${s.name} - $${s.price}`,
  }));
  const slotOptions: SelectOption[] = availableSlots.map((s) => ({
    value: s,
    label: s,
  }));

  const isLoadingSlots = Boolean(barberId && dateStr && availableSlots.length === 0 && !localError);

  const validate = (): string | null => {
    if (!barberId) return 'Seleccioná un barbero.';
    if (!serviceId) return 'Seleccioná un servicio.';
    if (!selectedTime) return 'Seleccioná un horario.';
    if (clientName.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    if (clientLastname.trim().length < 2) return 'El apellido debe tener al menos 2 caracteres.';
    if (clientPhone.trim().length < 7) return 'El teléfono debe tener al menos 7 dígitos.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);

    try {
      await createAppointment({
        barberId,
        serviceId,
        date: dateStr,
        startTime: selectedTime,
        clientName: clientName.trim(),
        clientLastname: clientLastname.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim(),
      }).unwrap();
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data: string }).data
          : 'Error al crear el turno.';
      setLocalError(message);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Nuevo turno - ${dateStr}`} size="md">
      <div className="flex flex-col gap-4">
        <Select
          label="Barbero"
          value={barberId}
          onChange={handleBarberChange}
          options={barberOptions}
          placeholder="Seleccionar barbero"
        />

        <Select
          label="Servicio"
          value={serviceId}
          onChange={setServiceId}
          options={serviceOptions}
          placeholder={barberId ? 'Seleccionar servicio' : 'Primero seleccioná un barbero'}
        />

        <Select
          label="Horario"
          value={selectedTime}
          onChange={setSelectedTime}
          options={slotOptions}
          placeholder={
            !barberId
              ? 'Primero seleccioná un barbero'
              : isLoadingSlots
                ? 'Cargando horarios...'
                : availableSlots.length === 0
                  ? 'Sin horarios disponibles'
                  : 'Seleccionar horario'
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nombre"
            required
            icon={<FiUser className="w-3.5 h-3.5 text-[#8A8A8A]" />}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nombre"
          />
          <Input
            label="Apellido"
            required
            icon={<FiUser className="w-3.5 h-3.5 text-[#8A8A8A]" />}
            value={clientLastname}
            onChange={(e) => setClientLastname(e.target.value)}
            placeholder="Apellido"
          />
        </div>

        <Input
          label="Teléfono"
          required
          icon={<FiPhone className="w-3.5 h-3.5 text-[#8A8A8A]" />}
          type="tel"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder="Teléfono"
        />

        <Input
          label="Email"
          icon={<FiMail className="w-3.5 h-3.5 text-[#8A8A8A]" />}
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="Email (opcional)"
        />

        {localError && (
          <p className="text-[12px] text-red-400">{localError}</p>
        )}

        <Button
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          className="w-full"
        >
          Crear turno
        </Button>
      </div>
    </Modal>
  );
};
