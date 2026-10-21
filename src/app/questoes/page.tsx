"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDados } from "@/lib/dados/DadosProvider";
import { INDICE, MATERIAS, TOPICOS, questaoTreinavel, rotuloAno } from "@/lib/conteudo";
import { placares, taxa } from "@/lib/estatisticas";
import { BotaoLink, Cartao, Carregando, Titulo, cx, pct } from "@/components/ui";

const ANOS = ["2017", "2018", "2021", "2023", "2024", "2024r", "2025"];
const FILTROS = [
  { id: "todas", rotulo: "Todas" },
  { id: "nao_respondidas", rotulo: "Não respondidas" },
  { id: "erradas", rotulo: "Que errei" },
];

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={ativo} onClick={onClick} className={cx("min-h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors", ativo ? "border-rosa-700 bg-rosa-50 text-rosa-700" : "border-borda-forte bg-cartao text-texto-forte hover:bg-lateral")}>
      {children}
    </button>
  );
}

export default function Questoes() {
  const { carregando, respostas } = useDados();
  const [materia, setMateria] = useState("");
  const [topico, setTopico] = useState("");
  const [anos, setAnos] = useState<string[]>([]);
  const [filtro, setFiltro] = useState("todas");
  const [n, setN] = useState(10);
  const pl = useMemo(() => placares(respostas), [respostas]);

  const respondidas = useMemo(() => new Set(respostas.map((r) => r.questao_id)), [respostas]);
  const ultimaErrada = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const r of respostas) m.set(r.questao_id, !r.correta);
    return m;
  }, [respostas]);

  const disponiveis = INDICE.filter(
    (q) =>
      questaoTreinavel(q) &&
      (!materia || q.materia === materia) &&
      (!topico || q.topico === topico) &&
      (!anos.length || anos.includes(q.ano)) &&
      (filtro !== "nao_respondidas" || !respondidas.has(q.id)) &&
      (filtro !== "erradas" || ultimaErrada.get(q.id))
  ).length;

  if (carregando) return <Carregando />;

  const qs = new URLSearchParams({ modo: "livre", n: String(n), filtro });
  if (materia) qs.set("materia", materia);
  if (topico) qs.set("topico", topico);
  if (anos.length) qs.set("anos", anos.join(","));

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold">Questões</h1>
        <p className="text-sm text-texto-2">{INDICE.length} questões reais da Vunesp (TJSP 2017 a 2025), todas comentadas.</p>
      </header>

      <Cartao className="flex flex-col gap-5 p-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold">Matéria</legend>
          <div className="flex flex-wrap gap-2">
            <Chip ativo={!materia} onClick={() => { setMateria(""); setTopico(""); }}>Todas</Chip>
            {MATERIAS.map((m) => (
              <Chip key={m.id} ativo={materia === m.id} onClick={() => { setMateria(m.id); setTopico(""); }}>{m.nome}</Chip>
            ))}
          </div>
        </fieldset>

        {materia && (
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Tópico
            <select value={topico} onChange={(e) => setTopico(e.target.value)} className="h-10 rounded-botao border border-borda-forte bg-cartao px-3 text-[13px] font-normal">
              <option value="">Todos os tópicos</option>
              {TOPICOS.filter((t) => t.materia === materia).map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </label>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold">Provas</legend>
          <div className="flex flex-wrap gap-2">
            {ANOS.map((a) => (
              <Chip key={a} ativo={anos.includes(a)} onClick={() => setAnos((x) => (x.includes(a) ? x.filter((y) => y !== a) : [...x, a]))}>{rotuloAno(a)}</Chip>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold">Quais</legend>
            <div className="flex flex-wrap gap-2">
              {FILTROS.map((f) => <Chip key={f.id} ativo={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.rotulo}</Chip>)}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold">Quantas</legend>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 20, 30].map((x) => <Chip key={x} ativo={n === x} onClick={() => setN(x)}>{x}</Chip>)}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda pt-4">
          <span className="text-[13px] text-texto-2">{disponiveis} questões com esses filtros</span>
          <BotaoLink href={`/praticar?${qs}`} tamanho="g" aria-disabled={disponiveis === 0} className={disponiveis === 0 ? "pointer-events-none opacity-50" : ""}>
            Começar {Math.min(n, disponiveis)} questões
          </BotaoLink>
        </div>
      </Cartao>

      <section aria-labelledby="por-materia" className="flex flex-col gap-3.5">
        <Titulo id="por-materia">Por matéria</Titulo>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
          {MATERIAS.map((m) => {
            const total = INDICE.filter((q) => q.materia === m.id && questaoTreinavel(q)).length;
            const feitas = INDICE.filter((q) => q.materia === m.id && respondidas.has(q.id)).length;
            const t = taxa(pl.porMateria.get(m.id), 1);
            return (
              <Link key={m.id} href={`/praticar?modo=livre&materia=${m.id}&n=10`} className="flex flex-col gap-1.5 rounded-cartao border border-borda px-4 py-3.5 transition-colors hover:bg-lateral">
                <span className="text-sm font-semibold">{m.nome}</span>
                <span className="text-xs text-texto-3">{feitas} de {total} feitas · acerto {pct(t)} · {m.questoes_2026} na prova</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
