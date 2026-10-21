"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useUserData } from "@/lib/data/UserDataProvider";
import { BLOCKS, SUBJECTS, TOPICS, subjectName, topicName } from "@/lib/content";
import { priorities, projectedScore, rate, scores, weakestTraps } from "@/lib/stats";
import { addDays, shortDate, toIsoDate, today, weekday } from "@/lib/dates";
import { Card, EmptyState, Heading, Loading, Pill, ProgressBar, cx, pct } from "@/components/ui";

function cellColor(r: number | null) {
  if (r === null) return "bg-subtle text-ink-2";
  if (r < 0.45) return "bg-trap text-white";
  if (r < 0.65) return "bg-trap-soft text-ink";
  if (r < 0.8) return "bg-brand-300 text-ink";
  return "bg-brand-700 text-white";
}

export default function Diagnosis() {
  const { loading, answers, reviews, mockExams } = useUserData();
  const sc = useMemo(() => scores(answers), [answers]);
  const ranking = useMemo(() => priorities(sc.byTopic), [sc]);
  const traps = useMemo(() => weakestTraps(sc.byTrap).slice(0, 5), [sc]);
  const projected = projectedScore(sc.bySubject);

  const weeks = useMemo(() => {
    const day = today();
    const wd = weekday(day);
    const monday = addDays(day, wd === 0 ? -6 : 1 - wd);
    return Array.from({ length: 8 }, (_, k) => {
      const start = addDays(monday, -7 * (7 - k));
      const end = addDays(start, 6);
      const inWeek = answers.filter((a) => {
        const d = toIsoDate(new Date(a.created_at));
        return d >= start && d <= end;
      });
      return { start, total: inWeek.length, rate: inWeek.length ? inWeek.filter((a) => a.correct).length / inWeek.length : null };
    });
  }, [answers]);

  if (loading) return <Loading />;

  if (answers.length < 10)
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-[22px] font-bold">Diagnóstico</h1>
        <EmptyState title="Ainda há poucas respostas">Responda pelo menos 10 questões para o diagnóstico começar a aparecer. Ele melhora a cada bloco.</EmptyState>
      </div>
    );

  const falseConfidence = sc.sure.total ? 1 - sc.sure.correct / sc.sure.total : null;
  const recovered = reviews.length ? reviews.filter((r) => r.stage >= 1).length / reviews.length : null;
  const totalCauses = Object.values(sc.causes).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold">Diagnóstico</h1>
        <p className="text-sm text-ink-2">Onde você está, o que derruba sua nota e o que estudar primeiro.</p>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-[13px] text-ink-2">Nota projetada</span>
          <span className="tabular text-3xl font-bold">{projected ?? "—"}<span className="text-base font-semibold text-ink-3"> / 70</span></span>
          <span className="text-xs text-ink-3">{projected === null ? "precisa de mais matérias respondidas" : "pelo seu acerto em cada matéria"}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-[13px] text-ink-2">Acerto geral</span>
          <span className="tabular text-3xl font-bold">{pct(rate(sc.overall))}</span>
          <span className="text-xs text-ink-3">{sc.overall.total} questões respondidas</span>
        </Card>
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-[13px] text-ink-2">Acerto quando “tenho certeza”</span>
          <span className="tabular text-3xl font-bold">{pct(rate(sc.sure))}</span>
          <span className={cx("text-xs", falseConfidence && falseConfidence > 0.15 ? "font-semibold text-trap" : "text-ink-3")}>
            {falseConfidence === null ? "marque a confiança ao responder" : `${pct(falseConfidence)} de falsa certeza`}
          </span>
        </Card>
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-[13px] text-ink-2">Erros recuperados</span>
          <span className="tabular text-3xl font-bold">{pct(recovered)}</span>
          <span className="text-xs text-ink-3">acertou na revisão espaçada</span>
        </Card>
      </div>

      <section aria-labelledby="blocks" className="flex flex-col gap-3">
        <Heading id="blocks">Blocos e matérias</Heading>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {BLOCKS.map((b) => {
            const blockRate = rate(sc.byBlock.get(b.id));
            return (
              <Card key={b.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">Bloco {b.id} · {b.name}</span>
                  <span className={cx("tabular text-sm font-bold", b.minimum && blockRate !== null && blockRate < 0.55 ? "text-danger" : "")}>{pct(blockRate)}</span>
                </div>
                {SUBJECTS.filter((s) => s.block === b.id).map((s) => {
                  const r = rate(sc.bySubject.get(s.id));
                  return (
                    <div key={s.id} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span>{s.name} <span className="text-ink-3">· {s.exam_questions} q</span></span>
                        <span className="tabular font-semibold">{pct(r)}</span>
                      </div>
                      <ProgressBar value={r ?? 0} color={r !== null && r < 0.5 ? "bg-danger-500" : "bg-brand-700"} cutoff={b.minimum ? 0.5 : undefined} />
                    </div>
                  );
                })}
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="prio" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Heading id="prio">Prioridades de estudo</Heading>
          <span className="text-[13px] text-ink-3">Quanto o tópico cai na Vunesp × peso no edital × quanto você ainda erra.</span>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-2">
                <th scope="col" className="px-4 py-3 font-semibold">#</th>
                <th scope="col" className="px-2 py-3 font-semibold">Tópico</th>
                <th scope="col" className="px-2 py-3 font-semibold">Caiu</th>
                <th scope="col" className="px-2 py-3 font-semibold">Seu acerto</th>
                <th scope="col" className="px-2 py-3 font-semibold">Prioridade</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Ação</span></th>
              </tr>
            </thead>
            <tbody>
              {ranking.slice(0, 8).map((row, k) => (
                <tr key={row.topic} className="border-t border-subtle">
                  <td className="px-4 py-3 font-bold text-ink-3">{k + 1}</td>
                  <td className="px-2 py-3">
                    <Link href={`/syllabus/${row.topic}`} className="font-semibold hover:underline">{topicName(row.topic)}</Link>
                    <div className="text-xs text-ink-3">{subjectName(row.subject)}</div>
                  </td>
                  <td className="px-2 py-3 text-[13px]">{row.occurrences}× em {row.years} provas</td>
                  <td className={cx("tabular px-2 py-3 font-bold", row.hitRate !== null && row.hitRate < 0.5 ? "text-trap" : "")}>{row.hitRate === null ? "—" : pct(row.hitRate)}</td>
                  <td className="px-2 py-3"><Pill tone={row.level === "high" ? "brand-strong" : row.level === "medium" ? "brand" : "neutral"}>{row.level === "high" ? "Alta" : row.level === "medium" ? "Média" : "Baixa"}</Pill></td>
                  <td className="px-4 py-3 text-right"><Link href={`/practice?mode=free&topic=${row.topic}&subject=${row.subject}&n=10`} className="text-[13px] font-semibold text-brand-700 hover:underline">Treinar 10</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <div className="flex flex-wrap items-stretch gap-6">
        <section aria-labelledby="map" className="flex min-w-0 flex-[999_1_520px] flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Heading id="map">Mapa por tópico</Heading>
            <span aria-hidden className="flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
              <span className="h-3.5 w-3.5 rounded-[4px] bg-trap" />&lt;45%
              <span className="ml-1.5 h-3.5 w-3.5 rounded-[4px] bg-trap-soft" />45–64%
              <span className="ml-1.5 h-3.5 w-3.5 rounded-[4px] bg-brand-300" />65–79%
              <span className="ml-1.5 h-3.5 w-3.5 rounded-[4px] bg-brand-700" />80%+
            </span>
          </div>
          <Card className="flex flex-col gap-3 p-4">
            {SUBJECTS.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="w-40 shrink-0 text-[13px] font-semibold">{s.name}</span>
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {TOPICS.filter((t) => t.subject === s.id).map((t) => {
                    const r = rate(sc.byTopic.get(t.id));
                    return (
                      <Link key={t.id} href={`/syllabus/${t.id}`} title={t.name} className={cx("rounded-button px-2 py-1 text-xs font-semibold", cellColor(r))}>
                        {t.short_name} {r === null ? "" : pct(r)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </Card>
        </section>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
          <section aria-labelledby="traps" className="flex flex-col gap-3">
            <Heading id="traps">Pegadinhas em que você mais cai</Heading>
            <Card className="flex flex-col gap-3 p-4">
              {traps.length === 0 ? (
                <span className="text-[13px] text-ink-3">Aparece depois de algumas respostas com pegadinha.</span>
              ) : (
                traps.map((t) => (
                  <div key={t.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[13px]"><span>{t.name}</span><strong className="tabular">{pct(t.errorRate)}</strong></div>
                    <ProgressBar value={t.errorRate ?? 0} color={(t.errorRate ?? 0) >= 0.35 ? "bg-trap" : "bg-trap-soft"} />
                  </div>
                ))
              )}
              <span className="text-xs text-ink-3">% das vezes que você errou quando essa armadilha apareceu</span>
            </Card>
          </section>

          <section aria-labelledby="causes" className="flex flex-col gap-3">
            <Heading id="causes">Por que você erra</Heading>
            <Card className="flex flex-col gap-2 p-4 text-[13px]">
              {totalCauses === 0 ? (
                <span className="text-ink-3">Marque o motivo depois de cada erro para ver este quadro.</span>
              ) : (
                <>
                  <span><strong>{pct(sc.causes.didnt_know / totalCauses)}</strong> não sabia o conteúdo → leia o guia do tópico</span>
                  <span><strong>{pct(sc.causes.confused / totalCauses)}</strong> confundiu institutos → veja o “Não confunda”</span>
                  <span><strong>{pct(sc.causes.careless / totalCauses)}</strong> falta de atenção → leia o comando duas vezes</span>
                </>
              )}
            </Card>
          </section>
        </div>
      </div>

      <section aria-labelledby="trend" className="flex flex-col gap-3">
        <Heading id="trend">Evolução nas últimas 8 semanas</Heading>
        <Card className="p-4">
          <div className="grid grid-cols-8 items-end gap-2" style={{ height: 150 }}>
            {weeks.map((w) => (
              <div key={w.start} className="flex h-full flex-col items-center justify-end gap-1">
                <span className="tabular text-[11px] font-semibold">{w.rate === null ? "" : pct(w.rate)}</span>
                <div className="w-full rounded-t-[4px] bg-brand-300" style={{ height: `${(w.rate ?? 0) * 100}px` }} />
                <span className="text-[10px] text-ink-3">{shortDate(w.start)}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {mockExams.length > 0 && (
        <section aria-labelledby="mocks" className="flex flex-col gap-3">
          <Heading id="mocks">Simulados</Heading>
          <Card className="divide-y divide-line">
            {mockExams.slice().reverse().map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                <span className="font-semibold">{m.title}</span>
                <span className="text-ink-2">{shortDate(toIsoDate(new Date(m.created_at)))} · <strong className="text-ink">{m.correct_count}/{m.total}</strong></span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
