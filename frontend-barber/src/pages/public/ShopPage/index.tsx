import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiSearch, FiCreditCard, FiMapPin, FiX } from 'react-icons/fi';
import { CartDrawer } from '../../../components/client/ecommerce/CartDrawer';
import ProductList from '../../../components/product/ProductList';
import PaymentModal from '../../../components/payment/PaymentModal';
import { useGetProductsQuery, useGetCategoriesQuery } from '../../../services/productApi';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { addItem, openCart, clearCheckoutResult } from '../../../store/slices/cartSlice';
import { getAccessToken } from '../../../services/api';
import { useCreateOrderMutation } from '../../../services/orderApi';
import type { Product } from '../../../types/product';
import { Button } from '../../../components/common';
import { formatCurrency } from '../../../utils/formatCurrency';

export default function ShopPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [preferenceId, setPreferenceId] = useState('');
  const [buyNowProduct, setBuyNowProduct] = useState<Product | null>(null);

  const checkoutPrefId = useAppSelector((state) => state.cart.checkoutPreferenceId);

  const { data: productsData, isLoading } = useGetProductsQuery({
    category: selectedCategory || undefined,
    search: searchTerm || undefined,
  });
  const { data: categoriesData } = useGetCategoriesQuery();

  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();

  const categories = categoriesData?.categories ?? [];
  const products = productsData?.products ?? [];

  const isCheckoutPref = !!checkoutPrefId;
  const effectivePreferenceId = preferenceId || checkoutPrefId || '';
  const isPaymentModalOpen = showPaymentModal || isCheckoutPref;

  const handleAddToCart = (product: Product) => {
    dispatch(addItem({ product }));
  };

  const handleBuyNow = (product: Product) => {
    const token = getAccessToken();
    if (!token) {
      navigate('/login?returnUrl=/tienda');
      return;
    }
    setBuyNowProduct(product);
  };

  const handleBuyNowPayment = async (paymentMethod: 'online' | 'local') => {
    if (!buyNowProduct) return;
    try {
      const result = await createOrder({
        items: [{ productId: buyNowProduct.id, quantity: 1 }],
        paymentMethod,
      }).unwrap();
      setBuyNowProduct(null);

      if (paymentMethod === 'online' && result.preferenceId) {
        setPreferenceId(result.preferenceId);
        setShowPaymentModal(true);
      } else {
        navigate('/mis-ordenes');
      }
    } catch {
      // El error de creación de orden se ignora: la UI ya muestra el fallo del flujo.
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPreferenceId('');
    if (checkoutPrefId) {
      dispatch(clearCheckoutResult());
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <CartDrawer />

      {buyNowProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[24px] border border-[#282828] bg-[#121212] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-white">Elegí cómo pagar</h2>
              <button
                onClick={() => setBuyNowProduct(null)}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#8A8A8A] hover:text-white hover:bg-[#1A1A1A] transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>
            <p className="text-[13px] text-[#8A8A8A] mb-5">
              <span className="text-white font-medium">{buyNowProduct.name}</span> — {formatCurrency(buyNowProduct.price)}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                icon={FiCreditCard}
                onClick={() => handleBuyNowPayment('online')}
                loading={isCreatingOrder}
              >
                Pagar online con MercadoPago
              </Button>
              <Button
                className="w-full"
                variant="outline"
                icon={FiMapPin}
                onClick={() => handleBuyNowPayment('local')}
                loading={isCreatingOrder}
              >
                Pago al levantar en el local
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-white">
              Tienda
            </h1>
            <p className="text-[13px] text-[#8A8A8A] mt-1">
              Productos de barbería y cuidado personal
            </p>
          </div>
          <button
            onClick={() => dispatch(openCart())}
            className="relative flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#282828] bg-[#1A1A1A] hover:border-[#555] transition-colors"
          >
            <FiShoppingCart className="text-[#FF5C00]" size={18} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]" size={16} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-[13px] text-white placeholder-[#555] outline-none focus:border-[#FF5C00]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('')}
              className={`whitespace-nowrap rounded-[10px] border px-4 py-2 text-[12px] font-medium transition-all ${
                !selectedCategory
                  ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-[#FF5C00]'
                  : 'border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:border-[#555]'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-[10px] border px-4 py-2 text-[12px] font-medium transition-all ${
                  selectedCategory === cat
                    ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-[#FF5C00]'
                    : 'border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:border-[#555]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <ProductList
          products={products}
          isLoading={isLoading}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onViewDetail={(product) => navigate(`/producto/${product.id}`)}
        />
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        preferenceId={effectivePreferenceId}
        onClose={handlePaymentClose}
        title="Pagar orden"
      />
    </div>
  );
}
