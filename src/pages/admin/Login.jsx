import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { mensagemErro } from "../../lib/format";
import { Spinner } from "../../components/ui/Feedback";
import Icon from "../../components/ui/Icon";
import logo from "../../assets/logo.svg";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(location.state?.negado ? "Esta conta não tem acesso ao painel." : null);

  useEffect(() => {
    document.title = "Painel — King Style";
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !location.state?.negado) navigate("/admin", { replace: true });
    });
  }, [navigate, location.state]);

  const entrar = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
      if (error) throw error;
      navigate(location.state?.de && location.state.de !== "/admin/login" ? location.state.de : "/admin", { replace: true });
    } catch (err) {
      setErro(mensagemErro(err, "E-mail ou senha inválidos."));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(201,162,39,0.15),transparent_55%)] px-4">
      <form onSubmit={entrar} className="card w-full max-w-sm p-7 shadow-2xl">
        <img src={logo} alt="King Style" className="mx-auto mb-2 h-9" />
        <p className="mb-7 text-center text-sm text-kswhite/55">Painel administrativo</p>

        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input mb-4" />

        <label className="label" htmlFor="senha">Senha</label>
        <div className="relative mb-5">
          <input id="senha" type={verSenha ? "text" : "password"} autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} className="input pr-11" />
          <button type="button" onClick={() => setVerSenha((v) => !v)} className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}>
            <Icon name={verSenha ? "eyeOff" : "eye"} className="h-4 w-4" />
          </button>
        </div>

        {erro && <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">{erro}</p>}

        <button type="submit" disabled={carregando} className="btn-gold w-full py-3 uppercase tracking-widest2">
          {carregando && <Spinner className="h-4 w-4" />} {carregando ? "Entrando..." : "Entrar"}
        </button>
        <a href="/" className="mt-4 block text-center text-xs text-kswhite/45 hover:text-ksgold">← Voltar para a loja</a>
      </form>
    </div>
  );
}
