import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarProdutosAdmin, listarPedidos, STATUS_PEDIDO } from "../../lib/admin";
import { formatarPreco, formatarData, mensagemErro } from "../../lib/format";
import { descreverVariante } from "../../lib/produtos";
import { useAdmin, TituloPagina } from "./AdminLayout";
import Icon from "../../components/ui/Icon";
import { Carregando } from "../../components/ui/Feedback";

const ESTOQUE_BAIXO = 3;

function Stat({ icone, label, valor, destaque, to }) {
  const C = to ? Link : "div";
  return (
    <C to={to} className={`card flex items-center gap-4 p-4 ${to ? "transition hover:border-ksgold/60" : ""}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${destaque || "bg-white/5 text-kswhite/70"}`}>
        <Icon name={icone} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight">{valor}</p>
        <p className="text-xs text-kswhite/55">{label}</p>
      </div>
    </C>
  );
}

export default function Dashboard() {
  const { migracao } = useAdmin();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    Promise.all([listarProdutosAdmin().catch((e) => { throw e; }), migracao ? listarPedidos({ limite: 500 }).catch(() => []) : []])
      .then(([produtos, pedidos]) => setDados({ produtos, pedidos }))
      .catch((e) => setErro(mensagemErro(e)));
  }, [migracao]);

  if (erro) return <p className="text-sm text-red-300">{erro}</p>;
  if (!dados) return <Carregando />;

  const { produtos, pedidos } = dados;
  const ativos = produtos.filter((p) => p.ativo);
  const semEstoque = ativos.filter((p) => !p.disponivel);
  const baixos = ativos.flatMap((p) =>
    p.variantes.filter((v) => v.estoque != null && v.estoque <= ESTOQUE_BAIXO).map((v) => ({ produto: p, v }))
  );
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const vendidos = pedidos.filter((p) => ["confirmado", "enviado", "entregue"].includes(p.status) && new Date(p.criado_em) >= inicioMes);
  const novos = pedidos.filter((p) => p.status === "novo");

  return (
    <>
      <TituloPagina titulo="Visão geral" subtitulo="Resumo da sua loja.">
        <Link to="/admin/produtos/novo" className="btn-gold"><Icon name="plus" className="h-4 w-4" /> Novo produto</Link>
      </TituloPagina>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icone="box" label="Produtos à venda" valor={ativos.length} to="/admin/produtos" />
        <Stat icone="alert" label="Esgotados" valor={semEstoque.length} destaque={semEstoque.length ? "bg-red-500/15 text-red-300" : undefined} to="/admin/produtos?filtro=esgotados" />
        <Stat icone="receipt" label="Pedidos novos" valor={migracao ? novos.length : "—"} destaque={novos.length ? "bg-sky-500/15 text-sky-300" : undefined} to="/admin/pedidos" />
        <Stat icone="chart" label="Vendas no mês" valor={migracao ? formatarPreco(vendidos.reduce((s, p) => s + Number(p.total), 0)) : "—"} destaque="bg-ksgold/15 text-ksgold" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between border-b border-ksline px-5 py-4">
            <h2 className="font-semibold">Últimos pedidos</h2>
            <Link to="/admin/pedidos" className="text-xs text-ksgold hover:underline">Ver todos</Link>
          </div>
          {!migracao ? (
            <p className="px-5 py-8 text-center text-sm text-kswhite/50">Disponível após atualizar o banco.</p>
          ) : pedidos.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-kswhite/50">Nenhum pedido ainda. Eles aparecem aqui quando um cliente finaliza pelo site.</p>
          ) : (
            <ul className="divide-y divide-ksline">
              {pedidos.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/pedidos?id=${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03]">
                    <span className="w-12 text-sm font-bold text-kswhite/50">#{p.id}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.cliente?.nome}</p>
                      <p className="text-xs text-kswhite/45">{formatarData(p.criado_em)}</p>
                    </div>
                    <span className={`chip border ${STATUS_PEDIDO[p.status]?.cor}`}>{STATUS_PEDIDO[p.status]?.label}</span>
                    <span className="w-24 text-right text-sm font-bold text-ksgold">{formatarPreco(p.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between border-b border-ksline px-5 py-4">
            <h2 className="font-semibold">Estoque baixo <span className="text-kswhite/40">(até {ESTOQUE_BAIXO})</span></h2>
            <Link to="/admin/produtos?filtro=estoque" className="text-xs text-ksgold hover:underline">Ver produtos</Link>
          </div>
          {baixos.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-kswhite/50">Tudo certo por aqui. 👌</p>
          ) : (
            <ul className="divide-y divide-ksline">
              {baixos.slice(0, 8).map(({ produto, v }) => (
                <li key={v.id}>
                  <Link to={`/admin/produtos/${produto.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03]">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ksgunmetal">{produto.imagens[0] && <img src={produto.imagens[0]} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{produto.nome}</p>
                      <p className="text-xs text-kswhite/50">{descreverVariante(v) || "Único"}</p>
                    </div>
                    <span className={`chip ${v.estoque === 0 ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>{v.estoque === 0 ? "Zerado" : `${v.estoque} un.`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
