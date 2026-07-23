import { FiGrid } from 'react-icons/fi';
import { Spinner } from '../common';
import ProductCard from './ProductCard';
import type { Product } from '../../types/product';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onViewDetail?: (product: Product) => void;
}

export default function ProductList({ products, isLoading, onAddToCart, onBuyNow, onViewDetail }: ProductListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
        <FiGrid className="text-4xl mb-3" />
        <p className="text-[15px]">No hay productos disponibles</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          onBuyNow={onBuyNow}
          onViewDetail={onViewDetail}
        />
      ))}
    </div>
  );
}
