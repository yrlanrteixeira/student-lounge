import type { Perfil, Resposta, Revisao, SimuladoResultado, TopicoStatus } from "../tipos";
import { supabaseNavegador } from "../supabase/client";

export interface DadosUsuario {
  perfil: Perfil;
  respostas: Resposta[];
  revisoes: Revisao[];
  topicos: TopicoStatus[];
  simulados: SimuladoResultado[];
}

export interface Repo {
  modo: "nuvem" | "local";
  email(): Promise<string | null>;
  carregar(): Promise<DadosUsuario>;
  inserirResposta(r: Resposta): Promise<void>;
  atualizarCausa(id: string, causa: Resposta["causa_erro"]): Promise<void>;
  salvarRevisao(r: Revisao): Promise<void>;
  salvarTopico(t: TopicoStatus): Promise<void>;
  salvarPerfil(p: Perfil): Promise<void>;
  inserirSimulado(s: SimuladoResultado): Promise<void>;
  sair(): Promise<void>;
}

export const PERFIL_PADRAO: Perfil = {
  nome: "",
  data_prova: "2027-03-14",
  inicio: "2026-10-19",
  notebooklm: {},
};

/* ---------------- Modo local (localStorage) ---------------- */

const CHAVE = "rumo-tjsp:v1";

function lerLocal(): DadosUsuario {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const d = JSON.parse(bruto) as Partial<DadosUsuario>;
      return {
        perfil: { ...PERFIL_PADRAO, ...(d.perfil ?? {}) },
        respostas: d.respostas ?? [],
        revisoes: d.revisoes ?? [],
        topicos: d.topicos ?? [],
        simulados: d.simulados ?? [],
      };
    }
  } catch {
    /* navegador sem armazenamento: começa vazio */
  }
  return { perfil: { ...PERFIL_PADRAO }, respostas: [], revisoes: [], topicos: [], simulados: [] };
}

function gravarLocal(d: DadosUsuario) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(d));
  } catch {
    /* ignora */
  }
}

export function exportarLocal() {
  return JSON.stringify(lerLocal(), null, 2);
}

export function importarLocal(json: string) {
  const d = JSON.parse(json) as DadosUsuario;
  gravarLocal(d);
}

export const repoLocal: Repo = {
  modo: "local",
  async email() {
    return null;
  },
  async carregar() {
    return lerLocal();
  },
  async inserirResposta(r) {
    const d = lerLocal();
    d.respostas.push(r);
    gravarLocal(d);
  },
  async atualizarCausa(id, causa) {
    const d = lerLocal();
    const r = d.respostas.find((x) => x.id === id);
    if (r) r.causa_erro = causa;
    gravarLocal(d);
  },
  async salvarRevisao(r) {
    const d = lerLocal();
    d.revisoes = d.revisoes.filter((x) => x.questao_id !== r.questao_id).concat(r);
    gravarLocal(d);
  },
  async salvarTopico(t) {
    const d = lerLocal();
    d.topicos = d.topicos.filter((x) => x.topico_id !== t.topico_id).concat(t);
    gravarLocal(d);
  },
  async salvarPerfil(p) {
    const d = lerLocal();
    d.perfil = p;
    gravarLocal(d);
  },
  async inserirSimulado(s) {
    const d = lerLocal();
    d.simulados.push(s);
    gravarLocal(d);
  },
  async sair() {},
};

/* ---------------- Modo nuvem (Supabase) ---------------- */

async function todas<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const saida: T[] = [];
  const pagina = 1000;
  for (let de = 0; ; de += pagina) {
    const { data, error } = await consulta(de, de + pagina - 1);
    if (error) throw error;
    saida.push(...(data ?? []));
    if (!data || data.length < pagina) break;
  }
  return saida;
}

let uidCache: string | null = null;
async function uid() {
  if (!uidCache) {
    const { data } = await supabaseNavegador().auth.getUser();
    uidCache = data.user?.id ?? null;
  }
  if (!uidCache) throw new Error("Sessão expirada. Entre de novo.");
  return uidCache;
}

export const repoNuvem: Repo = {
  modo: "nuvem",
  async email() {
    const { data } = await supabaseNavegador().auth.getUser();
    return data.user?.email ?? null;
  },
  async carregar() {
    const sb = supabaseNavegador();
    const [perfil, respostas, revisoes, topicos, simulados] = await Promise.all([
      sb.from("perfis").select("nome, data_prova, inicio, notebooklm").maybeSingle(),
      todas<Resposta>((de, ate) =>
        sb
          .from("respostas")
          .select("id, questao_id, materia_id, topico_id, pegadinhas, alternativa, correta, confianca, causa_erro, tempo_seg, contexto, created_at")
          .order("created_at", { ascending: true })
          .range(de, ate)
      ),
      todas<Revisao>((de, ate) => sb.from("revisoes").select("questao_id, etapa, proxima, updated_at").range(de, ate)),
      sb.from("topico_status").select("topico_id, guia_lido, dominado_manual, updated_at"),
      sb.from("simulados").select("id, titulo, total, acertos, por_bloco, duracao_seg, created_at").order("created_at"),
    ]);
    return {
      perfil: { ...PERFIL_PADRAO, ...((perfil.data as Partial<Perfil> | null) ?? {}) },
      respostas,
      revisoes,
      topicos: (topicos.data as TopicoStatus[] | null) ?? [],
      simulados: (simulados.data as SimuladoResultado[] | null) ?? [],
    };
  },
  async inserirResposta(r) {
    const { error } = await supabaseNavegador().from("respostas").insert(r);
    if (error) throw error;
  },
  async atualizarCausa(id, causa) {
    const { error } = await supabaseNavegador().from("respostas").update({ causa_erro: causa }).eq("id", id);
    if (error) throw error;
  },
  async salvarRevisao(r) {
    const { error } = await supabaseNavegador().from("revisoes").upsert({ user_id: await uid(), ...r }, { onConflict: "user_id,questao_id" });
    if (error) throw error;
  },
  async salvarTopico(t) {
    const { error } = await supabaseNavegador().from("topico_status").upsert({ user_id: await uid(), ...t }, { onConflict: "user_id,topico_id" });
    if (error) throw error;
  },
  async salvarPerfil(p) {
    const { error } = await supabaseNavegador().from("perfis").upsert({ user_id: await uid(), ...p, updated_at: new Date().toISOString() });
    if (error) throw error;
  },
  async inserirSimulado(s) {
    const { error } = await supabaseNavegador().from("simulados").insert(s);
    if (error) throw error;
  },
  async sair() {
    uidCache = null;
    await supabaseNavegador().auth.signOut();
  },
};
