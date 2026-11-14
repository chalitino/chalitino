"use client";
import { useEffect, useState } from "react";

export type CartItem = { variantId: string; sku: string; title: string; qty: number; price: number; caseSize: number };
const KEY = "wt_cart";

function read(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(items: CartItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  window.dispatchEvent(new Event("wt_cart"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    setItems(read());
    const h = () => setItems(read());
    window.addEventListener("wt_cart", h);
    return () => window.removeEventListener("wt_cart", h);
  }, []);
  return {
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    add(item: Omit<CartItem, "qty">, qty: number) {
      const cur = read();
      const ex = cur.find((i) => i.variantId === item.variantId);
      if (ex) ex.qty += qty; else cur.push({ ...item, qty });
      write(cur);
    },
    setQty(variantId: string, qty: number) {
      write(read().map((i) => (i.variantId === variantId ? { ...i, qty } : i)).filter((i) => i.qty > 0));
    },
    clear() { write([]); },
  };
}
