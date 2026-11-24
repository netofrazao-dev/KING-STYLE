import { createContext, useContext, useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { verificarAdmin } from "../../lib/admin";
import { mensagemErro } from "../../lib/format";
import Icon from "../../components/ui/Icon";
import { Carregando } from "../../components/ui/Feedback";
import logo from "../../assets/logo.svg";

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

const NAV = [
  { to: "/admin", label: "Início", icon: "home", end: true },
  { to: "/admin/produtos", label: "Produtos", icon: "box" },
  { to: "/admin/pedidos", label: "Pedidos", icon: "receipt" },
  { to: "/admin/categorias", label: "Categorias", icon: "tag" },
];

export default function AdminLayout() {
  const [estado, setEstado] = useState({ carregando: true });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let ativo = true;
    async function verificar(sessao) {
      if (!sessao) {
        ativo && setEstado({ carregando: false, sessao: null });
        return;
      }
      try {
        const r = await verificarAdmin();
        if (!ativo) return;
        if (!r.admin) {
          await supabase.auth.signOut();
          setEstado({ carregando: false, sessao: null, negado: true });
          return;
        }
        setEstado({ carregando: false, sessao, migracao: r.migracao });
      } catch (e) {
        ativo && setEstado({ carregando: false, sessao, erro: mensagemErro(e) });
      }
    }
    supabase.auth.getSession().then(({ data }) => verificar(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "SIGNED_OUT") setEstado({ carregando: false, sessao: null });
      else if (evento === "TOKEN_REFRESHED") setEstado((e) => ({ ...e, sessao }));
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (estado.carregando) return <Carregando texto="Verificando acesso..." />;
  if (!estado.sessao) return <Navigate to="/admin/login" replace state={{ de: location.pathname, negado: estado.negado }} />;

  const sair = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <AdminContext.Provider value={{ migracao: estado.migracao !== false, email: estado.sessao.user?.email }}>
      <div className="min-h-screen bg-[#0c0c0d] lg:pl-60">
        {/* Barra lateral (computador) */}
        <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-ksline bg-ksblack lg:flex">
          <Link to="/admin" className="flex items-center gap-2 border-b border-ksline px-5 py-5">
            <img src={logo} alt="King Style" className="h-7" />
          </Link>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-ksgold/10 text-ksgold" : "text-kswhite/65 hover:bg-white/5 hover:text-kswhite"}`}>
                <Icon name={n.icon} className="h-5 w-5" /> {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-ksline p-3">
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-kswhite/65 hover:bg-white/5 hover:text-kswhite">
              <Icon name="external" className="h-5 w-5" /> Ver loja
            </a>
            <button onClick={sair} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-kswhite/65 hover:bg-white/5 hover:text-red-300">
              <Icon name="logout" className="h-5 w-5" /> Sair
            </button>
            <p className="truncate px-3 pt-2 text-[11px] text-kswhite/35">{estado.sessao.user?.email}</p>
          </div>
        </aside>

        {/* Topo (celular) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ksline bg-ksblack/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link to="/admin"><img src={logo} alt="King Style" className="h-6" /></Link>
          <div className="flex items-center gap-1">
            <a href="/" target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label="Ver loja"><Icon name="external" /></a>
            <button onClick={sair} className="icon-btn" aria-label="Sair"><Icon name="logout" /></button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          {!estado.migracao && (
            <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
              <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <b>Falta atualizar o banco de dados.</b> Rode o arquivo <code className="rounded bg-black/40 px-1">sql/migration_002_upgrade.sql</code> no
                SQL Editor do Supabase para ativar variações, estoque, pedidos e a proteção do painel.
              </div>
            </div>
          )}
          {estado.erro && <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{estado.erro}</div>}
          <Outlet />
        </main>

        {/* Navegação inferior (celular) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-ksline bg-ksblack/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive ? "text-ksgold" : "text-kswhite/50"}`}>
              <Icon name={n.icon} className="h-5 w-5" /> {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </AdminContext.Provider>
  );
}

export function TituloPagina({ titulo, subtitulo, children }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="ks-heading text-4xl leading-none">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-kswhite/55">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
