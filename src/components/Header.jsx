import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import CartDrawer from "./CartDrawer";
import logo from "../assets/logo.svg";

export default function Header() {
  const { totalItens } = useCart();
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ksline bg-ksblack/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="King Style" className="h-8 sm:h-10" />
          </Link>

          <button
            onClick={() => setCarrinhoAberto(true)}
            className="relative rounded border border-ksline px-3 py-2 text-sm hover:border-ksgold"
            aria-label="Abrir carrinho"
          >
            Carrinho
            {totalItens > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ksgold text-xs font-bold text-ksblack">
                {totalItens}
              </span>
            )}
          </button>
        </div>
      </header>

      <CartDrawer aberto={carrinhoAberto} onFechar={() => setCarrinhoAberto(false)} />
    </>
  );
}
