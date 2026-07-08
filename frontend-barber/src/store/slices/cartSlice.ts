import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../types/product';

export type CartItem = {
  product: Product;
  quantity: number;
};

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  checkoutPreferenceId: string | null;
  checkoutPaymentId: string | null;
}

const CART_STORAGE_KEY = 'barberia_cart';

function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
  }
  return [];
}

function saveCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
  }
}

const initialState: CartState = {
  items: loadCart(),
  isOpen: false,
  checkoutPreferenceId: null,
  checkoutPaymentId: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<{ product: Product; quantity?: number }>) => {
      const { product, quantity = 1 } = action.payload;
      const existing = state.items.find((item) => item.product.id === product.id);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, product.stock);
      } else {
        state.items.push({ product, quantity: Math.min(quantity, product.stock) });
      }
      saveCart(state.items);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.product.id !== action.payload);
      saveCart(state.items);
    },
    updateQuantity: (state, action: PayloadAction<{ productId: string; quantity: number }>) => {
      const item = state.items.find((i) => i.product.id === action.payload.productId);
      if (item) {
        item.quantity = Math.max(1, Math.min(action.payload.quantity, item.product.stock));
      }
      saveCart(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      saveCart(state.items);
    },
    openCart: (state) => {
      state.isOpen = true;
    },
    closeCart: (state) => {
      state.isOpen = false;
    },
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    setCheckoutResult: (state, action: PayloadAction<{ preferenceId: string; paymentId: string }>) => {
      state.checkoutPreferenceId = action.payload.preferenceId;
      state.checkoutPaymentId = action.payload.paymentId;
    },
    clearCheckoutResult: (state) => {
      state.checkoutPreferenceId = null;
      state.checkoutPaymentId = null;
    },
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  openCart,
  closeCart,
  toggleCart,
  setCheckoutResult,
  clearCheckoutResult,
} = cartSlice.actions;

export const selectCartTotal = (state: { cart: CartState }): number =>
  state.cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

export const selectCartCount = (state: { cart: CartState }): number =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);

export default cartSlice.reducer;
