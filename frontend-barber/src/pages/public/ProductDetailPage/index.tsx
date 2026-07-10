import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductDetail from '../../../components/product/ProductDetail';
import PaymentModal from '../../../components/payment/PaymentModal';
import { getAccessToken } from '../../../services/api';
import { useCreateOrderMutation } from '../../../services/orderApi';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [createOrder] = useCreateOrderMutation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [preferenceId, setPreferenceId] = useState('');

  const handleBack = () => navigate('/tienda');

  const handleAddToCart = async (_productId: string) => {
    navigate('/tienda');
  };

  const handleBuyNow = async (productId: string) => {
    const token = getAccessToken();
    if (!token) {
      navigate('/login?returnUrl=/tienda');
      return;
    }
    try {
      const result = await createOrder({
        items: [{ productId, quantity: 1 }],
      }).unwrap();
      if (result.preferenceId) {
        setPreferenceId(result.preferenceId);
        setShowPaymentModal(true);
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
      <PaymentModal
        isOpen={showPaymentModal}
        preferenceId={preferenceId}
        onClose={handlePaymentClose}
        title="Pagar producto"
      />
    </div>
  );
}
