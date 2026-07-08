import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiGrid, FiSearch } from 'react-icons/fi';
import { AnimatedContainer, Button, Spinner } from '../../../components/common';
import { PublicHeader } from '../../../components/client/PublicHeader';
import { CartDrawer } from '../../../components/client/ecommerce/CartDrawer';
import PaymentModal from '../../../components/payment/PaymentModal';
import { useGetProductsQuery, useGetCategoriesQuery } from '../../../services/productApi';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { addItem, openCart, clearCheckoutResult } from '../../../store/slices/cartSlice';
import { getAccessToken } from '../../../services/api';
import { useCreateOrderMutation } from '../../../services/orderApi';
import type { Product } from '../../../types/product';

export default function ShopPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPreferenceId, setPaymentPreferenceId] = useState('');
  const [paymentId, setPaymentId] = useState('');

  const checkoutResult = useAppSelector((state) => ({
    preferenceId: state.cart.checkoutPreferenceId,
    paymentId: state.cart.checkoutPaymentId,
  }));

  const { data: productsData, isLoading } = useGetProductsQuery({
    category: selectedCategory || undefined,
    search: searchTerm || undefined,
  });
  const { data: categoriesData } = useGetCategoriesQuery();

  const [createOrder] = useCreateOrderMutation();

  const categories = categoriesData?.categories ?? [];
  const products = productsData?.products ?? [];

  useEffect(() => {
    if (checkoutResult.preferenceId) {
      setPaymentPreferenceId(checkoutResult.preferenceId);
      setPaymentId(checkoutResult.paymentId || '');
      setShowPaymentModal(true);
      dispatch(clearCheckoutResult());
    }
  }, [checkoutResult, dispatch]);

  const handleAddToCart = (product: Product) => {
    dispatch(addItem({ product }));
  };

  const handleBuyNow = async (product: Product) => {
    const token = getAccessToken();
    if (!token) {
      navigate('/login?returnUrl=/tienda');
      return;
    }
    try {
      const result = await createOrder({
        items: [{ productId: product.id, quantity: 1 }],
      }).unwrap();
      if (result.preferenceId) {
        setPaymentPreferenceId(result.preferenceId);
        setPaymentId(result.paymentId || '');
        setShowPaymentModal(true);
      }
    } catch {
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPaymentPreferenceId('');
    setPaymentId('');
    navigate('/mis-ordenes');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <PublicHeader />
      <CartDrawer />

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

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
            <FiGrid className="text-4xl mb-3" />
            <p className="text-[15px]">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <AnimatedContainer key={product.id} animation="fadeInUp" delay={index * 0.05}>
                <div className="group rounded-[16px] border border-[#282828] bg-[#121212] overflow-hidden hover:border-[#555] transition-all">
                  <div className="aspect-square bg-[#1A1A1A] overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#282828]">
                        <FiGrid size={32} />
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-[11px] text-[#555] uppercase tracking-wider">{product.category}</p>
                    <p className="text-[13px] font-semibold text-white leading-tight">{product.name}</p>
                    <p className="text-[15px] font-bold text-[#FF5C00]">${product.price}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-[11px]"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                      >
                        {product.stock === 0 ? 'Sin stock' : 'Agregar'}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-[11px]"
                        onClick={() => handleBuyNow(product)}
                        disabled={product.stock === 0}
                      >
                        Comprar
                      </Button>
                    </div>
                  </div>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        preferenceId={paymentPreferenceId}
        paymentId={paymentId}
        onClose={handlePaymentClose}
        title="Pagar orden"
      />
    </div>
  );
}
