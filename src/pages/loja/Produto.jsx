import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { buscarProduto, precoDaVariante, temEstoque } from "../../lib/produtos";
import { formatarPreco } from "../../lib/format";
import { useCart } from "../../context/CartContext";
import { useFeedback, Carregando, Vazio } from "../../components/ui/Feedback";
import Icon from "../../components/ui/Icon";

export default function Produto() {
  const { id } = useParams();
  const { abrirCarrinho } = useOutletContext();
  const { addItem, items } = useCart();
  const { toast } = useFeedback();
  const [produto, setProduto] = useState(undefined);
  const [erro, setErro] = useState(false);
  const [foto, setFoto] = useState(0);
  const [cor, setCor] = useState(null);
  const [tamanho, setTamanho] = useState(null);
  const [qtd, setQtd] = useState(1);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let ativo = true;
    setProduto(undefined);
    setErro(false);
    buscarProduto(id)
      .then((p) => {
        if (!ativo) return;
        setProduto(p);
        if (p) {
          document.title = `${p.nome} — King Style`;
          const primeiraCor = p.cores.find((c) => p.variantes.some((v) => v.cor === c.nome && temEstoque(v))) || p.cores[0];
          setCor(primeiraCor?.nome ?? null);
          setTamanho(p.tamanhos.length === 1 ? p.tamanhos[0] : null);
          setFoto(0);
        }
      })
      .catch(() => ativo && setErro(true));
    return () => {
      ativo = false;
    };
  }, [id]);

  // variações da cor escolhida
  const opcoesCor = useMemo(() => (produto ? produto.variantes.filter((v) => !produto.cores.length || v.cor === cor) : []), [produto, cor]);

  const variante = useMemo(() => {
    if (!produto || !produto.variantes.length) return null;
    if (produto.cores.length && !cor) return null;
    if (produto.tamanhos.length && !tamanho) return null;
    return opcoesCor.find((v) => !produto.tamanhos.length || v.tamanho === tamanho) || null;
  }, [produto, opcoesCor, cor, tamanho]);

  // Mostra a foto da cor escolhida, se houver
  useEffect(() => {
    if (!produto || !cor) return;
    const img = produto.cores.find((c) => c.nome === cor)?.imagem;
    const idx = img ? produto.imagens.indexOf(img) : -1;
    if (idx >= 0) setFoto(idx);
  }, [cor, produto]);

  if (produto === undefined && !erro) return <Carregando texto="Carregando produto..." />;
  if (erro || !produto || produto.ativo === false) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Vazio icone="box" titulo={erro ? "Não foi possível carregar o produto" : "Produto não encontrado"} texto="Ele pode ter saído de linha.">
          <Link to="/" className="btn-outline btn-sm">Ver outros produtos</Link>
        </Vazio>
      </div>
    );
  }

  const preco = variante ? precoDaVariante(produto, variante) : produto.precoMin;
  const precoDe = produto.precoDe && (!variante || variante.preco == null) ? produto.precoDe : null;
  const noCarrinho = variante ? items.find((i) => i.variantId === variante.id && i.productId === produto.id)?.quantidade || 0 : 0;
  const estoqueRestante = variante?.estoque != null ? Math.max(0, variante.estoque - noCarrinho) : null;
  const semVariacao = produto.variantes.length === 0;
  const podeComprar = produto.disponivel && (semVariacao || (variante && temEstoque(variante) && (estoqueRestante === null || estoqueRestante > 0)));
  const imagens = produto.imagens.length ? produto.imagens : [null];

  function adicionar(irParaCarrinho) {
    if (!produto.disponivel) return;
    if (!semVariacao && !variante) {
      setAviso(produto.cores.length && !cor ? "Escolha uma cor." : "Escolha um tamanho.");
      return;
    }
    if (!podeComprar) return;
    addItem({
      productId: produto.id,
      variantId: variante?.id ?? null,
      nome: produto.nome,
      cor: variante?.cor ?? null,
      tamanho: variante?.tamanho ?? null,
      preco,
      imagem: variante?.imagem || produto.imagens[0] || null,
      estoque: variante?.estoque ?? null,
      quantidade: qtd,
    });
    setAviso("");
    setQtd(1);
    if (irParaCarrinho) abrirCarrinho();
    else toast("Adicionado ao carrinho!");
  }

  const tamanhoDisponivel = (t) => opcoesCor.some((v) => v.tamanho === t && temEstoque(v));
  const corDisponivel = (c) => produto.variantes.some((v) => v.cor === c && temEstoque(v));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <nav className="mb-5 text-sm text-kswhite/50">
        <Link to="/" className="inline-flex items-center gap-1 hover:text-ksgold"><Icon name="arrowLeft" className="h-4 w-4" /> Voltar para a loja</Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Galeria */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-ksline bg-ksgunmetal">
            {imagens[foto] ? (
              <img src={imagens[foto]} alt={produto.nome} className={`h-full w-full object-cover ${!produto.disponivel ? "opacity-60 grayscale" : ""}`} />
            ) : (
              <div className="flex h-full items-center justify-center text-kswhite/30">Sem imagem</div>
            )}
            {imagens.length > 1 && (
              <>
                <button className="icon-btn absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur" onClick={() => setFoto((f) => (f - 1 + imagens.length) % imagens.length)} aria-label="Foto anterior">
                  <Icon name="chevronLeft" />
                </button>
                <button className="icon-btn absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur" onClick={() => setFoto((f) => (f + 1) % imagens.length)} aria-label="Próxima foto">
                  <Icon name="chevronRight" />
                </button>
              </>
            )}
            {!produto.disponivel && <span className="chip absolute left-3 top-3 bg-red-600 text-white">Esgotado</span>}
          </div>
          {imagens.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imagens.map((src, i) => (
                <button key={src} onClick={() => setFoto(i)} aria-label={`Foto ${i + 1}`} className={`h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${i === foto ? "border-ksgold" : "border-transparent opacity-60 hover:opacity-100"}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="ks-heading text-4xl leading-none sm:text-5xl">{produto.nome}</h1>
            <div className="mt-3 flex items-baseline gap-3">
              {precoDe && <span className="text-base text-kswhite/40 line-through">{formatarPreco(precoDe)}</span>}
              <span className="text-3xl font-bold text-ksgold">
                {!variante && produto.precoMax > produto.precoMin && <span className="mr-1 text-sm font-medium text-kswhite/50">a partir de</span>}
                {formatarPreco(preco)}
              </span>
            </div>
          </div>

          {produto.cores.length > 0 && (
            <div>
              <p className="label">Cor: <span className="normal-case tracking-normal text-kswhite">{cor || "escolha"}</span></p>
              <div className="flex flex-wrap gap-2">
                {produto.cores.map((c) => {
                  const ok = corDisponivel(c.nome);
                  return (
                    <button
                      key={c.nome}
                      onClick={() => { setCor(c.nome); setTamanho(produto.tamanhos.length === 1 ? produto.tamanhos[0] : null); setAviso(""); }}
                      aria-pressed={cor === c.nome}
                      title={ok ? c.nome : `${c.nome} (esgotado)`}
                      className={`relative flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm transition ${cor === c.nome ? "border-ksgold bg-ksgold/10" : "border-ksline hover:border-kswhite/40"} ${!ok ? "opacity-45" : ""}`}
                    >
                      <span className="h-6 w-6 rounded-full border border-white/25" style={{ background: c.hex || "#777" }} />
                      <span className={!ok ? "line-through" : ""}>{c.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {produto.tamanhos.length > 0 && (
            <div>
              <p className="label">Tamanho{tamanho ? <span className="normal-case tracking-normal text-kswhite">: {tamanho}</span> : null}</p>
              <div className="flex flex-wrap gap-2">
                {produto.tamanhos.map((t) => {
                  const existe = opcoesCor.some((v) => v.tamanho === t);
                  const ok = tamanhoDisponivel(t);
                  return (
                    <button
                      key={t}
                      disabled={!existe || !ok}
                      onClick={() => { setTamanho(t); setAviso(""); setQtd(1); }}
                      aria-pressed={tamanho === t}
                      className={`min-w-12 rounded-lg border px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${tamanho === t ? "border-ksgold bg-ksgold text-ksblack" : "border-ksline hover:border-ksgold"} ${!ok ? "line-through opacity-35" : ""}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {variante?.estoque != null && variante.estoque > 0 && variante.estoque <= 3 && (
            <p className="flex items-center gap-2 text-sm text-amber-300"><Icon name="alert" className="h-4 w-4" />Últimas {variante.estoque} unidades!</p>
          )}

          {produto.disponivel && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center justify-between rounded-lg border border-ksline sm:w-36">
                <button className="icon-btn h-12 w-12" onClick={() => setQtd((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade"><Icon name="minus" className="h-4 w-4" /></button>
                <span className="text-base tabular-nums" aria-label="Quantidade">{qtd}</span>
                <button className="icon-btn h-12 w-12" onClick={() => setQtd((q) => Math.min(estoqueRestante ?? 99, q + 1))} disabled={estoqueRestante !== null && qtd >= estoqueRestante} aria-label="Aumentar quantidade"><Icon name="plus" className="h-4 w-4" /></button>
              </div>
              <button onClick={() => adicionar(false)} className="btn-outline flex-1 py-3 uppercase tracking-widest2">Adicionar</button>
              <button onClick={() => adicionar(true)} className="btn-gold flex-1 py-3 uppercase tracking-widest2">Comprar</button>
            </div>
          )}
          {!produto.disponivel && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">Produto esgotado no momento.</p>}
          {produto.disponivel && variante && !podeComprar && <p className="text-sm text-red-300">Esta opção esgotou{noCarrinho ? " (as unidades restantes já estão no seu carrinho)" : ""}.</p>}
          {aviso && <p className="text-sm text-amber-300" role="alert">{aviso}</p>}

          {produto.descricao && (
            <div className="border-t border-ksline pt-6">
              <h2 className="label">Descrição</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-kswhite/75">{produto.descricao}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
