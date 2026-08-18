import { useState, useMemo } from 'react';
import {
  FiSearch, FiUser, FiPlus, FiMinus, FiShoppingBag, FiGrid, FiCheck,
} from 'react-icons/fi';
import { Modal, Button, Spinner, useToast } from '../common';
import { useGetProductsQuery } from '../../services/productApi';
import { useCreateManualOrderMutation } from '../../services/orderApi';
import { useGetRegisteredClientsQuery } from '../../services/clientApi';
import { formatCurrency } from '../../utils/formatCurrency';
import type { Product } from '../../types/product';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ClientTab = 'registered' | 'anonymous';

const STATUS_OPTIONS: { value: 'pending' | 'paid' | 'delivered'; label: string; desc: string }[] = [
  { value: 'pending', label: 'Pendiente', desc: 'Falta pago y entrega' },
  { value: 'paid', label: 'Pagado', desc: 'Pago en local, falta entrega' },
  { value: 'delivered', label: 'Entregado', desc: 'Pagado y entregado en persona' },
];

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const { data: productsData, isLoading: loadingProducts } = useGetProductsQuery({ status: 'active' });
  const [createManualOrder, { isLoading: isCreating }] = useCreateManualOrderMutation();

  const [clientTab, setClientTab] = useState<ClientTab>('registered');
  const [searchClient, setSearchClient] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [anonymousName, setAnonymousName] = useState('');
  const [anonymousEmail, setAnonymousEmail] = useState('');
  const [anonymousPhone, setAnonymousPhone] = useState('');
const [cart, setCart] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<'pending' | 'paid' | 'delivered'>('pending');

  const {
    data: clientsData,
    isFetching: loadingClients,
  } = useGetRegisteredClientsQuery(undefined, {
    skip: !isOpen || clientTab !== 'registered',
  });

  const clients = useMemo(() => clientsData?.clients ?? [], [clientsData]);

  const products = useMemo(
    () => (productsData as { products: Product[] } | undefined)?.products ?? [],
    [productsData]
  );

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!searchClient) return clients;
    const q = searchClient.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.lastname.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, searchClient]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        return { product, quantity };
      })
      .filter((item) => item.product);
  }, [cart, products]);

  const total = cartItems.reduce((sum, item) => sum + item.product!.price * item.quantity, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const rest = { ...prev };
        delete rest[productId];
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleCreate = async () => {
    if (clientTab === 'registered' && !selectedClientId) {
      showToast('Selecciona un cliente registrado', 'error');
      return;
    }
    if (clientTab === 'anonymous' && !anonymousName.trim()) {
      showToast('Ingresa el nombre del cliente', 'error');
      return;
    }
    if (cartItems.length === 0) {
      showToast('Agrega al menos un producto', 'error');
      return;
    }

    try {
      await createManualOrder({
        items: cartItems.map(({ product, quantity }) => ({ productId: product!.id, quantity })),
        userId: clientTab === 'registered' ? selectedClientId ?? undefined : undefined,
        clientName: clientTab === 'anonymous' ? anonymousName.trim() : undefined,
        clientEmail: clientTab === 'anonymous' ? anonymousEmail.trim() || undefined : undefined,
        clientPhone: clientTab === 'anonymous' ? anonymousPhone.trim() || undefined : undefined,
        status,
      }).unwrap();
      showToast('Orden creada con exito');
      setCart({});
      setSelectedClientId(null);
      setAnonymousName('');
      setAnonymousEmail('');
      setAnonymousPhone('');
      onClose();
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error || 'Error al crear la orden';
      showToast(msg, 'error');
    }
  };

  const resetAndClose = () => {
    setCart({});
    setSelectedClientId(null);
    setAnonymousName('');
    setAnonymousEmail('');
    setAnonymousPhone('');
    setClientTab('registered');
    setSearchClient('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Crear orden manual" size="xl">
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Cliente + Productos */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Cliente */}
          <div>
            <p className="text-[11px] text-[#6A6A6A] font-medium uppercase tracking-wider mb-2">Cliente</p>
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setClientTab('registered')}
                className={`flex-1 rounded-[8px] py-2 text-[12px] font-medium transition-colors ${
                  clientTab === 'registered' ? 'bg-[#FF5C00]/10 text-[#FF5C00]' : 'bg-[#1A1A1A] text-[#8A8A8A] hover:text-white'
                }`}
              >
                <FiUser size={12} className="inline mr-1" />
                Registrado
              </button>
              <button
                onClick={() => setClientTab('anonymous')}
                className={`flex-1 rounded-[8px] py-2 text-[12px] font-medium transition-colors ${
                  clientTab === 'anonymous' ? 'bg-[#FF5C00]/10 text-[#FF5C00]' : 'bg-[#1A1A1A] text-[#8A8A8A] hover:text-white'
                }`}
              >
                <FiUser size={12} className="inline mr-1" />
                Nuevo
              </button>
            </div>

            {clientTab === 'registered' ? (
              <div>
                <div className="relative mb-2">
                  <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A6A]" />
                  <input
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full h-[36px] rounded-[8px] border border-[#282828] bg-[#1A1A1A] pl-9 pr-3 text-[13px] text-white outline-none focus:border-[#FF5C00] placeholder:text-[#555]"
                  />
                </div>
                {loadingClients ? (
                  <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                ) : (
                  <div className="max-h-[160px] overflow-y-auto space-y-1">
                    {filteredClients.slice(0, 30).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClientId(selectedClientId === c.id ? null : c.id)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-[8px] text-left transition-colors cursor-pointer ${
                          selectedClientId === c.id ? 'bg-[#FF5C00]/10 border border-[#FF5C00]/30' : 'hover:bg-[#1A1A1A] border border-transparent'
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
                        {selectedClientId === c.id && <FiCheck size={14} className="text-[#FF5C00] shrink-0" />}
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <p className="text-[12px] text-[#6A6A6A] text-center py-3">Sin resultados</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={anonymousName}
                  onChange={(e) => setAnonymousName(e.target.value)}
                  placeholder="Nombre del cliente *"
                  className="w-full h-[36px] rounded-[8px] border border-[#282828] bg-[#1A1A1A] px-3 text-[13px] text-white outline-none focus:border-[#FF5C00] placeholder:text-[#555]"
                />
                <input
                  value={anonymousEmail}
                  onChange={(e) => setAnonymousEmail(e.target.value)}
                  placeholder="Email (opcional)"
                  className="w-full h-[36px] rounded-[8px] border border-[#282828] bg-[#1A1A1A] px-3 text-[13px] text-white outline-none focus:border-[#FF5C00] placeholder:text-[#555]"
                />
                <input
                  value={anonymousPhone}
                  onChange={(e) => setAnonymousPhone(e.target.value)}
                  placeholder="Telefono (opcional)"
                  className="w-full h-[36px] rounded-[8px] border border-[#282828] bg-[#1A1A1A] px-3 text-[13px] text-white outline-none focus:border-[#FF5C00] placeholder:text-[#555]"
                />
              </div>
            )}
          </div>

          {/* Productos */}
          <div>
            <p className="text-[11px] text-[#6A6A6A] font-medium uppercase tracking-wider mb-2">Productos</p>
            {loadingProducts ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto">
                {products
                  .filter((p) => p.status === 'active')
                  .map((product) => {
                    const qty = cart[product.id] ?? 0;
                    return (
                      <div
                        key={product.id}
                        className={`rounded-[10px] border p-2 transition-all ${
                          qty > 0 ? 'border-[#FF5C00]/50 bg-[#FF5C00]/5' : 'border-[#282828] bg-[#1A1A1A]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 shrink-0 rounded-[6px] bg-[#242424] border border-[#333] overflow-hidden flex items-center justify-center">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FiGrid size={14} className="text-[#555]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-white truncate">{product.name}</p>
                            <p className="text-[11px] text-[#6A6A6A]">{formatCurrency(product.price)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-[#555]">Stock: {product.stock}</span>
                          <div className="flex items-center gap-1">
                            {qty > 0 && (
                              <>
                                <button
                                  onClick={() => updateQty(product.id, -1)}
                                  className="w-6 h-6 rounded-[4px] bg-[#282828] text-white flex items-center justify-center hover:bg-[#333] transition-colors cursor-pointer"
                                >
                                  <FiMinus size={10} />
                                </button>
                                <span className="text-[12px] font-medium text-white w-4 text-center">{qty}</span>
                              </>
                            )}
                            <button
                              onClick={() => updateQty(product.id, 1)}
                              disabled={product.stock <= 0 || qty >= product.stock}
                              className="w-6 h-6 rounded-[4px] bg-[#FF5C00] text-white flex items-center justify-center hover:bg-[#FF5C00]/80 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <FiPlus size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Estado */}
          <div>
            <p className="text-[11px] text-[#6A6A6A] font-medium uppercase tracking-wider mb-2">Estado inicial</p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`rounded-[10px] border p-2.5 text-center transition-all cursor-pointer ${
                    status === opt.value
                      ? 'border-[#FF5C00]/50 bg-[#FF5C00]/5'
                      : 'border-[#282828] bg-[#1A1A1A] hover:border-[#383838]'
                  }`}
                >
                  <p className="text-[12px] font-medium text-white">{opt.label}</p>
                  <p className="text-[10px] text-[#6A6A6A] mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Resumen */}
        <div className="lg:w-[260px] shrink-0">
          <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4 lg:sticky lg:top-4">
            <p className="text-[11px] text-[#6A6A6A] font-medium uppercase tracking-wider mb-3">Resumen</p>

            {selectedClient && (
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#282828]">
                <div className="w-8 h-8 rounded-full bg-[#242424] border border-[#333] shrink-0 overflow-hidden flex items-center justify-center">
                  {selectedClient.photoUrl ? (
                    <img src={selectedClient.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FiUser size={14} className="text-[#555]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] text-white truncate">{selectedClient.name} {selectedClient.lastname}</p>
                  <p className="text-[10px] text-[#6A6A6A] truncate">{selectedClient.email}</p>
                </div>
              </div>
            )}

            {clientTab === 'anonymous' && anonymousName && (
              <div className="mb-3 pb-3 border-b border-[#282828]">
                <p className="text-[12px] text-white">{anonymousName}</p>
                {anonymousEmail && <p className="text-[10px] text-[#6A6A6A]">{anonymousEmail}</p>}
              </div>
            )}

            {clientTab === 'registered' && !selectedClient && (
              <p className="text-[12px] text-[#6A6A6A] mb-3 pb-3 border-b border-[#282828]">Sin cliente seleccionado</p>
            )}

            {clientTab === 'anonymous' && !anonymousName && (
              <p className="text-[12px] text-[#6A6A6A] mb-3 pb-3 border-b border-[#282828]">Sin nombre ingresado</p>
            )}

            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <FiShoppingBag size={24} className="text-[#555] mb-2" />
                <p className="text-[12px] text-[#6A6A6A]">Agrega productos</p>
              </div>
            ) : (
              <div className="space-y-1.5 mb-3 max-h-[200px] overflow-y-auto">
                {cartItems.map(({ product, quantity }) => (
                  <div key={product!.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#8A8A8A] truncate flex-1 mr-2">
                      {product!.name}
                      <span className="text-[#555] ml-1">x{quantity}</span>
                    </span>
                    <span className="text-white shrink-0">{formatCurrency(product!.price * quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-[13px] font-medium pt-3 border-t border-[#282828]">
              <span className="text-[#8A8A8A]">{itemCount} items</span>
              <span className="text-[#FF5C00] font-bold text-[16px]">{formatCurrency(total)}</span>
            </div>

            <div className="mt-3 space-y-2">
              <Button
                className="w-full"
                onClick={handleCreate}
                loading={isCreating}
                disabled={cartItems.length === 0}
              >
                <FiCheck className="mr-1" size={14} />
                Crear orden
              </Button>
              <Button variant="ghost" className="w-full" onClick={resetAndClose}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateOrderModal;
