"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { INDEX, fetchQuestions, lawsOf, subjectName, topicById, trapById, yearLabel } from "@/lib/content";
import type { Question } from "@/lib/types";
import { Pill, SimpleMarkdown } from "@/components/ui";
import { TopicActions } from "./TopicActions";

const PRIORITY_LABEL = { high: "Prioridade alta", medium: "Prioridade média", low: "Prioridade baixa" };

export default function TopicPage() {
  const { topic: topicId } = useParams<{ topic: string }>();
  const topic = topicById[topicId];
  const questions = useMemo(() => INDEX.filter((q) => q.topic === topicId && q.status !== "annulled"), [topicId]);
  const [examples, setExamples] = useState<Question[]>([]);

  useEffect(() => {
    const ids = questions.filter((q) => q.status === "ok").slice(-3).reverse().map((q) => q.id);
    if (!ids.length) return;
    let alive = true;
    fetchQuestions(ids)
      .then((qs) => alive && setExamples(qs))
      .catch(() => alive && setExamples([]));
    return () => {
      alive = false;
    };
  }, [questions]);

  if (!topic)
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <h1 className="text-[22px] font-bold">Tópico não encontrado</h1>
        <Link href="/syllabus" className="text-[13px] font-semibold text-brand-700 hover:underline">Voltar para o edital</Link>
      </div>
    );

  const trapCounts = new Map<string, number>();
  for (const q of questions) for (const t of q.traps) if (t !== "sem_pegadinha") trapCounts.set(t, (trapCounts.get(t) ?? 0) + 1);
  const topTraps = [...trapCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const laws = lawsOf(topic.subject);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <nav aria-label="Caminho" className="text-[13px] text-ink-3">
        <Link href="/syllabus" className="hover:underline">Edital</Link> ›{" "}
        <Link href={`/syllabus?subject=${topic.subject}`} className="hover:underline">{subjectName(topic.subject)}</Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold leading-tight">{topic.name}</h1>
          <span className="text-[13px] text-ink-2">{topic.syllabus_ref} · caiu {topic.occurrences}× ({topic.years.map(yearLabel).join(", ") || "ainda não caiu"})</span>
        </div>
        <Pill tone={topic.priority === "high" ? "brand-strong" : topic.priority === "medium" ? "brand" : "neutral"}>{PRIORITY_LABEL[topic.priority]}</Pill>
      </header>

      <TopicActions topic={topic.id} subject={topic.subject} total={questions.length} />

      {topic.how_tested && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Como a Vunesp cobra</h2>
          <p className="text-sm leading-relaxed text-ink-strong">{topic.how_tested}</p>
        </section>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        {topic.memorize.length > 0 && (
          <section className="flex flex-col gap-2.5 rounded-card bg-sidebar p-5">
            <h2 className="text-sm font-bold">Decore</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px] leading-relaxed text-ink-strong">
              {topic.memorize.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </section>
        )}
        {topic.common_traps.length > 0 && (
          <section className="flex flex-col gap-2.5 rounded-card bg-trap-bg p-5">
            <h2 className="text-sm font-bold text-trap-ink">Pegadinhas da Vunesp</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px] leading-relaxed text-trap-ink">
              {topic.common_traps.map((c) => <li key={c}>{c}</li>)}
            </ul>
            {topTraps.length > 0 && (
              <p className="text-xs text-trap-ink">Tipos mais comuns aqui: {topTraps.map(([t, n]) => `${trapById[t]?.name.toLowerCase()} (${n})`).join(", ")}.</p>
            )}
          </section>
        )}
      </div>

      {topic.comparison && (
        <section className="flex flex-col gap-2 rounded-card border border-line p-5">
          <h2 className="text-sm font-bold">Não confunda</h2>
          <SimpleMarkdown text={topic.comparison} />
        </section>
      )}

      {examples.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Como já caiu</h2>
          <ul className="flex flex-col divide-y divide-line rounded-card border border-line">
            {examples.map((q) => (
              <li key={q.id} className="flex flex-col gap-1 px-4 py-3">
                <span className="text-xs font-semibold text-ink-3">TJSP {yearLabel(q.year)} · Q{q.number}</span>
                <span className="line-clamp-2 text-[13px]">{q.statement}</span>
                {q.trap_note && <span className="text-xs text-trap">{q.trap_note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {laws.length > 0 && (
        <section className="flex flex-col gap-1.5 border-t border-line pt-4">
          <h2 className="text-sm font-semibold">Lei seca</h2>
          {laws.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-brand-700 hover:underline">{l.name}</a>
          ))}
        </section>
      )}
    </div>
  );
}
