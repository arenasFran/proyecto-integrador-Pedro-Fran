import { FiArrowLeft, FiGrid, FiShoppingCart, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { Button, Spinner } from '../common';
import { useGetProductByIdQuery } from '../../services/productApi';

interface ProductDetailProps {
  productId: string;
  onBack: () => void;
  onAddToCart: (productId: string) => void;
  onBuyNow: (productId: string) => void;
}

export default function ProductDetail({ productId, onBack, onAddToCart, onBuyNow }: ProductDetailProps) {
  const { data, isLoading, error } = useGetProductByIdQuery(productId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data?.product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
        <FiXCircle className="text-4xl mb-3" />
        <p className="text-[15px]">Producto no encontrado</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          Volver a la tienda
        </Button>
      </div>
    );
  }

  const product = data.product;
  const outOfStock = product.stock === 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[13px] text-[#8A8A8A] hover:text-white transition-colors mb-6"
      >
        <FiArrowLeft /> Volver a la tienda
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-[16px] bg-[#1A1A1A] overflow-hidden border border-[#282828]">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#282828]">
              <FiGrid size={64} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-[12px] text-[#555] uppercase tracking-wider mb-1">{product.category}</p>
            <h1 className="text-[26px] font-extrabold text-white">{product.name}</h1>
          </div>

          <p className="text-[32px] font-bold text-[#FF5C00]">${product.price}</p>

          <div className="flex items-center gap-2">
            {outOfStock ? (
              <>
                <FiXCircle className="text-red-400" />
                <span className="text-[13px] text-red-400">Sin stock</span>
              </>
            ) : (
              <>
                <FiCheckCircle className="text-[#22C55E]" />
                <span className="text-[13px] text-[#8A8A8A]">
                  Stock disponible: {product.stock} unidad{product.stock !== 1 ? 'es' : ''}
                </span>
              </>
            )}
          </div>

          <p className="text-[14px] text-[#8A8A8A] leading-relaxed">{product.description}</p>

          <div className="flex gap-3 mt-auto">
            <Button
              variant="outline"
              className="flex-1"
              icon={FiShoppingCart}
              onClick={() => onAddToCart(product.id)}
              disabled={outOfStock}
            >
              Agregar al carrito
            </Button>
            <Button
              className="flex-1"
              onClick={() => onBuyNow(product.id)}
              disabled={outOfStock}
            >
              Comprar ahora
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
