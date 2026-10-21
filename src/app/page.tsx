"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useUserData } from "@/lib/data/UserDataProvider";
import { useMission } from "@/lib/useMission";
import { BLOCKS, EXAM, subjectName, topicName, trapById, topicById } from "@/lib/content";
import { blockStatus, rate, scores } from "@/lib/stats";
import { SCHEDULE, WEEKDAY_NAMES, isMockExamDay, isStepDone, type Step } from "@/lib/plan";
import { addDays, daysBetween, parseDate, relativeDay, shortDate, shortMonth, toIsoDate, today, weekday } from "@/lib/dates";
import { ButtonLink, Heading, Loading, ProgressBar, Tag, cx, pct } from "@/components/ui";

const DAY_TONES = ["neutral", "brand", "honey", "success", "lilac", "mint", "neutral"] as const;

const CONTEXT_LABEL: Record<string, string> = {
  mission: "Bloco da missão",
  review: "Revisão de erros",
  topic: "Treino por tópico",
  trap: "Pegadinha do dia",
  free: "Questões livres",
  mock_exam: "Simulado",
};

function StepCard({ step, index, current }: { step: Step; index: number; current: boolean }) {
  const { profile } = useUserData();
  const done = isStepDone(step);
  const label = `ETAPA ${index + 1}${done ? " · CONCLUÍDA" : current ? " · AGORA" : ""}`;
  let title = "";
  let meta = "";
  let progress: number | null = null;
  let action: React.ReactNode = null;

  switch (step.kind) {
    case "review":
      title = "Revisar erros vencidos";
      meta = step.ids.length ? `${step.ids.length} questões · repetição espaçada` : "Nada vencido hoje";
      progress = step.ids.length ? step.done / step.ids.length : 1;
      if (step.ids.length && !done) action = <Link href="/practice?mode=review" className="text-xs font-semibold text-brand-700 hover:underline">Revisar agora →</Link>;
      break;
    case "topic": {
      title = topicName(step.topic);
      meta = `${subjectName(step.subject)} · ${topicById[step.topic]?.syllabus_ref ?? ""}`;
      progress = step.read ? 1 : 0;
      const notebook = profile.notebooklm[step.subject] || profile.notebooklm.geral;
      action = (
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <Link href={`/syllabus/${step.topic}`} className="font-semibold text-brand-700 hover:underline">Ler o guia →</Link>
          <a href={notebook || "https://notebooklm.google.com"} target="_blank" rel="noreferrer" className="text-ink-2 hover:underline">Áudio no NotebookLM</a>
        </span>
      );
      break;
    }
    case "practice":
      title = step.title;
      meta = step.composition.length ? step.composition.map((c) => `${c.n} ${subjectName(c.subject)}`).join(" + ") : `${step.ids.length} questões`;
      progress = step.ids.length ? step.done / step.ids.length : 0;
      action = done ? (
        <span className="text-xs font-semibold text-success">{step.correct} de {step.ids.length} certas</span>
      ) : step.ids.length ? (
        <Link href="/practice?mode=mission" className="text-xs font-semibold text-brand-700 hover:underline">{step.done ? "Continuar bloco →" : "Começar bloco →"}</Link>
      ) : (
        <span className="text-xs text-ink-3">Sem erros na semana — aproveite para descansar.</span>
      );
      break;
    case "trap":
      title = `Pegadinha do dia: ${trapById[step.trap]?.name.toLowerCase()}`;
      meta = trapById[step.trap]?.description ?? "";
      progress = step.done / step.ids.length;
      if (!done) action = <Link href="/practice?mode=trap" className="text-xs font-semibold text-brand-700 hover:underline">Ver 3 exemplos reais →</Link>;
      break;
    case "essay":
      title = "Redação cronometrada";
      meta = "25 a 30 linhas em 1 hora. Mais de 20 linhas para a nota máxima; mínimo de 24 dos 40 pontos.";
      break;
    case "mock_exam":
      title = "Simulado completo";
      meta = "70 questões no formato 2027, com tempo de prova.";
      action = <Link href="/mock-exams" className="text-xs font-semibold text-brand-700 hover:underline">Escolher simulado →</Link>;
      break;
  }

  return (
    <div className={cx("flex flex-col gap-2.5 rounded-card border bg-surface p-4", current && !done ? "border-brand-700 ring-[3px] ring-brand-50" : "border-line")}>
      <span className={cx("text-[11px] font-semibold tracking-wide", done ? "text-success" : current ? "text-brand-700" : "text-ink-3")}>{label}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs leading-snug text-ink-3">{meta}</span>
      </div>
      {progress !== null && (
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <ProgressBar value={progress} color={done ? "bg-success" : "bg-brand-700"} />
          </div>
          <span className="tabular text-xs font-semibold">{Math.round(progress * 100)}%</span>
        </div>
      )}
      {action}
    </div>
  );
}

export default function Today() {
  const { loading, answers, profile } = useUserData();
  const mission = useMission();
  const sc = useMemo(() => scores(answers), [answers]);

  const activity = useMemo(() => {
    const groups = new Map<string, { day: string; context: string; total: number; correct: number; last: string }>();
    for (const a of answers) {
      const day = toIsoDate(new Date(a.created_at));
      const k = `${day}:${a.context}`;
      const g = groups.get(k) ?? { day, context: a.context, total: 0, correct: 0, last: a.created_at };
      g.total += 1;
      if (a.correct) g.correct += 1;
      g.last = a.created_at;
      groups.set(k, g);
    }
    return [...groups.values()].sort((a, b) => b.last.localeCompare(a.last)).slice(0, 4);
  }, [answers]);

  const week = useMemo(() => {
    const day = today();
    const wd = weekday(day);
    const monday = addDays(day, wd === 0 ? -6 : 1 - wd);
    return [1, 2, 3, 4, 5].map((d) => {
      const date = addDays(monday, d - 1);
      const ofDay = answers.filter((a) => toIsoDate(new Date(a.created_at)) === date && a.context === "mission");
      return { d, date, done: ofDay.length, correct: ofDay.filter((a) => a.correct).length, isToday: date === day, past: date < day };
    });
  }, [answers]);

  if (loading) return <Loading />;

  const currentIdx = mission.steps.findIndex((s) => !isStepDone(s));
  const day = today();
  const [registrationOpens, registrationCloses] = EXAM.registration.split(" a ");
  const nextSunday = addDays(day, (7 - weekday(day)) % 7 || 7);
  let mockExamSunday = nextSunday;
  for (let i = 0; i < 3 && !isMockExamDay(profile, mockExamSunday); i++) mockExamSunday = addDays(mockExamSunday, 7);

  const dates = [
    day < registrationOpens
      ? { title: "Abertura das inscrições", sub: `Vunesp · até ${shortDate(registrationCloses)}`, date: registrationOpens }
      : day <= registrationCloses
        ? { title: "Fim das inscrições", sub: "Não deixe para o último dia", date: registrationCloses }
        : null,
    { title: "Simulado completo", sub: "70 questões · tempo de prova", date: mockExamSunday },
    { title: "Prova objetiva + redação", sub: "Vunesp · TJSP Escrevente", date: profile.exam_date },
  ].filter(Boolean) as { title: string; sub: string; date: string }[];

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-7">
        <section aria-labelledby="mission" className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 id="mission" className="text-lg font-semibold">Missão de hoje</h1>
            <span className="text-xs text-ink-3">
              {mission.completed} de {mission.steps.length} etapas · ~{mission.minutes >= 60 ? `${Math.floor(mission.minutes / 60)}h${String(mission.minutes % 60).padStart(2, "0")}` : `${mission.minutes} min`}
            </span>
          </div>
          <p className="-mt-2 text-[13px] text-ink-2">
            {WEEKDAY_NAMES[mission.weekday]}: {mission.label}. Fase {mission.phase.number} · {mission.phase.name} — {mission.phase.description}
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
            {mission.steps.map((s, i) => (
              <StepCard key={s.kind} step={s} index={i} current={i === currentIdx} />
            ))}
          </div>
        </section>

        <section aria-labelledby="blocks" className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <Heading id="blocks">Termômetro dos blocos</Heading>
            <Link href="/diagnosis" className="text-xs font-semibold text-brand-700 hover:underline">Diagnóstico completo</Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
            {BLOCKS.map((b) => {
              const r = rate(sc.byBlock.get(b.id), 1);
              const st = blockStatus(b.id, rate(sc.byBlock.get(b.id), 10));
              const color = b.minimum === 0 ? "bg-brand-700" : st.tone === "success" ? "bg-success" : "bg-danger-500";
              return (
                <div key={b.id} className="flex flex-col gap-2 rounded-card border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold">{b.id} · {b.name}</span>
                    <Tag tone={st.tone}>{st.label}</Tag>
                  </div>
                  <span className="tabular text-2xl font-bold">{pct(r)}</span>
                  <ProgressBar value={r ?? 0} color={color} cutoff={b.minimum ? 0.5 : undefined} />
                  <span className="text-xs text-ink-3">{b.minimum ? `corte: ${b.minimum} de ${b.questions}` : "sem nota mínima"} · {sc.byBlock.get(b.id)?.total ?? 0} respondidas</span>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="week" className="flex flex-col gap-3.5">
          <Heading id="week">Matérias da semana</Heading>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3.5">
            {week.map((w) => (
              <Link key={w.d} href={`/syllabus?subject=${SCHEDULE[w.d].subjects[0]}`} className={cx("flex flex-col gap-1.5 rounded-card border px-4 py-3.5 transition-colors hover:bg-sidebar", w.isToday ? "border-brand-200" : "border-line")}>
                <span className="text-sm font-semibold">{SCHEDULE[w.d].label}</span>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-3">
                    {w.done ? `${w.isToday ? "Hoje" : "Feito"} · ${w.correct} de ${w.done} certas` : w.isToday ? "Hoje · em andamento" : w.past ? "Não feito" : shortDate(w.date)}
                  </span>
                  <Tag tone={DAY_TONES[w.d]}>{WEEKDAY_NAMES[w.d]}</Tag>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-6">
        <div className="flex items-center justify-between gap-3 rounded-card bg-brand-100 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-brand-900">{mission.phase.daysLeft} dias para a prova</span>
            <span className="text-xs text-brand-800">
              Fase {mission.phase.number} — {mission.phase.name}
              <br />
              semana {Math.min(mission.phase.week, mission.phase.totalWeeks)} de {mission.phase.totalWeeks}
            </span>
          </div>
          <div className="flex h-[52px] w-[52px] flex-col items-center justify-center rounded-[14px] bg-surface text-brand-800">
            <span className="text-[10px] font-semibold">{shortMonth(profile.exam_date)}</span>
            <span className="text-xl font-bold leading-none">{parseDate(profile.exam_date).getDate()}</span>
          </div>
        </div>

        <section aria-labelledby="activity" className="flex flex-col gap-2">
          <Heading id="activity">Atividade recente</Heading>
          {activity.length === 0 ? (
            <p className="text-[13px] text-ink-3">Ainda não há respostas. Comece pela missão de hoje.</p>
          ) : (
            <ul className="flex flex-col">
              {activity.map((a, i) => {
                const r = a.correct / a.total;
                return (
                  <li key={`${a.day}${a.context}`} className={cx("flex gap-3 py-2.5", i < activity.length - 1 && "border-b border-line")}>
                    <span aria-hidden className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", r >= 0.7 ? "bg-success" : r >= 0.5 ? "bg-lilac-500" : "bg-brand-700")} />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold">{CONTEXT_LABEL[a.context] ?? a.context}: {a.correct}/{a.total}</span>
                      <span className="text-xs text-ink-3">{relativeDay(a.last)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="dates" className="flex flex-col gap-3">
          <Heading id="dates">Próximas datas</Heading>
          {dates.map((d) => {
            const left = daysBetween(day, d.date);
            return (
              <div key={d.title} className="flex flex-col gap-1.5 rounded-[10px] border border-line px-3.5 py-3">
                <span className="text-[13px] font-semibold">{d.title}</span>
                <span className="text-xs text-ink-3">{d.sub}</span>
                <span className="flex justify-between text-xs">
                  <span className="text-ink-strong">{shortDate(d.date)}</span>
                  <span className={cx("font-semibold", left <= 10 ? "text-danger" : "text-success")}>{left === 0 ? "hoje" : `em ${left} dias`}</span>
                </span>
              </div>
            );
          })}
        </section>
        <ButtonLink href="/questions" variant="secondary" className="w-full">
          Treinar questões livres
        </ButtonLink>
      </aside>
    </div>
  );
}
