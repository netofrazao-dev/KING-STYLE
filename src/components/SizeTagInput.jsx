import { useState } from "react";

/**
 * Input de tags livre para tamanhos.
 * Funciona tanto para roupas (P, M, G) quanto para calçados (36, 37, 38...),
 * já que o lojista digita o valor que quiser em vez de escolher de uma lista fixa.
 */
export default function SizeTagInput({ tamanhos, onChange }) {
  const [valorAtual, setValorAtual] = useState("");

  const adicionarTamanho = () => {
    const valor = valorAtual.trim().toUpperCase();
    if (!valor) return;
    if (tamanhos.includes(valor)) {
      setValorAtual("");
      return;
    }
    onChange([...tamanhos, valor]);
    setValorAtual("");
  };

  const removerTamanho = (tamanho) => {
    onChange(tamanhos.filter((t) => t !== tamanho));
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      adicionarTamanho();
    }
  };

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <input
          type="text"
          value={valorAtual}
          onChange={(e) => setValorAtual(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ex: M, 38, Único..."
          className="flex-1 rounded border border-ksline bg-ksblack px-3 py-2 text-sm outline-none focus:border-ksgold"
        />
        <button
          type="button"
          onClick={adicionarTamanho}
          className="rounded border border-ksgold px-4 text-sm font-bold text-ksgold hover:bg-ksgold hover:text-ksblack"
        >
          Adicionar
        </button>
      </div>

      {tamanhos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tamanhos.map((tamanho) => (
            <span
              key={tamanho}
              className="flex items-center gap-2 rounded border border-ksgold bg-ksgold/10 px-3 py-1 text-xs font-medium text-ksgold"
            >
              {tamanho}
              <button
                type="button"
                onClick={() => removerTamanho(tamanho)}
                aria-label={`Remover tamanho ${tamanho}`}
                className="text-ksgold hover:text-red-400"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-kswhite/50">
          Nenhum tamanho adicionado ainda. Digite e clique em "Adicionar" (ou pressione Enter).
        </p>
      )}
    </div>
  );
}
