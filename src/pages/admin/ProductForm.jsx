import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import SizeTagInput from "../../components/SizeTagInput";

export default function ProductForm() {
  const [categorias, setCategorias] = useState([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState([]);
  const [arquivosImagem, setArquivosImagem] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    async function buscarCategorias() {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, nome")
          .order("nome");

        if (error) throw error;
        setCategorias(data ?? []);
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
      }
    }
    buscarCategorias();
  }, []);

  // Faz upload de cada imagem para o bucket "product-images" e retorna as URLs públicas
  async function fazerUploadImagens(produtoId) {
    const urls = [];

    for (const arquivo of arquivosImagem) {
      const extensao = arquivo.name.split(".").pop();
      const caminho = `${produtoId}/${crypto.randomUUID()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from("product-images")
        .upload(caminho, arquivo, { cacheControl: "3600", upsert: false });

      if (erroUpload) throw erroUpload;

      const { data } = supabase.storage.from("product-images").getPublicUrl(caminho);
      urls.push(data.publicUrl);
    }

    return urls;
  }

  const resetForm = () => {
    setNome("");
    setDescricao("");
    setPreco("");
    setCategoryId("");
    setTamanhosSelecionados([]);
    setArquivosImagem([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setEnviando(true);
    setMensagem(null);

    try {
      if (tamanhosSelecionados.length === 0) {
        throw new Error("Selecione ao menos um tamanho.");
      }

      // 1. Cria o registro do produto sem imagens para obter o ID
      const { data: produtoCriado, error: erroInsert } = await supabase
        .from("products")
        .insert({
          nome,
          descricao,
          preco: Number(preco),
          category_id: categoryId || null,
          tamanhos: tamanhosSelecionados,
          imagens: [],
        })
        .select()
        .single();

      if (erroInsert) throw erroInsert;

      // 2. Faz upload das imagens (se houver) usando o ID do produto
      let urlsImagens = [];
      if (arquivosImagem.length > 0) {
        urlsImagens = await fazerUploadImagens(produtoCriado.id);

        const { error: erroUpdate } = await supabase
          .from("products")
          .update({ imagens: urlsImagens })
          .eq("id", produtoCriado.id);

        if (erroUpdate) throw erroUpdate;
      }

      setMensagem({ tipo: "sucesso", texto: "Produto cadastrado com sucesso!" });
      resetForm();
    } catch (error) {
      console.error("Erro ao cadastrar produto:", error);
      setMensagem({
        tipo: "erro",
        texto: error.message || "Erro ao cadastrar produto. Tente novamente.",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-xl flex-col gap-4 rounded-md border border-ksline bg-ksgunmetal/40 p-6"
    >
      <h2 className="ks-heading text-xl text-ksgold">Novo produto</h2>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
          Nome
        </label>
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded border border-ksline bg-ksblack px-3 py-2 text-sm outline-none focus:border-ksgold"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
          Descrição
        </label>
        <textarea
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full rounded border border-ksline bg-ksblack px-3 py-2 text-sm outline-none focus:border-ksgold"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
            Preço (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="w-full rounded border border-ksline bg-ksblack px-3 py-2 text-sm outline-none focus:border-ksgold"
          />
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
            Categoria
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded border border-ksline bg-ksblack px-3 py-2 text-sm outline-none focus:border-ksgold"
          >
            <option value="">Sem categoria</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-widest2 text-kswhite/70">
          Tamanhos disponíveis
        </label>
        <p className="mb-2 text-xs text-kswhite/50">
          Use letras (P, M, G) para roupas ou números (36, 37, 38) para calçados.
        </p>
        <SizeTagInput tamanhos={tamanhosSelecionados} onChange={setTamanhosSelecionados} />
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest2 text-kswhite/70">
          Imagens do produto
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setArquivosImagem(Array.from(e.target.files))}
          className="w-full text-sm text-kswhite/80 file:mr-3 file:rounded file:border-0 file:bg-ksgold file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:text-ksblack"
        />
      </div>

      {mensagem && (
        <p className={mensagem.tipo === "sucesso" ? "text-sm text-ksgold" : "text-sm text-red-400"}>
          {mensagem.texto}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded bg-ksgold py-3 text-sm font-bold uppercase tracking-widest2 text-ksblack transition hover:bg-ksgoldlight disabled:opacity-50"
      >
        {enviando ? "Salvando..." : "Cadastrar produto"}
      </button>
    </form>
  );
}
