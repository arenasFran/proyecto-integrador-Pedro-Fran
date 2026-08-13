import { useMemo, useState, useEffect, useRef } from 'react';
import { FiX, FiDollarSign, FiGift, FiUser } from 'react-icons/fi';
import { Modal, Button, Input, useToast } from '../../../../components/common';
import { useCreateMembershipMutation } from '../../../../services/membershipApi';
import { useGetClientesListQuery } from '../../../../services/analyticsApi';
import type { ClienteData } from '../../../../types/analytics';
import { formatCurrency } from '../../../../utils/formatCurrency';

type CreateMembershipModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const CreateMembershipModal: React.FC<CreateMembershipModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [backendSearch, setBackendSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClienteData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'local' | 'courtesy'>('local');
  const [price, setPrice] = useState<string>('399');
  const [couponsTotal, setCouponsTotal] = useState<string>('4');
  const [productDiscount, setProductDiscount] = useState<string>('10');
  const [durationDays, setDurationDays] = useState<string>('30');
  const [showList, setShowList] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [createMembership, { isLoading }] = useCreateMembershipMutation();

  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setBackendSearch('');
      setShowList(true);
    }
  }

  const desde = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  }, []);
  const hasta = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = { desde, hasta };
    if (backendSearch) p.search = backendSearch;
    return p;
  }, [desde, hasta, backendSearch]);

  const { data: clients = [], isFetching } = useGetClientesListQuery(
    queryParams as { desde: string; hasta: string; search?: string },
    { refetchOnMountOrArgChange: true }
  );

  const filteredClients = clients as ClienteData[];

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setSelectedClient(null);
    setShowList(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBackendSearch(value.trim());
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setBackendSearch(searchInput.trim());
      setSelectedClient(null);
      setShowList(true);
    }
  };

  const handleFocus = () => {
    setShowList(true);
  };

  const priceError = (() => {
    if (paymentMethod === 'courtesy') return undefined;
    const num = Number(price);
    if (isNaN(num) || num < 0) return 'Monto inválido';
    if (num === 0) return 'El monto no puede ser 0';
    return undefined;
  })();

  const couponsError = (() => {
    const num = Number(couponsTotal);
    if (isNaN(num) || num < 1 || num > 12) return '1-12 cupones';
    return undefined;
  })();

  const discountError = (() => {
    const num = Number(productDiscount);
    if (isNaN(num) || num < 0 || num > 100) return '0-100%';
    return undefined;
  })();

  const durationError = (() => {
    const num = Number(durationDays);
    if (isNaN(num) || num < 1 || num > 365) return '1-365 días';
    return undefined;
  })();

  const isValid = !!selectedClient && !priceError && !couponsError && !discountError && !durationError;

  const resetForm = () => {
    setSelectedClient(null);
    setSearchInput('');
    setBackendSearch('');
    setShowList(false);
    setPaymentMethod('local');
    setPrice('399');
    setCouponsTotal('4');
    setProductDiscount('10');
    setDurationDays('30');
  };

  const handleCreate = async () => {
    if (!isValid || !selectedClient?.clientId) return;
    try {
      await createMembership({
        userId: selectedClient.clientId,
        paymentMethod: 'local',
        price: paymentMethod === 'courtesy' ? 0 : Number(price),
        couponsTotal: Number(couponsTotal),
        productDiscount: Number(productDiscount),
        durationDays: Number(durationDays),
      }).unwrap();
      showToast('Membresía creada correctamente', 'success');
      resetForm();
      onClose();
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } | string; message?: string };
      const msg = (typeof e.data === 'object' && e.data ? e.data.error : e.data) ?? e.message ?? 'Error al crear la membresía';
      showToast(String(msg), 'error');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const endDateEstimate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + Number(durationDays));
    return d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  const isCourtesy = paymentMethod === 'courtesy';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva membresía" size="lg">
      <div className="flex flex-col gap-5">

        {/* ===== TWO-COLUMN LAYOUT: Search left, Settings right ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

          {/* ===== LEFT: Client search + list ===== */}
          <div className="flex flex-col gap-3 min-w-0">
            <p className="text-[11px] font-semibold text-[#6A6A6A] uppercase tracking-wider">Cliente</p>

            <Input
              value={searchInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder="Nombre, apellido, email o teléfono..."
              label=""
            />

            {showList && !selectedClient && (
              <div className="max-h-64 overflow-y-auto rounded-[12px] border border-[#282828] bg-[#1A1A1A]">
                {isFetching ? (
                  <p className="text-[13px] text-[#8A8A8A] p-4 text-center">Buscando...</p>
                ) : filteredClients.length === 0 ? (
                  <p className="text-[13px] text-[#8A8A8A] p-4 text-center">
                    {searchInput.trim() ? `Sin resultados para "${searchInput}"` : 'No hay clientes registrados'}
                  </p>
                ) : (
                  filteredClients.map((c: ClienteData) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => { setSelectedClient(c); setShowList(false); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#242424] transition-colors border-b border-[#282828] last:border-b-0 min-h-[60px]"
                      aria-label={`Seleccionar ${c.clientName} ${c.clientLastname}`}
                    >
                      {c.clientPhotoUrl ? (
                        <img
                          src={c.clientPhotoUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover shrink-0 bg-[#282828]"
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-[#282828] flex items-center justify-center shrink-0 ${c.clientPhotoUrl ? 'hidden' : ''}`}>
                        <FiUser className="text-[#6A6A6A] text-base" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-white font-medium truncate">
                          {c.clientName} {c.clientLastname}
                        </p>
                        {(c.clientEmail || c.clientPhone) && (
                          <p className="text-[11px] text-[#6A6A6A] truncate mt-0.5">
                            {[c.clientEmail, c.clientPhone].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      {c.membershipStatus === 'active' && (
                        <span className="text-[10px] bg-[#22C55E]/15 text-[#22C55E] rounded-full px-2 py-0.5 shrink-0">
                          Activa
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedClient && (
              <>
                <div className="flex items-center justify-between rounded-[12px] bg-[#FF5C00]/5 border border-[#FF5C00]/30 px-4 py-3 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedClient.clientPhotoUrl ? (
                      <img src={selectedClient.clientPhotoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 bg-[#282828]" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#282828] flex items-center justify-center shrink-0">
                        <FiUser className="text-[#6A6A6A] text-sm" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[13px] text-white font-medium truncate block">
                        {selectedClient.clientName} {selectedClient.clientLastname}
                      </span>
                      {(selectedClient.clientEmail || selectedClient.clientPhone) && (
                        <p className="text-[11px] text-[#8A8A8A] truncate">
                          {[selectedClient.clientEmail, selectedClient.clientPhone].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedClient(null)}
                    className="text-[#8A8A8A] hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                    aria-label="Quitar cliente"
                  >
                    <FiX size={16} />
                  </button>
                </div>
                {isCourtesy && (
                  <div className="rounded-[10px] bg-[#FFB800]/5 border border-[#FFB800]/20 p-3">
                    <p className="text-[12px] text-[#FFB800]">
                      Sin costo. No se contabiliza en estadísticas de ingresos.
                    </p>
                  </div>
                )}
              </>
            )}

            {!showList && !selectedClient && (
              <p className="text-[12px] text-[#6A6A6A] text-center py-2">
                Hacé foco en el buscador para ver los clientes
              </p>
            )}
          </div>

          {/* ===== RIGHT: Settings ===== */}
          <fieldset disabled={!selectedClient} className="contents">
            <div className="flex flex-col gap-4">

              {/* Payment toggles */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('local'); if (price === '0') setPrice('399'); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-[10px] border text-[13px] font-medium transition-colors min-h-[44px] ${
                      paymentMethod === 'local'
                        ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-[#FF5C00]'
                        : 'border-[#282828] bg-[#1A1A1A] text-[#8A8A8A]'
                    }`}
                  >
                    <FiDollarSign size={16} />
                    Pago en local
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('courtesy'); setPrice('0'); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-[10px] border text-[13px] font-medium transition-colors min-h-[44px] ${
                      paymentMethod === 'courtesy'
                        ? 'border-[#FFB800] bg-[#FFB800]/10 text-[#FFB800]'
                        : 'border-[#282828] bg-[#1A1A1A] text-[#8A8A8A]'
                    }`}
                  >
                    <FiGift size={16} />
                    Cortesía
                  </button>
                </div>

              </div>

              {/* ROW 1: Monto + Vigencia */}
              <div className="flex gap-3">
                {!isCourtesy && (
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#8A8A8A]" htmlFor="membership-price">
                      Monto ($)
                    </label>
                    <Input
                      id="membership-price"
                      type="number"
                      value={price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
                      error={priceError}
                      min={0}
                      label=""
                      className="hide-number-arrows"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#8A8A8A]" htmlFor="duration-days">
                    Vigencia (días)
                  </label>
                  <Input
                    id="duration-days"
                    type="number"
                    value={durationDays}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationDays(e.target.value)}
                    error={durationError}
                    min={1}
                    max={365}
                    label=""
                    className="hide-number-arrows"
                  />
                  <p className="text-[10px] text-[#6A6A6A]">Vence el {endDateEstimate}</p>
                </div>
              </div>

              {/* ROW 2: Cupones + Descuento */}
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#8A8A8A]" htmlFor="coupons-total">
                    Cupones
                  </label>
                  <Input
                    id="coupons-total"
                    type="number"
                    value={couponsTotal}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCouponsTotal(e.target.value)}
                    error={couponsError}
                    min={1}
                    max={12}
                    label=""
                    className="hide-number-arrows"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#8A8A8A]" htmlFor="product-discount">
                    Descuento (%)
                  </label>
                  <Input
                    id="product-discount"
                    type="number"
                    value={productDiscount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductDiscount(e.target.value)}
                    error={discountError}
                    min={0}
                    max={100}
                    label=""
                    className="hide-number-arrows"
                  />
                </div>
              </div>
            </div>
          </fieldset>
        </div>

        {/* ===== SUMMARY (full width) ===== */}
        <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4">
          <div className="grid grid-cols-2 gap-y-2 text-[12px]">
            <span className="text-[#8A8A8A]">Vigencia</span>
            <span className="text-white text-right">{durationDays} días (vence {endDateEstimate})</span>
            <span className="text-[#8A8A8A]">Beneficios</span>
            <span className="text-white text-right">{couponsTotal} cupones + {productDiscount}% desc.</span>
            <span className="text-[#8A8A8A]">Cliente</span>
            <span className="text-right">
              {selectedClient ? (
                selectedClient.membershipStatus === 'active'
                  ? <span className="text-[#22C55E] text-[11px] font-medium">Ya tiene membresía activa</span>
                  : <span className="text-[#8A8A8A] text-[11px]">Sin membresía activa</span>
              ) : (
                <span className="text-[#6A6A6A] text-[11px]">—</span>
              )}
            </span>
            <span className="text-[#8A8A8A]">Total</span>
            <span className={`text-right font-semibold ${isCourtesy ? 'text-[#FFB800]' : 'text-[#22C55E]'}`}>
              {isCourtesy ? 'Cortesía' : formatCurrency(Number(price))}
            </span>
          </div>
        </div>

        {/* ===== ACTIONS ===== */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            loading={isLoading}
            disabled={!isValid}
            onClick={handleCreate}
          >
            {isCourtesy ? 'Otorgar cortesía' : 'Crear membresía'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
