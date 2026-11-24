import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { buscarProdutosLoja, buscarCategorias } from "../../lib/produtos";
import { normalizarTexto } from "../../lib/format";
import ProductCard from "../../components/loja/ProductCard";
import Icon from "../../components/ui/Icon";
import { Vazio } from "../../components/ui/Feedback";

const ORDENS = {
  novidades: { label: "Novidades", fn: (a, b) => (b.criado_em || "").localeCompare(a.criado_em || "") },
  menor: { label: "Menor preço", fn: (a, b) => a.precoMin - b.precoMin },
  maior: { label: "Maior preço", fn: (a, b) => b.precoMin - a.precoMin },
};

export default function Home() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [params, setParams] = useSearchParams();
  const categoria = params.get("categoria") || "";
  const ordem = ORDENS[params.get("ordem")] ? params.get("ordem") : "novidades";
  const [busca, setBusca] = useState(params.get("q") || "");

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [p, c] = await Promise.all([buscarProdutosLoja(), buscarCategorias().catch(() => [])]);
      setProdutos(p);
      setCategorias(c);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar os produtos.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    document.title = "King Style — Streetwear Premium";
    carregar();
  }, []);

  const setParam = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };

  // categorias que realmente têm produto
  const categoriasComProduto = useMemo(
    () => categorias.filter((c) => produtos.some((p) => p.category_id === c.id)),
    [categorias, produtos]
  );

  const visiveis = useMemo(() => {
    const q = normalizarTexto(busca);
    return produtos
      .filter((p) => !categoria || p.category_id === categoria)
      .filter((p) => !q || normalizarTexto(`${p.nome} ${p.descricao || ""}`).includes(q))
      .sort((a, b) => Number(b.disponivel) - Number(a.disponivel) || ORDENS[ordem].fn(a, b));
  }, [produtos, categoria, busca, ordem]);

  const destaques = useMemo(() => produtos.filter((p) => p.destaque && p.disponivel).slice(0, 4), [produtos]);
  const filtrando = Boolean(categoria || busca);

  return (
    <>
      <section className="relative overflow-hidden border-b border-ksline px-4 py-16 text-center sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,39,0.18),transparent_60%)]" />
        <p className="relative mb-3 text-xs font-semibold uppercase tracking-widest2 text-ksgold">Streetwear premium</p>
        <h1 className="ks-heading relative text-5xl leading-none text-kswhite sm:text-7xl">
          Vista a <span className="text-ksgold">atitude</span>
        </h1>
        <p className="relative mx-auto mt-4 max-w-lg text-sm text-kswhite/70 sm:text-base">
          Peças autorais em preto, branco e dourado. Escolha, monte seu carrinho e finalize pelo WhatsApp.
        </p>
        <a href="#produtos" className="btn-gold relative mt-8 px-6 py-3 uppercase tracking-widest2">Ver coleção</a>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        {!filtrando && destaques.length > 0 && (
          <section className="pt-10" aria-labelledby="destaques">
            <h2 id="destaques" className="ks-heading mb-4 text-3xl">Em <span className="text-ksgold">destaque</span></h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {destaques.map((p) => <ProductCard key={p.id} produto={p} />)}
            </div>
          </section>
        )}

        <section id="produtos" className="scroll-mt-20 pt-10" aria-labelledby="titulo-produtos">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="titulo-produtos" className="ks-heading text-3xl">
              {categoria ? categorias.find((c) => c.id === categoria)?.nome || "Produtos" : "Todos os produtos"}
            </h2>
            <div className="flex gap-2">
              <label className="relative flex-1 sm:w-64">
                <span className="sr-only">Buscar produto</span>
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kswhite/40" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setParam("q", e.target.value);
                  }}
                  placeholder="Buscar..."
                  className="input pl-9"
                />
              </label>
              <select value={ordem} onChange={(e) => setParam("ordem", e.target.value === "novidades" ? "" : e.target.value)} className="input w-auto" aria-label="Ordenar">
                {Object.entries(ORDENS).map(([k, o]) => <option key={k} value={k}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {categoriasComProduto.length > 0 && (
            <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Categorias">
              {[{ id: "", nome: "Todos" }, ...categoriasComProduto].map((c) => (
                <button
                  key={c.id || "todos"}
                  onClick={() => setParam("categoria", c.id)}
                  aria-pressed={categoria === c.id}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${categoria === c.id ? "border-ksgold bg-ksgold text-ksblack" : "border-ksline text-kswhite/75 hover:border-ksgold"}`}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          )}

          {carregando ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-ksline">
                  <div className="aspect-[4/5] animate-pulse bg-ksgunmetal/60" />
                  <div className="space-y-2 p-4"><div className="h-4 w-3/4 animate-pulse rounded bg-ksgunmetal/60" /><div className="h-4 w-1/3 animate-pulse rounded bg-ksgunmetal/60" /></div>
                </div>
              ))}
            </div>
          ) : erro ? (
            <Vazio icone="alert" titulo={erro}>
              <button onClick={carregar} className="btn-outline btn-sm">Tentar novamente</button>
            </Vazio>
          ) : visiveis.length === 0 ? (
            <Vazio icone="search" titulo={filtrando ? "Nenhum produto encontrado" : "Nenhum produto disponível no momento"} texto={filtrando ? "Tente outra busca ou categoria." : "Volte em breve!"}>
              {filtrando && <button onClick={() => { setBusca(""); setParams({}, { replace: true }); }} className="btn-outline btn-sm">Limpar filtros</button>}
            </Vazio>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {visiveis.map((p) => <ProductCard key={p.id} produto={p} />)}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
