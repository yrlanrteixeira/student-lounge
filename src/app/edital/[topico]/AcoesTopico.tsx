"use client";

import { useMemo } from "react";
import { useDados } from "@/lib/dados/DadosProvider";
import { dominioTopico, placares, taxa } from "@/lib/estatisticas";
import { BotaoLink, Botao, pct } from "@/components/ui";

export function AcoesTopico({ topico, materia, total }: { topico: string; materia: string; total: number }) {
  const { respostas, topicos, marcarTopico, perfil } = useDados();
  const st = topicos.find((t) => t.topico_id === topico);
  const pl = useMemo(() => placares(respostas), [respostas]);
  const p = pl.porTopico.get(topico);
  const dominio = dominioTopico(topico, respostas, st);
  const nb = perfil.notebooklm[materia] || perfil.notebooklm.geral;

  return (
    <div className="flex flex-col gap-3 rounded-cartao border border-borda p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-texto-2">
        <span>
          Você: <strong className="text-texto">{p ? `${p.acertos}/${p.total} (${pct(taxa(p))})` : "ainda não respondeu"}</strong>
        </span>
        <span>{total} questões no banco</span>
        <span>{dominio === "dominado" ? "Dominado" : dominio === "progresso" ? "Em progresso" : "Não iniciado"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <BotaoLink href={`/praticar?modo=livre&topico=${topico}&materia=${materia}&n=${Math.min(10, total) || 10}`}>Fazer as questões deste tópico</BotaoLink>
        <Botao variante={st?.guia_lido ? "suave" : "secundario"} aria-pressed={Boolean(st?.guia_lido)} onClick={() => marcarTopico(topico, { guia_lido: !st?.guia_lido })}>
          {st?.guia_lido ? "Guia lido ✓" : "Marcar guia como lido"}
        </Botao>
        <Botao variante="secundario" aria-pressed={Boolean(st?.dominado_manual)} onClick={() => marcarTopico(topico, { dominado_manual: !st?.dominado_manual })}>
          {st?.dominado_manual ? "Desmarcar dominado" : "Já domino"}
        </Botao>
        <a href={nb || "https://notebooklm.google.com"} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center px-1 text-[13px] font-semibold text-rosa-700 hover:underline">
          Áudio no NotebookLM
        </a>
      </div>
    </div>
  );
}
