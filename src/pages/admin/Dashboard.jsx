import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import ProductForm from "./ProductForm";
import ProductList from "./ProductList";

export default function Dashboard() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState("novo"); // "novo" | "lista"

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/admin/login", { replace: true });
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="min-h-screen bg-ksblack px-4 py-8">
      <div className="mx-auto flex max-w-xl items-center justify-between pb-6">
        <h1 className="ks-heading text-2xl text-kswhite">
          Painel <span className="text-ksgold">Admin</span>
        </h1>
        <button
          onClick={handleLogout}
          className="rounded border border-ksline px-3 py-2 text-xs uppercase tracking-widest2 hover:border-ksgold"
        >
          Sair
        </button>
      </div>

      <div className="mx-auto mb-6 flex max-w-xl gap-2 border-b border-ksline">
        <button
          onClick={() => setAbaAtiva("novo")}
          className={`px-4 py-2 text-sm font-medium uppercase tracking-widest2 ${
            abaAtiva === "novo"
              ? "border-b-2 border-ksgold text-ksgold"
              : "text-kswhite/60 hover:text-kswhite"
          }`}
        >
          Novo produto
        </button>
        <button
          onClick={() => setAbaAtiva("lista")}
          className={`px-4 py-2 text-sm font-medium uppercase tracking-widest2 ${
            abaAtiva === "lista"
              ? "border-b-2 border-ksgold text-ksgold"
              : "text-kswhite/60 hover:text-kswhite"
          }`}
        >
          Produtos cadastrados
        </button>
      </div>

      <div className="mx-auto max-w-xl">
        {abaAtiva === "novo" ? <ProductForm /> : <ProductList />}
      </div>
    </div>
  );
}
