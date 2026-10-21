"use client";

import { useEffect, useState } from "react";
import { useDados } from "@/lib/dados/DadosProvider";
import { MATERIAS } from "@/lib/conteudo";
import { exportarLocal, importarLocal } from "@/lib/dados/repo";
import type { Perfil } from "@/lib/tipos";
import { Aviso, Botao, Cartao, Carregando, Titulo } from "@/components/ui";

const campo = "h-10 w-full rounded-botao border border-borda-forte bg-cartao px-3 text-[13px] outline-none focus:border-rosa-700 focus:ring-4 focus:ring-rosa-100";

export default function Configuracoes() {
  const { carregando, perfil, salvarPerfil, modo, email, sair } = useDados();
  const [p, setP] = useState<Perfil>(perfil);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => setP(perfil), [perfil]);
  if (carregando) return <Carregando />;

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    await salvarPerfil(p);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  };

  return (
    <form onSubmit={salvar} className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold">Configurações</h1>
        <p className="text-sm text-texto-2">{modo === "nuvem" ? `Conectada como ${email}. O progresso fica salvo na nuvem.` : "Modo local: o progresso fica só neste navegador. Configure o Supabase para sincronizar entre aparelhos."}</p>
      </header>

      <Cartao className="flex flex-col gap-4 p-5">
        <Titulo>Você e a prova</Titulo>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Nome
          <input className={campo} value={p.nome} onChange={(e) => setP({ ...p, nome: e.target.value })} placeholder="Como quer ser chamada" />
        </label>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Data da prova
            <input type="date" className={campo} value={p.data_prova} onChange={(e) => setP({ ...p, data_prova: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Início do cronograma (uma segunda-feira)
            <input type="date" className={campo} value={p.inicio} onChange={(e) => setP({ ...p, inicio: e.target.value })} />
          </label>
        </div>
      </Cartao>

      <Cartao className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <Titulo>Cadernos do NotebookLM</Titulo>
          <p className="text-[13px] text-texto-2">
            Crie um caderno por matéria no NotebookLM, suba o resumo baixado em “Edital mastigado” e cole o link aqui. Os botões “Áudio no NotebookLM” abrem o caderno certo.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Caderno geral
          <input type="url" className={campo} placeholder="https://notebooklm.google.com/notebook/…" value={p.notebooklm.geral ?? ""} onChange={(e) => setP({ ...p, notebooklm: { ...p.notebooklm, geral: e.target.value } })} />
        </label>
        {MATERIAS.map((m) => (
          <label key={m.id} className="flex flex-col gap-1.5 text-[13px] font-semibold">
            {m.nome}
            <input type="url" className={campo} placeholder="https://notebooklm.google.com/notebook/…" value={p.notebooklm[m.id] ?? ""} onChange={(e) => setP({ ...p, notebooklm: { ...p.notebooklm, [m.id]: e.target.value } })} />
          </label>
        ))}
      </Cartao>

      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" tamanho="g">Salvar</Botao>
        {salvo && <span role="status" className="text-[13px] font-semibold text-acerto">Salvo.</span>}
      </div>

      {modo === "local" ? (
        <Cartao className="flex flex-col gap-3 p-5">
          <Titulo>Backup do progresso</Titulo>
          <Aviso tom="pegadinha">No modo local, limpar os dados do navegador apaga o progresso. Baixe um backup de vez em quando.</Aviso>
          <div className="flex flex-wrap gap-2">
            <Botao
              variante="secundario"
              onClick={() => {
                const blob = new Blob([exportarLocal()], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `rumo-tjsp-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
              }}
            >
              Baixar backup
            </Botao>
            <label className="inline-flex min-h-10 cursor-pointer items-center rounded-botao border border-borda-forte px-4 text-[13px] font-semibold text-texto-forte hover:bg-lateral">
              Restaurar backup
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  importarLocal(await f.text());
                  window.location.reload();
                }}
              />
            </label>
          </div>
        </Cartao>
      ) : (
        <Botao variante="secundario" className="self-start" onClick={sair}>Sair da conta</Botao>
      )}
    </form>
  );
}
