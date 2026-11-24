/* Avisos (toast), diálogo de confirmação, modal e estados de carregamento. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialogo, setDialogo] = useState(null);
  const seq = useRef(0);

  const toast = useCallback((texto, tipo = "sucesso") => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, texto, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === "erro" ? 6000 : 3200);
  }, []);

  const confirmar = useCallback(
    (opcoes) => new Promise((resolve) => setDialogo({ ...opcoes, resolve })),
    []
  );

  const fechar = (valor) => {
    dialogo?.resolve(valor);
    setDialogo(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirmar }}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:items-end sm:pr-5" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tipo === "erro" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-2xl animate-[ksIn_.2s_ease-out] ${
              t.tipo === "erro" ? "border-red-500/40 bg-[#2a1214] text-red-200" : "border-ksgold/40 bg-[#1c1a12] text-kswhite"
            }`}
          >
            <Icon name={t.tipo === "erro" ? "alert" : "check"} className={`mt-0.5 h-4 w-4 shrink-0 ${t.tipo === "erro" ? "text-red-400" : "text-ksgold"}`} />
            <span>{t.texto}</span>
          </div>
        ))}
      </div>

      {dialogo && (
        <Modal titulo={dialogo.titulo || "Confirmar"} onFechar={() => fechar(false)} tamanho="sm">
          <p className="text-sm text-kswhite/75">{dialogo.mensagem}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => fechar(false)}>{dialogo.cancelar || "Cancelar"}</button>
            <button className={dialogo.perigo ? "btn-danger" : "btn-gold"} onClick={() => fechar(true)} autoFocus>
              {dialogo.confirmar || "Confirmar"}
            </button>
          </div>
        </Modal>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}

export function Modal({ titulo, onFechar, children, tamanho = "md", rodape }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onFechar?.();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onFechar]);

  const larguras = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" };
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onFechar?.()}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-ksline bg-[#111] shadow-2xl sm:rounded-2xl ${larguras[tamanho]} animate-[ksUp_.22s_ease-out]`}>
        <div className="flex items-center justify-between gap-4 border-b border-ksline px-5 py-4">
          <h2 className="ks-heading text-xl text-kswhite">{titulo}</h2>
          <button onClick={onFechar} className="rounded-md p-1.5 text-kswhite/60 hover:bg-white/5 hover:text-kswhite" aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {rodape && <div className="border-t border-ksline px-5 py-4">{rodape}</div>}
      </div>
    </div>
  );
}

export function Spinner({ className = "h-5 w-5" }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />;
}

export function Carregando({ texto = "Carregando..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-kswhite/60" role="status">
      <Spinner className="h-5 w-5 text-ksgold" />
      {texto}
    </div>
  );
}

export function Vazio({ icone = "box", titulo, texto, children }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ksline px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ksgold/10 text-ksgold">
        <Icon name={icone} />
      </span>
      <h3 className="font-semibold text-kswhite">{titulo}</h3>
      {texto && <p className="max-w-sm text-sm text-kswhite/60">{texto}</p>}
      {children}
    </div>
  );
}
