import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCreditCard, FiMapPin, FiX } from 'react-icons/fi';
import ProductDetail from '../../../components/product/ProductDetail';
import PaymentModal from '../../../components/payment/PaymentModal';
import { getAccessToken } from '../../../services/api';
import { useCreateOrderMutation } from '../../../services/orderApi';
import { Button } from '../../../components/common';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [createOrder] = useCreateOrderMutation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [preferenceId, setPreferenceId] = useState('');
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [pendingProductId, setPendingProductId] = useState('');

  const handleBack = () => navigate('/tienda');

  const handleAddToCart = async (_productId: string) => {
    navigate('/tienda');
  };

  const handleBuyNow = (productId: string) => {
    const token = getAccessToken();
    if (!token) {
      navigate('/login?returnUrl=/tienda');
      return;
    }
    setPendingProductId(productId);
    setShowPaymentChoice(true);
  };

  const handleBuyNowPayment = async (paymentMethod: 'online' | 'local') => {
    if (!pendingProductId) return;
    try {
      const result = await createOrder({
        items: [{ productId: pendingProductId, quantity: 1 }],
        paymentMethod,
      }).unwrap();
      setShowPaymentChoice(false);
      setPendingProductId('');

      if (paymentMethod === 'online' && result.preferenceId) {
        setPreferenceId(result.preferenceId);
        setShowPaymentModal(true);
      } else {
        navigate('/mis-ordenes');
      }
    } catch {
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPreferenceId('');
    navigate('/mis-ordenes');
  };

  if (!id) {
    navigate('/tienda');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <ProductDetail
        productId={id}
        onBack={handleBack}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {showPaymentChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[24px] border border-[#282828] bg-[#121212] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-white">Elegí cómo pagar</h2>
              <button
                onClick={() => { setShowPaymentChoice(false); setPendingProductId(''); }}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#8A8A8A] hover:text-white hover:bg-[#1A1A1A] transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>
            <p className="text-[13px] text-[#8A8A8A] mb-5">Seleccioná tu método de pago</p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                icon={FiCreditCard}
                onClick={() => handleBuyNowPayment('online')}
              >
                Pagar online con MercadoPago
              </Button>
              <Button
                className="w-full"
                variant="outline"
                icon={FiMapPin}
                onClick={() => handleBuyNowPayment('local')}
              >
                Pago al levantar en el local
              </Button>
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        preferenceId={preferenceId}
        onClose={handlePaymentClose}
        title="Pagar producto"
      />
    </div>
  );
}
