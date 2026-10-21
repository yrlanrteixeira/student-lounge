"use client";

import Link from "next/link";
import { useUserData } from "@/lib/data/UserDataProvider";
import { INDEX, examYears, yearLabel } from "@/lib/content";
import { shortDate, toIsoDate } from "@/lib/dates";
import { Card, Heading, Tag } from "@/components/ui";

export default function MockExams() {
  const { mockExams } = useUserData();
  const originals = examYears().map((year) => {
    const n = INDEX.filter((q) => q.year === year).length;
    return { year, n, currentFormat: n === 70 };
  });

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold">Simulados</h1>
        <p className="text-sm text-ink-2">Sem gabarito durante a prova. No fim, a nota por bloco comparada com o corte.</p>
      </header>

      <Link href="/simulados/formato-2027" className="flex flex-col gap-2 rounded-card border border-brand-700 bg-brand-50 p-5 ring-[3px] ring-brand-50 transition-colors hover:bg-brand-100">
        <Tag tone="brand-strong">RECOMENDADO</Tag>
        <span className="text-lg font-bold">Simulado no formato 2027</span>
        <span className="text-[13px] leading-relaxed text-ink-strong">70 questões com a mesma divisão do edital (16 de Português, 30 de Direito, 24 de Gerais), montadas com as questões que você menos viu. 4 horas de prova.</span>
      </Link>

      <section aria-labelledby="originals" className="flex flex-col gap-3.5">
        <Heading id="originals">Provas originais</Heading>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
          {originals.map((p) => (
            <Link key={p.year} href={`/simulados/${p.year}`} className="flex flex-col gap-1 rounded-card border border-line px-4 py-3.5 hover:bg-sidebar">
              <span className="flex items-center gap-2 text-sm font-semibold">
                TJSP {yearLabel(p.year)} {p.currentFormat && <Tag tone="success">Formato atual</Tag>}
              </span>
              <span className="text-xs text-ink-3">{p.n} questões, {p.currentFormat ? "já no formato atual (16 / 30 / 24)." : "formato antigo."}</span>
            </Link>
          ))}
        </div>
      </section>

      {mockExams.length > 0 && (
        <section aria-labelledby="history" className="flex flex-col gap-3.5">
          <Heading id="history">Seus resultados</Heading>
          <Card className="divide-y divide-line">
            {mockExams.slice().reverse().map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                <span className="font-semibold">{m.title}</span>
                <span className="text-ink-2">
                  {shortDate(toIsoDate(new Date(m.created_at)))} · <strong className="text-ink">{m.correct_count}/{m.total}</strong> · Port. {m.by_block.I?.correct ?? 0}/{m.by_block.I?.total ?? 0} · Direito {m.by_block.II?.correct ?? 0}/{m.by_block.II?.total ?? 0}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
