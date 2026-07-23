import { FiShoppingBag } from 'react-icons/fi';
import { Modal } from '../common';
import type { OrderItem } from '../../types/order';
import { formatCurrency } from '../../utils/formatCurrency';

interface ProductDetailModalProps {
  item: OrderItem | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <Modal isOpen={!!item} onClose={onClose} title="Producto en esta orden" size="md">
      <p className="text-[11px] text-[#6A6A6A] mb-4 -mt-2">
        Datos registrados al momento de la compra. Pueden diferir del estado actual del producto.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-[180px] shrink-0 aspect-square rounded-[12px] bg-[#1A1A1A] border border-[#282828] overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <FiShoppingBag size={28} className="text-[#555]" />
              <span className="text-[10px] text-[#555]">Sin imagen</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-bold text-white">{item.name}</h3>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-[14px]">
              <span className="text-[#6A6A6A] w-20 shrink-0">Precio unit.</span>
              <span className="text-white font-medium">{formatCurrency(item.price)}</span>
            </div>
            <div className="flex items-center gap-2 text-[14px]">
              <span className="text-[#6A6A6A] w-20 shrink-0">Cantidad</span>
              <span className="text-white font-medium">x{item.quantity}</span>
            </div>
            <div className="flex items-center gap-2 text-[14px] pt-2 border-t border-[#282828]">
              <span className="text-[#6A6A6A] w-20 shrink-0">Subtotal</span>
              <span className="text-[#FF5C00] font-bold text-[18px]">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ProductDetailModal;
