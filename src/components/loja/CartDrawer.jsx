import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { formatarPreco, mascararTelefone, mensagemErro } from "../../lib/format";
import { descreverVariante } from "../../lib/produtos";
import { registrarPedido, montarMensagemPedido, linkWhatsApp, PAGAMENTOS } from "../../lib/pedido";
import Icon, { WhatsAppIcon } from "../ui/Icon";
import { Spinner } from "../ui/Feedback";

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER;
const CLIENTE_KEY = "king-style-cliente";

const VAZIO = { nome: "", telefone: "", rua: "", numero: "", complemento: "", bairro: "" };

function carregarCliente() {
  try {
    return { ...VAZIO, ...JSON.parse(localStorage.getItem(CLIENTE_KEY) || "{}") };
  } catch {
    return VAZIO;
  }
}

export default function CartDrawer({ aberto, onFechar }) {
  const { items, totalPreco, updateQuantity, removeItem, clearCart } = useCart();
  const [etapa, setEtapa] = useState("carrinho");
  const [cliente, setCliente] = useState(carregarCliente);
  const [entrega, setEntrega] = useState("entrega");
  const [pagamento, setPagamento] = useState("Pix");
  const [observacoes, setObservacoes] = useState("");
  const [erros, setErros] = useState([]);
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(null);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [aberto, onFechar]);

  useEffect(() => {
    if (!aberto) {
      setErroEnvio("");
      if (concluido) {
        setConcluido(null);
        setEtapa("carrinho");
      }
    }
  }, [aberto, concluido]);

  const campo = (k) => (e) => setCliente((c) => ({ ...c, [k]: k === "telefone" ? mascararTelefone(e.target.value) : e.target.value }));

  const obrigatorios = entrega === "entrega" ? ["nome", "telefone", "rua", "numero", "bairro"] : ["nome", "telefone"];

  async function finalizar() {
    const faltando = obrigatorios.filter((k) => !cliente[k].trim());
    if (cliente.telefone.replace(/\D/g, "").length < 10 && !faltando.includes("telefone")) faltando.push("telefone");
    setErros(faltando);
    if (faltando.length) return;
    if (!WHATSAPP) {
      setErroEnvio("O WhatsApp da loja não está configurado. Avise o lojista.");
      return;
    }

    // Abre a aba já no clique (senão o navegador bloqueia como pop-up)
    const aba = window.open("", "_blank");
    setEnviando(true);
    setErroEnvio("");
    try {
      const dadosCliente = entrega === "entrega" ? cliente : { nome: cliente.nome, telefone: cliente.telefone };
      const registro = await registrarPedido({ items, cliente: dadosCliente, entrega, pagamento, observacoes });
      const itensMsg = registro
        ? registro.itens.map((i) => ({ ...i, preco: Number(i.preco) }))
        : items;
      const total = registro ? Number(registro.total) : totalPreco;
      const mensagem = montarMensagemPedido({ items: itensMsg, total, cliente, entrega, pagamento, observacoes, numero: registro?.id });
      const link = linkWhatsApp(WHATSAPP, mensagem);

      try {
        localStorage.setItem(CLIENTE_KEY, JSON.stringify(cliente));
      } catch {
        /* ignora */
      }
      if (aba) aba.location.href = link;
      else window.location.href = link;

      clearCart();
      setObservacoes("");
      setConcluido({ numero: registro?.id, link });
    } catch (error) {
      aba?.close();
      setErroEnvio(mensagemErro(error, "Não foi possível finalizar o pedido."));
    } finally {
      setEnviando(false);
    }
  }

  const classeInput = (k) => `input ${erros.includes(k) ? "input-erro" : ""}`;

  return (
    <div className={`fixed inset-0 z-50 ${aberto ? "" : "pointer-events-none"}`} aria-hidden={!aberto}>
      <div onClick={onFechar} className={`absolute inset-0 bg-black/70 transition-opacity ${aberto ? "opacity-100" : "opacity-0"}`} />

      <aside
        role="dialog"
        aria-label="Carrinho"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-ksline bg-ksblack shadow-2xl transition-transform duration-300 ${aberto ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-ksline px-5 py-4">
          <div className="flex items-center gap-2">
            {etapa === "dados" && !concluido && (
              <button className="icon-btn -ml-2" onClick={() => setEtapa("carrinho")} aria-label="Voltar ao carrinho">
                <Icon name="arrowLeft" />
              </button>
            )}
            <h2 className="ks-heading text-2xl text-ksgold">
              {concluido ? "Pedido enviado" : etapa === "carrinho" ? "Seu carrinho" : "Finalizar pedido"}
            </h2>
          </div>
          <button onClick={onFechar} className="icon-btn" aria-label="Fechar carrinho">
            <Icon name="x" />
          </button>
        </div>

        {concluido ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ksgold/15 text-ksgold">
              <Icon name="check" className="h-8 w-8" />
            </span>
            <h3 className="ks-heading text-3xl">Quase lá!</h3>
            <p className="text-sm text-kswhite/70">
              {concluido.numero ? <>Seu pedido <b className="text-ksgold">#{concluido.numero}</b> foi registrado. </> : null}
              Envie a mensagem que abriu no WhatsApp para a loja confirmar disponibilidade, frete e pagamento.
            </p>
            <a href={concluido.link} target="_blank" rel="noopener noreferrer" className="btn-gold">
              <WhatsAppIcon /> Abrir o WhatsApp de novo
            </a>
            <button onClick={onFechar} className="btn-ghost">Continuar comprando</button>
          </div>
        ) : etapa === "carrinho" ? (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <Icon name="cart" className="h-10 w-10 text-kswhite/20" />
                  <p className="text-sm text-kswhite/60">Seu carrinho está vazio.</p>
                  <button onClick={onFechar} className="btn-outline btn-sm">Ver produtos</button>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-ksline">
                  {items.map((item) => (
                    <li key={item.key} className="flex gap-3 py-4">
                      <Link to={`/produto/${item.productId}`} onClick={onFechar} className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-ksgunmetal">
                        {item.imagem && <img src={item.imagem} alt={item.nome} className="h-full w-full object-cover" />}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-sm font-semibold">{item.nome}</span>
                        {descreverVariante(item) && <span className="text-xs text-kswhite/60">{descreverVariante(item)}</span>}
                        <div className="mt-auto flex items-center gap-2">
                          <div className="flex items-center rounded-lg border border-ksline">
                            <button className="icon-btn h-8 w-8" onClick={() => updateQuantity(item.key, item.quantidade - 1)} aria-label="Diminuir">
                              <Icon name="minus" className="h-4 w-4" />
                            </button>
                            <span className="w-7 text-center text-sm tabular-nums">{item.quantidade}</span>
                            <button
                              className="icon-btn h-8 w-8"
                              onClick={() => updateQuantity(item.key, item.quantidade + 1)}
                              disabled={item.estoque != null && item.quantidade >= item.estoque}
                              aria-label="Aumentar"
                            >
                              <Icon name="plus" className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="ml-auto text-sm font-bold text-ksgold">{formatarPreco(item.preco * item.quantidade)}</span>
                        </div>
                      </div>
                      <button className="icon-btn h-8 w-8 self-start text-kswhite/40 hover:text-red-400" onClick={() => removeItem(item.key)} aria-label={`Remover ${item.nome}`}>
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {items.length > 0 && (
              <div className="border-t border-ksline px-5 py-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-kswhite/70">Subtotal</span>
                  <span className="ks-heading text-3xl text-ksgold">{formatarPreco(totalPreco)}</span>
                </div>
                <p className="mb-3 text-xs text-kswhite/45">Frete e pagamento são combinados pelo WhatsApp.</p>
                <button onClick={() => setEtapa("dados")} className="btn-gold w-full py-3 uppercase tracking-widest2">
                  Continuar
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label" htmlFor="ck-nome">Nome completo *</label>
                  <input id="ck-nome" autoComplete="name" value={cliente.nome} onChange={campo("nome")} className={classeInput("nome")} />
                </div>
                <div>
                  <label className="label" htmlFor="ck-tel">WhatsApp *</label>
                  <input id="ck-tel" type="tel" inputMode="tel" autoComplete="tel" placeholder="(91) 99999-9999" value={cliente.telefone} onChange={campo("telefone")} className={classeInput("telefone")} />
                </div>

                <div>
                  <span className="label">Como quer receber?</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[["entrega", "Entrega", "truck"], ["retirada", "Retirar na loja", "home"]].map(([v, t, ic]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setEntrega(v)}
                        aria-pressed={entrega === v}
                        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${entrega === v ? "border-ksgold bg-ksgold/10 text-ksgold" : "border-ksline text-kswhite/70 hover:border-kswhite/40"}`}
                      >
                        <Icon name={ic} className="h-4 w-4" /> {t}
                      </button>
                    ))}
                  </div>
                </div>

                {entrega === "entrega" && (
                  <>
                    <div className="grid grid-cols-[1fr_6rem] gap-3">
                      <div>
                        <label className="label" htmlFor="ck-rua">Rua *</label>
                        <input id="ck-rua" autoComplete="address-line1" value={cliente.rua} onChange={campo("rua")} className={classeInput("rua")} />
                      </div>
                      <div>
                        <label className="label" htmlFor="ck-num">Nº *</label>
                        <input id="ck-num" value={cliente.numero} onChange={campo("numero")} className={classeInput("numero")} />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor="ck-bairro">Bairro *</label>
                      <input id="ck-bairro" value={cliente.bairro} onChange={campo("bairro")} className={classeInput("bairro")} />
                    </div>
                    <div>
                      <label className="label" htmlFor="ck-comp">Complemento / referência</label>
                      <input id="ck-comp" value={cliente.complemento} onChange={campo("complemento")} placeholder="Apto, bloco, ponto de referência..." className="input" />
                    </div>
                  </>
                )}

                <div>
                  <label className="label" htmlFor="ck-pag">Forma de pagamento</label>
                  <select id="ck-pag" value={pagamento} onChange={(e) => setPagamento(e.target.value)} className="input">
                    {PAGAMENTOS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="ck-obs">Observações</label>
                  <textarea id="ck-obs" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="input" placeholder="Horário preferido, troco para..." />
                </div>

                {erros.length > 0 && <p className="text-sm text-red-400">Preencha os campos marcados em vermelho.</p>}
                {erroEnvio && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erroEnvio}</p>}
              </div>
            </div>

            <div className="border-t border-ksline px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-kswhite/70">Total</span>
                <span className="ks-heading text-3xl text-ksgold">{formatarPreco(totalPreco)}</span>
              </div>
              <button onClick={finalizar} disabled={enviando} className="btn-gold w-full py-3">
                {enviando ? <Spinner className="h-4 w-4" /> : <WhatsAppIcon />}
                {enviando ? "Enviando..." : "Enviar pedido pelo WhatsApp"}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
