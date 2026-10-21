"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDados } from "@/lib/dados/DadosProvider";
import { BLOCOS, indicePorId, materiaPorId, nomeMateria, nomeTopico, rotuloAno } from "@/lib/conteudo";
import { formatarTempo } from "@/lib/datas";
import type { Questao } from "@/lib/tipos";
import { buscarQuestoes } from "./Runner";
import { Botao, BotaoLink, Carregando, Pilula, cx } from "./ui";
import { IconeFechar } from "./icones";

const LETRAS = ["A", "B", "C", "D", "E"];

export function Simulado({ ids, titulo, minutos }: { ids: string[]; titulo: string; minutos: number }) {
  const { registrarResposta, salvarSimulado } = useDados();
  const [questoes, setQuestoes] = useState<Questao[] | null>(null);
  const [i, setI] = useState(0);
  const [marcadas, setMarcadas] = useState<Record<string, string>>({});
  const [restante, setRestante] = useState(minutos * 60);
  const [finalizado, setFinalizado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const inicio = useRef(Date.now());

  useEffect(() => {
    buscarQuestoes(ids).then(setQuestoes);
  }, [ids]);

  useEffect(() => {
    if (finalizado) return;
    const t = setInterval(() => setRestante(Math.max(0, minutos * 60 - Math.floor((Date.now() - inicio.current) / 1000))), 1000);
    return () => clearInterval(t);
  }, [finalizado, minutos]);

  const finalizar = () => {
    if (!questoes || finalizado) return;
    const duracao = Math.floor((Date.now() - inicio.current) / 1000);
    const porBloco: Record<string, { acertos: number; total: number }> = {};
    let acertos = 0;
    for (const q of questoes) {
      const bloco = materiaPorId[q.materia]?.bloco ?? "III";
      porBloco[bloco] ??= { acertos: 0, total: 0 };
      porBloco[bloco].total += 1;
      const anulada = q.gabarito === "N";
      const marc = marcadas[q.id];
      const certo = anulada || marc === q.gabarito;
      if (certo) {
        acertos += 1;
        porBloco[bloco].acertos += 1;
      }
      if (!anulada && marc) {
        registrarResposta({ questao: indicePorId[q.id], alternativa: marc, gabarito: q.gabarito, confianca: null, tempoSeg: duracao / questoes.length, contexto: "simulado" });
      }
    }
    salvarSimulado({ titulo, total: questoes.length, acertos, por_bloco: porBloco, duracao_seg: duracao });
    setFinalizado(true);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (restante === 0 && !finalizado && questoes) finalizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante]);

  if (!questoes) return <Carregando />;
  if (finalizado) return <ResultadoSimulado questoes={questoes} marcadas={marcadas} titulo={titulo} duracao={Math.floor((Date.now() - inicio.current) / 1000)} />;

  const q = questoes[i];
  const respondidas = Object.keys(marcadas).length;

  return (
    <div className="min-h-dvh bg-fundo">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-borda bg-cartao px-4 py-3 sm:px-8">
        <Link href="/simulados" aria-label="Sair do simulado" className="flex h-11 w-11 items-center justify-center rounded-cartao border border-borda text-texto-forte hover:bg-lateral">
          <IconeFechar />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">{titulo}</span>
          <span className="text-xs text-texto-3">{respondidas} de {questoes.length} respondidas</span>
        </div>
        <span className={cx("tabular text-sm font-bold", restante < 900 ? "text-erro" : "text-texto-forte")} aria-label={`Tempo restante ${formatarTempo(restante)}`}>
          {formatarTempo(restante)}
        </span>
        <Botao variante="secundario" onClick={() => setConfirmando(true)}>Finalizar</Botao>
      </header>

      {confirmando && (
        <div role="dialog" aria-modal="true" aria-labelledby="conf-tit" className="fixed inset-0 z-30 flex items-center justify-center bg-texto/40 p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-moldura bg-cartao p-6">
            <h2 id="conf-tit" className="text-lg font-bold">Finalizar o simulado?</h2>
            <p className="text-sm text-texto-2">{questoes.length - respondidas > 0 ? `Ainda faltam ${questoes.length - respondidas} questões em branco.` : "Todas as questões foram respondidas."}</p>
            <div className="flex gap-2">
              <Botao variante="secundario" className="flex-1" onClick={() => setConfirmando(false)}>Continuar</Botao>
              <Botao className="flex-1" onClick={finalizar}>Finalizar</Botao>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-6 px-4 pb-16 pt-6 sm:px-8">
        <article className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-cartao border border-borda bg-cartao p-5 sm:p-7">
          <div className="flex flex-wrap gap-2">
            <Pilula tom="rosa">Questão {i + 1}</Pilula>
            <Pilula>{nomeMateria(q.materia)}</Pilula>
          </div>
          {q.texto_base && <div className="max-h-[45vh] overflow-y-auto whitespace-pre-line rounded-[10px] bg-lateral p-4 text-[14px] leading-relaxed text-texto-forte">{q.texto_base}</div>}
          {q.imagem && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.imagem} alt={`Página da prova original da questão ${q.numero}`} className="max-h-[70vh] w-auto self-start rounded-[10px] border border-borda" />
          )}
          <p className="text-base font-medium leading-relaxed sm:text-lg">{q.enunciado}</p>
          <div role="radiogroup" aria-label="Alternativas" className="flex flex-col gap-2.5">
            {LETRAS.filter((l) => q.alternativas[l] !== undefined).map((l) => {
              const on = marcadas[q.id] === l;
              return (
                <button key={l} type="button" role="radio" aria-checked={on} onClick={() => setMarcadas((m) => ({ ...m, [q.id]: l }))} className={cx("flex min-h-11 items-start gap-3.5 rounded-cartao px-4 py-3.5 text-left", on ? "border-2 border-rosa-700 bg-rosa-50" : "border border-borda hover:border-rosa-300")}>
                  <span className={cx("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-sm font-bold", on ? "bg-rosa-700 text-white" : "bg-suave text-texto-forte")}>{l}</span>
                  <span className="flex-1 text-[15px] leading-relaxed">{q.alternativas[l]}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-between gap-3 pt-2">
            <Botao variante="secundario" tamanho="g" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</Botao>
            {i < questoes.length - 1 ? (
              <Botao tamanho="g" onClick={() => { setI(i + 1); window.scrollTo({ top: 0 }); }}>Próxima</Botao>
            ) : (
              <Botao tamanho="g" onClick={() => setConfirmando(true)}>Finalizar</Botao>
            )}
          </div>
        </article>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-cartao border border-borda bg-cartao p-4">
          <h2 className="text-sm font-bold">Folha de respostas</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1.5">
            {questoes.map((x, k) => (
              <button key={x.id} type="button" onClick={() => setI(k)} aria-label={`Questão ${k + 1}${marcadas[x.id] ? `, marcada ${marcadas[x.id]}` : ", em branco"}`} aria-current={k === i ? "true" : undefined} className={cx("h-9 rounded-botao text-xs font-semibold", k === i ? "bg-rosa-700 text-white" : marcadas[x.id] ? "bg-rosa-100 text-rosa-800" : "bg-suave text-texto-2")}>
                {k + 1}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ResultadoSimulado({ questoes, marcadas, titulo, duracao }: { questoes: Questao[]; marcadas: Record<string, string>; titulo: string; duracao: number }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const porBloco = useMemo(() => {
    const r: Record<string, { a: number; t: number }> = {};
    for (const q of questoes) {
      const b = materiaPorId[q.materia]?.bloco ?? "III";
      r[b] ??= { a: 0, t: 0 };
      r[b].t += 1;
      if (q.gabarito === "N" || marcadas[q.id] === q.gabarito) r[b].a += 1;
    }
    return r;
  }, [questoes, marcadas]);
  const total = Object.values(porBloco).reduce((s, b) => s + b.a, 0);
  const erros = questoes.filter((q) => q.gabarito !== "N" && marcadas[q.id] !== q.gabarito);
  const passou = BLOCOS.every((b) => !b.minimo || (porBloco[b.id] && porBloco[b.id].a / porBloco[b.id].t >= 0.5));

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-wide text-rosa-700">{titulo.toUpperCase()} · RESULTADO</span>
        <h1 className="text-3xl font-bold">{total} de {questoes.length}</h1>
        <p className={cx("text-sm font-semibold", passou ? "text-acerto" : "text-erro")}>{passou ? "Passou nos dois blocos eliminatórios." : "Ficou abaixo do corte em algum bloco eliminatório."} · {formatarTempo(duracao)} de prova</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {BLOCOS.map((b) => {
          const x = porBloco[b.id];
          if (!x) return null;
          const ok = !b.minimo || x.a / x.t >= 0.5;
          return (
            <div key={b.id} className={cx("flex flex-col gap-1 rounded-cartao border p-4", ok ? "border-borda bg-cartao" : "border-erro-borda bg-erro-fundo")}>
              <span className="text-xs text-texto-2">Bloco {b.id} · {b.nome}</span>
              <span className="text-2xl font-bold">{x.a}/{x.t}</span>
              <span className="text-xs text-texto-3">{b.minimo ? `mínimo 50% (${Math.ceil(x.t / 2)})` : "classificatório"}</span>
            </div>
          );
        })}
      </div>
      {erros.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Erros e em branco ({erros.length}) — já foram para a revisão</h2>
          <ul className="flex flex-col divide-y divide-borda rounded-cartao border border-borda bg-cartao">
            {erros.map((q) => (
              <li key={q.id} className="flex flex-col">
                <button type="button" aria-expanded={aberta === q.id} onClick={() => setAberta(aberta === q.id ? null : q.id)} className="flex items-center justify-between gap-3 px-4 py-3 text-left">
                  <span className="flex flex-col">
                    <span className="text-[13px] font-semibold">Q{questoes.indexOf(q) + 1} · {nomeTopico(q.topico)}</span>
                    <span className="text-xs text-texto-3">TJSP {rotuloAno(q.ano)} · você: {marcadas[q.id] ?? "em branco"} · gabarito: {q.gabarito}</span>
                  </span>
                  <span className="text-xs font-semibold text-rosa-700">{aberta === q.id ? "Fechar" : "Ver"}</span>
                </button>
                {aberta === q.id && (
                  <div className="flex flex-col gap-2 px-4 pb-4 text-[13px] leading-relaxed">
                    <p className="font-medium">{q.enunciado}</p>
                    <p><strong>{q.gabarito})</strong> {q.alternativas[q.gabarito]}</p>
                    <p className="text-texto-forte">{q.explicacao}</p>
                    {q.pegadinha && <p className="text-pegadinha">Pegadinha: {q.pegadinha}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        <BotaoLink href="/" tamanho="g">Voltar para Hoje</BotaoLink>
        <BotaoLink href="/diagnostico" variante="secundario" tamanho="g">Ver diagnóstico</BotaoLink>
      </div>
    </div>
  );
}
