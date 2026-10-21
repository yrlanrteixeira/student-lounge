"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUserData } from "@/lib/data/UserDataProvider";
import { INDEX, SUBJECTS, TOPICS, examYears, isTrainable, yearLabel } from "@/lib/content";
import { rate, scores } from "@/lib/stats";
import { ButtonLink, Card, Heading, Loading, cx, pct } from "@/components/ui";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "unanswered", label: "Não respondidas" },
  { id: "wrong", label: "Que errei" },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cx("min-h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors", active ? "border-brand-700 bg-brand-50 text-brand-700" : "border-line-strong bg-surface text-ink-strong hover:bg-sidebar")}>
      {children}
    </button>
  );
}

export default function Questions() {
  const { loading, answers } = useUserData();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [years, setYears] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [n, setN] = useState(10);
  const sc = useMemo(() => scores(answers), [answers]);
  const allYears = useMemo(() => examYears().reverse(), []);

  const answered = useMemo(() => new Set(answers.map((a) => a.question_id)), [answers]);
  const lastWrong = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const a of answers) m.set(a.question_id, !a.correct);
    return m;
  }, [answers]);

  const available = INDEX.filter(
    (q) =>
      isTrainable(q) &&
      (!subject || q.subject === subject) &&
      (!topic || q.topic === topic) &&
      (!years.length || years.includes(q.year)) &&
      (filter !== "unanswered" || !answered.has(q.id)) &&
      (filter !== "wrong" || lastWrong.get(q.id))
  ).length;

  if (loading) return <Loading />;

  const qs = new URLSearchParams({ mode: "free", n: String(n), filter });
  if (subject) qs.set("subject", subject);
  if (topic) qs.set("topic", topic);
  if (years.length) qs.set("years", years.join(","));

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold">Questões</h1>
        <p className="text-sm text-ink-2">{INDEX.length} questões reais da Vunesp (TJSP 2017 a 2025), todas comentadas.</p>
      </header>

      <Card className="flex flex-col gap-5 p-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold">Matéria</legend>
          <div className="flex flex-wrap gap-2">
            <Chip active={!subject} onClick={() => { setSubject(""); setTopic(""); }}>Todas</Chip>
            {SUBJECTS.map((s) => (
              <Chip key={s.id} active={subject === s.id} onClick={() => { setSubject(s.id); setTopic(""); }}>{s.name}</Chip>
            ))}
          </div>
        </fieldset>

        {subject && (
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Tópico
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="h-10 rounded-button border border-line-strong bg-surface px-3 text-[13px] font-normal">
              <option value="">Todos os tópicos</option>
              {TOPICS.filter((t) => t.subject === subject).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold">Provas</legend>
          <div className="flex flex-wrap gap-2">
            {allYears.map((y) => (
              <Chip key={y} active={years.includes(y)} onClick={() => setYears((x) => (x.includes(y) ? x.filter((z) => z !== y) : [...x, y]))}>{yearLabel(y)}</Chip>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold">Quais</legend>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>)}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold">Quantas</legend>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 20, 30].map((x) => <Chip key={x} active={n === x} onClick={() => setN(x)}>{x}</Chip>)}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-[13px] text-ink-2">{available} questões com esses filtros</span>
          <ButtonLink href={`/practice?${qs}`} size="l" aria-disabled={available === 0} className={available === 0 ? "pointer-events-none opacity-50" : ""}>
            Começar {Math.min(n, available)} questões
          </ButtonLink>
        </div>
      </Card>

      <section aria-labelledby="by-subject" className="flex flex-col gap-3.5">
        <Heading id="by-subject">Por matéria</Heading>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
          {SUBJECTS.map((s) => {
            const total = INDEX.filter((q) => q.subject === s.id && isTrainable(q)).length;
            const done = INDEX.filter((q) => q.subject === s.id && answered.has(q.id)).length;
            const r = rate(sc.bySubject.get(s.id), 1);
            return (
              <Link key={s.id} href={`/practice?mode=free&subject=${s.id}&n=10`} className="flex flex-col gap-1.5 rounded-card border border-line px-4 py-3.5 transition-colors hover:bg-sidebar">
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="text-xs text-ink-3">{done} de {total} feitas · acerto {pct(r)} · {s.exam_questions} na prova</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
