"use client";

import Link from "next/link";
import { useDados } from "@/lib/dados/DadosProvider";
import { dataCurta, isoLocal } from "@/lib/datas";
import { Cartao, Titulo, Tag } from "@/components/ui";

const PROVAS = [
  { id: "2025", titulo: "TJSP 2025 — prova original", desc: "70 questões, já no formato atual (16 / 30 / 24).", formatoAtual: true },
  { id: "2024", titulo: "TJSP 2024", desc: "100 questões, formato antigo." },
  { id: "2024r", titulo: "TJSP 2024 — reaplicação", desc: "100 questões, formato antigo." },
  { id: "2023", titulo: "TJSP 2023", desc: "100 questões, formato antigo." },
  { id: "2021", titulo: "TJSP 2021", desc: "100 questões, formato antigo." },
  { id: "2018", titulo: "TJSP 2018", desc: "100 questões, formato antigo." },
  { id: "2017", titulo: "TJSP 2017", desc: "100 questões, formato antigo." },
];

export default function Simulados() {
  const { simulados } = useDados();
  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold">Simulados</h1>
        <p className="text-sm text-texto-2">Sem gabarito durante a prova. No fim, a nota por bloco comparada com o corte.</p>
      </header>

      <Link href="/simulados/formato-2027" className="flex flex-col gap-2 rounded-cartao border border-rosa-700 bg-rosa-50 p-5 ring-[3px] ring-rosa-50 transition-colors hover:bg-rosa-100">
        <Tag tom="rosa-forte">RECOMENDADO</Tag>
        <span className="text-lg font-bold">Simulado no formato 2027</span>
        <span className="text-[13px] leading-relaxed text-texto-forte">70 questões com a mesma divisão do edital (16 de Português, 30 de Direito, 24 de Gerais), montadas com as questões que você menos viu. 4 horas de prova.</span>
      </Link>

      <section aria-labelledby="originais" className="flex flex-col gap-3.5">
        <Titulo id="originais">Provas originais</Titulo>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
          {PROVAS.map((p) => (
            <Link key={p.id} href={`/simulados/${p.id}`} className="flex flex-col gap-1 rounded-cartao border border-borda px-4 py-3.5 hover:bg-lateral">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {p.titulo} {p.formatoAtual && <Tag tom="acerto">Formato atual</Tag>}
              </span>
              <span className="text-xs text-texto-3">{p.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {simulados.length > 0 && (
        <section aria-labelledby="hist" className="flex flex-col gap-3.5">
          <Titulo id="hist">Seus resultados</Titulo>
          <Cartao className="divide-y divide-borda">
            {simulados.slice().reverse().map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                <span className="font-semibold">{s.titulo}</span>
                <span className="text-texto-2">
                  {dataCurta(isoLocal(new Date(s.created_at)))} · <strong className="text-texto">{s.acertos}/{s.total}</strong> · Port. {s.por_bloco.I?.acertos ?? 0}/{s.por_bloco.I?.total ?? 0} · Direito {s.por_bloco.II?.acertos ?? 0}/{s.por_bloco.II?.total ?? 0}
                </span>
              </div>
            ))}
          </Cartao>
        </section>
      )}
    </div>
  );
}
