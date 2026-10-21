"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserData } from "@/lib/data/UserDataProvider";
import { fetchQuestions, imageUrl, indexById, subjectById, subjectName, topicName, trapById, yearLabel } from "@/lib/content";
import { browserClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/dates";
import type { AnswerContext, Confidence, ErrorCause, Question, ReportReason } from "@/lib/types";
import { Button, ButtonLink, Loading, Notice, Pill, Tag, cx, inputClasses, textareaClasses } from "./ui";
import { CloseIcon } from "./icons";

const LETTERS = ["A", "B", "C", "D", "E"];
const CAUSES: { id: ErrorCause; label: string }[] = [
  { id: "didnt_know", label: "Não sabia o conteúdo" },
  { id: "confused", label: "Confundi com outro" },
  { id: "careless", label: "Falta de atenção" },
];
const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "answer_key", label: "Gabarito errado" },
  { id: "statement", label: "Enunciado com problema" },
  { id: "explanation", label: "Explicação errada ou incompleta" },
  { id: "outdated", label: "Questão desatualizada" },
  { id: "image", label: "Imagem faltando ou ilegível" },
  { id: "other", label: "Outro" },
];
const MAX_REPORT_DETAILS = 2000;

interface Result {
  question: Question;
  choice: string;
  correct: boolean;
  answerId: string;
}

export function QuestionRunner({ ids, context, title, subtitle }: { ids: string[]; context: AnswerContext; title: string; subtitle?: string }) {
  const { recordAnswer, setErrorCause } = useUserData();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [cause, setCause] = useState<ErrorCause | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [showPassage, setShowPassage] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const start = useRef(Date.now());
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetchQuestions(ids)
      .then((q) => alive && setQuestions(q))
      .catch((e) => alive && setLoadError(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [ids]);

  useEffect(() => {
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [i]);

  const q = questions?.[i];
  const done = questions !== null && i >= questions.length;

  const confirm = useCallback(() => {
    if (!q || !selected || result) return;
    const a = recordAnswer({
      question: indexById[q.id] ?? { id: q.id, year: q.year, subject: q.subject, topic: q.topic, traps: q.traps, difficulty: q.difficulty, status: q.status },
      choice: selected,
      answerKey: q.answer,
      confidence,
      timeSec: (Date.now() - start.current) / 1000,
      context,
    });
    const res = { question: q, choice: selected, correct: a.correct, answerId: a.id };
    setResult(res);
    setHistory((h) => [...h, res]);
  }, [q, selected, result, confidence, context, recordAnswer]);

  const next = useCallback(() => {
    setI((x) => x + 1);
    setSelected(null);
    setConfidence(null);
    setResult(null);
    setCause(null);
    setSeconds(0);
    start.current = Date.now();
    top.current?.scrollIntoView({ block: "start" });
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const k = e.key.toUpperCase();
      if (!result && LETTERS.includes(k) && q?.options[k] !== undefined) setSelected(k);
      if (e.key === "Enter") {
        if (result) next();
        else confirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, result, confirm, next]);

  if (loadError)
    return (
      <div role="alert" className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">Não foi possível carregar as questões.</p>
        <p className="text-sm text-ink-2">{loadError}</p>
        <ButtonLink href="/">Voltar para Hoje</ButtonLink>
      </div>
    );

  if (!questions) return <Loading />;

  if (questions.length === 0)
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">Nada para resolver aqui agora.</p>
        <p className="text-sm text-ink-2">Esta etapa já foi concluída ou não há questões com esse filtro.</p>
        <ButtonLink href="/">Voltar para Hoje</ButtonLink>
      </div>
    );

  if (done) return <Summary history={history} title={title} />;
  if (!q) return null;

  const letters = LETTERS.filter((l) => q.options[l] !== undefined);
  const missed = result && !result.correct;
  const mainTrap = q.traps.find((t) => t !== "sem_pegadinha");
  const longPassage = (q.passage?.length ?? 0) > 600;
  const image = imageUrl(q.image);

  return (
    <div className="min-h-dvh bg-canvas" ref={top}>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line bg-surface px-4 py-3 sm:px-8">
        <Link href="/" aria-label="Sair e voltar para Hoje" className="flex h-11 w-11 items-center justify-center rounded-card border border-line text-ink-strong hover:bg-sidebar">
          <CloseIcon />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">
            {title} · questão {i + 1} de {questions.length}
          </span>
          {subtitle && <span className="truncate text-xs text-ink-3">{subtitle}</span>}
        </div>
        <div aria-hidden className="order-last grid w-full gap-1 sm:order-none sm:w-auto sm:min-w-40 sm:flex-[0_1_320px]" style={{ gridTemplateColumns: `repeat(${Math.min(questions.length, 40)}, minmax(0, 1fr))` }}>
          {questions.slice(0, 40).map((x, k) => {
            const h = history[k];
            return <span key={x.id} className={cx("h-1.5 rounded", h ? (h.correct ? "bg-success" : "bg-danger") : k === i ? "bg-brand-700" : "bg-line")} />;
          })}
        </div>
        <span className="tabular text-sm font-semibold text-ink-strong" aria-label={`Tempo nesta questão: ${formatDuration(seconds)}`}>
          {formatDuration(seconds)}
        </span>
      </header>

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-6 px-4 pb-16 pt-6 sm:px-8">
        <article className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-card border border-line bg-surface p-5 sm:p-7">
          <div className="flex flex-wrap gap-2">
            <Pill tone="brand">{subjectName(q.subject)}</Pill>
            <Pill wrap>{topicName(q.topic)}</Pill>
            <Pill>Vunesp · TJSP {yearLabel(q.year)} · Q{q.number}</Pill>
            {q.status === "outdated" && <Tag tone="danger">Desatualizada</Tag>}
          </div>

          {q.passage && (
            <div className="rounded-[10px] bg-sidebar">
              <button type="button" onClick={() => setShowPassage((v) => !v)} aria-expanded={showPassage} className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-ink-strong">
                Texto de apoio
                <span className="text-xs font-medium text-brand-700">{showPassage ? "Ocultar" : "Mostrar"}</span>
              </button>
              {showPassage && (
                <div className={cx("whitespace-pre-line px-4 pb-4 text-[14px] leading-relaxed text-ink-strong", longPassage && "max-h-[50vh] overflow-y-auto")}>{q.passage}</div>
              )}
            </div>
          )}

          {image && (
            <figure className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={`Página da prova original com a figura da questão ${q.number} de ${yearLabel(q.year)}`} className="max-h-[70vh] w-auto self-start rounded-[10px] border border-line" />
              <figcaption className="text-xs text-ink-3">Recorte da prova original (a figura não vem no texto).</figcaption>
            </figure>
          )}

          <p className="q-stem text-base font-medium leading-relaxed sm:text-lg">{q.statement}</p>

          <div role="radiogroup" aria-label="Alternativas" className="flex flex-col gap-2.5">
            {letters.map((l) => {
              const isAnswer = l === q.answer;
              const isSelected = selected === l;
              let style = "border border-line bg-surface hover:border-brand-300";
              let badge = "bg-subtle text-ink-strong";
              let tag: React.ReactNode = null;
              if (!result && isSelected) {
                style = "border-2 border-brand-700 bg-brand-50";
                badge = "bg-brand-700 text-white";
              }
              if (result) {
                if (isAnswer) {
                  style = "border-2 border-success bg-success-bg";
                  badge = "bg-success text-white";
                  tag = <span className="self-center text-xs font-bold text-success-700">Correta</span>;
                } else if (isSelected) {
                  style = "border-2 border-danger bg-danger-bg";
                  badge = "bg-danger text-white";
                  tag = <span className="self-center whitespace-nowrap text-xs font-bold text-danger">Sua resposta</span>;
                } else {
                  style = "border border-subtle text-ink-3";
                }
              }
              return (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={Boolean(result)}
                  onClick={() => setSelected(l)}
                  className={cx("flex min-h-11 w-full items-start gap-3.5 rounded-card px-4 py-3.5 text-left transition-colors disabled:cursor-default", style)}
                >
                  <span className={cx("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-sm font-bold", badge)}>{l}</span>
                  <span className="flex-1 text-[15px] leading-relaxed">{q.options[l] || <em className="text-ink-3">(alternativa em imagem: veja o recorte acima)</em>}</span>
                  {tag}
                </button>
              );
            })}
          </div>

          {!result && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="float-left mr-1.5 text-[13px] text-ink-2">Como você está?</legend>
                {(["sure", "unsure"] as const).map((c) => (
                  <button key={c} type="button" aria-pressed={confidence === c} onClick={() => setConfidence(confidence === c ? null : c)} className={cx("min-h-9 rounded-full border px-3 text-[13px] font-semibold", confidence === c ? "border-brand-700 bg-brand-50 text-brand-700" : "border-line-strong bg-surface text-ink-strong")}>
                    {c === "sure" ? "Tenho certeza" : "Na dúvida"}
                  </button>
                ))}
              </fieldset>
              <Button size="l" onClick={confirm} disabled={!selected} className="w-full sm:w-auto">
                Confirmar resposta
              </Button>
            </div>
          )}
        </article>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-4" aria-live="polite">
          {!result ? (
            <section className="hidden flex-col gap-2 rounded-card border border-dashed border-line-strong bg-surface p-6 sm:flex">
              <h2 className="text-base font-bold">Depois de responder</h2>
              <p className="text-sm leading-relaxed text-ink-2">Aqui aparecem o gabarito comentado, onde estava a pegadinha e o artigo da lei. Atalhos: teclas A–E e Enter.</p>
            </section>
          ) : (
            <>
              <section className={cx("flex flex-col gap-2 rounded-card border p-5", missed ? "border-danger-line bg-danger-bg text-danger-ink" : "border-success-line bg-success-bg text-success-ink")}>
                <span className="text-xl font-bold">{missed ? "Não foi dessa vez" : confidence === "unsure" ? "Acertou, mas na dúvida" : "Você acertou"}</span>
                <span className="text-sm leading-relaxed">
                  Gabarito: <strong>{q.answer === "N" ? "anulada" : q.answer}</strong>. {q.explanation}
                </span>
                {q.legal_refs && <span className="text-xs opacity-80">{q.legal_refs}</span>}
              </section>

              {mainTrap && q.trap_note && (
                <section className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-5">
                  <div className="flex items-center gap-2">
                    <Tag tone="trap">Pegadinha</Tag>
                    <span className="text-sm font-bold">{trapById[mainTrap]?.name}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{q.trap_note}</p>
                </section>
              )}

              {Object.keys(q.distractors).length > 0 && (
                <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
                  <h2 className="text-sm font-bold">Por que as outras estão erradas</h2>
                  {LETTERS.filter((l) => q.distractors[l]).map((l) => (
                    <p key={l} className="text-[13px] leading-relaxed text-ink-strong">
                      <strong>{l}</strong> · {q.distractors[l]}
                    </p>
                  ))}
                </section>
              )}

              {q.tip && <Notice tone="brand"><strong>Macete:</strong> {q.tip}</Notice>}
              {q.status_note && <Notice tone={q.status === "ok" ? "trap" : "danger"}>{q.status_note}</Notice>}

              {missed && (
                <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
                  <h2 className="text-sm font-bold">Por que você errou?</h2>
                  <div className="flex flex-wrap gap-2">
                    {CAUSES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={cause === c.id}
                        onClick={() => {
                          setCause(c.id);
                          setErrorCause(result.answerId, c.id);
                        }}
                        className={cx("min-h-9 rounded-full border px-3 text-[13px] font-semibold", cause === c.id ? "border-brand-700 bg-brand-50 text-brand-700" : "border-line-strong bg-surface text-ink-strong")}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-ink-3">Esta questão volta para revisão amanhã e depois em 3, 7, 15 e 30 dias.</span>
                </section>
              )}

              <div className="flex gap-2.5">
                <ButtonLink href={`/syllabus/${q.topic}`} variant="secondary" size="l" className="flex-1" target="_blank">
                  Ver no guia
                </ButtonLink>
                <Button size="l" onClick={next} className="flex-1">
                  {i + 1 >= questions.length ? "Ver resultado" : "Próxima"}
                </Button>
              </div>

              <ReportProblem key={q.id} questionId={q.id} alreadySent={reported.has(q.id)} onSent={() => setReported((s) => new Set(s).add(q.id))} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function ReportProblem({ questionId, alreadySent, onSent }: { questionId: string; alreadySent: boolean; onSent(): void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("answer_key");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) return <Notice tone="success">Obrigado! O problema foi enviado para revisão.</Notice>;
  if (alreadySent) return null;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-[13px] font-semibold text-ink-3 hover:text-brand-700 hover:underline">
        Reportar problema nesta questão
      </button>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const { error } = await browserClient().from("reports").insert({ question_id: questionId, reason, details: details.trim() });
    setSending(false);
    if (error) {
      setError("Não foi possível enviar agora. Verifique a internet e tente de novo.");
      return;
    }
    setSent(true);
    onSent();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <h2 className="text-sm font-bold">Reportar problema</h2>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Qual é o problema?
        <select className={inputClasses} value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
          {REPORT_REASONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Detalhes (opcional)
        <textarea className={textareaClasses} maxLength={MAX_REPORT_DETAILS} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Ex.: pela lei, a resposta certa seria a letra C." />
      </label>
      {error && <p role="alert" className="text-[13px] font-semibold text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={sending}>Cancelar</Button>
        <Button type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar"}</Button>
      </div>
    </form>
  );
}

function Summary({ history, title }: { history: Result[]; title: string }) {
  const correct = history.filter((h) => h.correct).length;
  const bySubject = useMemo(() => {
    const m = new Map<string, { correct: number; total: number }>();
    for (const h of history) {
      const x = m.get(h.question.subject) ?? { correct: 0, total: 0 };
      x.total += 1;
      if (h.correct) x.correct += 1;
      m.set(h.question.subject, x);
    }
    return [...m.entries()];
  }, [history]);
  const errors = history.filter((h) => !h.correct);
  const r = history.length ? correct / history.length : 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
          {correct} de {history.length} certas
        </h1>
        <p className="tabular text-[15px] font-medium text-ink-2">{title} concluído · {Math.round(r * 100)}% de acerto</p>
        <p className="text-sm text-ink-2">{r >= 0.7 ? "Ótimo ritmo. Continue assim." : r >= 0.5 ? "Na linha do corte. Os erros já foram para a revisão." : "Os erros já foram para a revisão. Leia o guia dos tópicos abaixo."}</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {bySubject.map(([s, x]) => (
          <div key={s} className="rounded-card border border-line bg-surface p-4">
            <span className="text-xs text-ink-3">{subjectById[s]?.name}</span>
            <p className="text-xl font-bold">{x.correct}/{x.total}</p>
          </div>
        ))}
      </div>
      {errors.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Para revisar</h2>
          <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
            {errors.map((e) => (
              <li key={e.answerId} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold">{topicName(e.question.topic)}</span>
                  <span className="text-xs text-ink-3">TJSP {yearLabel(e.question.year)} · Q{e.question.number} · você marcou {e.choice}, era {e.question.answer}</span>
                </span>
                <Link href={`/syllabus/${e.question.topic}`} className="shrink-0 text-xs font-semibold text-brand-700 hover:underline">Guia</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/" size="l">Voltar para Hoje</ButtonLink>
        <ButtonLink href="/diagnosis" variant="secondary" size="l">Ver diagnóstico</ButtonLink>
      </div>
    </div>
  );
}
