import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../../components/common';
import ProductDetail from '../../../components/product/ProductDetail';
import { getAccessToken } from '../../../services/api';
import { useCreateOrderMutation } from '../../../services/orderApi';
import { useGetProductByIdQuery } from '../../../services/productApi';
import { useAppDispatch } from '../../../store/hooks';
import { addItem, openCart } from '../../../store/slices/cartSlice';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [createOrder, { isLoading: isBuying }] = useCreateOrderMutation();
  const { data: productData } = useGetProductByIdQuery(id ?? '', { skip: !id });
  const { showToast } = useToast();

  const handleBack = () => navigate('/tienda');

  const handleAddToCart = async () => {
    const product = productData?.product;
    if (!product) {
      navigate('/tienda');
      return;
    }
    dispatch(addItem({ product }));
    dispatch(openCart());
    showToast('Producto agregado al carrito');
  };

  const handleBuyNow = async (productId?: string) => {
    const token = getAccessToken();
    if (!token) {
      navigate('/login?returnUrl=/tienda');
      return;
    }
    if (!productId) return;
    try {
      await createOrder({
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'local',
      }).unwrap();
      navigate('/mis-ordenes');
    } catch {
      showToast('No se pudo crear la orden. Intentá de nuevo.', 'error');
    }
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
        isBuying={isBuying}
      />

    </div>
  );
}
