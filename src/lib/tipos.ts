export type Letra = "A" | "B" | "C" | "D" | "E";

export type StatusQuestao = "ok" | "desatualizada" | "anulada" | "fora_edital" | "gabarito_duvidoso";

export interface Questao {
  id: string;
  ano: string;
  numero: number;
  fonte: string;
  materia: string;
  topico: string;
  subtopico: string;
  artigos: string;
  texto_base: string | null;
  enunciado: string;
  alternativas: Record<string, string>;
  gabarito: Letra | "N";
  dificuldade: number;
  pegadinhas: string[];
  pegadinha: string;
  explicacao: string;
  distratores: Record<string, string>;
  dica: string;
  status: StatusQuestao;
  status_nota: string;
  precisa_imagem: boolean;
  imagem?: string;
}

/** Versão enxuta usada no navegador para montar blocos e diagnósticos. */
export interface QuestaoIndice {
  id: string;
  ano: string;
  materia: string;
  topico: string;
  pegadinhas: string[];
  dificuldade: number;
  status: StatusQuestao;
}

export interface Materia {
  id: string;
  nome: string;
  bloco: "I" | "II" | "III";
  questoes_2026: number;
  cor: string;
}

export interface Topico {
  id: string;
  materia: string;
  nome: string;
  curto: string;
  edital: string;
}

export interface TipoPegadinha {
  id: string;
  nome: string;
  desc: string;
}

export interface GuiaTopico {
  topico: string;
  nome: string;
  edital: string;
  incidencia: number;
  anos: string[];
  prioridade: "alta" | "media" | "baixa";
  como_cai: string;
  decorar: string[];
  pegadinhas_recorrentes: string[];
  comparativo: string;
}

export interface GuiaMateria {
  materia: string;
  visao_geral: string;
  topicos: GuiaTopico[];
}

export type Confianca = "certeza" | "duvida";
export type CausaErro = "nao_sabia" | "confundi" | "atencao";
export type Contexto = "missao" | "revisao" | "topico" | "pegadinha" | "livre" | "simulado";

export interface Resposta {
  id: string;
  questao_id: string;
  materia_id: string;
  topico_id: string;
  pegadinhas: string[];
  alternativa: string;
  correta: boolean;
  confianca: Confianca | null;
  causa_erro: CausaErro | null;
  tempo_seg: number;
  contexto: Contexto;
  created_at: string;
}

export interface Revisao {
  questao_id: string;
  etapa: number;
  proxima: string | null; // yyyy-mm-dd; null = concluída
  updated_at: string;
}

export interface TopicoStatus {
  topico_id: string;
  guia_lido: boolean;
  dominado_manual: boolean;
  updated_at: string;
}

export interface Perfil {
  nome: string;
  data_prova: string;
  inicio: string;
  notebooklm: Record<string, string>;
}

export interface SimuladoResultado {
  id: string;
  titulo: string;
  total: number;
  acertos: number;
  por_bloco: Record<string, { acertos: number; total: number }>;
  duracao_seg: number;
  created_at: string;
}
