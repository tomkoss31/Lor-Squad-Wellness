// Panier boutique HL SKIN — état local persisté (localStorage par boutique).
import { useCallback, useEffect, useMemo, useState } from "react";

export type CartMap = Record<string, number>;

function readCart(key: string): CartMap {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CartMap) : {};
  } catch {
    return {};
  }
}

export function useCart(slug: string | undefined) {
  const key = `bk-cart-${slug ?? "default"}`;
  const [cart, setCart] = useState<CartMap>(() => readCart(key));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [key, cart]);

  const add = useCallback(
    (id: string, qty = 1) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + qty })),
    [],
  );
  const setQty = useCallback(
    (id: string, qty: number) =>
      setCart((c) => {
        const next = { ...c };
        if (qty <= 0) delete next[id];
        else next[id] = Math.min(99, Math.round(qty));
        return next;
      }),
    [],
  );
  const remove = useCallback(
    (id: string) =>
      setCart((c) => {
        const next = { ...c };
        delete next[id];
        return next;
      }),
    [],
  );
  const clear = useCallback(() => setCart({}), []);

  const count = useMemo(() => Object.values(cart).reduce((s, q) => s + q, 0), [cart]);

  return { cart, add, setQty, remove, clear, count };
}
