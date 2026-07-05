import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import SizeTagInput from "../../components/SizeTagInput";

function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ProductList() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [produtoEditandoId, setProdutoEditandoId] = useState(null);
  const [rascunho, setRascunho] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function buscarDados() {
    setCarregando(true);
    setErro(null);
    try {
      const [{ data: produtosData, error: erroProdutos }, { data: categoriasData, error: erroCategorias }] =
        await Promise.all([
          supabase
            .from("products")
            .select("id, nome, descricao, preco, tamanhos, imagens, category_id, ativo, esgotado")
            .order("criado_em", { ascending: false }),
          supabase.from("categories").select("id, nome").order("nome"),
        ]);

      if (erroProdutos) throw erroProdutos;
      if (erroCategorias) throw erroCategorias;

      setProdutos(produtosData ?? []);
      setCategorias(categoriasData ?? []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setErro("Não foi possível carregar os produtos.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarDados();
  }, []);

  const handleToggleEsgotado = async (produto) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ esgotado: !produto.esgotado })
        .eq("id", produto.id);

      if (error) throw error;

      setProdutos((atual) =>
        atual.map((p) => (p.id === produto.id ? { ...p, esgotado: !p.esgotado } : p))
      );
    } catch (error) {
      console.error("Erro ao atualizar estoque:", error);
      alert("Não foi possível atualizar o status do produto.");
    }
  };

  const handleExcluir = async (produto) => {
    const confirmado = window.confirm(
      `Excluir "${produto.nome}" definitivamente? Essa ação não pode ser desfeita.`
    );
    if (!confirmado) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", produto.id);
      if (error) throw error;

      setProdutos((atual) => atual.filter((p) => p.id !== produto.id));
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      alert("Não foi possível excluir o produto.");
    }
  };

  const iniciarEdicao = (produto) => {
    setProdutoEditandoId(produto.id);
    setRascunho({
      nome: produto.nome,
      descricao: produto.descricao ?? "",
      preco: produto.preco,
      category_id: produto.category_id ?? "",
      tamanhos: produto.tamanhos ?? [],
    });
  };

  const cancelarEdicao = () => {
    setProdutoEditandoId(null);
    setRascunho(null);
  };

  const salvarEdicao = async (produtoId) => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          nome: rascunho.nome,
          descricao: rascunho.descricao,
          preco: Number(rascunho.preco),
          category_id: rascunho.category_id || null,
          tamanhos: rascunho.tamanhos,
        })
        .eq("id", produtoId);

      if (error) throw error;

      setProdutos((atual) =>
        atual.map((p) =>
          p.id === produtoId
            ? { ...p, ...rascunho, preco: Number(rascunho.preco) }
            : p
        )
      );
      cancelarEdicao();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert("Não foi possível salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <p className="text-center text-sm text-kswhite/60">Carregando produtos...</p>;
  }

  if (erro) {
    return <p className="text-center text-sm text-red-400">{erro}</p>;
  }

  if (produtos.length === 0) {
    return <p className="text-center text-sm text-kswhite/60">Nenhum produto cadastrado ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {produtos.map((produto) => {
        const emEdicao = produtoEditandoId === produto.id;

        return (
          <div
            key={produto.id}
            className="rounded-md border border-ksline bg-ksgunmetal/40 p-4"
          >
            {!emEdicao ? (
              <div className="flex gap-4">
                {produto.imagens?.[0] && (
                  <img
                    src={produto.imagens[0]}
                    alt={produto.nome}
                    className="h-20 w-20 rounded object-cover"
                  />
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-kswhite">{produto.nome}</h3>
                    {produto.esgotado && (
                      <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-bold uppercase text-red-400">
                        Esgotado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ksgold">{formatarPreco(produto.preco)}</p>
                  <p className="text-xs text-kswhite/60">
                    Tamanhos: {produto.tamanhos?.join(", ") || "—"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleToggleEsgotado(produto)}
                      className="rounded border border-ksline px-3 py-1 text-xs hover:border-ksgold"
                    >
                      {produto.esgotado ? "Marcar como disponível" : "Marcar como esgotado"}
                    </button>
                    <button
                      onClick={() => iniciarEdicao(produto)}
                      className="rounded border border-ksline px-3 py-1 text-xs hover:border-ksgold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleExcluir(produto)}
                      className="rounded border border-red-500/50 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                    Nome
                  </label>
                  <input
                    value={rascunho.nome}
                    onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                    className="w-full rounded border border-ksline bg-ksblack px-3 py-2 text-sm outline-none focus:border-ksgold"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    value={rascunho.descricao}
                    onChange={(e) => setRascunho({ ...rascunho, descricao: e.target.value })}
                    className="w-full rounded border border-ksline bg-ksblack px-3 py-2 text-sm outline-none focus:border-ksgold"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                      Preço (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rascunho.preco}
                      onChange={(e) => setRascunho({ ...rascunho, preco: e.target.value })}
                      className="w-full rounded border border-ksline bg-ksblack px-3 py-2 text-sm outline-none focus:border-ksgold"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
                      Categoria
                    </label>
                    <select
                      value={rascunho.category_id}
                      onChange={(e) => setRascunho({ ...rascunho, category_id: e.target.value })}
                      className="w-full rounded border border-ksline bg-ksblack px-3 py-2 text-sm outline-none focus:border-ksgold"
                    >
                      <option value="">Sem categoria</option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-widest2 text-kswhite/70">
                    Tamanhos
                  </label>
                  <SizeTagInput
                    tamanhos={rascunho.tamanhos}
                    onChange={(novos) => setRascunho({ ...rascunho, tamanhos: novos })}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => salvarEdicao(produto.id)}
                    disabled={salvando}
                    className="rounded bg-ksgold px-4 py-2 text-xs font-bold uppercase tracking-widest2 text-ksblack hover:bg-ksgoldlight disabled:opacity-50"
                  >
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    onClick={cancelarEdicao}
                    className="rounded border border-ksline px-4 py-2 text-xs uppercase tracking-widest2 hover:border-ksgold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
