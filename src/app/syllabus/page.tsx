"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BLOCKS, SUBJECTS, TOPICS, lawsOf } from "@/lib/content";
import { downloadFile, notebookSummary } from "@/lib/notebooklm";
import { TopicList } from "./TopicList";
import { cx } from "@/components/ui";

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function Syllabus() {
  return (
    <Suspense>
      <SyllabusContent />
    </Suspense>
  );
}

function SyllabusContent() {
  const params = useSearchParams();
  const search = params.get("q")?.trim();
  const [downloading, setDownloading] = useState(false);

  if (search) {
    const term = normalize(search);
    const found = TOPICS.filter((t) => normalize([t.name, t.syllabus_ref, t.how_tested, ...t.memorize, ...t.common_traps].join(" ")).includes(term));
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">“{search}”</h1>
          <p className="text-[15px] text-ink-2 sm:text-[17px]">Busca no edital: {found.length} tópicos encontrados. <Link href="/syllabus" className="font-semibold text-brand-700 hover:underline">Limpar busca</Link></p>
        </header>
        <TopicList topics={found} showSubject />
      </div>
    );
  }

  const subject = SUBJECTS.find((s) => s.id === params.get("subject")) ?? SUBJECTS[0];
  if (!subject) return <p className="text-sm text-ink-2">Nenhuma matéria cadastrada ainda.</p>;
  const topics = TOPICS.filter((t) => t.subject === subject.id);
  const laws = lawsOf(subject.id);

  const download = async () => {
    setDownloading(true);
    try {
      downloadFile(`tjsp-${subject.id}.md`, await notebookSummary(subject.id), "text/markdown;charset=utf-8");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">Edital mastigado</h1>
        <p className="text-[15px] text-ink-2 sm:text-[17px]">Edital 02/2026 da Vunesp, com 70 questões e redação. Cada tópico traz o que a banca cobra, o que decorar e as pegadinhas que se repetem.</p>
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <nav aria-label="Matérias" className="flex min-w-0 flex-[1_1_260px] flex-col gap-4 rounded-card border border-line p-3 lg:max-w-[300px]">
          {BLOCKS.map((b) => (
            <div key={b.id} className="flex flex-col gap-0.5">
              <span className="px-2.5 pb-1 text-[12px] font-semibold text-ink-3">
                Bloco {b.id} · {b.minimum ? `mínimo ${b.minimum} de ${b.questions}` : "classificatório"}
              </span>
              {SUBJECTS.filter((s) => s.block === b.id).map((s) => (
                <Link key={s.id} href={`/syllabus?subject=${s.id}`} aria-current={s.id === subject.id ? "page" : undefined} className={cx("flex justify-between rounded-button px-2.5 py-2 text-sm", s.id === subject.id ? "bg-brand-50 font-semibold text-brand-700" : "text-ink hover:bg-subtle")}>
                  <span>{s.name}</span>
                  <span className={s.id === subject.id ? "" : "text-ink-2"}>{s.exam_questions} q</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-card border border-line p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold">{subject.name}</h2>
              <span className="text-[13px] text-ink-2">{subject.exam_questions} questões em 2027 · {topics.reduce((sum, t) => sum + t.occurrences, 0)} no banco</span>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-strong">{subject.overview}</p>
            {laws.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                <span className="text-xs font-semibold text-ink-2">Lei seca oficial</span>
                <ul className="flex flex-col gap-1">
                  {laws.map((l) => (
                    <li key={l.url} className="text-[13px]">
                      <a href={l.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">{l.name}</a>
                      {l.excerpt && <span className="text-ink-3"> · {l.excerpt}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button type="button" onClick={download} disabled={downloading} className="self-start text-[13px] font-semibold text-brand-700 hover:underline disabled:text-disabled">
              {downloading ? "Gerando resumo…" : "Baixar resumo da matéria para o NotebookLM (.md)"}
            </button>
          </section>
          <TopicList topics={topics} />
        </div>
      </div>
    </div>
  );
}
