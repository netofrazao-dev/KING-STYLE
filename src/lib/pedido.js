/* Montagem e registro do pedido enviado pelo WhatsApp. */
import { supabase } from "../services/supabaseClient";
import { formatarPreco } from "./format";
import { descreverVariante, faltaMigracao } from "./produtos";

export const PAGAMENTOS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro"];

/**
 * Registra o pedido no banco (preço e estoque conferidos lá).
 * Se a migração 002 ainda não foi rodada, segue sem número de pedido.
 */
export async function registrarPedido({ items, cliente, entrega, pagamento, observacoes }) {
  const { data, error } = await supabase.rpc("criar_pedido", {
    p_cliente: cliente,
    p_itens: items.map((i) => ({ product_id: i.productId, variant_id: i.variantId, tamanho: i.tamanho, quantidade: i.quantidade })),
    p_entrega: entrega,
    p_pagamento: pagamento,
    p_observacoes: observacoes || null,
  });
  if (error) {
    if (faltaMigracao(error)) return null;
    throw error;
  }
  return data;
}

export function montarMensagemPedido({ items, total, cliente, entrega, pagamento, observacoes, numero }) {
  const endereco = [cliente.rua && `${cliente.rua}, ${cliente.numero}`, cliente.complemento, cliente.bairro]
    .filter(Boolean)
    .join(" - ");

  return [
    `*Novo pedido — King Style*${numero ? ` #${numero}` : ""}`,
    "",
    "*Cliente*",
    `Nome: ${cliente.nome}`,
    `Telefone: ${cliente.telefone}`,
    entrega === "retirada" ? "Entrega: vou retirar na loja" : `Entregar em: ${endereco}`,
    pagamento ? `Pagamento: ${pagamento}` : null,
    observacoes ? `Observações: ${observacoes}` : null,
    "",
    "*Itens*",
    ...items.map((item, i) => {
      const variacao = descreverVariante(item);
      return `${i + 1}. ${item.nome}${variacao ? ` (${variacao})` : ""}\n   ${item.quantidade} x ${formatarPreco(item.preco)} = ${formatarPreco(item.preco * item.quantidade)}`;
    }),
    "",
    `*Total: ${formatarPreco(total)}*`,
    entrega === "entrega" ? "(frete a combinar)" : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function linkWhatsApp(numero, mensagem) {
  return `https://wa.me/${String(numero || "").replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;
}
