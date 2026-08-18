import React, { useState, useEffect, useMemo } from 'react';
import { FiUser, FiPhone, FiMail, FiX, FiSearch, FiCheck } from 'react-icons/fi';
import { Modal, Select, Input, Button, DatePicker, Spinner, BarberAvatar, useToast } from '../../../components/common';
import type { SelectOption } from '../../../components/common';
import { useGetServicesQuery } from '../../../services/service.api';
import { professionalService } from '../../../services/professional.service';
import {
  useCreateAppointmentMutation,
  useAcquireTempLockMutation,
  useReleaseTempLockMutation,
  useLazySearchClientsQuery,
} from '../../../services/appointmentApi';
import { useGetRegisteredClientsQuery, type RegisteredClientSummary } from '../../../services/clientApi';
import type { BarberPublic, ClientSearchResult } from '../../../types/booking';

export interface QuickCreateInitialClient {
  id: string;
  name: string;
  lastname: string;
  phone?: string;
  email?: string;
  kind?: 'registered' | 'anonymous';
}

interface QuickCreateModalProps {
  dateStr: string;
  onClose: () => void;
  initialClient?: QuickCreateInitialClient;
}

type ClientMode = 'new' | 'existing';

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ dateStr, onClose, initialClient }) => {
  const { showToast } = useToast();
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
  const {
    data: clientsData,
    isFetching: loadingClients,
  } = useGetRegisteredClientsQuery(undefined, {
    skip: clientMode !== 'existing',
  });
  const [acquireTempLock] = useAcquireTempLockMutation();
  const [releaseTempLock] = useReleaseTempLockMutation();
  const [triggerSearchClients, { data: clientResults = [], isFetching: isSearchingClients }] =
    useLazySearchClientsQuery();

  const registeredClients = useMemo(() => clientsData?.clients ?? [], [clientsData]);
  const barbersById = useMemo(() => new Map(barbers.map((b) => [b.id, b])), [barbers]);

  // Un cliente anónimo no está en la lista de registrados (/api/users/clients).
  // Si el cliente predefinido no figura ahí, lo tratamos como anónimo y pasamos
  // al modo "Cliente sin registro" con sus datos precargados en vez de quedar
  // atascados en el buscador de registrados.
  const isAnonymousClient = useMemo(() => {
    if (!initialClient) return false;
    if (initialClient.kind === 'anonymous') return true;
    if (initialClient.kind === 'registered') return false;
    if (loadingClients) return false;
    return !registeredClients.some((c) => c.id === initialClient.id);
  }, [initialClient, loadingClients, registeredClients]);

  const effectiveClientMode: ClientMode = initialClient && isAnonymousClient ? 'new' : clientMode;

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return registeredClients;
    // Tokeniza la búsqueda ("Nombre Apellido") para que cada término pueda
    // matchear en un campo distinto (nombre, apellido o email), en vez de exigir
    // que la query completa esté contenida en un solo campo.
    const tokens = q.split(/\s+/).filter(Boolean);
    return registeredClients.filter((c) => {
      const fullName = `${c.name} ${c.lastname}`.toLowerCase();
      const email = c.email.toLowerCase();
      return tokens.every((t) => fullName.includes(t) || email.includes(t));
    });
  }, [registeredClients, clientSearch]);

  const remoteClients = useMemo<RegisteredClientSummary[]>(
    () => clientResults.map((client) => ({
      id: client.id,
      name: client.name,
      lastname: client.lastname,
      email: client.contactEmail ?? '',
      phone: client.phone ?? '',
      photoUrl: client.photoUrl ?? null,
    })),
    [clientResults]
  );

  const clientsForDisplay = clientSearch.trim().length >= 2 ? remoteClients : filteredClients;

  useEffect(() => {
    if (effectiveClientMode !== 'existing' || selectedClient) return;
    const query = clientSearch.trim();
    if (query.length < 2) return;
    const timeout = setTimeout(() => triggerSearchClients(query), 300);
    return () => clearTimeout(timeout);
  }, [clientSearch, effectiveClientMode, selectedClient, triggerSearchClients]);

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

  const handleSelectClient = (client: RegisteredClientSummary) => {
    setSelectedClient({
      id: client.id,
      name: client.name,
      lastname: client.lastname,
      phone: client.phone,
      contactEmail: client.email,
      photoUrl: client.photoUrl,
    });
    setClientId(client.id);
    setClientName(client.name);
    setClientLastname(client.lastname);
    setClientPhone(client.phone ?? '');
    setClientEmail(client.email ?? '');
  };

  useEffect(() => {
    professionalService.getPublic().then(setBarbers).catch((error: unknown) => showToast(error instanceof Error ? error.message : 'No se pudieron cargar los barberos', 'error'));
  }, [showToast]);

  const handleBarberChange = (id: string) => {
    setBarberId(id);
    setServiceId('');
    setSelectedTime('');
    setAvailableSlots([]);
    if (id && selectedDate) {
      professionalService
        .getSlots(id, selectedDate)
        .then((res) => setAvailableSlots(res.slots))
         .catch(() => { setAvailableSlots([]); setLocalError('No se pudieron cargar los horarios.'); });
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
         .catch(() => { setAvailableSlots([]); setLocalError('No se pudieron cargar los horarios.'); });
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
  // En modo registrado los inputs no se muestran; el teléfono solo vuelve a aparecer
  // si el cliente elegido no lo tiene cargado, para poder completarlo antes de crear el turno.
  const isExisting = effectiveClientMode === 'existing';
  const isNameLocked = isExisting && !!selectedClient;
  const isPhoneLocked = isNameLocked && !!selectedClient?.phone;

  const validate = (): string | null => {
    if (!barberId) return 'Seleccioná un barbero.';
    if (!serviceId) return 'Seleccioná un servicio.';
    if (!selectedTime) return 'Seleccioná un horario.';
    if (effectiveClientMode === 'existing' && !selectedClient) return 'Buscá y seleccioná un cliente registrado.';
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
      showToast('Turno creado con éxito');
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
          renderOption={(option) => {
            const barber = barbersById.get(option.value);
            if (!barber) return option.label;
            return (
              <span className="flex min-w-0 items-center gap-2">
                <BarberAvatar name={barber.name} lastname={barber.lastname} photoUrl={barber.photoUrl} size="sm" />
                <span className="truncate">{option.label}</span>
              </span>
            );
          }}
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
                ${effectiveClientMode === 'new'
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
                ${effectiveClientMode === 'existing'
                  ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00]'
                  : 'border-[#282828] text-[#8A8A8A] hover:text-white'
                }`}
            >
              Cliente registrado
            </button>
          </div>
        )}

        {effectiveClientMode === 'existing' && (
          <div className="flex flex-col gap-2">
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
            {loadingClients || isSearchingClients ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : (
              <div className="max-h-[160px] overflow-y-auto space-y-1 rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-1.5">
                {clientsForDisplay.slice(0, 30).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClient(c)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-[8px] text-left transition-colors cursor-pointer ${
                      selectedClient?.id === c.id
                        ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30'
                        : 'hover:bg-[#282828] border border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#242424] border border-[#333] shrink-0 overflow-hidden flex items-center justify-center">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FiUser size={14} className="text-[#555]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white truncate">{c.name} {c.lastname}</p>
                      <p className="text-[11px] text-[#6A6A6A] truncate">{c.email}</p>
                    </div>
                    {selectedClient?.id === c.id && <FiCheck size={14} className="text-[#FF5C00] shrink-0" />}
                  </button>
                ))}
                {clientsForDisplay.length === 0 && (
                  <p className="text-[12px] text-[#6A6A6A] text-center py-3">Sin resultados</p>
                )}
              </div>
            )}
          </div>
        )}

        {effectiveClientMode === 'new' && (
           <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        )}

        {(effectiveClientMode === 'new' || (isExisting && isNameLocked && !isPhoneLocked)) && (
          <Input
            label="Teléfono"
            required
            icon={<FiPhone className="w-3.5 h-3.5 text-[#8A8A8A]" />}
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="598 91 234 567"
            helperText={isExisting && isNameLocked ? 'Este cliente no tiene teléfono cargado — completalo para continuar' : undefined}
          />
        )}

        {effectiveClientMode === 'new' && (
          <Input
            label="Email"
            required
            icon={<FiMail className="w-3.5 h-3.5 text-[#8A8A8A]" />}
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="Email"
          />
        )}

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
