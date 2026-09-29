'use client';
import { createContext, useContext, useEffect, useState } from 'react';

// سلة الشراء تخص زائر هذا المتصفح فقط (localStorage) — وهذا طبيعي وصحيح
// لسلّة تسوق؛ لا علاقة له ببيانات المتجر نفسها التي تعيش في Supabase.
const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [ids, setIds] = useState([]);

  useEffect(() => {
    try { setIds(JSON.parse(localStorage.getItem('cp_cart') || '[]')); } catch (_) {}
  }, []);

  const persist = (next) => {
    setIds(next);
    try { localStorage.setItem('cp_cart', JSON.stringify(next)); } catch (_) {}
  };

  const add = (id) => { if (!ids.includes(id)) persist([...ids, id]); };
  const remove = (id) => persist(ids.filter((x) => x !== id));
  const clear = () => persist([]);

  return (
    <CartCtx.Provider value={{ ids, count: ids.length, add, remove, clear }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  return useContext(CartCtx) || { ids: [], count: 0, add() {}, remove() {}, clear() {} };
}
