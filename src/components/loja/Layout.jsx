import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import CartDrawer from "./CartDrawer";
import Icon, { WhatsAppIcon } from "../ui/Icon";
import logo from "../../assets/logo.svg";

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER;

export default function Layout() {
  const { totalItens } = useCart();
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ksline/70 bg-ksblack/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center" aria-label="King Style — início">
            <img src={logo} alt="King Style" className="h-8 sm:h-9" width="190" height="32" />
          </Link>

          <button
            onClick={() => setCarrinhoAberto(true)}
            className="relative inline-flex items-center gap-2 rounded-lg border border-ksline px-3 py-2 text-sm font-semibold transition hover:border-ksgold hover:text-ksgold"
            aria-label={`Abrir carrinho (${totalItens} ${totalItens === 1 ? "item" : "itens"})`}
          >
            <Icon name="cart" className="h-5 w-5" />
            <span className="hidden sm:inline">Carrinho</span>
            {totalItens > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ksgold px-1 text-[11px] font-bold text-ksblack">
                {totalItens}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet context={{ abrirCarrinho: () => setCarrinhoAberto(true) }} />
      </main>

      <footer className="border-t border-ksline bg-ksblack px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
          <img src={logo} alt="King Style" className="h-7 opacity-90" width="166" height="28" />
          {WHATSAPP && (
            <a
              href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-kswhite/70 hover:text-ksgold"
            >
              <WhatsAppIcon className="h-4 w-4" /> Atendimento pelo WhatsApp
            </a>
          )}
          <p className="text-xs text-kswhite/40">© {new Date().getFullYear()} King Style. Todos os direitos reservados.</p>
          <p className="text-xs text-kswhite/40">
            Desenvolvido por{" "}
            <a href="https://netofrazao.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold text-ksgold hover:text-ksgoldlight">
              Neto Dev
            </a>
          </p>
        </div>
      </footer>

      <CartDrawer aberto={carrinhoAberto} onFechar={() => setCarrinhoAberto(false)} />
    </div>
  );
}
