import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listarPedidos, atualizarPedido, excluirPedido, aplicarEstoquePedido, STATUS_PEDIDO } from "../../lib/admin";
import { formatarData, formatarPreco, mensagemErro, normalizarTexto, telefoneWhatsApp } from "../../lib/format";
import { descreverVariante } from "../../lib/produtos";
import { useAdmin, TituloPagina } from "./AdminLayout";
import Icon, { WhatsAppIcon } from "../../components/ui/Icon";
import { Carregando, Modal, Spinner, Vazio, useFeedback } from "../../components/ui/Feedback";

export default function Pedidos() {
  const { migracao } = useAdmin();
  const { toast, confirmar } = useFeedback();
  const [pedidos, setPedidos] = useState(null);
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const abertoId = params.get("id");

  async function carregar() {
    try {
      setPedidos(await listarPedidos());
    } catch (e) {
      toast(mensagemErro(e), "erro");
      setPedidos([]);
    }
  }
  useEffect(() => {
    if (migracao) carregar();
  }, [migracao]);

  const lista = useMemo(() => {
    const q = normalizarTexto(busca);
    return (pedidos || [])
      .filter((p) => !status || p.status === status)
      .filter((p) => !q || normalizarTexto(`${p.id} ${p.cliente?.nome} ${p.cliente?.telefone}`).includes(q));
  }, [pedidos, status, busca]);

  const aberto = pedidos?.find((p) => String(p.id) === abertoId);
  const abrir = (id) => setParams(id ? { id: String(id) } : {}, { replace: !id });
  const atualizarLocal = (id, campos) => setPedidos((ps) => ps.map((p) => (p.id === id ? { ...p, ...campos } : p)));

  if (!migracao) {
    return (
      <>
        <TituloPagina titulo="Pedidos" />
        <Vazio icone="receipt" titulo="Pedidos ainda não ativados" texto="Rode a migração 002 no Supabase. A partir daí, cada pedido finalizado no site aparece aqui." />
      </>
    );
  }

  return (
    <>
      <TituloPagina titulo="Pedidos" subtitulo="Pedidos enviados pelo site. Confirme pelo WhatsApp e atualize o status." >
        <button onClick={carregar} className="btn-outline"><Icon name="refresh" className="h-4 w-4" /> Atualizar</button>
      </TituloPagina>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kswhite/40" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nº, nome ou telefone..." className="input pl-9" />
        </label>
      </div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {[["", "Todos"], ...Object.entries(STATUS_PEDIDO).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k || "todos"} onClick={() => setStatus(k)} aria-pressed={status === k} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${status === k ? "border-ksgold bg-ksgold text-ksblack" : "border-ksline text-kswhite/70 hover:border-ksgold"}`}>
            {l} {pedidos && <span className="opacity-60">{pedidos.filter((p) => !k || p.status === k).length}</span>}
          </button>
        ))}
      </div>

      {!pedidos ? (
        <Carregando texto="Carregando pedidos..." />
      ) : lista.length === 0 ? (
        <Vazio icone="receipt" titulo={pedidos.length ? "Nenhum pedido neste filtro" : "Nenhum pedido ainda"} texto={pedidos.length ? "" : "Quando um cliente finalizar a compra no site, o pedido aparece aqui."} />
      ) : (
        <ul className="card divide-y divide-ksline">
          {lista.map((p) => (
            <li key={p.id}>
              <button onClick={() => abrir(p.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03]">
                <span className="w-12 shrink-0 text-sm font-bold text-kswhite/50">#{p.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.cliente?.nome}</p>
                  <p className="truncate text-xs text-kswhite/45">
                    {formatarData(p.criado_em)} • {p.itens?.reduce((s, i) => s + i.quantidade, 0)} item(ns) • {p.entrega === "retirada" ? "Retirada" : "Entrega"}
                  </p>
                </div>
                <span className={`chip hidden border sm:inline-flex ${STATUS_PEDIDO[p.status]?.cor}`}>{STATUS_PEDIDO[p.status]?.label}</span>
                <span className="w-24 shrink-0 text-right font-bold text-ksgold">{formatarPreco(p.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberto && (
        <DetalhePedido
          pedido={aberto}
          onFechar={() => abrir(null)}
          onAtualizar={(campos) => atualizarLocal(aberto.id, campos)}
          onExcluir={async () => {
            if (!(await confirmar({ titulo: `Excluir pedido #${aberto.id}?`, mensagem: "O registro será apagado. O estoque não é alterado.", confirmar: "Excluir", perigo: true }))) return;
            try {
              await excluirPedido(aberto.id);
              setPedidos((ps) => ps.filter((p) => p.id !== aberto.id));
              abrir(null);
              toast("Pedido excluído.");
            } catch (e) {
              toast(mensagemErro(e), "erro");
            }
          }}
        />
      )}
    </>
  );
}

function DetalhePedido({ pedido, onFechar, onAtualizar, onExcluir }) {
  const { toast } = useFeedback();
  const [ocupado, setOcupado] = useState(false);
  const [anotacoes, setAnotacoes] = useState(pedido.anotacoes || "");
  const c = pedido.cliente || {};
  const endereco = [c.rua && `${c.rua}, ${c.numero}`, c.complemento, c.bairro].filter(Boolean).join(" - ");
  const tel = telefoneWhatsApp(c.telefone);

  async function mudarStatus(novo) {
    setOcupado(true);
    try {
      await atualizarPedido(pedido.id, { status: novo });
      onAtualizar({ status: novo });
      // Ao confirmar, oferece baixar o estoque; ao cancelar, devolve.
      if (novo === "cancelado" && pedido.estoque_baixado) {
        await aplicarEstoquePedido(pedido.id, false);
        onAtualizar({ status: novo, estoque_baixado: false });
        toast("Pedido cancelado e estoque devolvido.");
      } else toast(`Status: ${STATUS_PEDIDO[novo].label}`);
    } catch (e) {
      toast(mensagemErro(e), "erro");
    } finally {
      setOcupado(false);
    }
  }

  async function estoque(baixar) {
    setOcupado(true);
    try {
      await aplicarEstoquePedido(pedido.id, baixar);
      onAtualizar({ estoque_baixado: baixar });
      toast(baixar ? "Estoque baixado." : "Estoque devolvido.");
    } catch (e) {
      toast(mensagemErro(e), "erro");
    } finally {
      setOcupado(false);
    }
  }

  async function salvarAnotacoes() {
    if (anotacoes === (pedido.anotacoes || "")) return;
    try {
      await atualizarPedido(pedido.id, { anotacoes });
      onAtualizar({ anotacoes });
      toast("Anotação salva.");
    } catch (e) {
      toast(mensagemErro(e), "erro");
    }
  }

  const msgCliente = `Olá, ${(c.nome || "").split(" ")[0]}! Aqui é da King Style, sobre o seu pedido #${pedido.id}.`;

  return (
    <Modal titulo={`Pedido #${pedido.id}`} onFechar={onFechar} tamanho="lg">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip border ${STATUS_PEDIDO[pedido.status]?.cor}`}>{STATUS_PEDIDO[pedido.status]?.label}</span>
          <span className="text-sm text-kswhite/50">{formatarData(pedido.criado_em)}</span>
          {ocupado && <Spinner className="h-4 w-4 text-ksgold" />}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white/[0.03] p-4 text-sm">
            <p className="label">Cliente</p>
            <p className="font-semibold">{c.nome}</p>
            <p className="text-kswhite/70">{c.telefone}</p>
            <p className="mt-2 text-kswhite/70">{pedido.entrega === "retirada" ? "Vai retirar na loja" : endereco || "—"}</p>
            {tel && (
              <a href={`https://wa.me/${tel}?text=${encodeURIComponent(msgCliente)}`} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm mt-3">
                <WhatsAppIcon className="h-4 w-4" /> Chamar no WhatsApp
              </a>
            )}
          </div>
          <div className="rounded-xl bg-white/[0.03] p-4 text-sm">
            <p className="label">Pagamento e observações</p>
            <p>{pedido.pagamento || "—"}</p>
            {pedido.observacoes && <p className="mt-2 whitespace-pre-line text-kswhite/70">{pedido.observacoes}</p>}
          </div>
        </div>

        <div>
          <p className="label">Itens</p>
          <ul className="divide-y divide-ksline rounded-xl border border-ksline">
            {(pedido.itens || []).map((i, idx) => (
              <li key={idx} className="flex items-center gap-3 px-3 py-2.5">
                <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-ksgunmetal">{i.imagem && <img src={i.imagem} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{i.nome}</p>
                  <p className="text-xs text-kswhite/50">{descreverVariante(i) || "—"} • {i.quantidade} x {formatarPreco(i.preco)}</p>
                </div>
                <span className="text-sm font-bold">{formatarPreco(i.subtotal ?? i.preco * i.quantidade)}</span>
              </li>
            ))}
            <li className="flex justify-between px-3 py-3 font-bold"><span>Total</span><span className="text-ksgold">{formatarPreco(pedido.total)}</span></li>
          </ul>
        </div>

        <div>
          <p className="label">Status</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_PEDIDO).map(([k, v]) => (
              <button key={k} disabled={ocupado} onClick={() => mudarStatus(k)} aria-pressed={pedido.status === k} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${pedido.status === k ? v.cor : "border-ksline text-kswhite/60 hover:border-kswhite/40"}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ksline p-4">
          <div className="text-sm">
            <p className="font-semibold">Estoque</p>
            <p className="text-kswhite/55">{pedido.estoque_baixado ? "Já descontado do estoque." : "Ainda não descontado. Baixe quando confirmar a venda."}</p>
          </div>
          {pedido.estoque_baixado ? (
            <button disabled={ocupado} onClick={() => estoque(false)} className="btn-outline btn-sm">Devolver ao estoque</button>
          ) : (
            <button disabled={ocupado || pedido.status === "cancelado"} onClick={() => estoque(true)} className="btn-gold btn-sm">Baixar estoque</button>
          )}
        </div>

        <div>
          <label className="label" htmlFor="anot">Anotações internas</label>
          <textarea id="anot" rows={2} value={anotacoes} onChange={(e) => setAnotacoes(e.target.value)} onBlur={salvarAnotacoes} className="input" placeholder="Código de rastreio, combinado com o cliente..." />
        </div>

        <button onClick={onExcluir} className="self-start text-xs text-red-300 hover:underline">Excluir pedido</button>
      </div>
    </Modal>
  );
}
