/* Upload de imagens com compressão no navegador (fotos de celular de 5 MB viram ~200 KB). */
import { supabase } from "../services/supabaseClient";

export const BUCKET = "product-images";

export async function comprimirImagem(arquivo, { maxLado = 1600, qualidade = 0.82 } = {}) {
  if (!arquivo.type.startsWith("image/") || arquivo.type === "image/gif") return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", qualidade));
    if (!blob || blob.size >= arquivo.size) return arquivo;
    return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return arquivo;
  }
}

export async function enviarImagem(produtoId, arquivo) {
  const final = await comprimirImagem(arquivo);
  const ext = (final.name.split(".").pop() || "jpg").toLowerCase();
  const caminho = `${produtoId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, final, { cacheControl: "31536000", upsert: false, contentType: final.type });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

/** Extrai o caminho dentro do bucket a partir da URL pública. */
export function caminhoDaUrl(url) {
  const marca = `/object/public/${BUCKET}/`;
  const i = String(url).indexOf(marca);
  return i >= 0 ? decodeURIComponent(String(url).slice(i + marca.length).split("?")[0]) : null;
}

export async function removerImagens(urls) {
  const caminhos = urls.map(caminhoDaUrl).filter(Boolean);
  if (!caminhos.length) return;
  await supabase.storage.from(BUCKET).remove(caminhos);
}

export async function removerPastaProduto(produtoId) {
  const { data } = await supabase.storage.from(BUCKET).list(produtoId, { limit: 1000 });
  if (data?.length) await supabase.storage.from(BUCKET).remove(data.map((f) => `${produtoId}/${f.name}`));
}
