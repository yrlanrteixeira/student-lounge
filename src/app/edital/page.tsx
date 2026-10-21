import { GUIA } from "@/lib/conteudo-server";
import { BLOCOS, MATERIAS } from "@/lib/conteudo";
import { LEI_SECA } from "@/lib/leis";
import { EditalTopicos } from "./EditalTopicos";
import Link from "next/link";
import { cx } from "@/components/ui";

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default async function Edital({ searchParams }: { searchParams: Promise<{ materia?: string; q?: string }> }) {
  const { materia: mParam, q } = await searchParams;
  const busca = q?.trim();

  if (busca) {
    const termo = normalizar(busca);
    const achados = GUIA.flatMap((m) =>
      m.topicos
        .filter((t) => normalizar([t.nome, t.edital, t.como_cai, ...t.decorar, ...t.pegadinhas_recorrentes].join(" ")).includes(termo))
        .map((t) => ({ materia: m.materia, topico: t.topico, nome: t.nome, edital: t.edital, incidencia: t.incidencia, prioridade: t.prioridade, anos: t.anos }))
    );
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-rosa-700">BUSCA NO EDITAL</span>
          <h1 className="text-[22px] font-bold">“{busca}”</h1>
          <p className="text-sm text-texto-2">{achados.length} tópicos encontrados. <Link href="/edital" className="font-semibold text-rosa-700 hover:underline">Limpar busca</Link></p>
        </header>
        <EditalTopicos topicos={achados} mostrarMateria />
      </div>
    );
  }

  const materia = MATERIAS.find((m) => m.id === mParam) ?? MATERIAS[0];
  const guia = GUIA.find((g) => g.materia === materia.id)!;
  const topicos = guia.topicos.map((t) => ({ materia: materia.id, topico: t.topico, nome: t.nome, edital: t.edital, incidencia: t.incidencia, prioridade: t.prioridade, anos: t.anos }));
  const leis = LEI_SECA[materia.id] ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-rosa-700">EDITAL 02/2026 · VUNESP · 70 QUESTÕES + REDAÇÃO</span>
        <h1 className="text-[22px] font-bold">Edital mastigado</h1>
        <p className="text-sm text-texto-2">Cada tópico com o que a Vunesp cobra, o que decorar e as pegadinhas que se repetem.</p>
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <nav aria-label="Matérias" className="flex min-w-0 flex-[1_1_260px] flex-col gap-4 rounded-cartao border border-borda p-3 lg:max-w-[300px]">
          {BLOCOS.map((b) => (
            <div key={b.id} className="flex flex-col gap-0.5">
              <span className="px-2.5 pb-1 text-[11px] font-bold tracking-wide text-texto-2">
                BLOCO {b.id} · {b.minimo ? `mínimo ${b.minimo} de ${b.questoes}` : "classificatório"}
              </span>
              {MATERIAS.filter((m) => m.bloco === b.id).map((m) => (
                <Link key={m.id} href={`/edital?materia=${m.id}`} aria-current={m.id === materia.id ? "page" : undefined} className={cx("flex justify-between rounded-botao px-2.5 py-2 text-sm", m.id === materia.id ? "bg-rosa-50 font-semibold text-rosa-700" : "text-texto hover:bg-suave")}>
                  <span>{m.nome}</span>
                  <span className={m.id === materia.id ? "" : "text-texto-2"}>{m.questoes_2026} q</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-cartao border border-borda p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold">{materia.nome}</h2>
              <span className="text-[13px] text-texto-2">{materia.questoes_2026} questões em 2027 · {topicos.reduce((s, t) => s + t.incidencia, 0)} no banco</span>
            </div>
            <p className="text-[13px] leading-relaxed text-texto-forte">{guia.visao_geral}</p>
            {leis.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-borda pt-3">
                <span className="text-xs font-semibold text-texto-2">Lei seca oficial</span>
                <ul className="flex flex-col gap-1">
                  {leis.map((l) => (
                    <li key={l.url} className="text-[13px]">
                      <a href={l.url} target="_blank" rel="noreferrer" className="font-semibold text-rosa-700 hover:underline">{l.nome}</a>
                      {l.trecho && <span className="text-texto-3"> · {l.trecho}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a href={`/api/notebooklm/${materia.id}`} className="self-start text-[13px] font-semibold text-rosa-700 hover:underline">
              Baixar resumo da matéria para o NotebookLM (.md)
            </a>
          </section>
          <EditalTopicos topicos={topicos} />
        </div>
      </div>
    </div>
  );
}
