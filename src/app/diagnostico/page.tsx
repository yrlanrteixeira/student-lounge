"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDados } from "@/lib/dados/DadosProvider";
import { BLOCOS, MATERIAS, TOPICOS, nomeMateria, nomeTopico } from "@/lib/conteudo";
import { notaProjetada, pegadinhasQueMaisErra, placares, prioridades, taxa } from "@/lib/estatisticas";
import { GUIA_RESUMO } from "@/lib/plano";
import { dataCurta, isoLocal, somarDias, hoje, diaDaSemana } from "@/lib/datas";
import { Barra, Cartao, Carregando, Pilula, Titulo, Vazio, cx, pct } from "@/components/ui";

function corCelula(t: number | null) {
  if (t === null) return "bg-suave text-texto-2";
  if (t < 0.45) return "bg-pegadinha text-white";
  if (t < 0.65) return "bg-[#FDBA74] text-texto";
  if (t < 0.8) return "bg-rosa-300 text-texto";
  return "bg-rosa-700 text-white";
}

export default function Diagnostico() {
  const { carregando, respostas, revisoes, simulados } = useDados();
  const pl = useMemo(() => placares(respostas), [respostas]);
  const prio = useMemo(() => prioridades(pl.porTopico, GUIA_RESUMO), [pl]);
  const pegs = useMemo(() => pegadinhasQueMaisErra(pl.porPegadinha).slice(0, 5), [pl]);
  const nota = notaProjetada(pl.porMateria);

  const semanas = useMemo(() => {
    const dia = hoje();
    const ds = diaDaSemana(dia);
    const segunda = somarDias(dia, ds === 0 ? -6 : 1 - ds);
    return Array.from({ length: 8 }, (_, k) => {
      const ini = somarDias(segunda, -7 * (7 - k));
      const fim = somarDias(ini, 6);
      const rs = respostas.filter((r) => {
        const d = isoLocal(new Date(r.created_at));
        return d >= ini && d <= fim;
      });
      return { ini, total: rs.length, taxa: rs.length ? rs.filter((r) => r.correta).length / rs.length : null };
    });
  }, [respostas]);

  if (carregando) return <Carregando />;

  if (respostas.length < 10)
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-[22px] font-bold">Diagnóstico</h1>
        <Vazio titulo="Ainda há poucas respostas">Responda pelo menos 10 questões para o diagnóstico começar a aparecer. Ele melhora a cada bloco.</Vazio>
      </div>
    );

  const falsaCerteza = pl.certeza.total ? 1 - pl.certeza.acertos / pl.certeza.total : null;
  const recuperados = revisoes.length ? revisoes.filter((r) => r.etapa >= 1).length / revisoes.length : null;
  const totalCausas = Object.values(pl.causas).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold">Diagnóstico</h1>
        <p className="text-sm text-texto-2">Onde você está, o que derruba sua nota e o que estudar primeiro.</p>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Cartao className="flex flex-col gap-1 p-4">
          <span className="text-[13px] text-texto-2">Nota projetada</span>
          <span className="tabular text-3xl font-bold">{nota ?? "—"}<span className="text-base font-semibold text-texto-3"> / 70</span></span>
          <span className="text-xs text-texto-3">{nota === null ? "precisa de mais matérias respondidas" : "pelo seu acerto em cada matéria"}</span>
        </Cartao>
        <Cartao className="flex flex-col gap-1 p-4">
          <span className="text-[13px] text-texto-2">Acerto geral</span>
          <span className="tabular text-3xl font-bold">{pct(taxa(pl.geral))}</span>
          <span className="text-xs text-texto-3">{pl.geral.total} questões respondidas</span>
        </Cartao>
        <Cartao className="flex flex-col gap-1 p-4">
          <span className="text-[13px] text-texto-2">Acerto quando “tenho certeza”</span>
          <span className="tabular text-3xl font-bold">{pct(taxa(pl.certeza))}</span>
          <span className={cx("text-xs", falsaCerteza && falsaCerteza > 0.15 ? "font-semibold text-pegadinha" : "text-texto-3")}>
            {falsaCerteza === null ? "marque a confiança ao responder" : `${pct(falsaCerteza)} de falsa certeza`}
          </span>
        </Cartao>
        <Cartao className="flex flex-col gap-1 p-4">
          <span className="text-[13px] text-texto-2">Erros recuperados</span>
          <span className="tabular text-3xl font-bold">{pct(recuperados)}</span>
          <span className="text-xs text-texto-3">acertou na revisão espaçada</span>
        </Cartao>
      </div>

      <section aria-labelledby="blocos" className="flex flex-col gap-3">
        <Titulo id="blocos">Blocos e matérias</Titulo>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {BLOCOS.map((b) => {
            const tb = taxa(pl.porBloco.get(b.id));
            return (
              <Cartao key={b.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">Bloco {b.id} · {b.nome}</span>
                  <span className={cx("tabular text-sm font-bold", b.minimo && tb !== null && tb < 0.55 ? "text-erro" : "")}>{pct(tb)}</span>
                </div>
                {MATERIAS.filter((m) => m.bloco === b.id).map((m) => {
                  const t = taxa(pl.porMateria.get(m.id));
                  return (
                    <div key={m.id} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span>{m.nome} <span className="text-texto-3">· {m.questoes_2026} q</span></span>
                        <span className="tabular font-semibold">{pct(t)}</span>
                      </div>
                      <Barra valor={t ?? 0} cor={t !== null && t < 0.5 ? "bg-erro-500" : "bg-rosa-700"} corte={b.minimo ? 0.5 : undefined} />
                    </div>
                  );
                })}
              </Cartao>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="prio" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Titulo id="prio">Prioridades de estudo</Titulo>
          <span className="text-[13px] text-texto-3">Quanto o tópico cai na Vunesp × peso no edital × quanto você ainda erra.</span>
        </div>
        <Cartao className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-texto-2">
                <th scope="col" className="px-4 py-3 font-semibold">#</th>
                <th scope="col" className="px-2 py-3 font-semibold">Tópico</th>
                <th scope="col" className="px-2 py-3 font-semibold">Caiu</th>
                <th scope="col" className="px-2 py-3 font-semibold">Seu acerto</th>
                <th scope="col" className="px-2 py-3 font-semibold">Prioridade</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Ação</span></th>
              </tr>
            </thead>
            <tbody>
              {prio.slice(0, 8).map((l, k) => (
                <tr key={l.topico} className="border-t border-suave">
                  <td className="px-4 py-3 font-bold text-texto-3">{k + 1}</td>
                  <td className="px-2 py-3">
                    <Link href={`/edital/${l.topico}`} className="font-semibold hover:underline">{nomeTopico(l.topico)}</Link>
                    <div className="text-xs text-texto-3">{nomeMateria(l.materia)}</div>
                  </td>
                  <td className="px-2 py-3 text-[13px]">{l.incidencia}× em {l.anos} provas</td>
                  <td className={cx("tabular px-2 py-3 font-bold", l.acerto !== null && l.acerto < 0.5 ? "text-pegadinha" : "")}>{l.acerto === null ? "—" : pct(l.acerto)}</td>
                  <td className="px-2 py-3"><Pilula tom={l.nivel === "alta" ? "rosa-forte" : l.nivel === "media" ? "rosa" : "neutro"}>{l.nivel === "alta" ? "Alta" : l.nivel === "media" ? "Média" : "Baixa"}</Pilula></td>
                  <td className="px-4 py-3 text-right"><Link href={`/praticar?modo=livre&topico=${l.topico}&materia=${l.materia}&n=10`} className="text-[13px] font-semibold text-rosa-700 hover:underline">Treinar 10</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      </section>

      <div className="flex flex-wrap items-stretch gap-6">
        <section aria-labelledby="mapa" className="flex min-w-0 flex-[999_1_520px] flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Titulo id="mapa">Mapa por tópico</Titulo>
            <span aria-hidden className="flex flex-wrap items-center gap-1.5 text-xs text-texto-2">
              <span className="h-3.5 w-3.5 rounded-[4px] bg-pegadinha" />&lt;45%
              <span className="ml-1.5 h-3.5 w-3.5 rounded-[4px] bg-[#FDBA74]" />45–64%
              <span className="ml-1.5 h-3.5 w-3.5 rounded-[4px] bg-rosa-300" />65–79%
              <span className="ml-1.5 h-3.5 w-3.5 rounded-[4px] bg-rosa-700" />80%+
            </span>
          </div>
          <Cartao className="flex flex-col gap-3 p-4">
            {MATERIAS.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="w-40 shrink-0 text-[13px] font-semibold">{m.nome}</span>
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {TOPICOS.filter((t) => t.materia === m.id).map((t) => {
                    const p = pl.porTopico.get(t.id);
                    const tx = taxa(p);
                    return (
                      <Link key={t.id} href={`/edital/${t.id}`} title={t.nome} className={cx("rounded-botao px-2 py-1 text-xs font-semibold", corCelula(tx))}>
                        {t.curto} {tx === null ? "" : pct(tx)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </Cartao>
        </section>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
          <section aria-labelledby="peg" className="flex flex-col gap-3">
            <Titulo id="peg">Pegadinhas em que você mais cai</Titulo>
            <Cartao className="flex flex-col gap-3 p-4">
              {pegs.length === 0 ? (
                <span className="text-[13px] text-texto-3">Aparece depois de algumas respostas com pegadinha.</span>
              ) : (
                pegs.map((p) => (
                  <div key={p.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[13px]"><span>{p.nome}</span><strong className="tabular">{pct(p.taxaErro)}</strong></div>
                    <Barra valor={p.taxaErro ?? 0} cor={(p.taxaErro ?? 0) >= 0.35 ? "bg-pegadinha" : "bg-[#FDBA74]"} />
                  </div>
                ))
              )}
              <span className="text-xs text-texto-3">% das vezes que você errou quando essa armadilha apareceu</span>
            </Cartao>
          </section>

          <section aria-labelledby="causa" className="flex flex-col gap-3">
            <Titulo id="causa">Por que você erra</Titulo>
            <Cartao className="flex flex-col gap-2 p-4 text-[13px]">
              {totalCausas === 0 ? (
                <span className="text-texto-3">Marque o motivo depois de cada erro para ver este quadro.</span>
              ) : (
                <>
                  <span><strong>{pct(pl.causas.nao_sabia / totalCausas)}</strong> não sabia o conteúdo → leia o guia do tópico</span>
                  <span><strong>{pct(pl.causas.confundi / totalCausas)}</strong> confundiu institutos → veja o “Não confunda”</span>
                  <span><strong>{pct(pl.causas.atencao / totalCausas)}</strong> falta de atenção → leia o comando duas vezes</span>
                </>
              )}
            </Cartao>
          </section>
        </div>
      </div>

      <section aria-labelledby="evol" className="flex flex-col gap-3">
        <Titulo id="evol">Evolução nas últimas 8 semanas</Titulo>
        <Cartao className="p-4">
          <div className="grid grid-cols-8 items-end gap-2" style={{ height: 150 }}>
            {semanas.map((s) => (
              <div key={s.ini} className="flex h-full flex-col items-center justify-end gap-1">
                <span className="tabular text-[11px] font-semibold">{s.taxa === null ? "" : pct(s.taxa)}</span>
                <div className="w-full rounded-t-[4px] bg-rosa-300" style={{ height: `${(s.taxa ?? 0) * 100}px` }} />
                <span className="text-[10px] text-texto-3">{dataCurta(s.ini)}</span>
              </div>
            ))}
          </div>
        </Cartao>
      </section>

      {simulados.length > 0 && (
        <section aria-labelledby="sims" className="flex flex-col gap-3">
          <Titulo id="sims">Simulados</Titulo>
          <Cartao className="divide-y divide-borda">
            {simulados.slice().reverse().map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                <span className="font-semibold">{s.titulo}</span>
                <span className="text-texto-2">{dataCurta(isoLocal(new Date(s.created_at)))} · <strong className="text-texto">{s.acertos}/{s.total}</strong></span>
              </div>
            ))}
          </Cartao>
        </section>
      )}
    </div>
  );
}
