"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDados } from "@/lib/dados/DadosProvider";
import { dominioTopico, placares, taxa } from "@/lib/estatisticas";
import { nomeMateria } from "@/lib/conteudo";
import { Pilula, Tag, pct } from "@/components/ui";

interface Item {
  materia: string;
  topico: string;
  nome: string;
  edital: string;
  incidencia: number;
  prioridade: "alta" | "media" | "baixa";
  anos: string[];
}

const DOMINIO = {
  dominado: { rotulo: "Dominado", tom: "acerto" as const },
  progresso: { rotulo: "Em progresso", tom: "mel" as const },
  nao_iniciado: { rotulo: "Não iniciado", tom: "neutro" as const },
};
const PRIORIDADE = { alta: { rotulo: "Alta", tom: "rosa-forte" as const }, media: { rotulo: "Média", tom: "rosa" as const }, baixa: { rotulo: "Baixa", tom: "neutro" as const } };

export function EditalTopicos({ topicos, mostrarMateria }: { topicos: Item[]; mostrarMateria?: boolean }) {
  const { respostas, topicos: status } = useDados();
  const pl = useMemo(() => placares(respostas), [respostas]);

  return (
    <ul className="flex flex-col divide-y divide-borda rounded-cartao border border-borda">
      {topicos.map((t) => {
        const d = dominioTopico(t.topico, respostas, status.find((s) => s.topico_id === t.topico));
        const acc = taxa(pl.porTopico.get(t.topico), 1);
        return (
          <li key={t.topico}>
            <Link href={`/edital/${t.topico}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-lateral sm:px-5">
              <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
                <span className="text-sm font-semibold">{t.nome}</span>
                <span className="text-xs text-texto-3">
                  {mostrarMateria ? `${nomeMateria(t.materia)} · ` : ""}
                  {t.edital} · caiu {t.incidencia}× em {t.anos.length} {t.anos.length === 1 ? "prova" : "provas"}
                  {acc !== null ? ` · seu acerto ${pct(acc)}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Pilula tom={PRIORIDADE[t.prioridade].tom}>{PRIORIDADE[t.prioridade].rotulo}</Pilula>
                <Tag tom={DOMINIO[d].tom}>{DOMINIO[d].rotulo}</Tag>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
