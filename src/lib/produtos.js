/* Acesso aos produtos da loja + regras de preço, variação e estoque. */
import { supabase } from "../services/supabaseClient";

const CAMPOS =
  "id, nome, descricao, preco, preco_promocional, tamanhos, imagens, category_id, ativo, esgotado, destaque, ordem, criado_em";
const CAMPOS_ANTIGOS = "id, nome, descricao, preco, tamanhos, imagens, category_id, ativo, esgotado, criado_em";
const VARIANTES = "product_variants(id, cor, cor_hex, tamanho, estoque, preco, imagem, sku, ativo, ordem)";

/** true quando o erro indica que a migração 002 ainda não foi rodada no banco. */
export function faltaMigracao(error) {
  const t = `${error?.code || ""} ${error?.message || ""}`;
  return /PGRST200|PGRST202|PGRST204|42P01|42703|42883|product_variants|preco_promocional|destaque|does not exist|Could not find/i.test(t);
}

async function selecionar(build) {
  let { data, error } = await build(`${CAMPOS}, ${VARIANTES}`);
  if (error && faltaMigracao(error)) {
    ({ data, error } = await build(CAMPOS_ANTIGOS));
  }
  if (error) throw error;
  return data;
}

export async function buscarProdutosLoja() {
  const data = await selecionar((cols) =>
    supabase.from("products").select(cols).eq("ativo", true).order("criado_em", { ascending: false })
  );
  return (data || []).map(normalizarProduto);
}

export async function buscarProduto(id) {
  const data = await selecionar((cols) => supabase.from("products").select(cols).eq("id", id).maybeSingle());
  return data ? normalizarProduto(data) : null;
}

export async function buscarCategorias() {
  let { data, error } = await supabase.from("categories").select("id, nome, ordem").order("ordem").order("nome");
  if (error && faltaMigracao(error)) ({ data, error } = await supabase.from("categories").select("id, nome").order("nome"));
  if (error) throw error;
  return data || [];
}

/* ---------------- Regras ---------------- */

export function precoComPromocao(produto) {
  const promo = produto.preco_promocional;
  const temPromo = promo !== null && promo !== undefined && Number(promo) < Number(produto.preco);
  return { preco: Number(temPromo ? promo : produto.preco), precoDe: temPromo ? Number(produto.preco) : null };
}

export const temEstoque = (v) => v.estoque === null || v.estoque === undefined || v.estoque > 0;

/**
 * Deixa o produto pronto para a vitrine:
 * variações ativas e ordenadas, lista de cores e tamanhos, faixa de preço e disponibilidade.
 */
export function normalizarProduto(p) {
  const { preco, precoDe } = precoComPromocao(p);
  let variantes = Array.isArray(p.product_variants)
    ? p.product_variants.filter((v) => v.ativo !== false)
    : (p.tamanhos || []).map((t, i) => ({ id: null, tamanho: t, cor: null, estoque: null, preco: null, ordem: i }));
  variantes = [...variantes].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const cores = [];
  variantes.forEach((v) => {
    if (v.cor && !cores.some((c) => c.nome === v.cor)) cores.push({ nome: v.cor, hex: v.cor_hex, imagem: v.imagem });
  });
  const tamanhos = [];
  variantes.forEach((v) => v.tamanho && !tamanhos.includes(v.tamanho) && tamanhos.push(v.tamanho));

  const precos = variantes.length ? variantes.map((v) => (v.preco ?? null) !== null ? Number(v.preco) : preco) : [preco];
  const disponiveis = variantes.filter(temEstoque);
  const disponivel = !p.esgotado && (variantes.length === 0 || disponiveis.length > 0);

  return {
    ...p,
    imagens: p.imagens || [],
    variantes,
    cores,
    tamanhos,
    precoFinal: preco,
    precoDe,
    precoMin: Math.min(...precos),
    precoMax: Math.max(...precos),
    disponivel,
    estoqueTotal: variantes.some((v) => v.estoque === null || v.estoque === undefined)
      ? null
      : variantes.reduce((s, v) => s + (v.estoque || 0), 0),
  };
}

export function precoDaVariante(produto, variante) {
  return variante && variante.preco !== null && variante.preco !== undefined ? Number(variante.preco) : produto.precoFinal;
}

export function descreverVariante(item) {
  return [item.cor, item.tamanho].filter(Boolean).join(" / ");
}
