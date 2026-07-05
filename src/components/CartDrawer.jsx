import WhatsAppCheckout from "./WhatsAppCheckout";

export default function CartDrawer({ aberto, onFechar }) {
  return (
    <div
      className={`fixed inset-0 z-50 transition ${aberto ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!aberto}
    >
      {/* overlay */}
      <div
        onClick={onFechar}
        className={`absolute inset-0 bg-black/60 transition-opacity ${
          aberto ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* painel */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-sm border-l border-ksline shadow-xl transition-transform duration-300 ${
          aberto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <WhatsAppCheckout onFechar={onFechar} />
      </div>
    </div>
  );
}
