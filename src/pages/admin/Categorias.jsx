import { useEffect, useState } from "react";
import { listarCategoriasAdmin, criarCategoria, atualizarCategoria, excluirCategoria, listarProdutosAdmin } from "../../lib/admin";
import { mensagemErro } from "../../lib/format";
import { TituloPagina } from "./AdminLayout";
import Icon from "../../components/ui/Icon";
import { Carregando, Vazio, useFeedback } from "../../components/ui/Feedback";

export default function Categorias() {
  const { toast, confirmar } = useFeedback();
  const [cats, setCats] = useState(null);
  const [contagem, setContagem] = useState({});
  const [nova, setNova] = useState("");
  const [editando, setEditando] = useState(null);

  async function carregar() {
    try {
      const [c, p] = await Promise.all([listarCategoriasAdmin(), listarProdutosAdmin().catch(() => [])]);
      setCats(c);
      const n = {};
      p.forEach((x) => x.category_id && (n[x.category_id] = (n[x.category_id] || 0) + 1));
      setContagem(n);
    } catch (e) {
      toast(mensagemErro(e), "erro");
      setCats([]);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function adicionar(e) {
    e.preventDefault();
    if (!nova.trim()) return;
    try {
      const c = await criarCategoria(nova, cats.length);
      setCats((cs) => [...cs, c]);
      setNova("");
      toast("Categoria criada.");
    } catch (err) {
      toast(/duplicate|23505/.test(err.message + err.code) ? "Já existe uma categoria com esse nome." : mensagemErro(err), "erro");
    }
  }

  async function renomear(c) {
    const nome = editando.nome.trim();
    setEditando(null);
    if (!nome || nome === c.nome) return;
    try {
      await atualizarCategoria(c.id, { nome });
      setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, nome } : x)));
    } catch (e) {
      toast(mensagemErro(e), "erro");
    }
  }

  async function mover(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const n = [...cats];
    [n[i], n[j]] = [n[j], n[i]];
    setCats(n);
    try {
      await Promise.all(n.map((c, ordem) => atualizarCategoria(c.id, { ordem })));
    } catch (e) {
      toast(mensagemErro(e), "erro");
    }
  }

  async function excluir(c) {
    const qtd = contagem[c.id] || 0;
    const ok = await confirmar({
      titulo: "Excluir categoria?",
      mensagem: qtd ? `"${c.nome}" tem ${qtd} produto(s). Eles continuam na loja, mas ficam sem categoria.` : `Excluir "${c.nome}"?`,
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    try {
      await excluirCategoria(c.id);
      setCats((cs) => cs.filter((x) => x.id !== c.id));
      toast("Categoria excluída.");
    } catch (e) {
      toast(mensagemErro(e), "erro");
    }
  }

  return (
    <>
      <TituloPagina titulo="Categorias" subtitulo="Organizam os filtros da loja. A ordem aqui é a ordem na vitrine." />

      <form onSubmit={adicionar} className="card mb-5 flex gap-2 p-4">
        <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova categoria (ex.: Bermudas)" className="input" aria-label="Nome da nova categoria" />
        <button className="btn-gold shrink-0"><Icon name="plus" className="h-4 w-4" /> Criar</button>
      </form>

      {!cats ? (
        <Carregando />
      ) : cats.length === 0 ? (
        <Vazio icone="tag" titulo="Nenhuma categoria" texto="Crie categorias como Camisetas, Moletons, Bonés..." />
      ) : (
        <ul className="card divide-y divide-ksline">
          {cats.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 px-4 py-3">
              <div className="flex flex-col">
                <button className="icon-btn h-6 w-7" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir"><Icon name="chevronUp" className="h-4 w-4" /></button>
                <button className="icon-btn h-6 w-7" onClick={() => mover(i, 1)} disabled={i === cats.length - 1} aria-label="Descer"><Icon name="chevronDown" className="h-4 w-4" /></button>
              </div>
              {editando?.id === c.id ? (
                <input autoFocus value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} onBlur={() => renomear(c)} onKeyDown={(e) => { if (e.key === "Enter") renomear(c); if (e.key === "Escape") setEditando(null); }} className="input flex-1 py-1.5" />
              ) : (
                <button className="flex-1 text-left font-semibold hover:text-ksgold" onClick={() => setEditando({ id: c.id, nome: c.nome })}>{c.nome}</button>
              )}
              <span className="text-xs text-kswhite/45">{contagem[c.id] || 0} produto(s)</span>
              <button className="icon-btn" onClick={() => setEditando({ id: c.id, nome: c.nome })} aria-label={`Renomear ${c.nome}`}><Icon name="edit" className="h-4 w-4" /></button>
              <button className="icon-btn hover:text-red-400" onClick={() => excluir(c)} aria-label={`Excluir ${c.nome}`}><Icon name="trash" className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
