import { Link } from "react-router-dom";
import { formatarPreco } from "../../lib/format";

export default function ProductCard({ produto }) {
  const capa = produto.imagens[0];
  const segunda = produto.imagens[1];
  const variaPreco = produto.precoMax > produto.precoMin;
  const desconto = produto.precoDe ? Math.round((1 - produto.precoFinal / produto.precoDe) * 100) : 0;

  return (
    <Link
      to={`/produto/${produto.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-ksline bg-[#121315] transition hover:-translate-y-0.5 hover:border-ksgold/70"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ksgunmetal">
        {capa ? (
          <>
            <img
              src={capa}
              alt={produto.nome}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${segunda ? "group-hover:opacity-0" : ""} ${!produto.disponivel ? "opacity-50 grayscale" : ""}`}
            />
            {segunda && (
              <img src={segunda} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-kswhite/30">Sem imagem</div>
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {!produto.disponivel && <span className="chip bg-red-600 text-white">Esgotado</span>}
          {produto.disponivel && desconto > 0 && <span className="chip bg-ksgold text-ksblack">-{desconto}%</span>}
          {produto.disponivel && produto.destaque && !desconto && <span className="chip bg-kswhite text-ksblack">Destaque</span>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <h3 className="ks-heading text-lg leading-tight text-kswhite sm:text-xl">{produto.nome}</h3>

        {produto.cores.length > 0 && (
          <div className="flex items-center gap-1.5" aria-label={`Cores: ${produto.cores.map((c) => c.nome).join(", ")}`}>
            {produto.cores.slice(0, 6).map((c) => (
              <span key={c.nome} title={c.nome} className="h-3.5 w-3.5 rounded-full border border-white/25" style={{ background: c.hex || "#777" }} />
            ))}
            {produto.cores.length > 6 && <span className="text-[11px] text-kswhite/50">+{produto.cores.length - 6}</span>}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          {produto.precoDe && !variaPreco && <span className="text-xs text-kswhite/40 line-through">{formatarPreco(produto.precoDe)}</span>}
          <span className="text-lg font-bold text-ksgold">
            {variaPreco && <span className="mr-1 text-xs font-medium text-kswhite/50">a partir de</span>}
            {formatarPreco(produto.precoMin)}
          </span>
        </div>
      </div>
    </Link>
  );
}
