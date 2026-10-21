import guiaResumo from "@/data/guia-resumo.json";
import { INDICE, materiaPorId, questaoTreinavel, pegadinhaPorId } from "./conteudo";
import { diaDaSemana, diferencaDias, hoje, isoLocal, semente, somarDias } from "./datas";
import { pegadinhasQueMaisErra, placares, prioridades, revisoesVencidas, taxa } from "./estatisticas";
import type { Perfil, QuestaoIndice, Resposta, Revisao, TopicoStatus } from "./tipos";

export const GUIA_RESUMO = guiaResumo as Record<string, { incidencia: number; anos: string[]; prioridade: "alta" | "media" | "baixa" }>;

/** Cronograma semanal do guia de estudos (0 = domingo). */
export const CRONOGRAMA: Record<number, { materias: string[]; rotulo: string }> = {
  1: { materias: ["portugues", "penal"], rotulo: "Português + Direito Penal" },
  2: { materias: ["processo_civil", "informatica"], rotulo: "Processo Civil + Informática" },
  3: { materias: ["processo_penal", "raciocinio_logico"], rotulo: "Processo Penal + Raciocínio Lógico" },
  4: { materias: ["administrativo", "matematica"], rotulo: "Administrativo + Matemática" },
  5: { materias: ["legislacao_interna", "constitucional", "atualidades_pcd"], rotulo: "Leg. Interna + Constitucional + PcD" },
  6: { materias: [], rotulo: "Revisão da semana + Atualidades + Redação" },
  0: { materias: [], rotulo: "Simulado ou revisão geral" },
};

export const DIAS_CURTOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export interface Fase {
  numero: 1 | 2 | 3;
  nome: string;
  descricao: string;
  questoesPorDia: number;
  semana: number;
  totalSemanas: number;
  diasRestantes: number;
}

export function faseDoDia(perfil: Perfil, dia = hoje()): Fase {
  const inicioF3 = somarDias(perfil.data_prova, -21);
  const fimF1 = somarDias(perfil.inicio, Math.round(diferencaDias(perfil.inicio, inicioF3) * 0.6));
  const semana = Math.max(1, Math.floor(diferencaDias(perfil.inicio, dia) / 7) + 1);
  const totalSemanas = Math.max(1, Math.ceil(diferencaDias(perfil.inicio, perfil.data_prova) / 7));
  const diasRestantes = Math.max(0, diferencaDias(dia, perfil.data_prova));
  if (dia >= inicioF3)
    return { numero: 3, nome: "Reta final", descricao: "Simulados, revisão de erros e lei seca. Nada de conteúdo novo.", questoesPorDia: 40, semana, totalSemanas, diasRestantes };
  if (dia > fimF1)
    return { numero: 2, nome: "Volume", descricao: "Mais questões por dia e foco nos tópicos fracos.", questoesPorDia: 30, semana, totalSemanas, diasRestantes };
  return { numero: 1, nome: "Base", descricao: "Lei seca, guia do tópico e 20 questões por dia.", questoesPorDia: 20, semana, totalSemanas, diasRestantes };
}

export function diaDeSimulado(perfil: Perfil, dia = hoje()) {
  if (diaDaSemana(dia) !== 0) return false;
  const f = faseDoDia(perfil, dia);
  return f.numero === 3 || f.semana % 2 === 0;
}

/* ---------------- Seleção de questões ---------------- */

interface OpcoesSelecao {
  pool: QuestaoIndice[];
  n: number;
  respostas: Resposta[];
  semente: string;
  foco?: string;
  fase?: number;
  excluir?: Set<string>;
}

export function selecionar({ pool, n, respostas, semente: s, foco, fase = 1, excluir }: OpcoesSelecao): string[] {
  const rnd = semente(s);
  const ultima = new Map<string, Resposta>();
  for (const r of respostas) ultima.set(r.questao_id, r);
  const { porTopico } = placares(respostas);
  const dia = hoje();

  const pontuadas = pool
    .filter((q) => questaoTreinavel(q) && !excluir?.has(q.id))
    .map((q) => {
      const u = ultima.get(q.id);
      let score = 0;
      if (!u) score += 4;
      else if (!u.correta) score += 2.5;
      if (foco && q.topico === foco) score += 3;
      const acc = taxa(porTopico.get(q.topico), 3);
      score += (1 - (acc ?? 0.45)) * 2;
      if (u && diferencaDias(isoLocal(new Date(u.created_at)), dia) < 10) score -= 6;
      if (fase === 1 && q.dificuldade === 3) score -= 0.5;
      if (q.status !== "ok") score -= 3;
      score += rnd() * 0.8;
      return { id: q.id, score };
    })
    .sort((a, b) => b.score - a.score);
  return pontuadas.slice(0, n).map((p) => p.id);
}

/** Divide n questões entre as matérias do dia (o resto fica com a primeira). */
function dividir(n: number, materias: string[]) {
  const base = Math.floor(n / materias.length);
  return materias.map((m, i) => ({ materia: m, n: base + (i === 0 ? n - base * materias.length : 0) }));
}

/* ---------------- Missão do dia ---------------- */

export type Passo =
  | { tipo: "revisao"; ids: string[]; feitas: number }
  | { tipo: "topico"; topico: string; materia: string; lido: boolean }
  | { tipo: "bloco"; ids: string[]; feitas: number; acertos: number; composicao: { materia: string; n: number }[]; titulo: string }
  | { tipo: "pegadinha"; pegadinha: string; ids: string[]; feitas: number }
  | { tipo: "simulado" }
  | { tipo: "redacao" };

export interface Missao {
  dia: string;
  diaSemana: number;
  rotulo: string;
  materias: string[];
  fase: Fase;
  passos: Passo[];
  concluidos: number;
  minutos: number;
}

interface EntradaMissao {
  perfil: Perfil;
  respostas: Resposta[];
  revisoes: Revisao[];
  topicos: TopicoStatus[];
  dia?: string;
}

export function topicoFoco(materia: string, respostasAnteriores: Resposta[], topicos: TopicoStatus[]) {
  const { porTopico } = placares(respostasAnteriores);
  const dominados = new Set(topicos.filter((t) => t.dominado_manual).map((t) => t.topico_id));
  const ranking = prioridades(porTopico, GUIA_RESUMO).filter((l) => l.materia === materia && !dominados.has(l.topico));
  return ranking[0]?.topico ?? null;
}

export function montarMissao({ perfil, respostas, revisoes, topicos, dia = hoje() }: EntradaMissao): Missao {
  const ds = diaDaSemana(dia);
  const fase = faseDoDia(perfil, dia);
  const anteriores = respostas.filter((r) => isoLocal(new Date(r.created_at)) < dia);
  const deHoje = respostas.filter((r) => isoLocal(new Date(r.created_at)) === dia);
  const respondidasHoje = (ctx: string) => new Set(deHoje.filter((r) => r.contexto === ctx).map((r) => r.questao_id));
  const passos: Passo[] = [];

  // 1. Revisão espaçada (o que venceu até hoje, mais o que já foi revisado hoje)
  const revisadasHoje = respondidasHoje("revisao");
  const vencidas = revisoesVencidas(revisoes, dia).filter((id) => !revisadasHoje.has(id));
  const idsRevisao = [...revisadasHoje, ...vencidas].slice(0, Math.max(25, revisadasHoje.size));
  passos.push({ tipo: "revisao", ids: idsRevisao, feitas: revisadasHoje.size });

  const cron = CRONOGRAMA[ds];
  let materias = cron.materias;
  let tituloBloco = `${fase.questoesPorDia} questões Vunesp`;
  const sementeDia = `${dia}:${perfil.inicio}`;

  if (ds >= 1 && ds <= 5) {
    // 2. Tópico em foco na matéria principal do dia
    const foco = topicoFoco(materias[0], anteriores, topicos);
    if (foco) {
      const st = topicos.find((t) => t.topico_id === foco);
      passos.push({ tipo: "topico", topico: foco, materia: materias[0], lido: Boolean(st?.guia_lido && isoLocal(new Date(st.updated_at)) === dia) });
    }
    // 3. Bloco de questões das matérias do dia
    const composicao = dividir(fase.questoesPorDia, materias);
    const ids: string[] = [];
    for (const c of composicao) {
      ids.push(
        ...selecionar({
          pool: INDICE.filter((q) => q.materia === c.materia),
          n: c.n,
          respostas: anteriores,
          semente: `${sementeDia}:${c.materia}`,
          foco: c.materia === materias[0] ? foco ?? undefined : undefined,
          fase: fase.numero,
          excluir: new Set(idsRevisao),
        })
      );
    }
    const feitas = deHoje.filter((r) => r.contexto === "missao" && ids.includes(r.questao_id));
    passos.push({ tipo: "bloco", ids, feitas: new Set(feitas.map((r) => r.questao_id)).size, acertos: feitas.filter((r) => r.correta).length, composicao, titulo: tituloBloco });
  } else if (ds === 6) {
    // Sábado: erros da semana + Estatuto PcD + redação
    const semana = somarDias(dia, -6);
    const errosSemana = [...new Set(anteriores.filter((r) => !r.correta && isoLocal(new Date(r.created_at)) >= semana).map((r) => r.questao_id))].filter((id) => !idsRevisao.includes(id));
    const pcd = selecionar({ pool: INDICE.filter((q) => q.topico === "atu.pcd"), n: 5, respostas: anteriores, semente: `${sementeDia}:pcd` });
    const ids = [...errosSemana.slice(0, fase.questoesPorDia - 5), ...pcd];
    materias = ["atualidades_pcd"];
    tituloBloco = "Erros da semana + Estatuto PcD";
    const feitas = deHoje.filter((r) => r.contexto === "missao" && ids.includes(r.questao_id));
    passos.push({ tipo: "bloco", ids, feitas: new Set(feitas.map((r) => r.questao_id)).size, acertos: feitas.filter((r) => r.correta).length, composicao: [], titulo: tituloBloco });
    passos.push({ tipo: "redacao" });
  } else {
    // Domingo: simulado quinzenal (ou toda semana na reta final) / revisão geral
    if (diaDeSimulado(perfil, dia)) {
      passos.push({ tipo: "simulado" });
    } else {
      const { porTopico } = placares(anteriores);
      const top = prioridades(porTopico, GUIA_RESUMO).slice(0, 6).map((l) => l.topico);
      const ids = selecionar({ pool: INDICE.filter((q) => top.includes(q.topico)), n: fase.questoesPorDia, respostas: anteriores, semente: `${sementeDia}:geral`, excluir: new Set(idsRevisao) });
      tituloBloco = "Revisão geral dos tópicos prioritários";
      const feitas = deHoje.filter((r) => r.contexto === "missao" && ids.includes(r.questao_id));
      passos.push({ tipo: "bloco", ids, feitas: new Set(feitas.map((r) => r.questao_id)).size, acertos: feitas.filter((r) => r.correta).length, composicao: [], titulo: tituloBloco });
    }
  }

  // 4. Pegadinha do dia: a armadilha em que ela mais cai (ou uma por dia, em rodízio)
  if (ds !== 0) {
    const { porPegadinha } = placares(anteriores);
    const piores = pegadinhasQueMaisErra(porPegadinha);
    const rodizio = ["literalidade_trocada", "prazo_numero", "instituto_vizinho", "generalizacao", "norma_padrao_sutil", "regra_excecao"];
    const peg = piores[0]?.id ?? rodizio[(fase.semana + ds) % rodizio.length];
    const usados = new Set(passos.flatMap((p) => ("ids" in p ? p.ids : [])));
    const pool = INDICE.filter((q) => q.pegadinhas.includes(peg));
    const ids = selecionar({ pool, n: 3, respostas: anteriores, semente: `${sementeDia}:peg`, excluir: usados });
    const feitas = new Set(deHoje.filter((r) => r.contexto === "pegadinha" && ids.includes(r.questao_id)).map((r) => r.questao_id)).size;
    if (pegadinhaPorId[peg] && ids.length) passos.push({ tipo: "pegadinha", pegadinha: peg, ids, feitas });
  }

  const minutos = passos.reduce((s, p) => {
    if (p.tipo === "revisao") return s + p.ids.length * 2;
    if (p.tipo === "topico") return s + 15;
    if (p.tipo === "bloco") return s + p.ids.length * 3;
    if (p.tipo === "pegadinha") return s + 6;
    if (p.tipo === "redacao") return s + 60;
    if (p.tipo === "simulado") return s + 270;
    return s;
  }, 0);

  return {
    dia,
    diaSemana: ds,
    rotulo: cron.rotulo,
    materias: materias.length ? materias : [],
    fase,
    passos,
    concluidos: passos.filter(passoConcluido).length,
    minutos,
  };
}

export function passoConcluido(p: Passo) {
  switch (p.tipo) {
    case "revisao":
      return p.ids.length === 0 || p.feitas >= p.ids.length;
    case "topico":
      return p.lido;
    case "bloco":
      return p.ids.length > 0 && p.feitas >= p.ids.length;
    case "pegadinha":
      return p.feitas >= p.ids.length;
    default:
      return false;
  }
}

export function corMateria(id: string) {
  return materiaPorId[id]?.cor ?? "#C11574";
}
