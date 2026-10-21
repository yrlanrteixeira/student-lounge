"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUserData } from "@/lib/data/UserDataProvider";
import { useMission } from "@/lib/useMission";
import { INDEX, subjectName, topicName, trapById } from "@/lib/content";
import { pickQuestions } from "@/lib/plan";
import { toIsoDate, today } from "@/lib/dates";
import type { AnswerContext } from "@/lib/types";
import { QuestionRunner } from "@/components/QuestionRunner";
import { Loading } from "@/components/ui";

interface Session {
  ids: string[];
  context: AnswerContext;
  title: string;
  subtitle?: string;
}

function Practice() {
  const params = useSearchParams();
  const { loading, answers } = useUserData();
  const mission = useMission();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (loading || session) return;
    const mode = params.get("mode") ?? "free";
    const day = today();
    const doneToday = (ctx: AnswerContext) => new Set(answers.filter((a) => a.context === ctx && toIsoDate(new Date(a.created_at)) === day).map((a) => a.question_id));
    const n = Math.min(60, Math.max(1, Number(params.get("n") ?? 10)));
    const subject = params.get("subject") ?? "";
    const topic = params.get("topic") ?? "";
    const years = (params.get("years") ?? "").split(",").filter(Boolean);
    const filter = params.get("filter") ?? "all";

    let s: Session;
    if (mode === "mission") {
      const step = mission.steps.find((x) => x.kind === "practice");
      const done = doneToday("mission");
      s = { ids: step && "ids" in step ? step.ids.filter((id) => !done.has(id)) : [], context: "mission", title: "Bloco de hoje", subtitle: mission.label };
    } else if (mode === "review") {
      const step = mission.steps.find((x) => x.kind === "review");
      const done = doneToday("review");
      s = { ids: step && "ids" in step ? step.ids.filter((id) => !done.has(id)) : [], context: "review", title: "Revisão de erros", subtitle: "Repetição espaçada: 1, 3, 7, 15 e 30 dias" };
    } else if (mode === "trap") {
      const step = mission.steps.find((x) => x.kind === "trap");
      const done = doneToday("trap");
      const name = step && step.kind === "trap" ? trapById[step.trap]?.name : "";
      s = { ids: step && "ids" in step ? step.ids.filter((id) => !done.has(id)) : [], context: "trap", title: "Pegadinha do dia", subtitle: name };
    } else if (mode === "mistakes") {
      const last = new Map<string, boolean>();
      for (const a of answers) last.set(a.question_id, a.correct);
      const ids = INDEX.filter((q) => last.get(q.id) === false && (!subject || q.subject === subject)).map((q) => q.id);
      s = { ids: ids.slice(0, n), context: "review", title: "Caderno de erros", subtitle: subject ? subjectName(subject) : "Todas as matérias" };
    } else {
      const answered = new Set(answers.map((a) => a.question_id));
      const lastWrong = new Map<string, boolean>();
      for (const a of answers) lastWrong.set(a.question_id, !a.correct);
      const pool = INDEX.filter(
        (q) =>
          (!subject || q.subject === subject) &&
          (!topic || q.topic === topic) &&
          (!years.length || years.includes(q.year)) &&
          (filter !== "unanswered" || !answered.has(q.id)) &&
          (filter !== "wrong" || lastWrong.get(q.id))
      );
      const ids = pickQuestions({ pool, n, answers, seed: `${Date.now()}`, focus: topic || undefined });
      s = {
        ids,
        context: topic ? "topic" : "free",
        title: topic ? "Treino do tópico" : "Questões",
        subtitle: topic ? topicName(topic) : subject ? subjectName(subject) : "Todas as matérias",
      };
    }
    setSession(s);
  }, [loading, session, params, answers, mission]);

  if (!session) return <Loading />;
  return <QuestionRunner ids={session.ids} context={session.context} title={session.title} subtitle={session.subtitle} />;
}

export default function PracticePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Practice />
    </Suspense>
  );
}
