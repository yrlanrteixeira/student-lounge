"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDados } from "@/lib/dados/DadosProvider";
import { useMissao } from "@/lib/useMissao";
import { BLOCOS, EDITAL, nomeMateria, nomeTopico, pegadinhaPorId, topicoPorId } from "@/lib/conteudo";
import { placares, statusBloco, taxa } from "@/lib/estatisticas";
import { CRONOGRAMA, DIAS_CURTOS, diaDeSimulado, passoConcluido, type Passo } from "@/lib/plano";
import { dataCurta, diaDaSemana, diferencaDias, hoje, isoLocal, mesCurto, paraData, quando, somarDias } from "@/lib/datas";
import { Barra, BotaoLink, Carregando, Tag, Titulo, cx, pct } from "@/components/ui";

const TONS_DIA = ["neutro", "rosa", "mel", "acerto", "lilas", "menta", "neutro"] as const;

function CartaoPasso({ passo, indice, atual }: { passo: Passo; indice: number; atual: boolean }) {
  const { perfil } = useDados();
  const feito = passoConcluido(passo);
  const rotulo = `ETAPA ${indice + 1}${feito ? " · CONCLUÍDA" : atual ? " · AGORA" : ""}`;
  let titulo = "";
  let meta = "";
  let progresso: number | null = null;
  let acao: React.ReactNode = null;

  switch (passo.tipo) {
    case "revisao":
      titulo = "Revisar erros vencidos";
      meta = passo.ids.length ? `${passo.ids.length} questões · repetição espaçada` : "Nada vencido hoje";
      progresso = passo.ids.length ? passo.feitas / passo.ids.length : 1;
      if (passo.ids.length && !feito) acao = <Link href="/praticar?modo=revisao" className="text-xs font-semibold text-rosa-700 hover:underline">Revisar agora →</Link>;
      break;
    case "topico": {
      titulo = nomeTopico(passo.topico);
      meta = `${nomeMateria(passo.materia)} · ${topicoPorId[passo.topico]?.edital ?? ""}`;
      progresso = passo.lido ? 1 : 0;
      const nb = perfil.notebooklm[passo.materia] || perfil.notebooklm.geral;
      acao = (
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <Link href={`/edital/${passo.topico}`} className="font-semibold text-rosa-700 hover:underline">Ler o guia →</Link>
          <a href={nb || "https://notebooklm.google.com"} target="_blank" rel="noreferrer" className="text-texto-2 hover:underline">Áudio no NotebookLM</a>
        </span>
      );
      break;
    }
    case "bloco":
      titulo = passo.titulo;
      meta = passo.composicao.length ? passo.composicao.map((c) => `${c.n} ${nomeMateria(c.materia)}`).join(" + ") : `${passo.ids.length} questões`;
      progresso = passo.ids.length ? passo.feitas / passo.ids.length : 0;
      acao = feito ? (
        <span className="text-xs font-semibold text-acerto">{passo.acertos} de {passo.ids.length} certas</span>
      ) : passo.ids.length ? (
        <Link href="/praticar?modo=missao" className="text-xs font-semibold text-rosa-700 hover:underline">{passo.feitas ? "Continuar bloco →" : "Começar bloco →"}</Link>
      ) : (
        <span className="text-xs text-texto-3">Sem erros na semana — aproveite para descansar.</span>
      );
      break;
    case "pegadinha":
      titulo = `Pegadinha do dia: ${pegadinhaPorId[passo.pegadinha]?.nome.toLowerCase()}`;
      meta = pegadinhaPorId[passo.pegadinha]?.desc ?? "";
      progresso = passo.feitas / passo.ids.length;
      if (!feito) acao = <Link href="/praticar?modo=pegadinha" className="text-xs font-semibold text-rosa-700 hover:underline">Ver 3 exemplos reais →</Link>;
      break;
    case "redacao":
      titulo = "Redação cronometrada";
      meta = "25 a 30 linhas em 1 hora. Mais de 20 linhas para a nota máxima; mínimo de 24 dos 40 pontos.";
      break;
    case "simulado":
      titulo = "Simulado completo";
      meta = "70 questões no formato 2027, com tempo de prova.";
      acao = <Link href="/simulados" className="text-xs font-semibold text-rosa-700 hover:underline">Escolher simulado →</Link>;
      break;
  }

  return (
    <div className={cx("flex flex-col gap-2.5 rounded-cartao border bg-cartao p-4", atual && !feito ? "border-rosa-700 ring-[3px] ring-rosa-50" : "border-borda")}>
      <span className={cx("text-[11px] font-semibold tracking-wide", feito ? "text-acerto" : atual ? "text-rosa-700" : "text-texto-3")}>{rotulo}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{titulo}</span>
        <span className="text-xs leading-snug text-texto-3">{meta}</span>
      </div>
      {progresso !== null && (
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <Barra valor={progresso} cor={feito ? "bg-acerto" : "bg-rosa-700"} />
          </div>
          <span className="tabular text-xs font-semibold">{Math.round(progresso * 100)}%</span>
        </div>
      )}
      {acao}
    </div>
  );
}

export default function Hoje() {
  const { carregando, respostas, perfil } = useDados();
  const missao = useMissao();
  const pl = useMemo(() => placares(respostas), [respostas]);

  const atividade = useMemo(() => {
    const grupos = new Map<string, { dia: string; contexto: string; total: number; acertos: number; ultima: string }>();
    for (const r of respostas) {
      const dia = isoLocal(new Date(r.created_at));
      const k = `${dia}:${r.contexto}`;
      const g = grupos.get(k) ?? { dia, contexto: r.contexto, total: 0, acertos: 0, ultima: r.created_at };
      g.total += 1;
      if (r.correta) g.acertos += 1;
      g.ultima = r.created_at;
      grupos.set(k, g);
    }
    return [...grupos.values()].sort((a, b) => b.ultima.localeCompare(a.ultima)).slice(0, 4);
  }, [respostas]);

  const semana = useMemo(() => {
    const dia = hoje();
    const ds = diaDaSemana(dia);
    const segunda = somarDias(dia, ds === 0 ? -6 : 1 - ds);
    return [1, 2, 3, 4, 5].map((d) => {
      const data = somarDias(segunda, d - 1);
      const doDia = respostas.filter((r) => isoLocal(new Date(r.created_at)) === data && r.contexto === "missao");
      return { d, data, feitas: doDia.length, acertos: doDia.filter((r) => r.correta).length, ehHoje: data === dia, passou: data < dia };
    });
  }, [respostas]);

  if (carregando) return <Carregando />;

  const atualIdx = missao.passos.findIndex((p) => !passoConcluido(p));
  const dia = hoje();
  const [abreInsc, fechaInsc] = EDITAL.inscricoes.split(" a ");
  const proximoDomingo = somarDias(dia, (7 - diaDaSemana(dia)) % 7 || 7);
  let domSimulado = proximoDomingo;
  for (let i = 0; i < 3 && !diaDeSimulado(perfil, domSimulado); i++) domSimulado = somarDias(domSimulado, 7);

  const datas = [
    dia < abreInsc
      ? { titulo: "Abertura das inscrições", sub: `Vunesp · até ${dataCurta(fechaInsc)}`, data: abreInsc }
      : dia <= fechaInsc
        ? { titulo: "Fim das inscrições", sub: "Não deixe para o último dia", data: fechaInsc }
        : null,
    { titulo: "Simulado completo", sub: "70 questões · tempo de prova", data: domSimulado },
    { titulo: "Prova objetiva + redação", sub: "Vunesp · TJSP Escrevente", data: perfil.data_prova },
  ].filter(Boolean) as { titulo: string; sub: string; data: string }[];

  const nomeContexto: Record<string, string> = { missao: "Bloco da missão", revisao: "Revisão de erros", topico: "Treino por tópico", pegadinha: "Pegadinha do dia", livre: "Questões livres", simulado: "Simulado" };

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-7">
        <section aria-labelledby="missao" className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 id="missao" className="text-lg font-semibold">Missão de hoje</h1>
            <span className="text-xs text-texto-3">
              {missao.concluidos} de {missao.passos.length} etapas · ~{missao.minutos >= 60 ? `${Math.floor(missao.minutos / 60)}h${String(missao.minutos % 60).padStart(2, "0")}` : `${missao.minutos} min`}
            </span>
          </div>
          <p className="-mt-2 text-[13px] text-texto-2">
            {DIAS_CURTOS[missao.diaSemana]}: {missao.rotulo}. Fase {missao.fase.numero} · {missao.fase.nome} — {missao.fase.descricao}
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
            {missao.passos.map((p, i) => (
              <CartaoPasso key={p.tipo} passo={p} indice={i} atual={i === atualIdx} />
            ))}
          </div>
        </section>

        <section aria-labelledby="blocos" className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <Titulo id="blocos">Termômetro dos blocos</Titulo>
            <Link href="/diagnostico" className="text-xs font-semibold text-rosa-700 hover:underline">Diagnóstico completo</Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
            {BLOCOS.map((b) => {
              const t = taxa(pl.porBloco.get(b.id), 1);
              const st = statusBloco(b.id, taxa(pl.porBloco.get(b.id), 10));
              const cor = b.minimo === 0 ? "bg-rosa-700" : st.tom === "acerto" ? "bg-acerto" : "bg-erro-500";
              return (
                <div key={b.id} className="flex flex-col gap-2 rounded-cartao border border-borda p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold">{b.id} · {b.nome}</span>
                    <Tag tom={st.tom === "neutro" ? "neutro" : st.tom}>{st.rotulo}</Tag>
                  </div>
                  <span className="tabular text-2xl font-bold">{pct(t)}</span>
                  <Barra valor={t ?? 0} cor={cor} corte={b.minimo ? 0.5 : undefined} />
                  <span className="text-xs text-texto-3">{b.minimo ? `corte: ${b.minimo} de ${b.questoes}` : "sem nota mínima"} · {pl.porBloco.get(b.id)?.total ?? 0} respondidas</span>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="semana" className="flex flex-col gap-3.5">
          <Titulo id="semana">Matérias da semana</Titulo>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3.5">
            {semana.map((s) => (
              <Link key={s.d} href={`/edital?materia=${CRONOGRAMA[s.d].materias[0]}`} className={cx("flex flex-col gap-1.5 rounded-cartao border px-4 py-3.5 transition-colors hover:bg-lateral", s.ehHoje ? "border-rosa-200" : "border-borda")}>
                <span className="text-sm font-semibold">{CRONOGRAMA[s.d].rotulo}</span>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs text-texto-3">
                    {s.feitas ? `${s.ehHoje ? "Hoje" : "Feito"} · ${s.acertos} de ${s.feitas} certas` : s.ehHoje ? "Hoje · em andamento" : s.passou ? "Não feito" : dataCurta(s.data)}
                  </span>
                  <Tag tom={TONS_DIA[s.d]}>{DIAS_CURTOS[s.d]}</Tag>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-6">
        <div className="flex items-center justify-between gap-3 rounded-cartao bg-rosa-100 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-rosa-900">{missao.fase.diasRestantes} dias para a prova</span>
            <span className="text-xs text-rosa-800">
              Fase {missao.fase.numero} — {missao.fase.nome}
              <br />
              semana {Math.min(missao.fase.semana, missao.fase.totalSemanas)} de {missao.fase.totalSemanas}
            </span>
          </div>
          <div className="flex h-[52px] w-[52px] flex-col items-center justify-center rounded-[14px] bg-cartao text-rosa-800">
            <span className="text-[10px] font-semibold">{mesCurto(perfil.data_prova)}</span>
            <span className="text-xl font-bold leading-none">{paraData(perfil.data_prova).getDate()}</span>
          </div>
        </div>

        <section aria-labelledby="ativ" className="flex flex-col gap-2">
          <Titulo id="ativ">Atividade recente</Titulo>
          {atividade.length === 0 ? (
            <p className="text-[13px] text-texto-3">Ainda não há respostas. Comece pela missão de hoje.</p>
          ) : (
            <ul className="flex flex-col">
              {atividade.map((a, i) => {
                const t = a.acertos / a.total;
                return (
                  <li key={`${a.dia}${a.contexto}`} className={cx("flex gap-3 py-2.5", i < atividade.length - 1 && "border-b border-borda")}>
                    <span aria-hidden className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", t >= 0.7 ? "bg-acerto" : t >= 0.5 ? "bg-lilas-500" : "bg-rosa-700")} />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold">{nomeContexto[a.contexto] ?? a.contexto}: {a.acertos}/{a.total}</span>
                      <span className="text-xs text-texto-3">{quando(a.ultima)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="datas" className="flex flex-col gap-3">
          <Titulo id="datas">Próximas datas</Titulo>
          {datas.map((d) => {
            const faltam = diferencaDias(dia, d.data);
            return (
              <div key={d.titulo} className="flex flex-col gap-1.5 rounded-[10px] border border-borda px-3.5 py-3">
                <span className="text-[13px] font-semibold">{d.titulo}</span>
                <span className="text-xs text-texto-3">{d.sub}</span>
                <span className="flex justify-between text-xs">
                  <span className="text-texto-forte">{dataCurta(d.data)}</span>
                  <span className={cx("font-semibold", faltam <= 10 ? "text-[#D92D20]" : "text-acerto")}>{faltam === 0 ? "hoje" : `em ${faltam} dias`}</span>
                </span>
              </div>
            );
          })}
        </section>
        <BotaoLink href="/questoes" variante="secundario" className="w-full">
          Treinar questões livres
        </BotaoLink>
      </aside>
    </div>
  );
}
