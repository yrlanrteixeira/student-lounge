"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useUserData } from "@/lib/data/UserDataProvider";
import { SUBJECTS, indexById } from "@/lib/content";
import { dueReviews } from "@/lib/stats";
import { addDays, shortDate, today } from "@/lib/dates";
import { ButtonLink, Card, EmptyState, Heading, Loading } from "@/components/ui";

export default function Review() {
  const { loading, reviews, answers } = useUserData();
  const day = today();
  const due = useMemo(() => dueReviews(reviews, day), [reviews, day]);
  const upcoming = useMemo(
    () =>
      Array.from({ length: 7 }, (_, k) => {
        const d = addDays(day, k + 1);
        return { d, n: reviews.filter((r) => r.due_date === d).length };
      }),
    [reviews, day]
  );
  const mistakeBook = useMemo(() => {
    const last = new Map<string, boolean>();
    for (const a of answers) last.set(a.question_id, a.correct);
    const bySubject = new Map<string, number>();
    for (const [id, ok] of last) {
      if (ok) continue;
      const s = indexById[id]?.subject;
      if (s) bySubject.set(s, (bySubject.get(s) ?? 0) + 1);
    }
    return bySubject;
  }, [answers]);
  const finished = reviews.filter((r) => r.due_date === null).length;

  if (loading) return <Loading />;
  const maxUpcoming = Math.max(1, ...upcoming.map((u) => u.n));

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">Revisão de erros</h1>
        <p className="text-[15px] text-ink-2 sm:text-[17px]">Cada erro volta depois de 1, 3, 7, 15 e 30 dias. Acertou as cinco vezes, saiu da fila.</p>
      </header>

      <div className="flex flex-wrap gap-6">
        <Card className="flex flex-[2_1_320px] flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-ink-2">Para revisar hoje</span>
            <span className="text-4xl font-bold">{due.length}</span>
          </div>
          {due.length ? (
            <ButtonLink href="/practice?mode=review" size="l" className="self-start">Revisar agora</ButtonLink>
          ) : (
            <EmptyState title="Nenhum erro para revisar hoje">Os próximos aparecem nos dias abaixo.</EmptyState>
          )}
          <span className="text-xs text-ink-3">{reviews.filter((r) => r.due_date).length} na fila · {finished} já dominadas</span>
        </Card>

        <Card className="flex flex-[3_1_360px] flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold">Próximos 7 dias</h2>
          <div className="grid grid-cols-7 items-end gap-2" style={{ height: 120 }}>
            {upcoming.map((u) => (
              <div key={u.d} className="flex h-full flex-col items-center justify-end gap-1">
                <span className="text-xs font-semibold">{u.n || ""}</span>
                <div className="w-full rounded-t-[4px] bg-brand-300" style={{ height: `${(u.n / maxUpcoming) * 80}px`, minHeight: u.n ? 4 : 0 }} />
                <span className="text-[11px] text-ink-3">{shortDate(u.d)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <section aria-labelledby="mistake-notebook" className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <Heading id="mistake-notebook">Caderno de erros</Heading>
          <p className="text-[13px] text-ink-2">Questões cuja última resposta foi errada. Treine quando quiser, fora da fila.</p>
        </div>
        {mistakeBook.size === 0 ? (
          <EmptyState title="Caderno vazio">Quando errar uma questão, ela aparece aqui.</EmptyState>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
            {SUBJECTS.filter((s) => mistakeBook.get(s.id)).map((s) => (
              <Link key={s.id} href={`/practice?mode=mistakes&subject=${s.id}&n=20`} className="flex flex-col gap-1 rounded-card border border-line px-4 py-3.5 hover:bg-sidebar">
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="text-xs text-ink-3">{mistakeBook.get(s.id)} questões para refazer</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
