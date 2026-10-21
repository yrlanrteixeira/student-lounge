import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIA, todasQuestoes } from "@/lib/conteudo-server";
import { nomeMateria, pegadinhaPorId, rotuloAno, topicoPorId } from "@/lib/conteudo";
import { LEI_SECA } from "@/lib/leis";
import { MarkdownSimples, Pilula } from "@/components/ui";
import { AcoesTopico } from "./AcoesTopico";

export default async function TopicoPagina({ params }: { params: Promise<{ topico: string }> }) {
  const { topico } = await params;
  const info = topicoPorId[topico];
  if (!info) notFound();
  const guia = GUIA.find((m) => m.materia === info.materia)!.topicos.find((t) => t.topico === topico)!;
  const questoes = todasQuestoes().filter((q) => q.topico === topico && q.status !== "anulada");
  const contagemPeg = new Map<string, number>();
  for (const q of questoes) for (const p of q.pegadinhas) if (p !== "sem_pegadinha") contagemPeg.set(p, (contagemPeg.get(p) ?? 0) + 1);
  const pegs = [...contagemPeg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const exemplos = questoes.filter((q) => q.status === "ok").slice(-3).reverse();
  const prioridade = { alta: "Prioridade alta", media: "Prioridade média", baixa: "Prioridade baixa" }[guia.prioridade];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <nav aria-label="Caminho" className="text-[13px] text-texto-3">
        <Link href="/edital" className="hover:underline">Edital</Link> ›{" "}
        <Link href={`/edital?materia=${info.materia}`} className="hover:underline">{nomeMateria(info.materia)}</Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold leading-tight">{guia.nome}</h1>
          <span className="text-[13px] text-texto-2">{guia.edital} · caiu {guia.incidencia}× ({guia.anos.map(rotuloAno).join(", ") || "ainda não caiu"})</span>
        </div>
        <Pilula tom={guia.prioridade === "alta" ? "rosa-forte" : guia.prioridade === "media" ? "rosa" : "neutro"}>{prioridade}</Pilula>
      </header>

      <AcoesTopico topico={topico} materia={info.materia} total={questoes.length} />

      {guia.como_cai && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Como a Vunesp cobra</h2>
          <p className="text-sm leading-relaxed text-texto-forte">{guia.como_cai}</p>
        </section>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        {guia.decorar.length > 0 && (
          <section className="flex flex-col gap-2.5 rounded-cartao bg-lateral p-5">
            <h2 className="text-sm font-bold">Decore</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px] leading-relaxed text-texto-forte">
              {guia.decorar.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </section>
        )}
        {guia.pegadinhas_recorrentes.length > 0 && (
          <section className="flex flex-col gap-2.5 rounded-cartao bg-pegadinha-fundo p-5">
            <h2 className="text-sm font-bold text-[#7A2E0E]">Pegadinhas da Vunesp</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px] leading-relaxed text-[#7A2E0E]">
              {guia.pegadinhas_recorrentes.map((d) => <li key={d}>{d}</li>)}
            </ul>
            {pegs.length > 0 && (
              <p className="text-xs text-[#7A2E0E]">Tipos mais comuns aqui: {pegs.map(([p, n]) => `${pegadinhaPorId[p]?.nome.toLowerCase()} (${n})`).join(", ")}.</p>
            )}
          </section>
        )}
      </div>

      {guia.comparativo && (
        <section className="flex flex-col gap-2 rounded-cartao border border-borda p-5">
          <h2 className="text-sm font-bold">Não confunda</h2>
          <MarkdownSimples texto={guia.comparativo} />
        </section>
      )}

      {exemplos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Como já caiu</h2>
          <ul className="flex flex-col divide-y divide-borda rounded-cartao border border-borda">
            {exemplos.map((q) => (
              <li key={q.id} className="flex flex-col gap-1 px-4 py-3">
                <span className="text-xs font-semibold text-texto-3">TJSP {rotuloAno(q.ano)} · Q{q.numero}</span>
                <span className="line-clamp-2 text-[13px]">{q.enunciado}</span>
                {q.pegadinha && <span className="text-xs text-pegadinha">{q.pegadinha}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(LEI_SECA[info.materia] ?? []).length > 0 && (
        <section className="flex flex-col gap-1.5 border-t border-borda pt-4">
          <h2 className="text-sm font-semibold">Lei seca</h2>
          {LEI_SECA[info.materia].map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-rosa-700 hover:underline">{l.nome}</a>
          ))}
        </section>
      )}
    </div>
  );
}

export function generateStaticParams() {
  return GUIA.flatMap((m) => m.topicos.map((t) => ({ topico: t.topico })));
}
