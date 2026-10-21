"use client";

import { useMemo } from "react";
import { useUserData } from "@/lib/data/UserDataProvider";
import { rate, scores, topicMastery } from "@/lib/stats";
import { Button, ButtonLink, pct } from "@/components/ui";

export function TopicActions({ topic, subject, total }: { topic: string; subject: string; total: number }) {
  const { answers, topicProgress, markTopic, profile } = useUserData();
  const progress = topicProgress.find((t) => t.topic_id === topic);
  const sc = useMemo(() => scores(answers), [answers]);
  const s = sc.byTopic.get(topic);
  const mastery = topicMastery(topic, answers, progress);
  const notebook = profile.notebooklm[subject] || profile.notebooklm.geral;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-ink-2">
        <span>
          Você: <strong className="text-ink">{s ? `${s.correct}/${s.total} (${pct(rate(s))})` : "ainda não respondeu"}</strong>
        </span>
        <span>{total} questões no banco</span>
        <span>{mastery === "mastered" ? "Dominado" : mastery === "in_progress" ? "Em progresso" : "Não iniciado"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/practice?mode=free&topic=${topic}&subject=${subject}&n=${Math.min(10, total) || 10}`}>Fazer as questões deste tópico</ButtonLink>
        <Button variant={progress?.guide_read ? "soft" : "secondary"} aria-pressed={Boolean(progress?.guide_read)} onClick={() => markTopic(topic, { guide_read: !progress?.guide_read })}>
          {progress?.guide_read ? "Guia lido ✓" : "Marcar guia como lido"}
        </Button>
        <Button variant="secondary" aria-pressed={Boolean(progress?.mastered)} onClick={() => markTopic(topic, { mastered: !progress?.mastered })}>
          {progress?.mastered ? "Desmarcar dominado" : "Já domino"}
        </Button>
        <a href={notebook || "https://notebooklm.google.com"} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center px-1 text-[13px] font-semibold text-brand-700 hover:underline">
          Áudio no NotebookLM
        </a>
      </div>
    </div>
  );
}
