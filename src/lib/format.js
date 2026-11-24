export function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizarTexto(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Converte "89,90" ou "89.90" em número; vazio vira null. */
export function parsePreco(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  let s = String(valor).trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function parseInteiro(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  const n = parseInt(valor, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Telefone em formato wa.me (com 55 do Brasil). */
export function telefoneWhatsApp(tel) {
  const d = String(tel || "").replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("55") && d.length > 11 ? d : `55${d}`;
}

export function mascararTelefone(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mensagemErro(error, padrao = "Algo deu errado. Tente novamente.") {
  const msg = String(error?.message || error || "");
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "Sem conexão. Verifique sua internet.";
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha inválidos.";
  if (/row-level security|permission denied/i.test(msg)) return "Você não tem permissão para fazer isso.";
  if (/JWT expired/i.test(msg)) return "Sua sessão expirou. Entre novamente.";
  return msg || padrao;
}
