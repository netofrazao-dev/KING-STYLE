import { createContext, useContext, useEffect, useMemo, useReducer } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "king-style-cart";

// Cada item é identificado pela combinação produto+tamanho,
// pois o mesmo produto pode estar no carrinho em tamanhos diferentes.
function buildItemKey(productId, tamanho) {
  return `${productId}::${tamanho}`;
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Erro ao carregar carrinho salvo:", error);
    return [];
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const { produto, tamanho, quantidade } = action.payload;
      const key = buildItemKey(produto.id, tamanho);
      const existente = state.find((item) => item.key === key);

      if (existente) {
        return state.map((item) =>
          item.key === key
            ? { ...item, quantidade: item.quantidade + quantidade }
            : item
        );
      }

      return [
        ...state,
        {
          key,
          productId: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          imagem: produto.imagens?.[0] ?? null,
          tamanho,
          quantidade,
        },
      ];
    }

    case "REMOVE_ITEM":
      return state.filter((item) => item.key !== action.payload.key);

    case "UPDATE_QUANTITY":
      return state
        .map((item) =>
          item.key === action.payload.key
            ? { ...item, quantidade: action.payload.quantidade }
            : item
        )
        .filter((item) => item.quantidade > 0);

    case "CLEAR_CART":
      return [];

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Erro ao salvar carrinho:", error);
    }
  }, [items]);

  const addItem = (produto, tamanho, quantidade = 1) => {
    if (!tamanho) {
      throw new Error("Selecione um tamanho antes de adicionar ao carrinho.");
    }
    dispatch({ type: "ADD_ITEM", payload: { produto, tamanho, quantidade } });
  };

  const removeItem = (key) => dispatch({ type: "REMOVE_ITEM", payload: { key } });

  const updateQuantity = (key, quantidade) =>
    dispatch({ type: "UPDATE_QUANTITY", payload: { key, quantidade } });

  const clearCart = () => dispatch({ type: "CLEAR_CART" });

  const totalItens = useMemo(
    () => items.reduce((soma, item) => soma + item.quantidade, 0),
    [items]
  );

  const totalPreco = useMemo(
    () => items.reduce((soma, item) => soma + item.preco * item.quantidade, 0),
    [items]
  );

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItens,
    totalPreco,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart deve ser usado dentro de um <CartProvider>.");
  }
  return context;
}
