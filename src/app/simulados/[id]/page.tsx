"use client";

import { use, useEffect, useState } from "react";
import { useDados } from "@/lib/dados/DadosProvider";
import { INDICE, MATERIAS, questaoTreinavel, rotuloAno } from "@/lib/conteudo";
import { selecionar } from "@/lib/plano";
import { hoje } from "@/lib/datas";
import { Simulado } from "@/components/Simulado";
import { Carregando } from "@/components/ui";

export default function SimuladoPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { carregando, respostas } = useDados();
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (carregando || ids) return;
    if (id === "formato-2027") {
      const vistos = new Set(respostas.map((r) => r.questao_id));
      // Português: um bloco contínuo de 16 da prova menos vista (mantém os textos inteiros)
      const anos = ["2017", "2018", "2021", "2023", "2024", "2024r", "2025"];
      const anoPt = anos
        .map((a) => ({ a, vistos: INDICE.filter((q) => q.ano === a && q.materia === "portugues" && vistos.has(q.id)).length }))
        .sort((x, y) => x.vistos - y.vistos)[0].a;
      const pt = INDICE.filter((q) => q.ano === anoPt && q.materia === "portugues" && questaoTreinavel(q)).slice(0, 16).map((q) => q.id);
      const resto = MATERIAS.filter((m) => m.id !== "portugues").flatMap((m) =>
        selecionar({
          pool: INDICE.filter((q) => q.materia === m.id && (m.id !== "atualidades_pcd" || q.topico === "atu.pcd")),
          n: m.questoes_2026,
          respostas,
          semente: `sim:${hoje()}:${m.id}`,
        })
      );
      setIds([...pt, ...resto]);
    } else {
      setIds(INDICE.filter((q) => q.ano === id).map((q) => q.id));
    }
  }, [carregando, ids, id, respostas]);

  if (!ids) return <Carregando />;
  const titulo = id === "formato-2027" ? "Simulado formato 2027" : `Prova TJSP ${rotuloAno(id)}`;
  const minutos = ids.length > 70 ? 300 : 240;
  return <Simulado ids={ids} titulo={titulo} minutos={minutos} />;
}
