"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useUserData } from "@/lib/data/UserDataProvider";
import { useMission } from "@/lib/useMission";
import { BLOCKS, EXAM, subjectName, topicName, trapById, topicById } from "@/lib/content";
import { blockStatus, rate, scores } from "@/lib/stats";
import { SCHEDULE, WEEKDAY_NAMES, isMockExamDay, isStepDone, type Mission, type Step } from "@/lib/plan";
import { addDays, daysBetween, parseDate, relativeDay, shortDate, shortMonth, toIsoDate, today, weekday } from "@/lib/dates";
import { ButtonLink, ChevronLink, Heading, Loading, ProgressBar, Tag, cx, pct } from "@/components/ui";
import { ArrowUpRightIcon, CheckIcon } from "@/components/icons";

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
  let title = "";
  let meta = "";
  let progress: number | null = null;
  let cta: { href: string; label: string } | null = null;
  let extra: React.ReactNode = null;

  switch (step.kind) {
    case "review":
      title = "Revisar erros vencidos";
      meta = step.ids.length ? `${step.ids.length} questões · repetição espaçada` : "Nada vencido hoje";
      progress = step.ids.length ? step.done / step.ids.length : 1;
      if (step.ids.length && !done) cta = { href: "/practice?mode=review", label: "Revisar agora" };
      break;
    case "topic": {
      title = topicName(step.topic);
      meta = `${subjectName(step.subject)} · ${topicById[step.topic]?.syllabus_ref ?? ""}`;
      progress = step.read ? 1 : 0;
      cta = { href: `/syllabus/${step.topic}`, label: "Ler o guia" };
      const notebook = profile.notebooklm[step.subject] || profile.notebooklm.geral;
      extra = (
        <a href={notebook || "https://notebooklm.google.com"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink hover:underline">
          Áudio no NotebookLM <ArrowUpRightIcon className="h-3 w-3" />
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      );
      break;
    }
    case "practice":
      title = step.title;
      meta = step.composition.length ? step.composition.map((c) => `${c.n} ${subjectName(c.subject)}`).join(" + ") : `${step.ids.length} questões`;
      progress = step.ids.length ? step.done / step.ids.length : 0;
      if (done) extra = <span className="text-[13px] font-medium text-success">{step.correct} de {step.ids.length} certas</span>;
      else if (step.ids.length) cta = { href: "/practice?mode=mission", label: step.done ? "Continuar bloco" : "Começar bloco" };
      else extra = <span className="text-[13px] text-ink-2">Sem erros na semana. Aproveite para descansar.</span>;
      break;
    case "trap":
      title = `Pegadinha do dia: ${trapById[step.trap]?.name.toLowerCase()}`;
      meta = trapById[step.trap]?.description ?? "";
      progress = step.done / step.ids.length;
      if (!done) cta = { href: "/practice?mode=trap", label: "Ver 3 exemplos reais" };
      break;
    case "essay":
      title = "Redação cronometrada";
      meta = "25 a 30 linhas em 1 hora. Mais de 20 linhas para a nota máxima; mínimo de 24 dos 40 pontos.";
      break;
    case "mock_exam":
      title = "Simulado completo";
      meta = "70 questões no formato 2027, com tempo de prova.";
      cta = { href: "/mock-exams", label: "Escolher simulado" };
      break;
  }

  const active = current && !done;
  return (
    <div className={cx("flex flex-col gap-3 rounded-card border bg-surface p-5 transition-shadow", active ? "border-brand-600 shadow-[0_8px_24px_rgb(193_21_116/0.10)]" : "border-line")}>
      <div className="flex items-center justify-between gap-2">
        <span
          aria-label={done ? `Etapa ${index + 1}, concluída` : `Etapa ${index + 1}`}
          className={cx(
            "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold",
            done ? "bg-success text-white" : active ? "bg-brand-700 text-white" : "bg-subtle text-ink-2"
          )}
        >
          {done ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
        </span>
        {done ? <Tag tone="success">Concluída</Tag> : active ? <Tag tone="brand">Agora</Tag> : null}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold leading-snug">{title}</span>
        <span className="text-[13px] leading-snug text-ink-2">{meta}</span>
      </div>
      {progress !== null && (
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <ProgressBar value={progress} color={done ? "bg-success" : "bg-brand-700"} />
          </div>
          <span className="tabular text-xs font-medium text-ink-2">{Math.round(progress * 100)}%</span>
        </div>
      )}
      {(cta || extra) && (
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          {cta && (active ? <ButtonLink href={cta.href} size="s">{cta.label}</ButtonLink> : <ChevronLink href={cta.href} className="text-[13px]">{cta.label}</ChevronLink>)}
          {extra}
        </div>
      )}
    </div>
  );
}

function Countdown({ mission, examDate, className }: { mission: Mission; examDate: string; className?: string }) {
  const { phase } = mission;
  return (
    <div className={cx("items-center justify-between gap-4 rounded-card bg-brand-700 p-5 text-white", className)}>
      <div className="flex flex-col">
        <span className="tabular text-[44px] font-semibold leading-none tracking-tight">{phase.daysLeft}</span>
        <span className="mt-1 text-[15px] font-medium">dias para a prova</span>
        <span className="mt-2 text-[13px] text-white/75">
          Fase {phase.number} · {phase.name} · semana {Math.min(phase.week, phase.totalWeeks)} de {phase.totalWeeks}
        </span>
      </div>
      <div className="flex h-[60px] w-[60px] shrink-0 flex-col items-center justify-center rounded-[14px] bg-surface text-brand-800">
        <span className="text-[11px] font-semibold">{shortMonth(examDate)}</span>
        <span className="tabular text-[24px] font-semibold leading-none">{parseDate(examDate).getDate()}</span>
      </div>
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
  const duration = mission.minutes >= 60 ? `${Math.floor(mission.minutes / 60)}h${String(mission.minutes % 60).padStart(2, "0")}` : `${mission.minutes} min`;

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
    // Phones: countdown, mission, sidebar. Wide screens: mission on the left, countdown and sidebar on the right.
    <div className="grid gap-8 [grid-template-areas:'count'_'main'_'aside'] xl:grid-cols-[minmax(0,1fr)_300px] xl:grid-rows-[auto_1fr] xl:[grid-template-areas:'main_count'_'main_aside']">
      <Countdown mission={mission} examDate={profile.exam_date} className="flex [grid-area:count]" />

      <div className="flex min-w-0 flex-col gap-10 [grid-area:main]">
        <section aria-labelledby="mission" className="flex flex-col gap-4">
          <header className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h1 id="mission" className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">Missão de hoje</h1>
              <span className="tabular text-[13px] font-medium text-ink-2">
                {mission.completed} de {mission.steps.length} etapas · cerca de {duration}
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-ink-2 sm:text-[17px]">
              {WEEKDAY_NAMES[mission.weekday]}: {mission.label}. Fase {mission.phase.number}, {mission.phase.name.toLowerCase()}: {mission.phase.description.charAt(0).toLowerCase() + mission.phase.description.slice(1)}
            </p>
          </header>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {mission.steps.map((s, i) => (
              <StepCard key={s.kind} step={s} index={i} current={i === currentIdx} />
            ))}
          </div>
        </section>

        <section aria-labelledby="blocks" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <Heading id="blocks">Termômetro dos blocos</Heading>
            <ChevronLink href="/diagnosis" className="shrink-0 whitespace-nowrap text-[13px]">Diagnóstico completo</ChevronLink>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {BLOCKS.map((b) => {
              const r = rate(sc.byBlock.get(b.id), 1);
              const st = blockStatus(b.id, rate(sc.byBlock.get(b.id), 10));
              const color = b.minimum === 0 ? "bg-brand-700" : st.tone === "success" ? "bg-success" : "bg-danger-500";
              return (
                <div key={b.id} className="flex flex-col gap-2.5 rounded-card border border-line p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink-2">Bloco {b.id} · {b.name}</span>
                    <Tag tone={st.tone}>{st.label}</Tag>
                  </div>
                  <span className="tabular text-[34px] font-semibold leading-none tracking-tight">{pct(r)}</span>
                  <ProgressBar value={r ?? 0} color={color} cutoff={b.minimum ? 0.5 : undefined} />
                  <span className="text-xs text-ink-2">{b.minimum ? `Corte: ${b.minimum} de ${b.questions}` : "Sem nota mínima"} · {sc.byBlock.get(b.id)?.total ?? 0} respondidas</span>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="week" className="flex flex-col gap-4">
          <Heading id="week">Matérias da semana</Heading>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
            {week.map((w) => (
              <Link key={w.d} href={`/syllabus?subject=${SCHEDULE[w.d].subjects[0]}`} className={cx("flex flex-col gap-2 rounded-card border px-5 py-4 transition-colors hover:bg-canvas", w.isToday ? "border-brand-600" : "border-line")}>
                <span className="flex items-center justify-between gap-2">
                  <span className={cx("text-[13px] font-semibold", w.isToday ? "text-brand-700" : "text-ink-2")}>{w.isToday ? `Hoje, ${WEEKDAY_NAMES[w.d].toLowerCase()}` : WEEKDAY_NAMES[w.d]}</span>
                  {w.done > 0 && <span className="tabular text-xs text-ink-2">{w.correct} de {w.done} certas</span>}
                </span>
                <span className="text-[15px] font-semibold leading-snug">{SCHEDULE[w.d].label}</span>
                <span className="text-xs text-ink-2">{w.done ? (w.isToday ? "Em andamento" : "Feito") : w.isToday ? "Em andamento" : w.past ? "Não feito" : shortDate(w.date)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="flex min-w-0 flex-col gap-8 [grid-area:aside]">
        <section aria-labelledby="activity" className="flex flex-col gap-2">
          <Heading id="activity">Atividade recente</Heading>
          {activity.length === 0 ? (
            <p className="text-[13px] text-ink-2">Ainda não há respostas. Comece pela missão de hoje.</p>
          ) : (
            <ul className="flex flex-col">
              {activity.map((a, i) => {
                const r = a.correct / a.total;
                return (
                  <li key={`${a.day}${a.context}`} className={cx("flex gap-3 py-3", i < activity.length - 1 && "border-b border-line")}>
                    <span aria-hidden className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", r >= 0.7 ? "bg-success" : r >= 0.5 ? "bg-honey" : "bg-danger-500")} />
                    <span className="flex flex-1 items-baseline justify-between gap-3">
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-medium">{CONTEXT_LABEL[a.context] ?? a.context}</span>
                        <span className="text-xs text-ink-2">{relativeDay(a.last)}</span>
                      </span>
                      <span className="tabular text-[14px] font-semibold">{a.correct}/{a.total}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="dates" className="flex flex-col gap-3">
          <Heading id="dates">Próximas datas</Heading>
          <ul className="flex flex-col rounded-card border border-line">
            {dates.map((d, i) => {
              const left = daysBetween(day, d.date);
              return (
                <li key={d.title} className={cx("flex items-center justify-between gap-3 px-4 py-3.5", i > 0 && "border-t border-line")}>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-medium">{d.title}</span>
                    <span className="text-xs text-ink-2">{shortDate(d.date)} · {d.sub}</span>
                  </span>
                  <span className={cx("tabular shrink-0 text-[13px] font-semibold", left <= 10 ? "text-brand-700" : "text-ink-2")}>{left === 0 ? "hoje" : `em ${left} dias`}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <ButtonLink href="/questions" variant="secondary" className="w-full">
          Treinar questões livres
        </ButtonLink>
      </aside>
    </div>
  );
}
