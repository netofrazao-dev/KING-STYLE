/* Operações do painel administrativo. */
import { supabase } from "../services/supabaseClient";
import { faltaMigracao, normalizarProduto } from "./produtos";
import { caminhoDaUrl, removerImagens, removerPastaProduto } from "./imagens";

const CAMPOS =
  "id, nome, descricao, preco, preco_promocional, tamanhos, imagens, category_id, ativo, esgotado, destaque, ordem, criado_em, product_variants(id, cor, cor_hex, tamanho, estoque, preco, imagem, sku, ativo, ordem)";

function ok({ data, error }) {
  if (error) throw error;
  return data;
}

/** { admin, migracao } — se a migração não rodou, ainda deixa entrar (comportamento antigo). */
export async function verificarAdmin() {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    if (faltaMigracao(error)) return { admin: true, migracao: false };
    throw error;
  }
  return { admin: Boolean(data), migracao: true };
}

/* ---------------- Produtos ---------------- */

export async function listarProdutosAdmin() {
  const data = ok(await supabase.from("products").select(CAMPOS).order("criado_em", { ascending: false }));
  return (data || []).map((p) => ({ ...normalizarProduto(p), todasVariantes: p.product_variants || [] }));
}

export async function obterProdutoAdmin(id) {
  const data = ok(await supabase.from("products").select(CAMPOS).eq("id", id).maybeSingle());
  return data ? { ...data, product_variants: [...(data.product_variants || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)) } : null;
}

export async function atualizarProduto(id, campos) {
  ok(await supabase.from("products").update({ ...campos, atualizado_em: new Date().toISOString() }).eq("id", id));
}

/**
 * Salva produto + variações.
 * variantes: [{ id?, cor, cor_hex, tamanho, estoque, preco, imagem, sku, ativo }]
 */
export async function salvarProduto({ id, novo, dados, variantes, imagensRemovidas = [] }) {
  const tamanhos = [...new Set(variantes.map((v) => v.tamanho).filter(Boolean))];
  const registro = { ...dados, tamanhos, atualizado_em: new Date().toISOString() };

  if (novo) ok(await supabase.from("products").insert({ id, ...registro }));
  else ok(await supabase.from("products").update(registro).eq("id", id));

  // Variações: atualiza as existentes, cria as novas e apaga as removidas
  const atuais = ok(await supabase.from("product_variants").select("id").eq("product_id", id)) || [];
  const manter = new Set(variantes.filter((v) => v.id).map((v) => v.id));
  const apagar = atuais.map((v) => v.id).filter((vid) => !manter.has(vid));
  if (apagar.length) ok(await supabase.from("product_variants").delete().in("id", apagar));

  const linhas = variantes.map((v, i) => ({
    ...(v.id ? { id: v.id } : {}),
    product_id: id,
    cor: v.cor || null,
    cor_hex: v.cor ? v.cor_hex || null : null,
    tamanho: v.tamanho || null,
    estoque: v.estoque,
    preco: v.preco,
    imagem: v.imagem || null,
    sku: v.sku || null,
    ativo: v.ativo !== false,
    ordem: i,
  }));
  const existentes = linhas.filter((l) => l.id);
  const novas = linhas.filter((l) => !l.id);
  if (existentes.length) ok(await supabase.from("product_variants").upsert(existentes));
  if (novas.length) ok(await supabase.from("product_variants").insert(novas));

  // Só apaga arquivos da pasta deste produto (cópias reaproveitam fotos do original)
  const daPasta = imagensRemovidas.filter((u) => caminhoDaUrl(u)?.startsWith(`${id}/`));
  if (daPasta.length) await removerImagens(daPasta).catch(() => {});
}

export async function excluirProduto(produto) {
  ok(await supabase.from("products").delete().eq("id", produto.id));
  try {
    // Não apaga fotos que outro produto (ex.: uma cópia) ainda usa
    const outros = ok(await supabase.from("products").select("imagens")) || [];
    const emUso = new Set(outros.flatMap((p) => p.imagens || []));
    const livres = (produto.imagens || []).filter((u) => !emUso.has(u));
    if (livres.length === (produto.imagens || []).length) await removerPastaProduto(produto.id);
    else await removerImagens(livres.filter((u) => caminhoDaUrl(u)?.startsWith(`${produto.id}/`)));
  } catch {
    /* fotos órfãs não impedem a exclusão */
  }
}

export async function duplicarProduto(produto) {
  const novoId = crypto.randomUUID();
  await salvarProduto({
    id: novoId,
    novo: true,
    dados: {
      nome: `${produto.nome} (cópia)`,
      descricao: produto.descricao,
      preco: produto.preco,
      preco_promocional: produto.preco_promocional ?? null,
      category_id: produto.category_id,
      imagens: produto.imagens, // reaproveita as mesmas fotos
      ativo: false,
      esgotado: false,
      destaque: false,
    },
    variantes: (produto.todasVariantes || produto.variantes).map(({ id, product_id, ...v }) => v),
  });
  return novoId;
}

/* ---------------- Categorias ---------------- */

export async function listarCategoriasAdmin() {
  return ok(await supabase.from("categories").select("id, nome, ordem").order("ordem").order("nome")) || [];
}
export async function criarCategoria(nome, ordem) {
  return ok(await supabase.from("categories").insert({ nome: nome.trim(), ordem }).select().single());
}
export async function atualizarCategoria(id, campos) {
  ok(await supabase.from("categories").update(campos).eq("id", id));
}
export async function excluirCategoria(id) {
  ok(await supabase.from("categories").delete().eq("id", id));
}

/* ---------------- Pedidos ---------------- */

export const STATUS_PEDIDO = {
  novo: { label: "Novo", cor: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  confirmado: { label: "Confirmado", cor: "bg-ksgold/15 text-ksgold border-ksgold/40" },
  enviado: { label: "Enviado", cor: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  entregue: { label: "Entregue", cor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  cancelado: { label: "Cancelado", cor: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export async function listarPedidos({ limite = 300 } = {}) {
  return ok(await supabase.from("pedidos").select("*").order("criado_em", { ascending: false }).limit(limite)) || [];
}
export async function atualizarPedido(id, campos) {
  ok(await supabase.from("pedidos").update(campos).eq("id", id));
}
export async function excluirPedido(id) {
  ok(await supabase.from("pedidos").delete().eq("id", id));
}
export async function aplicarEstoquePedido(id, baixar) {
  ok(await supabase.rpc("aplicar_estoque_pedido", { p_pedido: id, p_baixar: baixar }));
}
