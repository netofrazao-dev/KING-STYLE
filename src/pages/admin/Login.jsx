import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCarregando(true);
    setErro(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) throw error;

      navigate("/admin", { replace: true });
    } catch (error) {
      console.error("Erro no login:", error);
      setErro("E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ksblack px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-md border border-ksline bg-ksgunmetal/40 p-8"
      >
        <h1 className="ks-heading mb-6 text-center text-2xl text-ksgold">
          Admin — King Style
        </h1>

        <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
          E-mail
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded border border-ksline bg-ksblack px-3 py-2 text-sm text-kswhite outline-none focus:border-ksgold"
        />

        <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
          Senha
        </label>
        <input
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mb-6 w-full rounded border border-ksline bg-ksblack px-3 py-2 text-sm text-kswhite outline-none focus:border-ksgold"
        />

        {erro && <p className="mb-4 text-sm text-red-400">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded bg-ksgold py-3 text-sm font-bold uppercase tracking-widest2 text-ksblack transition hover:bg-ksgoldlight disabled:opacity-50"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
