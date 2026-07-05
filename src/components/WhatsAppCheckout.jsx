import { useState } from "react";
import { useCart } from "../context/CartContext";

function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CAMPOS_OBRIGATORIOS = ["nome", "telefone", "rua", "numero", "bairro", "cidade"];

const DADOS_INICIAIS = {
  nome: "",
  telefone: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  observacoes: "",
};

/**
 * Monta a mensagem de pedido em texto puro para o WhatsApp,
 * incluindo os dados de entrega do cliente.
 * Mantida fora do componente para facilitar testes unitários.
 */
export function montarMensagemPedido(items, totalPreco, cliente) {
  const enderecoCompleto = [
    `${cliente.rua}, ${cliente.numero}`,
    cliente.complemento,
    cliente.bairro,
    cliente.cidade,
    cliente.cep ? `CEP: ${cliente.cep}` : null,
  ]
    .filter(Boolean)
    .join(" - ");

  const linhas = [
    "*Novo pedido — King Style*",
    "",
    "*Dados do cliente*",
    `Nome: ${cliente.nome}`,
    `Telefone: ${cliente.telefone}`,
    `Endereço de entrega: ${enderecoCompleto}`,
    ...(cliente.observacoes ? [`Observações: ${cliente.observacoes}`] : []),
    "",
    "*Itens do pedido*",
    ...items.map((item, index) => {
      const subtotal = item.preco * item.quantidade;
      return (
        `${index + 1}. ${item.nome}\n` +
        `   Tamanho: ${item.tamanho} | Qtd: ${item.quantidade}\n` +
        `   Subtotal: ${formatarPreco(subtotal)}`
      );
    }),
    "",
    `*Total do pedido: ${formatarPreco(totalPreco)}*`,
    "",
    "Aguardo confirmação de disponibilidade, prazo de entrega e forma de pagamento.",
  ];

  return linhas.join("\n");
}

export function gerarLinkWhatsApp(numero, mensagem) {
  const numeroLimpo = numero.replace(/\D/g, "");
  return `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
}

export default function WhatsAppCheckout({ onFechar }) {
  const { items, removeItem, updateQuantity, clearCart, totalPreco } = useCart();
  const numeroLoja = import.meta.env.VITE_WHATSAPP_NUMBER;

  const [etapa, setEtapa] = useState("carrinho"); // "carrinho" | "endereco"
  const [dadosCliente, setDadosCliente] = useState(DADOS_INICIAIS);
  const [camposComErro, setCamposComErro] = useState([]);

  const handleChangeCampo = (campo, valor) => {
    setDadosCliente((atual) => ({ ...atual, [campo]: valor }));
  };

  const validarCampos = () => {
    const faltando = CAMPOS_OBRIGATORIOS.filter((campo) => !dadosCliente[campo].trim());
    setCamposComErro(faltando);
    return faltando.length === 0;
  };

  const handleAvancarParaEndereco = () => {
    if (items.length === 0) return;
    setEtapa("endereco");
  };

  const handleFinalizarPedido = () => {
    if (!validarCampos()) return;

    if (!numeroLoja) {
      console.error("VITE_WHATSAPP_NUMBER não configurado no .env");
      alert("Checkout indisponível no momento. Contate o suporte da loja.");
      return;
    }

    try {
      const mensagem = montarMensagemPedido(items, totalPreco, dadosCliente);
      const link = gerarLinkWhatsApp(numeroLoja, mensagem);

      window.open(link, "_blank", "noopener,noreferrer");
      clearCart();
      setDadosCliente(DADOS_INICIAIS);
      setEtapa("carrinho");
      onFechar?.();
    } catch (error) {
      console.error("Erro ao gerar checkout via WhatsApp:", error);
      alert("Não foi possível gerar o pedido. Tente novamente.");
    }
  };

  const inputClasse = (campo) =>
    `w-full rounded border bg-ksblack px-3 py-2 text-sm outline-none focus:border-ksgold ${
      camposComErro.includes(campo) ? "border-red-500" : "border-ksline"
    }`;

  return (
    <div className="flex h-full flex-col bg-ksblack">
      <div className="flex items-center justify-between border-b border-ksline p-4">
        <h2 className="ks-heading text-xl text-ksgold">
          {etapa === "carrinho" ? "Seu carrinho" : "Dados para entrega"}
        </h2>
        <button onClick={onFechar} className="text-kswhite hover:text-ksgold" aria-label="Fechar carrinho">
          ✕
        </button>
      </div>

      {etapa === "carrinho" ? (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <p className="text-center text-sm text-kswhite/60">Seu carrinho está vazio.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3 border-b border-ksline pb-4">
                    {item.imagem && (
                      <img
                        src={item.imagem}
                        alt={item.nome}
                        className="h-16 w-16 rounded object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-sm font-semibold text-kswhite">{item.nome}</span>
                      <span className="text-xs text-kswhite/60">Tamanho: {item.tamanho}</span>
                      <span className="text-sm font-bold text-ksgold">
                        {formatarPreco(item.preco * item.quantidade)}
                      </span>

                      <div className="mt-1 flex items-center gap-2">
                        <button
                          className="h-6 w-6 rounded border border-ksline text-xs hover:border-ksgold"
                          onClick={() => updateQuantity(item.key, item.quantidade - 1)}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm">{item.quantidade}</span>
                        <button
                          className="h-6 w-6 rounded border border-ksline text-xs hover:border-ksgold"
                          onClick={() => updateQuantity(item.key, item.quantidade + 1)}
                        >
                          +
                        </button>

                        <button
                          className="ml-auto text-xs text-red-400 hover:text-red-300"
                          onClick={() => removeItem(item.key)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-ksline p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-kswhite/70">Total</span>
                <span className="ks-heading text-xl text-ksgold">
                  {formatarPreco(totalPreco)}
                </span>
              </div>
              <button
                onClick={handleAvancarParaEndereco}
                className="w-full rounded bg-ksgold py-3 text-sm font-bold uppercase tracking-widest2 text-ksblack transition hover:bg-ksgoldlight"
              >
                Continuar para entrega
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                  Nome completo *
                </label>
                <input
                  value={dadosCliente.nome}
                  onChange={(e) => handleChangeCampo("nome", e.target.value)}
                  className={inputClasse("nome")}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                  Telefone / WhatsApp *
                </label>
                <input
                  value={dadosCliente.telefone}
                  onChange={(e) => handleChangeCampo("telefone", e.target.value)}
                  placeholder="(91) 99999-9999"
                  className={inputClasse("telefone")}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                  CEP
                </label>
                <input
                  value={dadosCliente.cep}
                  onChange={(e) => handleChangeCampo("cep", e.target.value)}
                  className={inputClasse("cep")}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                    Rua *
                  </label>
                  <input
                    value={dadosCliente.rua}
                    onChange={(e) => handleChangeCampo("rua", e.target.value)}
                    className={inputClasse("rua")}
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                    Número *
                  </label>
                  <input
                    value={dadosCliente.numero}
                    onChange={(e) => handleChangeCampo("numero", e.target.value)}
                    className={inputClasse("numero")}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                  Complemento
                </label>
                <input
                  value={dadosCliente.complemento}
                  onChange={(e) => handleChangeCampo("complemento", e.target.value)}
                  placeholder="Apto, bloco, ponto de referência..."
                  className={inputClasse("complemento")}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                    Bairro *
                  </label>
                  <input
                    value={dadosCliente.bairro}
                    onChange={(e) => handleChangeCampo("bairro", e.target.value)}
                    className={inputClasse("bairro")}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                    Cidade *
                  </label>
                  <input
                    value={dadosCliente.cidade}
                    onChange={(e) => handleChangeCampo("cidade", e.target.value)}
                    className={inputClasse("cidade")}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={dadosCliente.observacoes}
                  onChange={(e) => handleChangeCampo("observacoes", e.target.value)}
                  placeholder="Ponto de referência, horário preferido..."
                  className={inputClasse("observacoes")}
                />
              </div>

              {camposComErro.length > 0 && (
                <p className="text-sm text-red-400">
                  Preencha os campos obrigatórios marcados em vermelho.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-ksline p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-kswhite/70">Total</span>
              <span className="ks-heading text-xl text-ksgold">
                {formatarPreco(totalPreco)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEtapa("carrinho")}
                className="rounded border border-ksline px-4 py-3 text-xs uppercase tracking-widest2 hover:border-ksgold"
              >
                Voltar
              </button>
              <button
                onClick={handleFinalizarPedido}
                className="flex-1 rounded bg-ksgold py-3 text-sm font-bold uppercase tracking-widest2 text-ksblack transition hover:bg-ksgoldlight"
              >
                Finalizar pedido via WhatsApp
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
