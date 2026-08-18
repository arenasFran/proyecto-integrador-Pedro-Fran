import { FiGrid, FiShoppingCart } from 'react-icons/fi';
import { Button } from '../common';
import type { Product } from '../../types/product';
import { formatCurrency } from '../../utils/formatCurrency';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onViewDetail?: (product: Product) => void;
  discountPercent?: number;
}

export default function ProductCard({ product, onAddToCart, onBuyNow, onViewDetail, discountPercent = 0 }: ProductCardProps) {
  const outOfStock = product.stock === 0;
  const lowStock = !outOfStock && product.stock <= (product.minStock || 5);
  const memberPrice = discountPercent > 0 ? Math.round(product.price * (100 - discountPercent) / 100) : product.price;

  return (
    <div
      className="group rounded-[16px] border border-[#282828] bg-[#121212] overflow-hidden hover:border-[#555] transition-all cursor-pointer"
      onClick={() => onViewDetail?.(product)}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onViewDetail) {
          event.preventDefault();
          onViewDetail(product);
        }
      }}
      role={onViewDetail ? 'button' : undefined}
      tabIndex={onViewDetail ? 0 : undefined}
    >
      <div className="aspect-square bg-[#1A1A1A] overflow-hidden relative">
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
        {outOfStock && (
          <div className="absolute top-2 right-2 bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Sin stock
          </div>
        )}
        {lowStock && (
          <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
            Quedan {product.stock}
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-[11px] text-[#555] uppercase tracking-wider">{product.category}</p>
        <p className="text-[13px] font-semibold text-white leading-tight">{product.name}</p>
        <div className="flex items-baseline gap-2"><p className="text-[15px] font-bold text-[#FF5C00]">{formatCurrency(memberPrice)}</p>{discountPercent > 0 && <span className="text-[10px] text-[#666] line-through">{formatCurrency(product.price)}</span>}</div>
        {discountPercent > 0 && <p className="text-[10px] font-medium text-emerald-400">{discountPercent}% de descuento por membresía</p>}
         <div className="flex flex-col gap-2 sm:flex-row" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-[11px]"
            icon={FiShoppingCart}
            onClick={() => onAddToCart(product)}
            disabled={outOfStock}
          >
            {outOfStock ? 'Sin stock' : 'Agregar'}
          </Button>
          <Button
            size="sm"
            className="flex-1 text-[11px]"
            onClick={() => onBuyNow(product)}
            disabled={outOfStock}
          >
            Comprar
          </Button>
        </div>
      </div>
    </div>
  );
}
