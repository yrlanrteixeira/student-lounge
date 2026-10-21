"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useDados } from "@/lib/dados/DadosProvider";
import { revisoesVencidas } from "@/lib/estatisticas";
import { dataPorExtenso, hoje } from "@/lib/datas";
import { IconeDiagnostico, IconeEdital, IconeHoje, IconeQuestoes, IconeRevisao, Logo } from "./icones";
import { cx } from "./ui";

const ESTUDO = [
  { href: "/", rotulo: "Hoje", curto: "Hoje", Icone: IconeHoje },
  { href: "/questoes", rotulo: "Questões", curto: "Questões", Icone: IconeQuestoes },
  { href: "/revisao", rotulo: "Revisão de erros", curto: "Revisão", Icone: IconeRevisao, contador: true },
  { href: "/simulados", rotulo: "Simulados", curto: "Simulados" },
  { href: "/diagnostico", rotulo: "Diagnóstico", curto: "Diagnóstico", Icone: IconeDiagnostico },
];
const MATERIAL = [{ href: "/edital", rotulo: "Edital mastigado", curto: "Edital", Icone: IconeEdital }];
const CONTA = [{ href: "/configuracoes", rotulo: "Configurações", curto: "Ajustes" }];
const CELULAR = [ESTUDO[0], ESTUDO[1], ESTUDO[2], ESTUDO[4], MATERIAL[0]];

function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { perfil, email, revisoes, modo, erro } = useDados();
  const [busca, setBusca] = useState("");
  const vencidas = useMemo(() => revisoesVencidas(revisoes).length, [revisoes]);

  const semMoldura = pathname.startsWith("/praticar") || pathname.startsWith("/login") || /^\/simulados\/.+/.test(pathname);
  if (semMoldura) return <>{children}</>;

  const nome = perfil.nome || email?.split("@")[0] || "estudante";

  const itemLateral = (i: (typeof ESTUDO)[number] | (typeof MATERIAL)[number] | (typeof CONTA)[number]) => {
    const on = ativo(pathname, i.href);
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={on ? "page" : undefined}
        className={cx(
          "flex items-center gap-2.5 rounded-botao px-2.5 py-2 text-[13px] transition-colors",
          on ? "border border-borda bg-cartao font-semibold text-texto shadow-xs" : "border border-transparent font-medium text-texto-2 hover:bg-suave hover:text-texto"
        )}
      >
        {i.rotulo}
        {"contador" in i && i.contador && vencidas > 0 && (
          <span className="ml-auto rounded-tag border border-borda-forte px-1.5 text-[11px] font-semibold text-texto-forte">{vencidas}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-dvh lg:p-6">
      <div className="mx-auto flex min-h-dvh max-w-[1360px] flex-col overflow-hidden bg-cartao lg:min-h-[calc(100dvh-48px)] lg:flex-row lg:rounded-moldura lg:border lg:border-borda lg:shadow-moldura">
        {/* Menu lateral (desktop) */}
        <nav aria-label="Navegação principal" className="hidden w-[244px] shrink-0 flex-col gap-5 border-r border-borda bg-lateral px-4 py-5 lg:flex">
          <Link href="/" className="flex items-center gap-2.5 px-1.5">
            <Logo />
            <span className="text-base font-bold">Rumo ao TJSP</span>
          </Link>
          <div className="flex items-center gap-2.5 rounded-[10px] border border-borda bg-cartao px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rosa-100 text-[13px] font-bold text-rosa-700">{nome[0]?.toUpperCase()}</span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-semibold capitalize">{nome}</span>
              <span className="text-xs text-mel">Escrevente · Vunesp</span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-texto-3">ESTUDO</span>
            {ESTUDO.map(itemLateral)}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-texto-3">MATERIAL</span>
            {MATERIAL.map(itemLateral)}
            <a href={perfil.notebooklm.geral || "https://notebooklm.google.com"} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-botao border border-transparent px-2.5 py-2 text-[13px] font-medium text-texto-2 hover:bg-suave hover:text-texto">
              Áudios (NotebookLM) <span className="sr-only">(abre em nova aba)</span>
            </a>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-texto-3">CONTA</span>
            {CONTA.map(itemLateral)}
          </div>
          {modo === "local" && (
            <p className="mt-auto rounded-[10px] bg-mel-fundo px-3 py-2 text-xs leading-snug text-mel">Modo local: o progresso fica só neste navegador.</p>
          )}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Menu no topo (tablet) */}
          <nav aria-label="Navegação" className="hidden items-center gap-3 overflow-x-auto border-b border-borda bg-lateral px-4 py-2.5 sm:flex lg:hidden">
            <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Rumo ao TJSP — início">
              <Logo />
            </Link>
            {[...ESTUDO, ...MATERIAL, ...CONTA].map((i) => {
              const on = ativo(pathname, i.href);
              return (
                <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={cx("shrink-0 rounded-botao px-2.5 py-2 text-[13px] whitespace-nowrap", on ? "border border-borda bg-cartao font-semibold shadow-xs" : "font-medium text-texto-2")}>
                  {i.rotulo}
                  {"contador" in i && i.contador && vencidas > 0 ? ` (${vencidas})` : ""}
                </Link>
              );
            })}
          </nav>

          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-borda px-4 py-3 sm:px-7 sm:py-4">
            <div className="flex flex-col">
              <span className="text-xs text-texto-3">Olá,</span>
              <span className="text-[15px] font-semibold">
                <span className="capitalize">{nome}</span>
                <span className="hidden sm:inline"> · {dataPorExtenso(hoje())}</span>
              </span>
            </div>
            <form
              role="search"
              className="hidden h-[38px] w-60 items-center gap-2 rounded-botao border border-borda pl-3 pr-2 sm:flex"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/edital?q=${encodeURIComponent(busca)}`);
              }}
            >
              <label htmlFor="busca" className="sr-only">Buscar no edital</label>
              <input id="busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar artigo, tópico…" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-texto-3" />
            </form>
          </header>

          {erro && (
            <div role="alert" className="border-b border-erro-borda bg-erro-fundo px-4 py-2 text-[13px] text-erro sm:px-7">{erro}</div>
          )}

          <main className="flex-1 px-4 pb-28 pt-5 sm:px-7 sm:pb-10 sm:pt-6">{children}</main>

          {/* Barra inferior (celular) */}
          <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-borda bg-cartao px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 sm:hidden">
            {CELULAR.map((i) => {
              const on = ativo(pathname, i.href);
              const Icone = i.Icone!;
              return (
                <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={cx("relative flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px]", on ? "font-bold text-rosa-700" : "font-semibold text-texto-3")}>
                  <Icone />
                  {i.curto}
                  {"contador" in i && i.contador && vencidas > 0 && <span className="absolute right-3 top-0 rounded-full bg-rosa-700 px-1.5 text-[10px] font-bold text-white">{vencidas}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
