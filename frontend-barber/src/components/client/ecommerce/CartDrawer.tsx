import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingCart, FiX, FiCreditCard, FiMapPin } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  removeItem,
  updateQuantity,
  clearCart,
  closeCart,
  selectCartTotal,
  selectCartCount,
  setCheckoutResult,
  syncWithProducts,
} from '../../../store/slices/cartSlice';
import CartItem from '../../product/CartItem';
import { Button } from '../../common';
import { getAccessToken } from '../../../services/api';
import { useCreateOrderMutation } from '../../../services/orderApi';
import { useGetProductsQuery } from '../../../services/productApi';

export const CartDrawer = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, isOpen } = useAppSelector((state) => state.cart);
  const total = useAppSelector(selectCartTotal);
  const count = useAppSelector(selectCartCount);
  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();

  const { data: allProductsData } = useGetProductsQuery({});

  useEffect(() => {
    if (allProductsData?.products && items.length > 0) {
      dispatch(syncWithProducts(allProductsData.products));
    }
  }, [allProductsData?.products, dispatch]);

  const handleCheckout = async (paymentMethod: 'online' | 'local') => {
    const token = getAccessToken();
    if (!token) {
      navigate('/login?returnUrl=/tienda');
      return;
    }
    if (items.length === 0) return;
    try {
      const result = await createOrder({
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        paymentMethod,
      }).unwrap();
      dispatch(closeCart());
      dispatch(clearCart());

      if (paymentMethod === 'online' && result.preferenceId) {
        dispatch(setCheckoutResult({ preferenceId: result.preferenceId }));
        navigate('/tienda');
      } else {
        navigate('/mis-ordenes');
      }
    } catch {
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => dispatch(closeCart())}
          />
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-[#282828] bg-[#121212] shadow-2xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-[#282828] px-5 py-4">
                <div className="flex items-center gap-2">
                  <FiShoppingCart className="text-[#FF5C00]" />
                  <span className="text-[16px] font-bold text-white">Carrito</span>
                  <span className="rounded-full bg-[#FF5C00]/10 px-2 py-0.5 text-[11px] text-[#FF5C00]">
                    {count}
                  </span>
                </div>
                <button onClick={() => dispatch(closeCart())} className="text-[#8A8A8A] hover:text-white">
                  <FiX size={20} />
                </button>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-[#8A8A8A]">
                  <FiShoppingCart className="text-4xl mb-3" />
                  <p className="text-[14px]">Tu carrito está vacío</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {items.map((item) => (
                      <CartItem
                        key={item.product.id}
                        item={item}
                        onUpdateQuantity={(productId, quantity) =>
                          dispatch(updateQuantity({ productId, quantity }))
                        }
                        onRemove={(productId) => dispatch(removeItem(productId))}
                      />
                    ))}
                  </div>

                  <div className="border-t border-[#282828] px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#8A8A8A]">Subtotal</span>
                      <span className="text-[16px] font-bold text-white">${total}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 text-[12px]"
                        onClick={() => handleCheckout('online')}
                        icon={FiCreditCard}
                        loading={isCreatingOrder}
                      >
                        Pagar online
                      </Button>
                      <Button
                        className="flex-1 text-[12px]"
                        variant="outline"
                        onClick={() => handleCheckout('local')}
                        icon={FiMapPin}
                        loading={isCreatingOrder}
                      >
                        Pago al levantar
                      </Button>
                    </div>

                    <button
                      onClick={() => dispatch(clearCart())}
                      className="w-full text-center text-[12px] text-[#555] hover:text-red-400"
                    >
                      Vaciar carrito
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
