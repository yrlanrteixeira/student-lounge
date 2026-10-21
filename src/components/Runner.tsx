"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDados } from "@/lib/dados/DadosProvider";
import { indicePorId, materiaPorId, nomeMateria, nomeTopico, pegadinhaPorId, rotuloAno } from "@/lib/conteudo";
import { formatarTempo } from "@/lib/datas";
import type { CausaErro, Confianca, Contexto, Questao } from "@/lib/tipos";
import { Aviso, Botao, BotaoLink, Carregando, Pilula, Tag, cx } from "./ui";
import { IconeFechar } from "./icones";

const LETRAS = ["A", "B", "C", "D", "E"];
const CAUSAS: { id: CausaErro; rotulo: string }[] = [
  { id: "nao_sabia", rotulo: "Não sabia o conteúdo" },
  { id: "confundi", rotulo: "Confundi com outro" },
  { id: "atencao", rotulo: "Falta de atenção" },
];

export async function buscarQuestoes(ids: string[]): Promise<Questao[]> {
  const partes: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) partes.push(ids.slice(i, i + 100));
  const res = await Promise.all(partes.map((p) => fetch(`/api/questoes?ids=${p.join(",")}`).then((r) => r.json() as Promise<Questao[]>)));
  const porId = new Map(res.flat().map((q) => [q.id, q]));
  return ids.map((id) => porId.get(id)).filter((q): q is Questao => Boolean(q));
}

interface Resultado {
  questao: Questao;
  alternativa: string;
  correta: boolean;
  respostaId: string;
}

export function Runner({ ids, contexto, titulo, subtitulo }: { ids: string[]; contexto: Contexto; titulo: string; subtitulo?: string }) {
  const { registrarResposta, definirCausa } = useDados();
  const [questoes, setQuestoes] = useState<Questao[] | null>(null);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [conf, setConf] = useState<Confianca | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [causa, setCausa] = useState<CausaErro | null>(null);
  const [historico, setHistorico] = useState<Resultado[]>([]);
  const [mostrarTexto, setMostrarTexto] = useState(true);
  const [segundos, setSegundos] = useState(0);
  const inicio = useRef(Date.now());
  const topo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    buscarQuestoes(ids).then((q) => vivo && setQuestoes(q));
    return () => {
      vivo = false;
    };
  }, [ids]);

  useEffect(() => {
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [i]);

  const q = questoes?.[i];
  const fim = questoes !== null && i >= questoes.length;

  const confirmar = useCallback(() => {
    if (!q || !sel || resultado) return;
    const idx = indicePorId[q.id];
    const r = registrarResposta({
      questao: idx ?? { id: q.id, ano: q.ano, materia: q.materia, topico: q.topico, pegadinhas: q.pegadinhas, dificuldade: q.dificuldade, status: q.status },
      alternativa: sel,
      gabarito: q.gabarito,
      confianca: conf,
      tempoSeg: (Date.now() - inicio.current) / 1000,
      contexto,
    });
    const res = { questao: q, alternativa: sel, correta: r.correta, respostaId: r.id };
    setResultado(res);
    setHistorico((h) => [...h, res]);
  }, [q, sel, resultado, conf, contexto, registrarResposta]);

  const proxima = useCallback(() => {
    setI((x) => x + 1);
    setSel(null);
    setConf(null);
    setResultado(null);
    setCausa(null);
    setSegundos(0);
    inicio.current = Date.now();
    topo.current?.scrollIntoView({ block: "start" });
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toUpperCase();
      if (!resultado && LETRAS.includes(k) && q?.alternativas[k] !== undefined) setSel(k);
      if (e.key === "Enter") {
        if (resultado) proxima();
        else confirmar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, resultado, confirmar, proxima]);

  if (!questoes) return <Carregando />;

  if (questoes.length === 0)
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">Nada para resolver aqui agora.</p>
        <p className="text-sm text-texto-2">Esta etapa já foi concluída ou não há questões com esse filtro.</p>
        <BotaoLink href="/">Voltar para Hoje</BotaoLink>
      </div>
    );

  if (fim) return <Resumo historico={historico} titulo={titulo} />;
  if (!q) return null;

  const letrasQ = LETRAS.filter((l) => q.alternativas[l] !== undefined);
  const errou = resultado && !resultado.correta;
  const pegadinhaPrincipal = q.pegadinhas.find((p) => p !== "sem_pegadinha");
  const textoLongo = (q.texto_base?.length ?? 0) > 600;

  return (
    <div className="min-h-dvh bg-fundo" ref={topo}>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-borda bg-cartao px-4 py-3 sm:px-8">
        <Link href="/" aria-label="Sair e voltar para Hoje" className="flex h-11 w-11 items-center justify-center rounded-cartao border border-borda text-texto-forte hover:bg-lateral">
          <IconeFechar />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">
            {titulo} · questão {i + 1} de {questoes.length}
          </span>
          {subtitulo && <span className="truncate text-xs text-texto-3">{subtitulo}</span>}
        </div>
        <div aria-hidden className="order-last grid w-full gap-1 sm:order-none sm:w-auto sm:min-w-40 sm:flex-[0_1_320px]" style={{ gridTemplateColumns: `repeat(${Math.min(questoes.length, 40)}, minmax(0, 1fr))` }}>
          {questoes.slice(0, 40).map((x, k) => {
            const h = historico[k];
            return <span key={x.id} className={cx("h-1.5 rounded", h ? (h.correta ? "bg-acerto" : "bg-erro") : k === i ? "bg-rosa-700" : "bg-borda")} />;
          })}
        </div>
        <span className="tabular text-sm font-semibold text-texto-forte" aria-label={`Tempo nesta questão: ${formatarTempo(segundos)}`}>
          {formatarTempo(segundos)}
        </span>
      </header>

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-6 px-4 pb-16 pt-6 sm:px-8">
        <article className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-cartao border border-borda bg-cartao p-5 sm:p-7">
          <div className="flex flex-wrap gap-2">
            <Pilula tom="rosa">{nomeMateria(q.materia)}</Pilula>
            <Pilula>{nomeTopico(q.topico)}</Pilula>
            <Pilula>Vunesp · TJSP {rotuloAno(q.ano)} · Q{q.numero}</Pilula>
            {q.status === "desatualizada" && <Tag tom="erro">DESATUALIZADA</Tag>}
          </div>

          {q.texto_base && (
            <div className="rounded-[10px] bg-lateral">
              <button type="button" onClick={() => setMostrarTexto((v) => !v)} aria-expanded={mostrarTexto} className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-texto-forte">
                Texto de apoio
                <span className="text-xs font-medium text-rosa-700">{mostrarTexto ? "Ocultar" : "Mostrar"}</span>
              </button>
              {mostrarTexto && (
                <div className={cx("whitespace-pre-line px-4 pb-4 text-[14px] leading-relaxed text-texto-forte", textoLongo && "max-h-[50vh] overflow-y-auto")}>{q.texto_base}</div>
              )}
            </div>
          )}

          {q.imagem && (
            <figure className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={q.imagem} alt={`Página da prova original com a figura da questão ${q.numero} de ${rotuloAno(q.ano)}`} className="max-h-[70vh] w-auto self-start rounded-[10px] border border-borda" />
              <figcaption className="text-xs text-texto-3">Recorte da prova original (a figura não vem no texto).</figcaption>
            </figure>
          )}

          <p className="q-stem text-base font-medium leading-relaxed sm:text-lg">{q.enunciado}</p>

          <div role="radiogroup" aria-label="Alternativas" className="flex flex-col gap-2.5">
            {letrasQ.map((l) => {
              const correta = l === q.gabarito;
              const marcada = sel === l;
              let estilo = "border border-borda bg-cartao hover:border-rosa-300";
              let badge = "bg-suave text-texto-forte";
              let tag: React.ReactNode = null;
              if (!resultado && marcada) {
                estilo = "border-2 border-rosa-700 bg-rosa-50";
                badge = "bg-rosa-700 text-white";
              }
              if (resultado) {
                if (correta) {
                  estilo = "border-2 border-acerto bg-acerto-fundo";
                  badge = "bg-acerto text-white";
                  tag = <span className="self-center text-xs font-bold text-acerto-700">Correta</span>;
                } else if (marcada) {
                  estilo = "border-2 border-erro bg-erro-fundo";
                  badge = "bg-erro text-white";
                  tag = <span className="self-center whitespace-nowrap text-xs font-bold text-erro">Sua resposta</span>;
                } else {
                  estilo = "border border-suave text-texto-3";
                }
              }
              return (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={marcada}
                  disabled={Boolean(resultado)}
                  onClick={() => setSel(l)}
                  className={cx("flex min-h-11 w-full items-start gap-3.5 rounded-cartao px-4 py-3.5 text-left transition-colors disabled:cursor-default", estilo)}
                >
                  <span className={cx("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-sm font-bold", badge)}>{l}</span>
                  <span className="flex-1 text-[15px] leading-relaxed">{q.alternativas[l] || <em className="text-texto-3">(alternativa em imagem — veja o recorte acima)</em>}</span>
                  {tag}
                </button>
              );
            })}
          </div>

          {!resultado && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="float-left mr-1.5 text-[13px] text-texto-2">Como você está?</legend>
                {(["certeza", "duvida"] as const).map((c) => (
                  <button key={c} type="button" aria-pressed={conf === c} onClick={() => setConf(conf === c ? null : c)} className={cx("min-h-9 rounded-full border px-3 text-[13px] font-semibold", conf === c ? "border-rosa-700 bg-rosa-50 text-rosa-700" : "border-borda-forte bg-cartao text-texto-forte")}>
                    {c === "certeza" ? "Tenho certeza" : "Na dúvida"}
                  </button>
                ))}
              </fieldset>
              <Botao tamanho="g" onClick={confirmar} disabled={!sel} className="w-full sm:w-auto">
                Confirmar resposta
              </Botao>
            </div>
          )}
        </article>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-4" aria-live="polite">
          {!resultado ? (
            <section className="hidden flex-col gap-2 rounded-cartao border border-dashed border-borda-forte bg-cartao p-6 sm:flex">
              <h2 className="text-base font-bold">Depois de responder</h2>
              <p className="text-sm leading-relaxed text-texto-2">Aqui aparecem o gabarito comentado, onde estava a pegadinha e o artigo da lei. Atalhos: teclas A–E e Enter.</p>
            </section>
          ) : (
            <>
              <section className={cx("flex flex-col gap-2 rounded-cartao border p-5", errou ? "border-erro-borda bg-erro-fundo text-[#7A271A]" : "border-acerto-borda bg-acerto-fundo text-[#074D31]")}>
                <span className="text-xl font-bold">{errou ? "Não foi dessa vez" : conf === "duvida" ? "Acertou — mas na dúvida" : "Você acertou"}</span>
                <span className="text-sm leading-relaxed">
                  Gabarito: <strong>{q.gabarito === "N" ? "anulada" : q.gabarito}</strong>. {q.explicacao}
                </span>
                {q.artigos && <span className="text-xs opacity-80">{q.artigos}</span>}
              </section>

              {pegadinhaPrincipal && q.pegadinha && (
                <section className="flex flex-col gap-2.5 rounded-cartao border border-borda bg-cartao p-5">
                  <div className="flex items-center gap-2">
                    <Tag tom="pegadinha">PEGADINHA</Tag>
                    <span className="text-sm font-bold">{pegadinhaPorId[pegadinhaPrincipal]?.nome}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{q.pegadinha}</p>
                </section>
              )}

              {Object.keys(q.distratores).length > 0 && (
                <section className="flex flex-col gap-2 rounded-cartao border border-borda bg-cartao p-5">
                  <h2 className="text-sm font-bold">Por que as outras estão erradas</h2>
                  {LETRAS.filter((l) => q.distratores[l]).map((l) => (
                    <p key={l} className="text-[13px] leading-relaxed text-texto-forte">
                      <strong>{l}</strong> · {q.distratores[l]}
                    </p>
                  ))}
                </section>
              )}

              {q.dica && <Aviso tom="rosa"><strong>Macete:</strong> {q.dica}</Aviso>}
              {q.status_nota && <Aviso tom={q.status === "ok" ? "pegadinha" : "erro"}>{q.status_nota}</Aviso>}

              {errou && (
                <section className="flex flex-col gap-3 rounded-cartao border border-borda bg-cartao p-5">
                  <h2 className="text-sm font-bold">Por que você errou?</h2>
                  <div className="flex flex-wrap gap-2">
                    {CAUSAS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={causa === c.id}
                        onClick={() => {
                          setCausa(c.id);
                          definirCausa(resultado.respostaId, c.id);
                        }}
                        className={cx("min-h-9 rounded-full border px-3 text-[13px] font-semibold", causa === c.id ? "border-rosa-700 bg-rosa-50 text-rosa-700" : "border-borda-forte bg-cartao text-texto-forte")}
                      >
                        {c.rotulo}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-texto-3">Esta questão volta para revisão amanhã e depois em 3, 7, 15 e 30 dias.</span>
                </section>
              )}

              <div className="flex gap-2.5">
                <BotaoLink href={`/edital/${q.topico}`} variante="secundario" tamanho="g" className="flex-1" target="_blank">
                  Ver no guia
                </BotaoLink>
                <Botao tamanho="g" onClick={proxima} className="flex-1">
                  {i + 1 >= questoes.length ? "Ver resultado" : "Próxima"}
                </Botao>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Resumo({ historico, titulo }: { historico: Resultado[]; titulo: string }) {
  const acertos = historico.filter((h) => h.correta).length;
  const porMateria = useMemo(() => {
    const m = new Map<string, { a: number; t: number }>();
    for (const h of historico) {
      const x = m.get(h.questao.materia) ?? { a: 0, t: 0 };
      x.t += 1;
      if (h.correta) x.a += 1;
      m.set(h.questao.materia, x);
    }
    return [...m.entries()];
  }, [historico]);
  const erros = historico.filter((h) => !h.correta);
  const t = historico.length ? acertos / historico.length : 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-wide text-rosa-700">{titulo.toUpperCase()} · CONCLUÍDO</span>
        <h1 className="text-2xl font-bold">
          {acertos} de {historico.length} certas ({Math.round(t * 100)}%)
        </h1>
        <p className="text-sm text-texto-2">{t >= 0.7 ? "Ótimo ritmo. Continue assim." : t >= 0.5 ? "Na linha do corte — os erros já foram para a revisão." : "Os erros já foram para a revisão. Leia o guia dos tópicos abaixo."}</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {porMateria.map(([m, x]) => (
          <div key={m} className="rounded-cartao border border-borda bg-cartao p-4">
            <span className="text-xs text-texto-3">{materiaPorId[m]?.nome}</span>
            <p className="text-xl font-bold">{x.a}/{x.t}</p>
          </div>
        ))}
      </div>
      {erros.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Para revisar</h2>
          <ul className="flex flex-col divide-y divide-borda rounded-cartao border border-borda bg-cartao">
            {erros.map((e) => (
              <li key={e.respostaId} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold">{nomeTopico(e.questao.topico)}</span>
                  <span className="text-xs text-texto-3">TJSP {rotuloAno(e.questao.ano)} · Q{e.questao.numero} · você marcou {e.alternativa}, era {e.questao.gabarito}</span>
                </span>
                <Link href={`/edital/${e.questao.topico}`} className="shrink-0 text-xs font-semibold text-rosa-700 hover:underline">Guia</Link>
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
