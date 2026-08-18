import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiEdit2,
  FiLock,
  FiPlus,
  FiSave,
  FiSend,
  FiSettings,
  FiTrash2,
  FiUser,
} from 'react-icons/fi';
import { AnimatedContainer, Button, ImageUpload, Input, PasswordInput, Spinner, useToast } from '../../../components/common';
import { uploadAvatar } from '../../../services/upload.service';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { logout, updateCurrentUser } from '../../../store/slices/authSlice';
import { fetchBarbers, updateBarberMe } from '../../../store/slices/barbersSlice';
import { useChangePasswordMutation, useRequestResetMutation } from '../../../services/authApi';
import { useGenerateTelegramLinkTokenMutation } from '../../../services/telegramApi';
import { getErrorMessage } from '../../../utils/errorMessages';
import type { DayKey } from '../../../types/professional';
import {
  createEmptyDay,
  createEmptySchedule,
  days,
  mapScheduleToForm,
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#282828] bg-[#1A1A1A] px-4 py-3">
      <span className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">{label}</span>
      <span className="break-all text-right text-[13px] font-medium text-white">{value}</span>
    </div>
  );
}

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
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmPassword?: string }>({});

  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailPasswordError, setEmailPasswordError] = useState<string | null>(null);

  const [changePasswordMutation, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [requestReset, { isLoading: isRequestingReset }] = useRequestResetMutation();
  const [generateTelegramLinkToken, { isLoading: isGeneratingTelegramLink }] = useGenerateTelegramLinkTokenMutation();
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [telegramLinkCommand, setTelegramLinkCommand] = useState<string | null>(null);
  const { showToast } = useToast();

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, unknown>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editedSchedule, setEditedSchedule] = useState<Record<DayKey, ScheduleDayForm> | null>(null);
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

  const originalEmail = isBarber ? barberData?.email : authUser?.email;
  const emailChanged = String(formData?.email ?? '').trim() !== String(originalEmail ?? '').trim();

  const displayName = isBarber
    ? `${String(formData?.name ?? '')} ${String(formData?.lastname ?? '')}`.trim()
    : `${String(formData?.name ?? '')} ${String(formData?.lastname ?? '')}`.trim();

  const activeDaysCount = days.filter((d) => schedule[d.key].startTime && schedule[d.key].endTime).length;

  const scheduleSummary = days
    .filter((d) => schedule[d.key].startTime && schedule[d.key].endTime)
    .map((d) => `${dayLabels[d.key]} ${schedule[d.key].startTime}-${schedule[d.key].endTime}`)
    .join(' · ');

  const handleFieldChange = (field: string) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEditedFields((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleDayChange = (day: DayKey, field: keyof ScheduleDayForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setEditedSchedule({
        ...schedule,
        [day]: {
          ...schedule[day],
          [field]: value,
        },
      });
    };

  const toggleDay = (day: DayKey) => {
    const current = schedule[day];
    const isActive = Boolean(current.startTime) && Boolean(current.endTime);
    setEditedSchedule({
      ...schedule,
      [day]: isActive
        ? createEmptyDay()
        : {
            startTime: current.startTime || '09:00',
            endTime: current.endTime || '18:00',
            breakStart: current.breakStart,
            breakEnd: current.breakEnd,
          },
    });
  };

  const toggleBreak = (day: DayKey) => {
    const current = schedule[day];
    const hasBreak = Boolean(current.breakStart) && Boolean(current.breakEnd);
    setEditedSchedule({
      ...schedule,
      [day]: {
        ...current,
        breakStart: hasBreak ? '' : (current.breakStart || '12:00'),
        breakEnd: hasBreak ? '' : (current.breakEnd || '13:00'),
      },
    });
  };

  const applyPreset = (preset: 'weekdays' | 'saturday' | 'clear') => {
    const next = { ...schedule };
    if (preset === 'weekdays') {
      days.forEach((d) => {
        if (d.key !== 'saturday' && d.key !== 'sunday') {
          next[d.key] = { startTime: '09:00', endTime: '18:00', breakStart: '', breakEnd: '' };
        }
      });
    } else if (preset === 'saturday') {
      next.saturday = { startTime: '09:00', endTime: '14:00', breakStart: '', breakEnd: '' };
    } else {
      days.forEach((d) => {
        next[d.key] = createEmptyDay();
      });
    }
    setEditedSchedule(next);
  };

  const cancelPersonal = () => {
    setEditingPersonal(false);
    setEditedFields({});
    setPhotoFile(null);
    setEmailCurrentPassword('');
    setEmailPasswordError(null);
    setPageError(null);
    setPageMessage(null);
  };

  const discardSchedule = () => {
    setEditedSchedule(null);
    setPageError(null);
    setPageMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData) return;

    setPageError(null);
    setPageMessage(null);
    setEmailPasswordError(null);

    if (isBarber) {
      const scheduleError = validateSchedule(schedule);
      if (scheduleError) {
        setPageError(scheduleError);
        return;
      }

      const slotDuration = Number(formData.slotDuration || 30);
      if (!Number.isInteger(slotDuration) || slotDuration < 1) {
        setPageError('La duración del turno debe ser un número entero mayor o igual a 1.');
        return;
      }
    }

    if (emailChanged && !emailCurrentPassword) {
      setEmailPasswordError('La contraseña actual es obligatoria');
      setPageError('Ingresá tu contraseña actual para confirmar el cambio de email.');
      return;
    }

    setIsSaving(true);

    try {
      let photoUrl = formData.photoUrl != null ? String(formData.photoUrl).trim() || null : null;

      if (photoFile) {
        photoUrl = await uploadAvatar(photoFile, photoUrl ?? undefined);
        setPhotoFile(null);
      }

      if (isBarber) {
        const payload: Record<string, unknown> = {
          email: String(formData.email ?? '').trim(),
          name: String(formData.name ?? '').trim(),
          lastname: String(formData.lastname ?? '').trim(),
          phone: String(formData.phone ?? '').trim(),
          photoUrl,
          slotDuration: Number(formData.slotDuration ?? 30),
          maxAdvanceDays: formData.maxAdvanceDays,
        };

        if (editedSchedule) {
          payload.schedule = scheduleFromForm(editedSchedule);
        }

        if (emailChanged) {
          payload.currentPassword = emailCurrentPassword;
        }

        await dispatch(updateBarberMe(payload)).unwrap();
        setEditedFields({});
        setEmailCurrentPassword('');
        setEditingPersonal(false);
        setPageMessage('Perfil actualizado con éxito.');
      } else {
        await dispatch(updateCurrentUser({
          email: String(formData.email ?? '').trim() || undefined,
          name: String(formData.name ?? '').trim() || undefined,
          lastname: String(formData.lastname ?? '').trim() || undefined,
          phone: String(formData.phone ?? '').trim() || undefined,
          photoUrl: photoUrl ?? undefined,
          currentPassword: emailChanged ? emailCurrentPassword : undefined,
        })).unwrap();
        setEditedFields({});
        setEmailCurrentPassword('');
        setEditingPersonal(false);
        setPageMessage('Perfil actualizado con éxito.');
      }
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Error al guardar el perfil');
      if (msg.includes('409') || msg.toLowerCase().includes('email en uso')) {
        setPageError('El email ya está en uso');
      } else if (msg.toLowerCase().includes('contraseña actual')) {
        setEmailPasswordError(msg);
        setPageError(msg);
      } else {
        setPageError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordFieldErrors({});

    const errors: { currentPassword?: string; newPassword?: string; confirmPassword?: string } = {};

    if (!currentPassword) errors.currentPassword = 'La contraseña actual es obligatoria';
    if (!newPassword) errors.newPassword = 'La nueva contraseña es obligatoria';
    if (!confirmPassword) errors.confirmPassword = 'La confirmación es obligatoria';

    if (newPassword && newPassword.length < 8) errors.newPassword = 'Debe tener al menos 8 caracteres';
    if (newPassword && confirmPassword && newPassword !== confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden';
    if (currentPassword && newPassword && currentPassword === newPassword) errors.newPassword = 'Debe ser diferente a la actual';

    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors);
      return;
    }

    try {
      await changePasswordMutation({
        currentPassword,
        newPassword,
        newPasswordConfirmation: confirmPassword,
      }).unwrap();

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      showToast('Contraseña actualizada. Iniciá sesión de nuevo con tu nueva contraseña.', 'success');
      dispatch(logout());
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Error al cambiar la contraseña');
      if (msg.toLowerCase().includes('contraseña actual incorrecta')) {
        setPasswordFieldErrors({ currentPassword: 'Contraseña actual incorrecta' });
      } else {
        showToast(msg, 'error');
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!authUser?.email) return;

    try {
      await requestReset({ email: authUser.email }).unwrap();
      showToast(`Te enviamos un código de 6 dígitos a ${authUser.email}.`, 'success');
      navigate(`/recovery?email=${encodeURIComponent(authUser.email)}&from=profile`, { replace: true });
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Error al solicitar el restablecimiento'), 'error');
    }
  };

  const handleConnectTelegram = async () => {
    try {
      const result = await generateTelegramLinkToken().unwrap();
      setTelegramDeepLink(result.deepLink);
      setTelegramLinkCommand(`/start ${result.token}`);
      showToast('¡Listo! Abrí el link para vincular tu Telegram.', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Error al generar el link de Telegram'), 'error');
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

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown" className="rounded-2xl border border-[#282828] bg-[#121212] p-5 shadow-[0_0_20px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ImageUpload
                variant="avatar"
                name={String(formData.name ?? '')}
                lastname={String(formData.lastname ?? '')}
                currentUrl={formData.photoUrl ? String(formData.photoUrl) : null}
                onFileSelect={(file) => {
                  setPhotoFile(file);
                  setEditedFields((prev) => ({ ...prev, photoUrl: null }));
                }}
                helperText="Tocá para cambiar"
              />
              <div>
                <h1 className="text-[25px] font-semibold tracking-[-0.02em] text-white sm:text-[32px]">
                  {displayName || 'Mi perfil'}
                </h1>
                {(isBarber || role === 'Registrado') && (
                  <p className="mt-1 text-[12px] text-[#8A8A8A]">{roleTitle[role ?? '']}</p>
                )}
              </div>
            </div>

            {role && role !== 'Registrado' && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-[12px] font-medium text-purple-400">
                {roleTitle[role]}
              </span>
            )}
          </div>
        </AnimatedContainer>

        {(pageError || pageMessage) && (
          <AnimatedContainer animation="fadeIn" className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] px-4 py-3">
            <p className={`text-[13px] ${pageError ? 'text-red-400' : 'text-green-400'}`}>
              {pageError || pageMessage}
            </p>
          </AnimatedContainer>
        )}

        <AnimatedContainer animation="fadeInUp" className="rounded-2xl border border-[#282828] bg-[#121212] p-5">
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Nombre completo" value={displayName || '—'} />
                  <InfoRow label="Email" value={String(formData.email ?? '') || '—'} />
                  <InfoRow label="Teléfono" value={String(formData.phone ?? '') || '—'} />
                  {isBarber && (
                    <InfoRow label="Rol" value={roleTitle[role ?? ''] || '—'} />
                  )}
                </div>

                {!editingPersonal ? (
                  <div className="flex gap-3 pt-2">
                    <Button type="button" icon={FiEdit2} onClick={() => { setEditingPersonal(true); setPageError(null); setPageMessage(null); }}>
                      Editar perfil
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 pt-1">
                      <Input label="Nombre" value={String(formData.name ?? '')} onChange={handleFieldChange('name')} required placeholder="Nombre" />
                      <Input label="Apellido" value={String(formData.lastname ?? '')} onChange={handleFieldChange('lastname')} required placeholder="Apellido" />
                      <Input label="Email" type="email" value={String(formData.email ?? '')} onChange={handleFieldChange('email')} required placeholder="email@ejemplo.com" />
                      <Input label="Teléfono" value={String(formData.phone ?? '')} onChange={handleFieldChange('phone')} required placeholder="598 91 234 567" />
                    </div>
                    {emailChanged && (
                      <PasswordInput
                        label="Contraseña actual"
                        value={emailCurrentPassword}
                        onChange={(e) => {
                          setEmailCurrentPassword(e.target.value);
                          setEmailPasswordError(null);
                        }}
                        placeholder="Ingresá tu contraseña actual"
                        helperText="Requerida para confirmar el cambio de email"
                        error={emailPasswordError ?? undefined}
                      />
                    )}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button type="submit" icon={FiSave} loading={isSaving}>
                        Guardar cambios
                      </Button>
                      <Button type="button" variant="secondary" onClick={cancelPersonal}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'agenda' && isBarber && (
              <div className="grid gap-4">
                <div className="rounded-[20px] border border-[#282828] bg-[#1A1A1A] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FiSettings className="w-4 h-4 text-[#FF5C00]" />
                      <div>
                        <h3 className="text-[14px] font-semibold text-white">Configuración de reservas</h3>
                        <p className="text-[11px] text-[#8A8A8A]">Duración del turno y anticipación</p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" icon={barberConfigExpanded ? FiChevronUp : FiChevronDown} onClick={() => setBarberConfigExpanded(!barberConfigExpanded)}>
                      {barberConfigExpanded ? 'Colapsar' : 'Expandir'}
                    </Button>
                  </div>

                  {barberConfigExpanded && (
                    <div className="mt-4 grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input label="Duración del turno" type="number" min={1} value={String(formData.slotDuration ?? 30)} onChange={(e) => setEditedFields((prev) => ({ ...prev, slotDuration: Number(e.target.value) || 30 }))} required placeholder="30" helperText="En minutos" />
                        <Input label="Días máximos para reservar" type="number" min={1} value={String(formData.maxAdvanceDays ?? 30)} onChange={(e) => setEditedFields((prev) => ({ ...prev, maxAdvanceDays: Number(e.target.value) || 30 }))} required placeholder="30" helperText="Anticipación máxima" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] border border-[#282828] bg-[#1A1A1A] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <FiClock className="w-4 h-4 text-[#FF5C00]" />
                      <div>
                        <h3 className="text-[14px] font-semibold text-white">Horario semanal</h3>
                        <p className="text-[11px] text-[#8A8A8A]">
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
                      const isActive = Boolean(schedule[day.key].startTime) && Boolean(schedule[day.key].endTime);
                      const hasBreak = Boolean(schedule[day.key].breakStart) && Boolean(schedule[day.key].breakEnd);
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
                                    {schedule[day.key].startTime} - {schedule[day.key].endTime}
                                    {hasBreak && ` · Break ${schedule[day.key].breakStart} - ${schedule[day.key].breakEnd}`}
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
                                  value={schedule[day.key].startTime}
                                  onChange={handleDayChange(day.key, 'startTime')}
                                  className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 py-2 text-[13px] text-white outline-none transition-colors focus:border-[#FF5C00]"
                                />
                                <input
                                  type="time"
                                  aria-label={`Fin ${day.label}`}
                                  value={schedule[day.key].endTime}
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
                                      value={schedule[day.key].breakStart}
                                      onChange={handleDayChange(day.key, 'breakStart')}
                                      className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 py-2 text-[13px] text-white outline-none transition-colors focus:border-[#FF5C00]"
                                    />
                                    <input
                                      type="time"
                                      aria-label={`Break fin ${day.label}`}
                                      value={schedule[day.key].breakEnd}
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

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" icon={FiSave} loading={isSaving}>
                    Guardar cambios
                  </Button>
                  <Button type="button" variant="secondary" onClick={discardSchedule}>
                    Descartar cambios
                  </Button>
                </div>
              </div>
            )}
          </form>
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" className="rounded-2xl border border-[#282828] bg-[#121212] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiLock className="w-5 h-5 text-[#FF5C00]" />
              <h2 className="text-[18px] font-bold text-white">Cambiar contraseña</h2>
            </div>
            {!showChangePassword && (
              <Button type="button" variant="secondary" onClick={() => setShowChangePassword(true)}>
                Cambiar
              </Button>
            )}
          </div>

          {showChangePassword && (
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <PasswordInput
                  label="Contraseña actual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresá tu contraseña actual"
                  error={passwordFieldErrors.currentPassword}
                />
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isRequestingReset}
                  className="self-start text-[12px] text-[#8A8A8A] hover:text-[#FF5C00] transition-colors disabled:opacity-50"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <PasswordInput
                label="Nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres, mayúscula, minúscula y número"
                error={passwordFieldErrors.newPassword}
              />
              <PasswordInput
                label="Confirmar nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí la nueva contraseña"
                error={passwordFieldErrors.confirmPassword}
              />

              {passwordError && (
                <p className="text-[12px] text-red-400 text-center">{passwordError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleChangePassword}
                  loading={isChangingPassword}
                >
                  Actualizar contraseña
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError(null);
                    setPasswordFieldErrors({});
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </AnimatedContainer>

        {role === 'Registrado' && (
          <AnimatedContainer animation="fadeInUp" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FiSend className="w-5 h-5 text-[#FF5C00]" />
                <h2 className="text-[18px] font-bold text-white">Conectar Telegram</h2>
              </div>
              <Button
                type="button"
                variant="secondary"
                loading={isGeneratingTelegramLink}
                onClick={handleConnectTelegram}
              >
                Conectar
              </Button>
            </div>

            <p className="text-[13px] text-[#8A8A8A]">
              Vinculá tu Telegram para reservar, ver y cancelar turnos directamente desde el bot, usando tu cuenta.
            </p>

            {telegramDeepLink && telegramLinkCommand && (
              <div className="mt-3 grid gap-3">
                <a
                  href={telegramDeepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block w-fit text-[13px] text-[#FF5C00] hover:underline"
                >
                  Abrir en Telegram
                </a>

                <div className="grid gap-1.5">
                  <p className="text-[12px] text-[#8A8A8A]">
                    ¿Ya hablaste antes con el bot? El botón de arriba puede no mostrarte "Start". Pegá este comando
                    directo en el chat en su lugar (vence en 10 minutos):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-[#282828] bg-[#0A0A0A] px-3 py-2 text-[12px] text-white font-mono overflow-x-auto">
                      {telegramLinkCommand}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(telegramLinkCommand);
                        showToast('Comando copiado.', 'success');
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </AnimatedContainer>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
