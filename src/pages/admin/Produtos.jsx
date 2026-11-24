import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listarProdutosAdmin, listarCategoriasAdmin, atualizarProduto, excluirProduto, duplicarProduto } from "../../lib/admin";
import { formatarPreco, mensagemErro, normalizarTexto } from "../../lib/format";
import { normalizarProduto } from "../../lib/produtos";
import { TituloPagina } from "./AdminLayout";
import Icon from "../../components/ui/Icon";
import { Carregando, Vazio, useFeedback } from "../../components/ui/Feedback";

const FILTROS = {
  todos: { label: "Todos", fn: () => true },
  ativos: { label: "À venda", fn: (p) => p.ativo },
  ocultos: { label: "Ocultos", fn: (p) => !p.ativo },
  esgotados: { label: "Esgotados", fn: (p) => !p.disponivel },
  estoque: { label: "Estoque baixo", fn: (p) => p.variantes.some((v) => v.estoque != null && v.estoque <= 3) },
  destaque: { label: "Destaques", fn: (p) => p.destaque },
};

function Toggle({ ligado, onClick, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${ligado ? "bg-ksgold" : "bg-ksline"} disabled:opacity-50`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${ligado ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function Produtos() {
  const navigate = useNavigate();
  const { toast, confirmar } = useFeedback();
  const [produtos, setProdutos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [erro, setErro] = useState(null);
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState(null);
  const filtro = FILTROS[params.get("filtro")] ? params.get("filtro") : "todos";
  const categoria = params.get("categoria") || "";

  async function carregar() {
    try {
      const [p, c] = await Promise.all([listarProdutosAdmin(), listarCategoriasAdmin().catch(() => [])]);
      setProdutos(p);
      setCategorias(c);
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  const lista = useMemo(() => {
    if (!produtos) return [];
    const q = normalizarTexto(busca);
    return produtos
      .filter(FILTROS[filtro].fn)
      .filter((p) => !categoria || p.category_id === categoria)
      .filter((p) => !q || normalizarTexto(`${p.nome} ${p.variantes.map((v) => v.sku || "").join(" ")}`).includes(q));
  }, [produtos, filtro, categoria, busca]);

  const setParam = (k, v) => {
    const n = new URLSearchParams(params);
    v ? n.set(k, v) : n.delete(k);
    setParams(n, { replace: true });
  };

  async function alternar(produto, campo) {
    setOcupado(`${produto.id}-${campo}`);
    try {
      await atualizarProduto(produto.id, { [campo]: !produto[campo] });
      setProdutos((ps) =>
        ps.map((p) =>
          p.id === produto.id
            ? { ...normalizarProduto({ ...p, [campo]: !p[campo], product_variants: p.todasVariantes }), todasVariantes: p.todasVariantes }
            : p
        )
      );
    } catch (e) {
      toast(mensagemErro(e), "erro");
    } finally {
      setOcupado(null);
    }
  }

  async function excluir(produto) {
    const ok = await confirmar({
      titulo: "Excluir produto?",
      mensagem: `"${produto.nome}" e suas fotos serão apagados definitivamente. Se só quiser tirar da loja, use "À venda" para ocultar.`,
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    try {
      await excluirProduto(produto);
      setProdutos((ps) => ps.filter((p) => p.id !== produto.id));
      toast("Produto excluído.");
    } catch (e) {
      toast(mensagemErro(e), "erro");
    }
  }

  async function duplicar(produto) {
    try {
      const id = await duplicarProduto(produto);
      toast("Cópia criada (oculta). Ajuste e coloque à venda.");
      navigate(`/admin/produtos/${id}`);
    } catch (e) {
      toast(mensagemErro(e), "erro");
    }
  }

  return (
    <>
      <TituloPagina titulo="Produtos" subtitulo={produtos ? `${produtos.length} cadastrados` : ""}>
        <Link to="/admin/produtos/novo" className="btn-gold"><Icon name="plus" className="h-4 w-4" /> Novo produto</Link>
      </TituloPagina>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kswhite/40" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou SKU..." className="input pl-9" />
        </label>
        {categorias.length > 0 && (
          <select value={categoria} onChange={(e) => setParam("categoria", e.target.value)} className="input sm:w-52" aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {Object.entries(FILTROS).map(([k, f]) => (
          <button key={k} onClick={() => setParam("filtro", k === "todos" ? "" : k)} aria-pressed={filtro === k} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${filtro === k ? "border-ksgold bg-ksgold text-ksblack" : "border-ksline text-kswhite/70 hover:border-ksgold"}`}>
            {f.label}
            {produtos && <span className="ml-1.5 opacity-60">{produtos.filter(f.fn).length}</span>}
          </button>
        ))}
      </div>

      {erro ? (
        <p className="text-sm text-red-300">{erro}</p>
      ) : !produtos ? (
        <Carregando texto="Carregando produtos..." />
      ) : lista.length === 0 ? (
        <Vazio icone="box" titulo={produtos.length ? "Nenhum produto neste filtro" : "Nenhum produto cadastrado"} texto={produtos.length ? "" : "Cadastre o primeiro produto da loja."}>
          {!produtos.length && <Link to="/admin/produtos/novo" className="btn-gold btn-sm">Cadastrar produto</Link>}
        </Vazio>
      ) : (
        <div className="card divide-y divide-ksline">
          <div className="hidden grid-cols-[1fr_7rem_6rem_4.5rem_4.5rem_4.5rem_7rem] items-center gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-kswhite/40 md:grid">
            <span>Produto</span><span>Preço</span><span>Estoque</span><span className="text-center">À venda</span><span className="text-center">Esgotado</span><span className="text-center">Destaque</span><span />
          </div>
          {lista.map((p) => {
            const cat = categorias.find((c) => c.id === p.category_id)?.nome;
            const estoque = p.estoqueTotal;
            return (
              <div key={p.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[1fr_7rem_6rem_4.5rem_4.5rem_4.5rem_7rem]">
                <Link to={`/admin/produtos/${p.id}`} className="contents md:flex md:items-center md:gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ksgunmetal">
                    {p.imagens[0] ? <img src={p.imagens[0]} alt="" className={`h-full w-full object-cover ${!p.ativo ? "opacity-40" : ""}`} loading="lazy" /> : <Icon name="image" className="m-auto mt-4 h-6 w-6 text-kswhite/20" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate font-semibold ${!p.ativo ? "text-kswhite/45" : ""}`}>{p.nome}</p>
                    <p className="truncate text-xs text-kswhite/45">
                      {[cat, p.cores.length ? `${p.cores.length} cor(es)` : null, p.tamanhos.length ? p.tamanhos.join(" · ") : null].filter(Boolean).join(" • ") || "Sem variações"}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-ksgold md:hidden">{formatarPreco(p.precoMin)}{!p.ativo && <span className="ml-2 chip bg-white/10 text-kswhite/60">Oculto</span>}{!p.disponivel && <span className="ml-2 chip bg-red-500/15 text-red-300">Esgotado</span>}</p>
                  </div>
                </Link>
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-ksgold">{formatarPreco(p.precoFinal)}</p>
                  {p.precoDe && <p className="text-xs text-kswhite/40 line-through">{formatarPreco(p.precoDe)}</p>}
                </div>
                <div className="hidden text-sm md:block">
                  {estoque === null ? <span className="text-kswhite/40">—</span> : <span className={estoque === 0 ? "text-red-300" : estoque <= 3 ? "text-amber-300" : ""}>{estoque} un.</span>}
                </div>
                <div className="hidden justify-center md:flex"><Toggle ligado={p.ativo} label="À venda" onClick={() => alternar(p, "ativo")} disabled={ocupado === `${p.id}-ativo`} /></div>
                <div className="hidden justify-center md:flex"><Toggle ligado={p.esgotado} label="Marcar esgotado" onClick={() => alternar(p, "esgotado")} disabled={ocupado === `${p.id}-esgotado`} /></div>
                <div className="hidden justify-center md:flex"><Toggle ligado={p.destaque} label="Destaque" onClick={() => alternar(p, "destaque")} disabled={ocupado === `${p.id}-destaque`} /></div>
                <div className="flex justify-end gap-0.5">
                  <Link to={`/admin/produtos/${p.id}`} className="icon-btn" aria-label={`Editar ${p.nome}`} title="Editar"><Icon name="edit" className="h-4 w-4" /></Link>
                  <button className="icon-btn hidden sm:inline-flex" onClick={() => duplicar(p)} aria-label={`Duplicar ${p.nome}`} title="Duplicar"><Icon name="copy" className="h-4 w-4" /></button>
                  <button className="icon-btn hover:text-red-400" onClick={() => excluir(p)} aria-label={`Excluir ${p.nome}`} title="Excluir"><Icon name="trash" className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
