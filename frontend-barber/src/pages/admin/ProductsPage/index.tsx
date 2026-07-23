import React, { useRef, useState } from 'react';
import { FiEdit3, FiEye, FiEyeOff, FiPackage, FiPlus, FiTrash2 } from 'react-icons/fi';
import { AnimatedContainer, Button, ConfirmModal, Spinner, useToast } from '../../../components/common';
import { useCreateProductMutation, useDeleteProductMutation, useGetProductsQuery, useUpdateProductMutation } from '../../../services/productApi';
import type { CreateProductPayload, Product, ProductStatus } from '../../../types/product';
import ProductFormModal from './components/ProductFormModal';

const statusLabel: Record<ProductStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  deleted: 'Eliminado',
};

const statusColor: Record<ProductStatus, string> = {
  active: 'bg-green-500/10 text-green-400',
  inactive: 'bg-red-500/10 text-red-400',
  deleted: 'bg-gray-500/10 text-gray-400',
};

const INITIAL_FORM: CreateProductPayload = {
  name: '', description: '', price: 0, stock: 0, minStock: 5, imageUrl: '', gallery: [], category: '',
};

export const ProductsPage: React.FC = () => {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data, isLoading } = useGetProductsQuery({ status: includeInactive ? 'all' : 'active' });
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<CreateProductPayload>(INITIAL_FORM);
  const formDraftRef = useRef<CreateProductPayload | null>(null);

  const products = data?.products ?? [];

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = () => {
    setEditingProduct(null);
    setFormData(formDraftRef.current ?? INITIAL_FORM);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      minStock: product.minStock,
      imageUrl: product.imageUrl,
      gallery: product.gallery,
      category: product.category,
    });
    setModalOpen(true);
  };

  const handleClose = () => {
    if (!editingProduct) {
      formDraftRef.current = formData;
    }
    setModalOpen(false);
  };

  const handleCancel = () => {
    formDraftRef.current = null;
    setEditingProduct(null);
    setModalOpen(false);
  };

  const handleCreate = async () => {
    try {
      await createProduct(formData).unwrap();
      showToast('Producto creado con éxito');
      formDraftRef.current = null;
      setModalOpen(false);
    } catch {
      showToast('Error al crear producto', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    try {
      await updateProduct({ id: editingProduct.id, data: formData }).unwrap();
      showToast('Producto actualizado con éxito');
      setEditingProduct(null);
      setModalOpen(false);
    } catch {
      showToast('Error al actualizar producto', 'error');
    }
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id).unwrap();
      showToast('Producto eliminado con éxito');
    } catch {
      showToast('Error al eliminar producto', 'error');
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
      setConfirmOpen(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      await updateProduct({
        id: product.id,
        data: { status: newStatus },
      }).unwrap();
      showToast(`Producto ${product.status === 'active' ? 'desactivado' : 'activado'} con éxito`);
    } catch {
      showToast('Error al cambiar estado', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FF5C00]/10">
            <FiPackage className="text-[#FF5C00] text-lg" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-white">Productos</h1>
            <p className="text-[13px] text-[#8A8A8A]">Gestioná el catálogo de productos</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludeInactive(!includeInactive)}
            icon={includeInactive ? FiEye : FiEyeOff}
          >
            {includeInactive ? 'Ver activos' : 'Ver inactivos'}
          </Button>
          <Button size="sm" icon={FiPlus} onClick={openCreate}>
            Nuevo producto
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <AnimatedContainer animation="fadeInUp">
          <div className="rounded-[16px] border border-[#282828] bg-[#121212] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#282828] text-[#8A8A8A]">
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 font-medium">Precio</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-[#282828] hover:bg-[#1A1A1A]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-[8px] object-cover" />
                          )}
                          <div>
                            <p className="text-white font-medium">{product.name}</p>
                            <p className="text-[11px] text-[#555] truncate max-w-[200px]">{product.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#8A8A8A]">{product.category || '-'}</td>
                      <td className="px-4 py-3 text-white font-semibold">${product.price}</td>
                      <td className="px-4 py-3">
                        <span className={product.stock > 0 ? 'text-[#22C55E]' : 'text-red-400'}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor[product.status]}`}>
                          {statusLabel[product.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(product)}
                            className="rounded-lg p-2 text-[#8A8A8A] hover:bg-[#282828] hover:text-white"
                            title={product.status === 'active' ? 'Desactivar' : 'Activar'}
                          >
                            {product.status === 'active' ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                          </button>
                          <button
                            onClick={() => openEdit(product)}
                            className="rounded-lg p-2 text-[#8A8A8A] hover:bg-[#282828] hover:text-white"
                          >
                            <FiEdit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="rounded-lg p-2 text-[#8A8A8A] hover:bg-[#282828] hover:text-red-400"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedContainer>
      )}

      {modalOpen && (
        <ProductFormModal
          product={editingProduct}
          formData={formData}
          onChange={setFormData}
          onSave={editingProduct ? handleUpdate : handleCreate}
          onCancel={handleCancel}
          onClose={handleClose}
          isSaving={isCreating || isUpdating}
        />
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar producto"
        message={`¿Estás seguro que querés eliminar "${productToDelete?.name || ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};

export default ProductsPage;
