import { useState } from "react";
import { useCart } from "../context/CartContext";

function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ProductCard({ produto }) {
  const { addItem } = useCart();
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState("");
  const [feedback, setFeedback] = useState("");

  const imagemPrincipal = produto.imagens?.[0];

  const handleAdicionar = () => {
    if (produto.esgotado) return;
    try {
      addItem(produto, tamanhoSelecionado, 1);
      setFeedback("Adicionado ao carrinho");
      setTimeout(() => setFeedback(""), 1800);
    } catch (error) {
      setFeedback(error.message);
    }
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-md border border-ksline bg-ksgunmetal/40 transition hover:border-ksgold">
      <div className="relative aspect-square w-full overflow-hidden bg-ksgunmetal">
        {imagemPrincipal ? (
          <img
            src={imagemPrincipal}
            alt={produto.nome}
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
              produto.esgotado ? "grayscale opacity-60" : ""
            }`}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ksline">
            Sem imagem
          </div>
        )}

        {produto.esgotado && (
          <span className="absolute left-2 top-2 rounded bg-red-500/90 px-2 py-1 text-xs font-bold uppercase tracking-widest2 text-white">
            Esgotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="ks-heading text-lg text-kswhite">{produto.nome}</h3>
        <p className="line-clamp-2 text-sm text-kswhite/70">{produto.descricao}</p>

        <span className="text-xl font-semibold text-ksgold">
          {formatarPreco(produto.preco)}
        </span>

        {produto.tamanhos?.length > 0 && !produto.esgotado && (
          <div className="flex flex-wrap gap-2">
            {produto.tamanhos.map((tamanho) => (
              <button
                key={tamanho}
                type="button"
                onClick={() => setTamanhoSelecionado(tamanho)}
                className={`rounded border px-3 py-1 text-xs font-medium transition ${
                  tamanhoSelecionado === tamanho
                    ? "border-ksgold bg-ksgold text-ksblack"
                    : "border-ksline text-kswhite hover:border-ksgold"
                }`}
              >
                {tamanho}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleAdicionar}
          disabled={produto.esgotado}
          className="mt-auto w-full rounded bg-ksgold py-2 text-sm font-bold uppercase tracking-widest2 text-ksblack transition hover:bg-ksgoldlight disabled:cursor-not-allowed disabled:bg-ksline disabled:text-kswhite/50"
        >
          {produto.esgotado ? "Indisponível" : "Adicionar"}
        </button>

        {feedback && (
          <span className="text-center text-xs text-ksgold">{feedback}</span>
        )}
      </div>
    </div>
  );
}
