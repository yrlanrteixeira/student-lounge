import taxonomia from "@/data/taxonomia.json";
import indiceJson from "@/data/indice.json";
import type { Materia, QuestaoIndice, TipoPegadinha, Topico } from "./tipos";

export const EDITAL = taxonomia.edital;
export const MATERIAS = taxonomia.materias as Materia[];
export const TOPICOS = taxonomia.topicos as Topico[];
export const PEGADINHAS = taxonomia.pegadinhas as TipoPegadinha[];
export const INDICE = indiceJson as QuestaoIndice[];

export const materiaPorId = Object.fromEntries(MATERIAS.map((m) => [m.id, m])) as Record<string, Materia>;
export const topicoPorId = Object.fromEntries(TOPICOS.map((t) => [t.id, t])) as Record<string, Topico>;
export const pegadinhaPorId = Object.fromEntries(PEGADINHAS.map((p) => [p.id, p])) as Record<string, TipoPegadinha>;
export const indicePorId = Object.fromEntries(INDICE.map((q) => [q.id, q])) as Record<string, QuestaoIndice>;

export const BLOCOS = [
  { id: "I", nome: "Português", questoes: 16, minimo: 8 },
  { id: "II", nome: "Direito", questoes: 30, minimo: 15 },
  { id: "III", nome: "Gerais", questoes: 24, minimo: 0 },
] as const;

export function nomeMateria(id: string) {
  return materiaPorId[id]?.nome ?? id;
}

export function nomeTopico(id: string) {
  return topicoPorId[id]?.nome ?? id;
}

/** Questões que fazem sentido treinar hoje (exclui anuladas e atualidades vencidas). */
export function questaoTreinavel(q: QuestaoIndice) {
  if (q.status === "anulada") return false;
  if (q.status === "desatualizada" && q.materia === "atualidades_pcd") return false;
  return true;
}

export function rotuloAno(ano: string) {
  return ano === "2024r" ? "2024 (reaplicação)" : ano;
}
