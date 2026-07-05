import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import ProductCard from "./ProductCard";

export default function ProductGallery() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true; // evita setState após unmount

    async function buscarProdutos() {
      setCarregando(true);
      setErro(null);

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, nome, descricao, preco, tamanhos, imagens, category_id, esgotado, criado_em")
          .eq("ativo", true)
          .order("criado_em", { ascending: false });

        if (error) throw error;
        if (ativo) setProdutos(data ?? []);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        if (ativo) setErro("Não foi possível carregar os produtos. Tente novamente.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    buscarProdutos();
    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return (
      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-md bg-ksgunmetal/50"
          />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6 text-center text-sm text-red-400">
        {erro}
      </div>
    );
  }

  if (produtos.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-kswhite/60">
        Nenhum produto disponível no momento.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
      {produtos.map((produto) => (
        <ProductCard key={produto.id} produto={produto} />
      ))}
    </div>
  );
}
