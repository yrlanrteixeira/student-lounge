"use client";

import Link from "next/link";
import { INDEX, SUBJECTS, TOPICS } from "@/lib/content";
import { PRIORITY_LABEL } from "@/lib/admin";
import { ButtonLink, Heading, Pill } from "@/components/ui";
import { AdminGuard } from "../AdminGuard";

const PRIORITY_TONE = { high: "brand", medium: "neutral", low: "neutral" } as const;

export default function AdminTopics() {
  return (
    <AdminGuard>
      <TopicIndex />
    </AdminGuard>
  );
}

function TopicIndex() {
  const questionsPerTopic = INDEX.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.topic]: (acc[q.topic] ?? 0) + 1 }), {});

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">Tópicos e guia</h1>
          <p className="text-[15px] text-ink-2 sm:text-[17px]">{TOPICS.length} tópicos. Cada um tem o texto do edital mastigado que aparece para quem estuda.</p>
        </div>
        <ButtonLink href="/admin/topics/new">Novo tópico</ButtonLink>
      </header>

      {SUBJECTS.map((s) => {
        const topics = TOPICS.filter((t) => t.subject === s.id);
        return (
          <section key={s.id} aria-labelledby={`m-${s.id}`} className="flex flex-col gap-3">
            <Heading id={`m-${s.id}`}>
              {s.name} <span className="text-sm font-normal text-ink-3">· {topics.length} tópicos</span>
            </Heading>
            {topics.length === 0 ? (
              <p className="text-[13px] text-ink-3">Nenhum tópico nesta matéria.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-card border border-line">
                {topics.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/topics/${encodeURIComponent(t.id)}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-sidebar">
                      <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
                        <span className="text-sm font-semibold">{t.name}</span>
                        <span className="text-xs text-ink-3">
                          {t.id} · caiu {t.occurrences}× · {questionsPerTopic[t.id] ?? 0} questões no banco{t.how_tested ? "" : " · guia vazio"}
                        </span>
                      </span>
                      <Pill tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
