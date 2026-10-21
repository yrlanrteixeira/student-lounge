import { BLOCOS, MATERIAS, PEGADINHAS, TOPICOS, materiaPorId } from "./conteudo";
import type { Resposta, Revisao, TopicoStatus } from "./tipos";
import { hoje, isoLocal } from "./datas";

export interface Placar {
  acertos: number;
  total: number;
}

export function taxa(p: Placar | undefined, minimo = 1): number | null {
  if (!p || p.total < minimo) return null;
  return p.acertos / p.total;
}

function somar(mapa: Map<string, Placar>, chave: string, correta: boolean) {
  const p = mapa.get(chave) ?? { acertos: 0, total: 0 };
  p.total += 1;
  if (correta) p.acertos += 1;
  mapa.set(chave, p);
}

export function placares(respostas: Resposta[]) {
  const porMateria = new Map<string, Placar>();
  const porTopico = new Map<string, Placar>();
  const porBloco = new Map<string, Placar>();
  const porPegadinha = new Map<string, Placar>();
  const geral: Placar = { acertos: 0, total: 0 };
  const certeza: Placar = { acertos: 0, total: 0 };
  const causas: Record<string, number> = { nao_sabia: 0, confundi: 0, atencao: 0 };

  for (const r of respostas) {
    geral.total += 1;
    if (r.correta) geral.acertos += 1;
    somar(porMateria, r.materia_id, r.correta);
    somar(porTopico, r.topico_id, r.correta);
    const bloco = materiaPorId[r.materia_id]?.bloco;
    if (bloco) somar(porBloco, bloco, r.correta);
    for (const p of r.pegadinhas) if (p !== "sem_pegadinha") somar(porPegadinha, p, r.correta);
    if (r.confianca === "certeza") {
      certeza.total += 1;
      if (r.correta) certeza.acertos += 1;
    }
    if (!r.correta && r.causa_erro) causas[r.causa_erro] += 1;
  }
  return { porMateria, porTopico, porBloco, porPegadinha, geral, certeza, causas };
}

/** Nota esperada na prova de 70 questões, usando o acerto de cada matéria. */
export function notaProjetada(porMateria: Map<string, Placar>) {
  let nota = 0;
  let cobertas = 0;
  for (const m of MATERIAS) {
    const t = taxa(porMateria.get(m.id), 5);
    if (t === null) continue;
    nota += t * m.questoes_2026;
    cobertas += m.questoes_2026;
  }
  if (cobertas < 35) return null;
  return Math.round((nota / cobertas) * 70);
}

export function statusBloco(blocoId: string, t: number | null) {
  const bloco = BLOCOS.find((b) => b.id === blocoId)!;
  if (t === null) return { rotulo: "Sem dados", tom: "neutro" as const };
  if (bloco.minimo === 0) return { rotulo: "Classifica", tom: "rosa" as const };
  if (t >= 0.62) return { rotulo: "Seguro", tom: "acerto" as const };
  if (t >= 0.5) return { rotulo: "Atenção", tom: "erro" as const };
  return { rotulo: "Abaixo do corte", tom: "erro" as const };
}

export type Dominio = "dominado" | "progresso" | "nao_iniciado";

export function dominioTopico(topicoId: string, respostas: Resposta[], status: TopicoStatus | undefined): Dominio {
  if (status?.dominado_manual) return "dominado";
  const doTopico = respostas.filter((r) => r.topico_id === topicoId);
  const ultimas = doTopico.slice(-10);
  if (ultimas.length >= 5 && ultimas.filter((r) => r.correta).length / ultimas.length >= 0.8) return "dominado";
  if (doTopico.length > 0 || status?.guia_lido) return "progresso";
  return "nao_iniciado";
}

export function revisoesVencidas(revisoes: Revisao[], dia = hoje()) {
  return revisoes.filter((r) => r.proxima && r.proxima <= dia).map((r) => r.questao_id);
}

const PESO_PRIORIDADE = { alta: 3, media: 2, baixa: 1 } as const;

export interface LinhaPrioridade {
  topico: string;
  materia: string;
  incidencia: number;
  anos: number;
  acerto: number | null;
  respondidas: number;
  score: number;
  nivel: "alta" | "media" | "baixa";
}

/** Ranking de tópicos: quanto cai × peso no edital × quanto ainda erra. */
export function prioridades(
  porTopico: Map<string, Placar>,
  guia: Record<string, { incidencia: number; anos: string[]; prioridade: "alta" | "media" | "baixa" }>
): LinhaPrioridade[] {
  const linhas = TOPICOS.map((t) => {
    const g = guia[t.id];
    const p = porTopico.get(t.id);
    const acerto = taxa(p, 3);
    const peso = PESO_PRIORIDADE[g?.prioridade ?? "media"];
    const fraqueza = acerto === null ? 0.55 : 1 - acerto;
    const score = peso * (1 + (g?.incidencia ?? 0) / 4) * fraqueza;
    return {
      topico: t.id,
      materia: t.materia,
      incidencia: g?.incidencia ?? 0,
      anos: g?.anos.length ?? 0,
      acerto,
      respondidas: p?.total ?? 0,
      score,
      nivel: "baixa" as LinhaPrioridade["nivel"],
    };
  }).sort((a, b) => b.score - a.score);
  const max = linhas[0]?.score || 1;
  for (const l of linhas) l.nivel = l.score >= max * 0.6 ? "alta" : l.score >= max * 0.35 ? "media" : "baixa";
  return linhas;
}

export function pegadinhasQueMaisErra(porPegadinha: Map<string, Placar>) {
  return PEGADINHAS.filter((p) => p.id !== "sem_pegadinha")
    .map((p) => {
      const pl = porPegadinha.get(p.id);
      return { ...p, total: pl?.total ?? 0, erros: pl ? pl.total - pl.acertos : 0, taxaErro: pl && pl.total >= 3 ? (pl.total - pl.acertos) / pl.total : null };
    })
    .filter((p) => p.taxaErro !== null)
    .sort((a, b) => (b.taxaErro ?? 0) - (a.taxaErro ?? 0));
}

export function sequenciaDias(respostas: Resposta[]) {
  const dias = new Set(respostas.map((r) => isoLocal(new Date(r.created_at))));
  let n = 0;
  const d = new Date();
  // conta hoje se já estudou; senão começa de ontem
  if (!dias.has(isoLocal(d))) d.setDate(d.getDate() - 1);
  while (dias.has(isoLocal(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function respostasDoDia(respostas: Resposta[], dia = hoje()) {
  return respostas.filter((r) => isoLocal(new Date(r.created_at)) === dia);
}
