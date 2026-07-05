import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha rápida e clara em vez de erros silenciosos em runtime
  throw new Error(
    "Supabase: variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
