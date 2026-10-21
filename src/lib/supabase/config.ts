export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Sem as variáveis do Supabase o app roda no modo local (dados só neste navegador). */
export const SUPABASE_ATIVO = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
