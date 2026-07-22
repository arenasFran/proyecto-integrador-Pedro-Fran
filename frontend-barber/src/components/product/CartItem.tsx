import { FiPlus, FiMinus, FiTrash2 } from 'react-icons/fi';
import type { CartItem as CartItemType } from '../../store/slices/cartSlice';
import { formatCurrency } from '../../utils/formatCurrency';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="flex gap-3 rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-3">
      {item.product.imageUrl && (
        <img
          src={item.product.imageUrl}
          alt={item.product.name}
          className="h-16 w-16 rounded-[8px] object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white truncate">
          {item.product.name}
        </p>
        <p className="text-[12px] text-[#FF5C00] font-semibold mt-0.5">
          {formatCurrency(item.product.price)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#282828] text-[#8A8A8A] hover:text-white"
          >
            <FiMinus size={12} />
          </button>
          <span className="text-[13px] text-white w-6 text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#282828] text-[#8A8A8A] hover:text-white"
          >
            <FiPlus size={12} />
          </button>
          <button
            onClick={() => onRemove(item.product.id)}
            className="ml-auto text-[#8A8A8A] hover:text-red-400"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
