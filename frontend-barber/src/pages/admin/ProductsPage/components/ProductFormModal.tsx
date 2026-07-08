import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPackage } from 'react-icons/fi';
import { Button, Input } from '../../../../components/common';
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

const ProductFormModal: React.FC<Props> = ({ product, formData, onChange, onSave, onCancel, onClose, isSaving }) => {
  const set = (field: keyof CreateProductPayload, value: string | number) =>
    onChange({ ...formData, [field]: value });

  useEffect(() => {
    if (product) {
      onChange({
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
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
          className="w-full max-w-lg rounded-[24px] border border-[#282828] bg-[#121212] p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FF5C00]/10">
                <FiPackage className="text-[#FF5C00] text-lg" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-white">
                  {product ? 'Editar producto' : 'Nuevo producto'}
                </h2>
                <p className="text-[12px] text-[#8A8A8A]">
                  {product ? 'Modificá los datos del producto' : 'Completá los datos del nuevo producto'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#8A8A8A] hover:text-white">
              <FiX size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <Input label="Nombre" required value={formData.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Shampoo profesional" />
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#8A8A8A]">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Descripción del producto"
                rows={3}
                className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-4 py-2.5 text-[13px] text-white placeholder-[#555] outline-none focus:border-[#FF5C00] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Precio ($)" required type="number" min="0" step="0.01" value={formData.price.toString()} onChange={(e) => set('price', parseFloat(e.target.value) || 0)} placeholder="0" />
              <Input label="Stock" required type="number" min="0" value={formData.stock.toString()} onChange={(e) => set('stock', parseInt(e.target.value) || 0)} placeholder="0" />
            </div>
            <Input label="URL de imagen" value={formData.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
            <Input label="Categoría" value={formData.category} onChange={(e) => set('category', e.target.value)} placeholder="Ej: Cuidado capilar" />
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={isSaving} className="flex-1" disabled={!formData.name.trim() || !formData.description.trim() || !formData.price}>
              {product ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductFormModal;
