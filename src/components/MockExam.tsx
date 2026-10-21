"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUserData } from "@/lib/data/UserDataProvider";
import { BLOCKS, fetchQuestions, imageUrl, indexById, subjectById, subjectName, topicName, yearLabel } from "@/lib/content";
import { formatDuration } from "@/lib/dates";
import type { Question, QuestionIndex, Score } from "@/lib/types";
import { Button, ButtonLink, Loading, Pill, cx } from "./ui";
import { CloseIcon } from "./icons";

const LETTERS = ["A", "B", "C", "D", "E"];

function toIndex(q: Question): QuestionIndex {
  return indexById[q.id] ?? { id: q.id, year: q.year, subject: q.subject, topic: q.topic, traps: q.traps, difficulty: q.difficulty, status: q.status };
}

export function MockExam({ ids, title, minutes }: { ids: string[]; title: string; minutes: number }) {
  const { recordAnswer, saveMockExam } = useUserData();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [marked, setMarked] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(minutes * 60);
  const [finished, setFinished] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const start = useRef(Date.now());

  useEffect(() => {
    fetchQuestions(ids)
      .then(setQuestions)
      .catch((e) => setError(String(e?.message ?? e)));
  }, [ids]);

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setRemaining(Math.max(0, minutes * 60 - Math.floor((Date.now() - start.current) / 1000))), 1000);
    return () => clearInterval(t);
  }, [finished, minutes]);

  const finish = () => {
    if (!questions || finished) return;
    const duration = Math.floor((Date.now() - start.current) / 1000);
    const byBlock: Record<string, Score> = {};
    let correctCount = 0;
    for (const q of questions) {
      const block = subjectById[q.subject]?.block ?? "III";
      byBlock[block] ??= { correct: 0, total: 0 };
      byBlock[block].total += 1;
      const annulled = q.answer === "N";
      const choice = marked[q.id];
      const correct = annulled || choice === q.answer;
      if (correct) {
        correctCount += 1;
        byBlock[block].correct += 1;
      }
      if (!annulled && choice) {
        recordAnswer({ question: toIndex(q), choice, answerKey: q.answer, confidence: null, timeSec: duration / questions.length, context: "mock_exam" });
      }
    }
    saveMockExam({ title, total: questions.length, correct_count: correctCount, by_block: byBlock, duration_sec: duration });
    setFinished(true);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (remaining === 0 && !finished && questions) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  if (error)
    return (
      <div role="alert" className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">Não foi possível carregar as questões.</p>
        <p className="text-sm text-ink-2">{error}</p>
        <ButtonLink href="/simulados">Voltar para Simulados</ButtonLink>
      </div>
    );
  if (!questions) return <Loading />;
  if (finished) return <MockExamResult questions={questions} marked={marked} title={title} duration={Math.floor((Date.now() - start.current) / 1000)} />;

  const q = questions[i];
  const answered = Object.keys(marked).length;
  const image = imageUrl(q.image);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface px-4 py-3 sm:px-8">
        <Link href="/simulados" aria-label="Sair do simulado" className="flex h-11 w-11 items-center justify-center rounded-card border border-line text-ink-strong hover:bg-sidebar">
          <CloseIcon />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">{title}</span>
          <span className="text-xs text-ink-3">{answered} de {questions.length} respondidas</span>
        </div>
        <span className={cx("tabular text-sm font-bold", remaining < 900 ? "text-danger" : "text-ink-strong")} aria-label={`Tempo restante ${formatDuration(remaining)}`}>
          {formatDuration(remaining)}
        </span>
        <Button variant="secondary" onClick={() => setConfirming(true)}>Finalizar</Button>
      </header>

      {confirming && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-frame bg-surface p-6">
            <h2 id="confirm-title" className="text-lg font-bold">Finalizar o simulado?</h2>
            <p className="text-sm text-ink-2">{questions.length - answered > 0 ? `Ainda faltam ${questions.length - answered} questões em branco.` : "Todas as questões foram respondidas."}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>Continuar</Button>
              <Button className="flex-1" onClick={finish}>Finalizar</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-6 px-4 pb-16 pt-6 sm:px-8">
        <article className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-card border border-line bg-surface p-5 sm:p-7">
          <div className="flex flex-wrap gap-2">
            <Pill tone="brand">Questão {i + 1}</Pill>
            <Pill>{subjectName(q.subject)}</Pill>
          </div>
          {q.passage && <div className="max-h-[45vh] overflow-y-auto whitespace-pre-line rounded-[10px] bg-sidebar p-4 text-[14px] leading-relaxed text-ink-strong">{q.passage}</div>}
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={`Página da prova original da questão ${q.number}`} className="max-h-[70vh] w-auto self-start rounded-[10px] border border-line" />
          )}
          <p className="text-base font-medium leading-relaxed sm:text-lg">{q.statement}</p>
          <div role="radiogroup" aria-label="Alternativas" className="flex flex-col gap-2.5">
            {LETTERS.filter((l) => q.options[l] !== undefined).map((l) => {
              const on = marked[q.id] === l;
              return (
                <button key={l} type="button" role="radio" aria-checked={on} onClick={() => setMarked((m) => ({ ...m, [q.id]: l }))} className={cx("flex min-h-11 items-start gap-3.5 rounded-card px-4 py-3.5 text-left", on ? "border-2 border-brand-700 bg-brand-50" : "border border-line hover:border-brand-300")}>
                  <span className={cx("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-sm font-bold", on ? "bg-brand-700 text-white" : "bg-subtle text-ink-strong")}>{l}</span>
                  <span className="flex-1 text-[15px] leading-relaxed">{q.options[l]}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-between gap-3 pt-2">
            <Button variant="secondary" size="l" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</Button>
            {i < questions.length - 1 ? (
              <Button size="l" onClick={() => { setI(i + 1); window.scrollTo({ top: 0 }); }}>Próxima</Button>
            ) : (
              <Button size="l" onClick={() => setConfirming(true)}>Finalizar</Button>
            )}
          </div>
        </article>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <h2 className="text-sm font-bold">Folha de respostas</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1.5">
            {questions.map((x, k) => (
              <button key={x.id} type="button" onClick={() => setI(k)} aria-label={`Questão ${k + 1}${marked[x.id] ? `, marcada ${marked[x.id]}` : ", em branco"}`} aria-current={k === i ? "true" : undefined} className={cx("h-9 rounded-button text-xs font-semibold", k === i ? "bg-brand-700 text-white" : marked[x.id] ? "bg-brand-100 text-brand-800" : "bg-subtle text-ink-2")}>
                {k + 1}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MockExamResult({ questions, marked, title, duration }: { questions: Question[]; marked: Record<string, string>; title: string; duration: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const byBlock = useMemo(() => {
    const r: Record<string, Score> = {};
    for (const q of questions) {
      const b = subjectById[q.subject]?.block ?? "III";
      r[b] ??= { correct: 0, total: 0 };
      r[b].total += 1;
      if (q.answer === "N" || marked[q.id] === q.answer) r[b].correct += 1;
    }
    return r;
  }, [questions, marked]);
  const total = Object.values(byBlock).reduce((s, b) => s + b.correct, 0);
  const errors = questions.filter((q) => q.answer !== "N" && marked[q.id] !== q.answer);
  const passed = BLOCKS.every((b) => !b.minimum || (byBlock[b.id] && byBlock[b.id].correct / byBlock[b.id].total >= 0.5));

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-wide text-brand-700">{title.toUpperCase()} · RESULTADO</span>
        <h1 className="text-3xl font-bold">{total} de {questions.length}</h1>
        <p className={cx("text-sm font-semibold", passed ? "text-success" : "text-danger")}>{passed ? "Passou nos dois blocos eliminatórios." : "Ficou abaixo do corte em algum bloco eliminatório."} · {formatDuration(duration)} de prova</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {BLOCKS.map((b) => {
          const x = byBlock[b.id];
          if (!x) return null;
          const ok = !b.minimum || x.correct / x.total >= 0.5;
          return (
            <div key={b.id} className={cx("flex flex-col gap-1 rounded-card border p-4", ok ? "border-line bg-surface" : "border-danger-line bg-danger-bg")}>
              <span className="text-xs text-ink-2">Bloco {b.id} · {b.name}</span>
              <span className="text-2xl font-bold">{x.correct}/{x.total}</span>
              <span className="text-xs text-ink-3">{b.minimum ? `mínimo 50% (${Math.ceil(x.total / 2)})` : "classificatório"}</span>
            </div>
          );
        })}
      </div>
      {errors.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Erros e em branco ({errors.length}) — já foram para a revisão</h2>
          <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
            {errors.map((q) => (
              <li key={q.id} className="flex flex-col">
                <button type="button" aria-expanded={open === q.id} onClick={() => setOpen(open === q.id ? null : q.id)} className="flex items-center justify-between gap-3 px-4 py-3 text-left">
                  <span className="flex flex-col">
                    <span className="text-[13px] font-semibold">Q{questions.indexOf(q) + 1} · {topicName(q.topic)}</span>
                    <span className="text-xs text-ink-3">TJSP {yearLabel(q.year)} · você: {marked[q.id] ?? "em branco"} · gabarito: {q.answer}</span>
                  </span>
                  <span className="text-xs font-semibold text-brand-700">{open === q.id ? "Fechar" : "Ver"}</span>
                </button>
                {open === q.id && (
                  <div className="flex flex-col gap-2 px-4 pb-4 text-[13px] leading-relaxed">
                    <p className="font-medium">{q.statement}</p>
                    <p><strong>{q.answer})</strong> {q.options[q.answer]}</p>
                    <p className="text-ink-strong">{q.explanation}</p>
                    {q.trap_note && <p className="text-trap">Pegadinha: {q.trap_note}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/" size="l">Voltar para Hoje</ButtonLink>
        <ButtonLink href="/diagnostico" variant="secondary" size="l">Ver diagnóstico</ButtonLink>
      </div>
    </div>
  );
}
