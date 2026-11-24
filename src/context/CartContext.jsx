import { createContext, useContext, useEffect, useMemo, useReducer } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "king-style-cart-v2";

// Cada item é a combinação produto + variação (cor/tamanho).
export function chaveItem(productId, variantId, tamanho, cor) {
  return `${productId}::${variantId || `${cor || ""}|${tamanho || ""}`}`;
}

function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const itens = raw ? JSON.parse(raw) : [];
    return Array.isArray(itens) ? itens : [];
  } catch {
    return [];
  }
}

const limitar = (qtd, estoque) => Math.max(0, Math.min(qtd, estoque ?? 99, 99));

function reducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const it = action.item;
      const existente = state.find((i) => i.key === it.key);
      if (existente) {
        return state.map((i) =>
          i.key === it.key ? { ...i, ...it, quantidade: limitar(i.quantidade + it.quantidade, it.estoque) } : i
        );
      }
      return [...state, { ...it, quantidade: limitar(it.quantidade, it.estoque) }];
    }
    case "QTD":
      return state
        .map((i) => (i.key === action.key ? { ...i, quantidade: limitar(action.quantidade, i.estoque) } : i))
        .filter((i) => i.quantidade > 0);
    case "REMOVE":
      return state.filter((i) => i.key !== action.key);
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, carregar);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.removeItem("king-style-cart"); // formato antigo
    } catch {
      /* modo privado */
    }
  }, [items]);

  const value = useMemo(() => {
    const totalItens = items.reduce((s, i) => s + i.quantidade, 0);
    const totalPreco = items.reduce((s, i) => s + i.preco * i.quantidade, 0);
    return {
      items,
      totalItens,
      totalPreco,
      addItem: (item) => dispatch({ type: "ADD", item: { ...item, key: chaveItem(item.productId, item.variantId, item.tamanho, item.cor) } }),
      updateQuantity: (key, quantidade) => dispatch({ type: "QTD", key, quantidade }),
      removeItem: (key) => dispatch({ type: "REMOVE", key }),
      clearCart: () => dispatch({ type: "CLEAR" }),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de um <CartProvider>.");
  return ctx;
}
