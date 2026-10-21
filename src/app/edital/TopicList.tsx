"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useUserData } from "@/lib/data/UserDataProvider";
import { rate, scores, topicMastery } from "@/lib/stats";
import { subjectName } from "@/lib/content";
import type { Topic } from "@/lib/types";
import { Pill, Tag, pct } from "@/components/ui";

const MASTERY = {
  mastered: { label: "Dominado", tone: "success" as const },
  in_progress: { label: "Em progresso", tone: "honey" as const },
  not_started: { label: "Não iniciado", tone: "neutral" as const },
};
const PRIORITY = { high: { label: "Alta", tone: "brand-strong" as const }, medium: { label: "Média", tone: "brand" as const }, low: { label: "Baixa", tone: "neutral" as const } };

export function TopicList({ topics, showSubject }: { topics: Topic[]; showSubject?: boolean }) {
  const { answers, topicProgress } = useUserData();
  const sc = useMemo(() => scores(answers), [answers]);

  return (
    <ul className="flex flex-col divide-y divide-line rounded-card border border-line">
      {topics.map((t) => {
        const m = topicMastery(t.id, answers, topicProgress.find((p) => p.topic_id === t.id));
        const hit = rate(sc.byTopic.get(t.id), 1);
        return (
          <li key={t.id}>
            <Link href={`/edital/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-sidebar sm:px-5">
              <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
                <span className="text-sm font-semibold">{t.name}</span>
                <span className="text-xs text-ink-3">
                  {showSubject ? `${subjectName(t.subject)} · ` : ""}
                  {t.syllabus_ref} · caiu {t.occurrences}× em {t.years.length} {t.years.length === 1 ? "prova" : "provas"}
                  {hit !== null ? ` · seu acerto ${pct(hit)}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Pill tone={PRIORITY[t.priority].tone}>{PRIORITY[t.priority].label}</Pill>
                <Tag tone={MASTERY[m].tone}>{MASTERY[m].label}</Tag>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
