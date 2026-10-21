"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDados } from "@/lib/dados/DadosProvider";
import { useMissao } from "@/lib/useMissao";
import { INDICE, nomeMateria, nomeTopico, pegadinhaPorId } from "@/lib/conteudo";
import { selecionar } from "@/lib/plano";
import { hoje, isoLocal } from "@/lib/datas";
import type { Contexto } from "@/lib/tipos";
import { Runner } from "@/components/Runner";
import { Carregando } from "@/components/ui";

interface Sessao {
  ids: string[];
  contexto: Contexto;
  titulo: string;
  subtitulo?: string;
}

function Praticar() {
  const params = useSearchParams();
  const { carregando, respostas } = useDados();
  const missao = useMissao();
  const [sessao, setSessao] = useState<Sessao | null>(null);

  useEffect(() => {
    if (carregando || sessao) return;
    const modo = params.get("modo") ?? "livre";
    const dia = hoje();
    const feitasHoje = (ctx: string) => new Set(respostas.filter((r) => r.contexto === ctx && isoLocal(new Date(r.created_at)) === dia).map((r) => r.questao_id));
    const n = Math.min(60, Math.max(1, Number(params.get("n") ?? 10)));
    const materia = params.get("materia") ?? "";
    const topico = params.get("topico") ?? "";
    const anos = (params.get("anos") ?? "").split(",").filter(Boolean);
    const filtro = params.get("filtro") ?? "todas";

    let s: Sessao;
    if (modo === "missao") {
      const p = missao.passos.find((x) => x.tipo === "bloco");
      const feitas = feitasHoje("missao");
      s = { ids: p && "ids" in p ? p.ids.filter((id) => !feitas.has(id)) : [], contexto: "missao", titulo: "Bloco de hoje", subtitulo: missao.rotulo };
    } else if (modo === "revisao") {
      const p = missao.passos.find((x) => x.tipo === "revisao");
      const feitas = feitasHoje("revisao");
      s = { ids: p && "ids" in p ? p.ids.filter((id) => !feitas.has(id)) : [], contexto: "revisao", titulo: "Revisão de erros", subtitulo: "Repetição espaçada: 1, 3, 7, 15 e 30 dias" };
    } else if (modo === "pegadinha") {
      const p = missao.passos.find((x) => x.tipo === "pegadinha");
      const feitas = feitasHoje("pegadinha");
      const nome = p && p.tipo === "pegadinha" ? pegadinhaPorId[p.pegadinha]?.nome : "";
      s = { ids: p && "ids" in p ? p.ids.filter((id) => !feitas.has(id)) : [], contexto: "pegadinha", titulo: "Pegadinha do dia", subtitulo: nome };
    } else if (modo === "erros") {
      const ultima = new Map<string, boolean>();
      for (const r of respostas) ultima.set(r.questao_id, r.correta);
      const ids = INDICE.filter((q) => ultima.get(q.id) === false && (!materia || q.materia === materia)).map((q) => q.id);
      s = { ids: ids.slice(0, n), contexto: "revisao", titulo: "Caderno de erros", subtitulo: materia ? nomeMateria(materia) : "Todas as matérias" };
    } else {
      const respondidas = new Set(respostas.map((r) => r.questao_id));
      const ultimaErrada = new Map<string, boolean>();
      for (const r of respostas) ultimaErrada.set(r.questao_id, !r.correta);
      const pool = INDICE.filter(
        (q) =>
          (!materia || q.materia === materia) &&
          (!topico || q.topico === topico) &&
          (!anos.length || anos.includes(q.ano)) &&
          (filtro !== "nao_respondidas" || !respondidas.has(q.id)) &&
          (filtro !== "erradas" || ultimaErrada.get(q.id))
      );
      const ids = selecionar({ pool, n, respostas, semente: `${Date.now()}`, foco: topico || undefined });
      s = {
        ids,
        contexto: topico ? "topico" : "livre",
        titulo: topico ? "Treino do tópico" : "Questões",
        subtitulo: topico ? nomeTopico(topico) : materia ? nomeMateria(materia) : "Todas as matérias",
      };
    }
    setSessao(s);
  }, [carregando, sessao, params, respostas, missao]);

  if (!sessao) return <Carregando />;
  return <Runner ids={sessao.ids} contexto={sessao.contexto} titulo={sessao.titulo} subtitulo={sessao.subtitulo} />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<Carregando />}>
      <Praticar />
    </Suspense>
  );
}
