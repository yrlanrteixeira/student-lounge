import "server-only";
import banco from "@/data/banco.json";
import guia from "@/data/guia.json";
import type { GuiaMateria, Questao } from "./tipos";

const QUESTOES = banco as Questao[];
const porId = new Map(QUESTOES.map((q) => [q.id, q]));

export function questoesPorIds(ids: string[]): Questao[] {
  return ids.map((id) => porId.get(id)).filter((q): q is Questao => Boolean(q));
}

export function todasQuestoes() {
  return QUESTOES;
}

export const GUIA = guia as GuiaMateria[];
