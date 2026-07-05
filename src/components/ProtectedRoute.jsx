import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

export default function ProtectedRoute({ children }) {
  const [sessao, setSessao] = useState(undefined); // undefined = carregando

  useEffect(() => {
    let ativo = true;

    async function carregarSessao() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (ativo) setSessao(data.session);
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        if (ativo) setSessao(null);
      }
    }

    carregarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSessao(novaSessao);
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (sessao === undefined) {
    return (
      <div className="flex h-screen items-center justify-center text-kswhite/60">
        Verificando acesso...
      </div>
    );
  }

  if (!sessao) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
