import React, { useState, useEffect } from 'react';
import { FiUser, FiPhone, FiMail, FiX, FiSearch } from 'react-icons/fi';
import { Modal, Select, Input, Button, DatePicker } from '../../../components/common';
import type { SelectOption } from '../../../components/common';
import { useGetServicesQuery } from '../../../services/service.api';
import { professionalService } from '../../../services/professional.service';
import { useCreateAppointmentMutation, useAcquireTempLockMutation, useReleaseTempLockMutation, useLazySearchClientsQuery } from '../../../services/appointmentApi';
import type { BarberPublic, ClientSearchResult } from '../../../types/booking';

export interface QuickCreateInitialClient {
  id: string;
  name: string;
  lastname: string;
  phone?: string;
  email?: string;
}

interface QuickCreateModalProps {
  dateStr: string;
  onClose: () => void;
  initialClient?: QuickCreateInitialClient;
}

type ClientMode = 'new' | 'existing';

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ dateStr, onClose, initialClient }) => {
  const [barbers, setBarbers] = useState<BarberPublic[]>([]);
  const [barberId, setBarberId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDate, setSelectedDate] = useState(dateStr);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [clientMode, setClientMode] = useState<ClientMode>(initialClient ? 'existing' : 'new');
  const [clientId, setClientId] = useState(initialClient?.id ?? '');
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(
    initialClient
      ? {
          id: initialClient.id,
          name: initialClient.name,
          lastname: initialClient.lastname,
          phone: initialClient.phone,
          contactEmail: initialClient.email,
        }
      : null
  );
  const [clientSearch, setClientSearch] = useState(
    initialClient ? `${initialClient.name} ${initialClient.lastname}` : ''
  );
  const [clientName, setClientName] = useState(initialClient?.name ?? '');
  const [clientLastname, setClientLastname] = useState(initialClient?.lastname ?? '');
  const [clientPhone, setClientPhone] = useState(initialClient?.phone ?? '');
  const [clientEmail, setClientEmail] = useState(initialClient?.email ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: services = [] } = useGetServicesQuery();
  const [createAppointment, { isLoading: isSubmitting }] = useCreateAppointmentMutation();
  const [acquireTempLock] = useAcquireTempLockMutation();
  const [releaseTempLock] = useReleaseTempLockMutation();
  const [triggerSearchClients, { data: clientResults = [], isFetching: isSearchingClients }] =
    useLazySearchClientsQuery();

  useEffect(() => {
    if (clientMode !== 'existing' || selectedClient) return;
    const query = clientSearch.trim();
    if (query.length < 2) return;
    const timeout = setTimeout(() => triggerSearchClients(query), 300);
    return () => clearTimeout(timeout);
  }, [clientSearch, clientMode, selectedClient, triggerSearchClients]);

  const resetClientFields = () => {
    setClientId('');
    setSelectedClient(null);
    setClientSearch('');
    setClientName('');
    setClientLastname('');
    setClientPhone('');
    setClientEmail('');
  };

  const handleClientModeChange = (mode: ClientMode) => {
    if (mode === clientMode) return;
    setClientMode(mode);
    resetClientFields();
  };

  const handleSelectClient = (client: ClientSearchResult) => {
    setSelectedClient(client);
    setClientId(client.id);
    setClientSearch(`${client.name} ${client.lastname}`);
    setClientName(client.name);
    setClientLastname(client.lastname);
    setClientPhone(client.phone ?? '');
    setClientEmail(client.contactEmail ?? '');
  };

  useEffect(() => {
    professionalService.getPublic().then(setBarbers).catch(() => {});
  }, []);

  const handleBarberChange = (id: string) => {
    setBarberId(id);
    setServiceId('');
    setSelectedTime('');
    setAvailableSlots([]);
    if (id && selectedDate) {
      professionalService
        .getSlots(id, selectedDate)
        .then((res) => setAvailableSlots(res.slots))
        .catch(() => setAvailableSlots([]));
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedTime('');
    setAvailableSlots([]);
    if (barberId && newDate) {
      professionalService
        .getSlots(barberId, newDate)
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
  // Nombre/apellido quedan siempre bloqueados al elegir un cliente (para no desvincular
  // el clientId), pero teléfono/email solo se bloquean si el cliente YA TENÍA ese dato al
  // momento de seleccionarlo (de `selectedClient`, no del valor editable en vivo — si se
  // derivara de clientPhone/clientEmail, el campo se re-bloquearía solo apenas se tipea el
  // primer carácter). Si viene vacío, el campo queda editable para completarlo antes de crear el turno.
  const isNameLocked = clientMode === 'existing' && !!selectedClient;
  const isPhoneLocked = isNameLocked && !!selectedClient?.phone;
  const isEmailLocked = isNameLocked && !!selectedClient?.contactEmail;

  const validate = (): string | null => {
    if (!barberId) return 'Seleccioná un barbero.';
    if (!serviceId) return 'Seleccioná un servicio.';
    if (!selectedTime) return 'Seleccioná un horario.';
    if (clientMode === 'existing' && !selectedClient) return 'Buscá y seleccioná un cliente registrado.';
    if (clientName.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    if (clientLastname.trim().length < 2) return 'El apellido debe tener al menos 2 caracteres.';
    if (clientPhone.trim().length < 7) return 'El teléfono debe tener al menos 7 dígitos.';
    if (clientEmail.trim().length < 5) return 'El email es obligatorio.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);

    let tempLockResult: { tempLockId: string; ownerToken: string } | undefined;
    try {
      tempLockResult = await acquireTempLock({
        barberId,
        date: selectedDate,
        startTime: selectedTime,
      }).unwrap();

      await createAppointment({
        barberId,
        serviceId,
        date: selectedDate,
        startTime: selectedTime,
        clientId: clientId || undefined,
        clientName: clientName.trim(),
        clientLastname: clientLastname.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim(),
        tempLockId: tempLockResult.tempLockId,
      }).unwrap();
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data: string }).data
          : 'Error al crear el turno.';
      setLocalError(message);
    } finally {
      if (tempLockResult) {
        await releaseTempLock({
          tempLockId: tempLockResult.tempLockId,
          ownerToken: tempLockResult.ownerToken,
        }).catch(() => {});
      }
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={undefined} size="md">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          <h2 className="text-[18px] font-bold text-white shrink-0">
            {initialClient ? `Nuevo turno — ${initialClient.name} ${initialClient.lastname}` : 'Nuevo turno'}
          </h2>
          <DatePicker value={selectedDate} onChange={handleDateChange} className="w-full sm:w-auto" />
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[#8A8A8A] hover:text-white hover:bg-[#1A1A1A] transition-colors"
          aria-label="Cerrar"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>
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

        {!initialClient && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleClientModeChange('new')}
              className={`flex-1 h-9 rounded-[10px] text-[12.5px] font-medium transition-colors border
                ${clientMode === 'new'
                  ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00]'
                  : 'border-[#282828] text-[#8A8A8A] hover:text-white'
                }`}
            >
              Cliente sin registro
            </button>
            <button
              type="button"
              onClick={() => handleClientModeChange('existing')}
              className={`flex-1 h-9 rounded-[10px] text-[12.5px] font-medium transition-colors border
                ${clientMode === 'existing'
                  ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00]'
                  : 'border-[#282828] text-[#8A8A8A] hover:text-white'
                }`}
            >
              Cliente registrado
            </button>
          </div>
        )}

        {!initialClient && clientMode === 'existing' && (
          <div className="relative">
            <Input
              label="Buscar cliente"
              icon={<FiSearch className="w-3.5 h-3.5 text-[#8A8A8A]" />}
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                if (selectedClient) {
                  setSelectedClient(null);
                  setClientId('');
                }
              }}
              placeholder="Buscar por nombre, apellido o email"
            />
            {!selectedClient && clientSearch.trim().length >= 2 && (
              <ul className="absolute left-0 right-0 z-50 mt-1 rounded-[10px] border border-[#282828] bg-[#1A1A1A] py-1 shadow-xl max-h-48 overflow-y-auto">
                {isSearchingClients && (
                  <li className="px-3 py-2 text-[12.5px] text-[#8A8A8A]">Buscando...</li>
                )}
                {!isSearchingClients && clientResults.length === 0 && (
                  <li className="px-3 py-2 text-[12.5px] text-[#8A8A8A]">Sin resultados</li>
                )}
                {clientResults.map((client) => (
                  <li
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className="px-3 py-2 text-[12.5px] text-white cursor-pointer hover:bg-[#282828] transition-colors"
                  >
                    <div className="font-medium">{client.name} {client.lastname}</div>
                    {client.contactEmail && (
                      <div className="text-[11px] text-[#8A8A8A]">{client.contactEmail}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nombre"
            required
            disabled={isNameLocked}
            icon={<FiUser className="w-3.5 h-3.5 text-[#8A8A8A]" />}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nombre"
          />
          <Input
            label="Apellido"
            required
            disabled={isNameLocked}
            icon={<FiUser className="w-3.5 h-3.5 text-[#8A8A8A]" />}
            value={clientLastname}
            onChange={(e) => setClientLastname(e.target.value)}
            placeholder="Apellido"
          />
        </div>

        <Input
          label="Teléfono"
          required
          disabled={isPhoneLocked}
          icon={<FiPhone className="w-3.5 h-3.5 text-[#8A8A8A]" />}
          type="tel"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder="598 91 234 567"
          helperText={isNameLocked && !isPhoneLocked ? 'Este cliente no tiene teléfono cargado — completalo para continuar' : undefined}
        />

        <Input
          label="Email"
          required
          disabled={isEmailLocked}
          icon={<FiMail className="w-3.5 h-3.5 text-[#8A8A8A]" />}
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="Email"
          helperText={isNameLocked && !isEmailLocked ? 'Este cliente no tiene email cargado — completalo para continuar' : undefined}
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
