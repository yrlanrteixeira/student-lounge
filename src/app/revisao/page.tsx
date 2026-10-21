"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDados } from "@/lib/dados/DadosProvider";
import { MATERIAS, indicePorId } from "@/lib/conteudo";
import { revisoesVencidas } from "@/lib/estatisticas";
import { dataCurta, hoje, somarDias } from "@/lib/datas";
import { BotaoLink, Cartao, Carregando, Titulo, Vazio } from "@/components/ui";

export default function Revisao() {
  const { carregando, revisoes, respostas } = useDados();
  const dia = hoje();
  const vencidas = useMemo(() => revisoesVencidas(revisoes, dia), [revisoes, dia]);
  const proximos = useMemo(
    () =>
      Array.from({ length: 7 }, (_, k) => {
        const d = somarDias(dia, k + 1);
        return { d, n: revisoes.filter((r) => r.proxima === d).length };
      }),
    [revisoes, dia]
  );
  const caderno = useMemo(() => {
    const ultima = new Map<string, boolean>();
    for (const r of respostas) ultima.set(r.questao_id, r.correta);
    const porMateria = new Map<string, number>();
    for (const [id, ok] of ultima) {
      if (ok) continue;
      const m = indicePorId[id]?.materia;
      if (m) porMateria.set(m, (porMateria.get(m) ?? 0) + 1);
    }
    return porMateria;
  }, [respostas]);
  const concluidas = revisoes.filter((r) => r.proxima === null).length;

  if (carregando) return <Carregando />;
  const maxProx = Math.max(1, ...proximos.map((p) => p.n));

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold">Revisão de erros</h1>
        <p className="text-sm text-texto-2">Cada erro volta depois de 1, 3, 7, 15 e 30 dias. Acertou as cinco vezes, saiu da fila.</p>
      </header>

      <div className="flex flex-wrap gap-6">
        <Cartao className="flex flex-[2_1_320px] flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-texto-2">Para revisar hoje</span>
            <span className="text-4xl font-bold">{vencidas.length}</span>
          </div>
          {vencidas.length ? (
            <BotaoLink href="/praticar?modo=revisao" tamanho="g" className="self-start">Revisar agora</BotaoLink>
          ) : (
            <Vazio titulo="Nenhum erro para revisar hoje">Os próximos aparecem nos dias abaixo.</Vazio>
          )}
          <span className="text-xs text-texto-3">{revisoes.filter((r) => r.proxima).length} na fila · {concluidas} já dominadas</span>
        </Cartao>

        <Cartao className="flex flex-[3_1_360px] flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold">Próximos 7 dias</h2>
          <div className="grid grid-cols-7 items-end gap-2" style={{ height: 120 }}>
            {proximos.map((p) => (
              <div key={p.d} className="flex h-full flex-col items-center justify-end gap-1">
                <span className="text-xs font-semibold">{p.n || ""}</span>
                <div className="w-full rounded-t-[4px] bg-rosa-300" style={{ height: `${(p.n / maxProx) * 80}px`, minHeight: p.n ? 4 : 0 }} />
                <span className="text-[11px] text-texto-3">{dataCurta(p.d)}</span>
              </div>
            ))}
          </div>
        </Cartao>
      </div>

      <section aria-labelledby="caderno" className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <Titulo id="caderno">Caderno de erros</Titulo>
          <p className="text-[13px] text-texto-2">Questões cuja última resposta foi errada. Treine quando quiser, fora da fila.</p>
        </div>
        {caderno.size === 0 ? (
          <Vazio titulo="Caderno vazio">Quando errar uma questão, ela aparece aqui.</Vazio>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
            {MATERIAS.filter((m) => caderno.get(m.id)).map((m) => (
              <Link key={m.id} href={`/praticar?modo=erros&materia=${m.id}&n=20`} className="flex flex-col gap-1 rounded-cartao border border-borda px-4 py-3.5 hover:bg-lateral">
                <span className="text-sm font-semibold">{m.nome}</span>
                <span className="text-xs text-texto-3">{caderno.get(m.id)} questões para refazer</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
