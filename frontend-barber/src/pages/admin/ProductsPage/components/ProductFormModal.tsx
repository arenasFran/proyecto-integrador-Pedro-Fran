import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPackage } from 'react-icons/fi';
import { Button } from '../../../../components/common';
import ProductImageUpload from '../../../../components/product/ProductImageUpload';
import type { Product, CreateProductPayload } from '../../../../types/product';

interface Props {
  product?: Product | null;
  formData: CreateProductPayload;
  onChange: (data: CreateProductPayload) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onClose: () => void;
  isSaving: boolean;
}

const inputClass = 'w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 py-2 text-[13px] text-white placeholder-[#555] outline-none focus:border-[#FF5C00] transition-colors';
const labelClass = 'mb-1 block text-[11px] font-medium text-[#8A8A8A] tracking-wide uppercase';

export default function ProductFormModal({ product, formData, onChange, onSave, onCancel, onClose, isSaving }: Props) {
  const set = (field: keyof CreateProductPayload, value: string | number | string[]) =>
    onChange({ ...formData, [field]: value });

  useEffect(() => {
    if (product) {
      onChange({
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
        gallery: product.gallery,
        category: product.category,
      });
    }
  }, [product]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.description.trim() || !formData.price) return;
    await onSave();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-[24px] border border-[#282828] bg-[#121212] p-5 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#FF5C00]/10">
                <FiPackage className="text-[#FF5C00] text-sm" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-white">
                  {product ? 'Editar producto' : 'Nuevo producto'}
                </h2>
                <p className="text-[11px] text-[#8A8A8A]">
                  {product ? 'Modificá los datos del producto' : 'Completá los datos del nuevo producto'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#282828] hover:text-white transition-colors">
              <FiX size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                value={formData.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej: Shampoo profesional"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Descripción del producto"
                rows={2}
                className={inputClass + ' resize-none'}
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className={labelClass}>Precio ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price.toString()}
                  onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={inputClass + ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'}
                />
              </div>
              <div>
                <label className={labelClass}>Stock</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock.toString()}
                  onChange={(e) => set('stock', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={inputClass + ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'}
                />
              </div>
              <div>
                <label className={labelClass}>Categoría</label>
                <input
                  value={formData.category}
                  onChange={(e) => set('category', e.target.value)}
                  placeholder="Ej: Cuidado capilar"
                  className={inputClass}
                />
              </div>
            </div>

            <ProductImageUpload
              mainImageUrl={formData.imageUrl ?? ''}
              galleryUrls={formData.gallery ?? []}
              onMainImageChange={(url) => set('imageUrl', url)}
              onGalleryChange={(urls) => set('gallery', urls)}
            />
          </div>

          <div className="flex gap-2.5 mt-4 pt-4 border-t border-[#282828]">
            <Button variant="secondary" onClick={onCancel} className="flex-1 text-[12px] h-[38px]">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={isSaving} className="flex-1 text-[12px] h-[38px]" disabled={!formData.name.trim() || !formData.description.trim() || !formData.price}>
              {product ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
