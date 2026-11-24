import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { obterProdutoAdmin, salvarProduto, listarCategoriasAdmin, criarCategoria } from "../../lib/admin";
import { enviarImagem } from "../../lib/imagens";
import { formatarPreco, mensagemErro, parseInteiro, parsePreco } from "../../lib/format";
import { useAdmin, TituloPagina } from "./AdminLayout";
import SizeTagInput from "../../components/SizeTagInput";
import Icon from "../../components/ui/Icon";
import { Carregando, Spinner, useFeedback } from "../../components/ui/Feedback";

const PRESETS_TAMANHO = [
  { label: "P ao GG", valores: ["P", "M", "G", "GG"] },
  { label: "PP ao XGG", valores: ["PP", "P", "M", "G", "GG", "XG", "XGG"] },
  { label: "Calçados 37–44", valores: ["37", "38", "39", "40", "41", "42", "43", "44"] },
  { label: "Calças 36–48", valores: ["36", "38", "40", "42", "44", "46", "48"] },
  { label: "Único", valores: ["Único"] },
];

const CORES_COMUNS = [
  ["Preto", "#111111"], ["Branco", "#f5f5f5"], ["Cinza", "#8a8a8a"], ["Chumbo", "#3f4247"], ["Bege", "#d8c3a5"],
  ["Marrom", "#6b4423"], ["Azul", "#1e40af"], ["Azul-marinho", "#1e2a4a"], ["Verde", "#166534"], ["Verde-militar", "#4b5320"],
  ["Vermelho", "#b91c1c"], ["Vinho", "#6d1a2a"], ["Rosa", "#f4a7c3"], ["Amarelo", "#facc15"], ["Laranja", "#ea580c"], ["Dourado", "#c9a227"],
];

const chave = (cor, tam) => `${cor ?? ""}|${tam ?? ""}`;

export default function ProductForm() {
  const { id: idParam } = useParams();
  const novo = !idParam;
  const navigate = useNavigate();
  const { migracao } = useAdmin();
  const { toast, confirmar } = useFeedback();
  const inputArquivo = useRef(null);

  const [id] = useState(() => idParam || crypto.randomUUID());
  const [carregando, setCarregando] = useState(!novo);
  const [erroCarga, setErroCarga] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [dados, setDados] = useState({ nome: "", descricao: "", preco: "", preco_promocional: "", category_id: "", ativo: true, destaque: false, esgotado: false });
  const [imagens, setImagens] = useState([]); // { url } | { file, preview }
  const [removidas, setRemovidas] = useState([]);
  const [cores, setCores] = useState([]); // { nome, hex, imagem: url|preview|null }
  const [tamanhos, setTamanhos] = useState([]);
  const [grade, setGrade] = useState({}); // chave -> { id, estoque, preco, sku, ativo }
  const [precoPorVariacao, setPrecoPorVariacao] = useState(false);
  const [novaCor, setNovaCor] = useState({ nome: "", hex: "#111111" });
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});
  const [sujo, setSujo] = useState(false);

  // Carrega categorias e (se editando) o produto
  useEffect(() => {
    listarCategoriasAdmin().then(setCategorias).catch(() => {});
    if (novo) return;
    obterProdutoAdmin(idParam)
      .then((p) => {
        if (!p) {
          setErroCarga("Produto não encontrado.");
          return;
        }
        setDados({
          nome: p.nome || "",
          descricao: p.descricao || "",
          preco: p.preco != null ? String(p.preco).replace(".", ",") : "",
          preco_promocional: p.preco_promocional != null ? String(p.preco_promocional).replace(".", ",") : "",
          category_id: p.category_id || "",
          ativo: p.ativo !== false,
          destaque: !!p.destaque,
          esgotado: !!p.esgotado,
        });
        setImagens((p.imagens || []).map((url) => ({ url })));
        const vs = p.product_variants || [];
        const listaCores = [];
        vs.forEach((v) => v.cor && !listaCores.some((c) => c.nome === v.cor) && listaCores.push({ nome: v.cor, hex: v.cor_hex || "#777777", imagem: v.imagem || null }));
        const listaTam = vs.length ? [...new Set(vs.map((v) => v.tamanho).filter(Boolean))] : p.tamanhos || [];
        setCores(listaCores);
        setTamanhos(listaTam);
        const g = {};
        vs.forEach((v) => {
          g[chave(v.cor, v.tamanho)] = { id: v.id, estoque: v.estoque ?? "", preco: v.preco != null ? String(v.preco).replace(".", ",") : "", sku: v.sku || "", ativo: v.ativo !== false };
        });
        setGrade(g);
        setPrecoPorVariacao(vs.some((v) => v.preco != null));
      })
      .catch((e) => setErroCarga(mensagemErro(e)))
      .finally(() => setCarregando(false));
  }, [idParam, novo]);

  useEffect(() => {
    document.title = `${novo ? "Novo produto" : "Editar produto"} — King Style`;
    const aviso = (e) => {
      if (sujo) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo, novo]);

  const muda = (fn) => (...args) => {
    setSujo(true);
    fn(...args);
  };
  const campo = (k) =>
    muda((e) => {
      setDados((d) => ({ ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
      setErros((er) => (er[k] ? { ...er, [k]: undefined } : er));
    });

  // Todas as combinações cor × tamanho
  const combinacoes = useMemo(() => {
    const cs = cores.length ? cores.map((c) => c.nome) : [null];
    const ts = tamanhos.length ? tamanhos : [null];
    return cs.flatMap((c) => ts.map((t) => ({ cor: c, tamanho: t, k: chave(c, t) })));
  }, [cores, tamanhos]);

  const linha = (k) => grade[k] || { estoque: "", preco: "", sku: "", ativo: true };
  const setLinha = muda((k, campos) => setGrade((g) => ({ ...g, [k]: { ...linha(k), ...g[k], ...campos } })));

  /* ---------- Imagens ---------- */
  const adicionarArquivos = muda((files) => {
    const novos = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImagens((im) => [...im, ...novos].slice(0, 12));
  });
  const srcImagem = (img) => img.url || img.preview;
  const removerImagem = muda((i) => {
    setImagens((im) => {
      const alvo = im[i];
      if (alvo.url) setRemovidas((r) => [...r, alvo.url]);
      setCores((cs) => cs.map((c) => (c.imagem === srcImagem(alvo) ? { ...c, imagem: null } : c)));
      return im.filter((_, j) => j !== i);
    });
  });
  const moverImagem = muda((i, dir) => {
    setImagens((im) => {
      const j = i + dir;
      if (j < 0 || j >= im.length) return im;
      const n = [...im];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  });

  /* ---------- Cores ---------- */
  const adicionarCor = muda((nome, hex) => {
    const n = nome.trim();
    if (!n || cores.some((c) => c.nome.toLowerCase() === n.toLowerCase())) return;
    setCores((cs) => [...cs, { nome: n, hex, imagem: null }]);
    setNovaCor({ nome: "", hex: "#111111" });
  });
  const removerCor = muda((nome) => setCores((cs) => cs.filter((c) => c.nome !== nome)));

  /* ---------- Ações em massa ---------- */
  const [massa, setMassa] = useState({ estoque: "", preco: "" });
  const aplicarMassa = muda((campoMassa) => {
    setGrade((g) => {
      const n = { ...g };
      combinacoes.forEach(({ k }) => (n[k] = { ...linha(k), ...g[k], [campoMassa]: massa[campoMassa] }));
      return n;
    });
  });

  /* ---------- Salvar ---------- */
  async function salvar(e) {
    e.preventDefault();
    const preco = parsePreco(dados.preco);
    const promo = parsePreco(dados.preco_promocional);
    const errosNovos = {};
    if (!dados.nome.trim()) errosNovos.nome = "Informe o nome.";
    if (preco === null) errosNovos.preco = "Informe o preço.";
    if (promo !== null && preco !== null && promo >= preco) errosNovos.preco_promocional = "O preço promocional deve ser menor que o preço normal.";
    setErros(errosNovos);
    if (Object.keys(errosNovos).length) {
      toast("Confira os campos destacados.", "erro");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSalvando(true);
    try {
      // 1. Envia as fotos novas (já comprimidas) mantendo a ordem
      const mapa = {};
      const urls = [];
      for (const img of imagens) {
        const url = img.url || (await enviarImagem(id, img.file));
        mapa[srcImagem(img)] = url;
        urls.push(url);
      }

      // 2. Variações
      const variantes = combinacoes.map(({ cor, tamanho, k }) => {
        const l = linha(k);
        const c = cores.find((x) => x.nome === cor);
        return {
          id: l.id,
          cor,
          cor_hex: c?.hex,
          tamanho,
          estoque: parseInteiro(l.estoque),
          preco: precoPorVariacao ? parsePreco(l.preco) : null,
          sku: l.sku,
          ativo: l.ativo !== false,
          imagem: c?.imagem ? mapa[c.imagem] || null : null,
        };
      });

      await salvarProduto({
        id,
        novo,
        dados: {
          nome: dados.nome.trim(),
          descricao: dados.descricao.trim() || null,
          preco,
          preco_promocional: promo,
          category_id: dados.category_id || null,
          imagens: urls,
          ativo: dados.ativo,
          destaque: dados.destaque,
          esgotado: dados.esgotado,
        },
        variantes,
        imagensRemovidas: removidas,
      });
      setSujo(false);
      toast(novo ? "Produto cadastrado!" : "Alterações salvas!");
      navigate("/admin/produtos");
    } catch (err) {
      console.error(err);
      toast(mensagemErro(err, "Não foi possível salvar o produto."), "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function cancelar() {
    if (sujo && !(await confirmar({ titulo: "Descartar alterações?", mensagem: "Você tem alterações que não foram salvas.", confirmar: "Descartar", perigo: true }))) return;
    setSujo(false);
    navigate("/admin/produtos");
  }

  async function novaCategoria() {
    const nome = window.prompt("Nome da nova categoria:");
    if (!nome?.trim()) return;
    try {
      const c = await criarCategoria(nome, categorias.length);
      setCategorias((cs) => [...cs, c]);
      setDados((d) => ({ ...d, category_id: c.id }));
      setSujo(true);
    } catch (e) {
      toast(mensagemErro(e), "erro");
    }
  }

  if (carregando) return <Carregando texto="Carregando produto..." />;
  if (erroCarga) return <p className="text-sm text-red-300">{erroCarga} <Link to="/admin/produtos" className="text-ksgold underline">Voltar</Link></p>;

  const temVariacoes = cores.length > 0 || tamanhos.length > 0;
  const precoBase = parsePreco(dados.preco);

  return (
    <form onSubmit={salvar} noValidate>
      <TituloPagina titulo={novo ? "Novo produto" : "Editar produto"} subtitulo={novo ? "Preencha as informações e as variações." : dados.nome}>
        <button type="button" onClick={cancelar} className="btn-ghost">Cancelar</button>
        <button type="submit" disabled={salvando || !migracao} className="btn-gold">
          {salvando ? <Spinner className="h-4 w-4" /> : <Icon name="check" className="h-4 w-4" />}
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </TituloPagina>

      {!migracao && <p className="mb-6 text-sm text-amber-300">Para salvar produtos com variações, rode primeiro a migração 002 no Supabase (veja o aviso acima).</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          {/* Informações */}
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Informações</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="label" htmlFor="nome">Nome *</label>
                <input id="nome" value={dados.nome} onChange={campo("nome")} className={`input ${erros.nome ? "input-erro" : ""}`} placeholder="Ex.: Camiseta Oversized Coroa" />
                {erros.nome && <p className="mt-1 text-xs text-red-400">{erros.nome}</p>}
              </div>
              <div>
                <label className="label" htmlFor="descricao">Descrição</label>
                <textarea id="descricao" rows={4} value={dados.descricao} onChange={campo("descricao")} className="input" placeholder="Tecido, modelagem, medidas, cuidados..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="preco">Preço (R$) *</label>
                  <input id="preco" inputMode="decimal" value={dados.preco} onChange={campo("preco")} className={`input ${erros.preco ? "input-erro" : ""}`} placeholder="129,90" />
                  {erros.preco && <p className="mt-1 text-xs text-red-400">{erros.preco}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="promo">Preço promocional (R$)</label>
                  <input id="promo" inputMode="decimal" value={dados.preco_promocional} onChange={campo("preco_promocional")} className={`input ${erros.preco_promocional ? "input-erro" : ""}`} placeholder="Opcional" />
                  {erros.preco_promocional ? <p className="mt-1 text-xs text-red-400">{erros.preco_promocional}</p> : <p className="mt-1 text-xs text-kswhite/40">Aparece riscado o preço normal na loja.</p>}
                </div>
              </div>
            </div>
          </section>

          {/* Fotos */}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Fotos <span className="text-kswhite/40">({imagens.length}/12)</span></h2>
              <span className="text-xs text-kswhite/40">A primeira é a capa</span>
            </div>
            <div
              className="grid grid-cols-3 gap-3 sm:grid-cols-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                adicionarArquivos(e.dataTransfer.files);
              }}
            >
              {imagens.map((img, i) => (
                <div key={srcImagem(img)} className="group relative aspect-square overflow-hidden rounded-lg border border-ksline bg-ksgunmetal">
                  <img src={srcImagem(img)} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && <span className="chip absolute left-1.5 top-1.5 bg-ksgold text-ksblack">Capa</span>}
                  {img.file && <span className="chip absolute right-1.5 top-1.5 bg-black/70 text-kswhite">Nova</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/85 to-transparent p-1">
                    <button type="button" className="icon-btn h-7 w-7" onClick={() => moverImagem(i, -1)} disabled={i === 0} aria-label="Mover para a esquerda"><Icon name="chevronLeft" className="h-4 w-4" /></button>
                    <button type="button" className="icon-btn h-7 w-7 hover:text-red-400" onClick={() => removerImagem(i)} aria-label="Remover foto"><Icon name="trash" className="h-4 w-4" /></button>
                    <button type="button" className="icon-btn h-7 w-7" onClick={() => moverImagem(i, 1)} disabled={i === imagens.length - 1} aria-label="Mover para a direita"><Icon name="chevronRight" className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              {imagens.length < 12 && (
                <button type="button" onClick={() => inputArquivo.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ksline text-kswhite/50 transition hover:border-ksgold hover:text-ksgold">
                  <Icon name="upload" />
                  <span className="text-xs font-semibold">Adicionar</span>
                </button>
              )}
            </div>
            <input ref={inputArquivo} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { adicionarArquivos(e.target.files); e.target.value = ""; }} />
            <p className="mt-3 text-xs text-kswhite/40">As fotos são reduzidas automaticamente para a loja carregar rápido. Pode arrastar e soltar aqui.</p>
          </section>

          {/* Variações */}
          <section className="card p-5">
            <h2 className="font-semibold">Variações</h2>
            <p className="mb-5 mt-1 text-sm text-kswhite/50">Cores e tamanhos que o cliente pode escolher. Depois defina o estoque de cada combinação.</p>

            <div className="mb-6">
              <span className="label">Cores</span>
              {cores.length > 0 && (
                <div className="mb-3 flex flex-col gap-2">
                  {cores.map((c) => (
                    <div key={c.nome} className="flex flex-wrap items-center gap-3 rounded-lg border border-ksline px-3 py-2">
                      <input type="color" value={c.hex} onChange={muda((e) => setCores((cs) => cs.map((x) => (x.nome === c.nome ? { ...x, hex: e.target.value } : x))))} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent" aria-label={`Cor de ${c.nome}`} />
                      <span className="flex-1 font-semibold">{c.nome}</span>
                      {imagens.length > 0 && (
                        <select value={c.imagem || ""} onChange={muda((e) => setCores((cs) => cs.map((x) => (x.nome === c.nome ? { ...x, imagem: e.target.value || null } : x))))} className="input w-auto py-1.5 text-xs" aria-label={`Foto da cor ${c.nome}`}>
                          <option value="">Foto: nenhuma</option>
                          {imagens.map((img, i) => <option key={srcImagem(img)} value={srcImagem(img)}>Foto {i + 1}</option>)}
                        </select>
                      )}
                      <button type="button" onClick={() => removerCor(c.nome)} className="icon-btn h-8 w-8 hover:text-red-400" aria-label={`Remover cor ${c.nome}`}><Icon name="x" className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {CORES_COMUNS.filter(([n]) => !cores.some((c) => c.nome === n)).map(([n, hex]) => (
                  <button key={n} type="button" onClick={() => adicionarCor(n, hex)} className="flex items-center gap-1.5 rounded-full border border-ksline py-1 pl-1 pr-2.5 text-xs text-kswhite/75 hover:border-ksgold">
                    <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: hex }} /> {n}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input type="color" value={novaCor.hex} onChange={(e) => setNovaCor((c) => ({ ...c, hex: e.target.value }))} className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-ksline bg-ksblack p-1" aria-label="Escolher cor" />
                <input value={novaCor.nome} onChange={(e) => setNovaCor((c) => ({ ...c, nome: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarCor(novaCor.nome, novaCor.hex); } }} placeholder="Outra cor (ex.: Off-white)" className="input" />
                <button type="button" onClick={() => adicionarCor(novaCor.nome, novaCor.hex)} className="btn-outline shrink-0">Adicionar</button>
              </div>
            </div>

            <div className="mb-6">
              <span className="label">Tamanhos</span>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {PRESETS_TAMANHO.map((p) => (
                  <button key={p.label} type="button" onClick={muda(() => setTamanhos((ts) => [...new Set([...ts, ...p.valores])]))} className="rounded-full border border-ksline px-3 py-1 text-xs text-kswhite/75 hover:border-ksgold">
                    + {p.label}
                  </button>
                ))}
                {tamanhos.length > 0 && <button type="button" onClick={muda(() => setTamanhos([]))} className="rounded-full px-3 py-1 text-xs text-red-300 hover:bg-red-500/10">Limpar</button>}
              </div>
              <SizeTagInput tamanhos={tamanhos} onChange={muda(setTamanhos)} />
            </div>

            {/* Grade de estoque */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <span className="label mb-0">{temVariacoes ? `Estoque por variação (${combinacoes.length})` : "Estoque"}</span>
                <label className="flex items-center gap-2 text-xs text-kswhite/70">
                  <input type="checkbox" checked={precoPorVariacao} onChange={muda((e) => setPrecoPorVariacao(e.target.checked))} className="h-4 w-4 accent-ksgold" />
                  Preço diferente por variação
                </label>
              </div>

              {combinacoes.length > 1 && (
                <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg bg-white/[0.03] p-3">
                  <div>
                    <label className="label" htmlFor="massa-estoque">Estoque para todas</label>
                    <div className="flex gap-2">
                      <input id="massa-estoque" inputMode="numeric" value={massa.estoque} onChange={(e) => setMassa((m) => ({ ...m, estoque: e.target.value.replace(/\D/g, "") }))} className="input w-24" placeholder="ex.: 10" />
                      <button type="button" className="btn-outline btn-sm" onClick={() => aplicarMassa("estoque")}>Aplicar</button>
                    </div>
                  </div>
                  {precoPorVariacao && (
                    <div>
                      <label className="label" htmlFor="massa-preco">Preço para todas</label>
                      <div className="flex gap-2">
                        <input id="massa-preco" inputMode="decimal" value={massa.preco} onChange={(e) => setMassa((m) => ({ ...m, preco: e.target.value }))} className="input w-28" placeholder="R$" />
                        <button type="button" className="btn-outline btn-sm" onClick={() => aplicarMassa("preco")}>Aplicar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="overflow-hidden rounded-lg border border-ksline">
                <div className={`hidden gap-3 border-b border-ksline bg-white/[0.03] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-kswhite/40 sm:grid ${precoPorVariacao ? "sm:grid-cols-[1fr_6rem_7rem_7rem_3rem]" : "sm:grid-cols-[1fr_6rem_8rem_3rem]"}`}>
                  <span>Variação</span><span>Estoque</span>{precoPorVariacao && <span>Preço</span>}<span>SKU</span><span className="text-center">Ativa</span>
                </div>
                {combinacoes.map(({ cor, tamanho, k }) => {
                  const l = linha(k);
                  const c = cores.find((x) => x.nome === cor);
                  const est = parseInteiro(l.estoque);
                  return (
                    <div key={k} className={`grid grid-cols-2 items-center gap-3 border-b border-ksline px-3 py-2.5 last:border-0 ${precoPorVariacao ? "sm:grid-cols-[1fr_6rem_7rem_7rem_3rem]" : "sm:grid-cols-[1fr_6rem_8rem_3rem]"} ${l.ativo === false ? "opacity-50" : ""}`}>
                      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                        {c && <span className="h-4 w-4 shrink-0 rounded-full border border-white/25" style={{ background: c.hex }} />}
                        <span className="text-sm font-semibold">{[cor, tamanho].filter(Boolean).join(" / ") || "Produto único"}</span>
                        {est === 0 && <span className="chip bg-red-500/15 text-red-300">Zerado</span>}
                      </div>
                      <label className="flex items-center gap-2 sm:block">
                        <span className="w-14 text-xs text-kswhite/50 sm:hidden">Estoque</span>
                        <input inputMode="numeric" value={l.estoque} onChange={(e) => setLinha(k, { estoque: e.target.value.replace(/\D/g, "") })} className="input py-1.5" placeholder="∞" aria-label={`Estoque ${cor || ""} ${tamanho || ""}`} />
                      </label>
                      {precoPorVariacao && (
                        <label className="flex items-center gap-2 sm:block">
                          <span className="w-14 text-xs text-kswhite/50 sm:hidden">Preço</span>
                          <input inputMode="decimal" value={l.preco} onChange={(e) => setLinha(k, { preco: e.target.value })} className="input py-1.5" placeholder={precoBase != null ? formatarPreco(precoBase) : "R$"} aria-label={`Preço ${cor || ""} ${tamanho || ""}`} />
                        </label>
                      )}
                      <label className="flex items-center gap-2 sm:block">
                        <span className="w-14 text-xs text-kswhite/50 sm:hidden">SKU</span>
                        <input value={l.sku} onChange={(e) => setLinha(k, { sku: e.target.value })} className="input py-1.5" placeholder="opcional" aria-label={`SKU ${cor || ""} ${tamanho || ""}`} />
                      </label>
                      <label className="flex items-center justify-end gap-2 sm:justify-center">
                        <span className="text-xs text-kswhite/50 sm:hidden">Ativa</span>
                        <input type="checkbox" checked={l.ativo !== false} onChange={(e) => setLinha(k, { ativo: e.target.checked })} className="h-4 w-4 accent-ksgold" />
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-kswhite/40">Deixe o estoque vazio (∞) para não controlar. Com estoque 0, a opção aparece riscada na loja.</p>
            </div>
          </section>
        </div>

        {/* Lateral */}
        <div className="flex flex-col gap-6">
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Publicação</h2>
            <div className="flex flex-col gap-4">
              {[
                ["ativo", "À venda", "Aparece na loja."],
                ["destaque", "Destaque", "Mostra na seção “Em destaque”."],
                ["esgotado", "Esgotado (todas as opções)", "Bloqueia a compra mesmo com estoque."],
              ].map(([k, t, d]) => (
                <label key={k} className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={dados[k]} onChange={campo(k)} className="mt-0.5 h-4 w-4 accent-ksgold" />
                  <span><span className="block text-sm font-semibold">{t}</span><span className="text-xs text-kswhite/45">{d}</span></span>
                </label>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Categoria</h2>
              <button type="button" onClick={novaCategoria} className="text-xs font-semibold text-ksgold hover:underline">+ Nova</button>
            </div>
            <select value={dados.category_id} onChange={campo("category_id")} className="input" aria-label="Categoria">
              <option value="">Sem categoria</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </section>

          {!novo && (
            <a href={`/produto/${id}`} target="_blank" rel="noopener noreferrer" className="btn-outline">
              <Icon name="external" className="h-4 w-4" /> Ver na loja
            </a>
          )}
        </div>
      </div>

      <div className="sticky bottom-20 z-20 mt-6 flex justify-end gap-2 rounded-xl border border-ksline bg-ksblack/95 p-3 backdrop-blur lg:bottom-4">
        {sujo && <span className="mr-auto self-center text-xs text-amber-300">Alterações não salvas</span>}
        <button type="button" onClick={cancelar} className="btn-ghost">Cancelar</button>
        <button type="submit" disabled={salvando || !migracao} className="btn-gold">
          {salvando ? <Spinner className="h-4 w-4" /> : <Icon name="check" className="h-4 w-4" />}
          {salvando ? "Salvando..." : "Salvar produto"}
        </button>
      </div>
    </form>
  );
}
