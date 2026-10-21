"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useContent } from "@/lib/data/ContentProvider";
import { useUserData } from "@/lib/data/UserDataProvider";
import { dueReviews } from "@/lib/stats";
import { longDate, today } from "@/lib/dates";
import { DiagnosisIcon, QuestionsIcon, ReviewIcon, SyllabusIcon, TodayIcon, Logo } from "./icons";
import { cx } from "./ui";

interface NavItem {
  href: string;
  label: string;
  short: string;
  Icon?: React.ComponentType<{ className?: string }>;
  counter?: boolean;
}

const STUDY: NavItem[] = [
  { href: "/", label: "Hoje", short: "Hoje", Icon: TodayIcon },
  { href: "/questions", label: "Questões", short: "Questões", Icon: QuestionsIcon },
  { href: "/review", label: "Revisão de erros", short: "Revisão", Icon: ReviewIcon, counter: true },
  { href: "/mock-exams", label: "Simulados", short: "Simulados" },
  { href: "/diagnosis", label: "Diagnóstico", short: "Diagnóstico", Icon: DiagnosisIcon },
];
const MATERIAL: NavItem[] = [{ href: "/syllabus", label: "Edital mastigado", short: "Edital", Icon: SyllabusIcon }];
const ACCOUNT: NavItem[] = [{ href: "/settings", label: "Configurações", short: "Ajustes" }];
const ADMIN: NavItem[] = [{ href: "/admin", label: "Administração", short: "Admin" }];
const PHONE = [STUDY[0], STUDY[1], STUDY[2], STUDY[4], MATERIAL[0]];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, email, reviews, error } = useUserData();
  const { isAdmin } = useContent();
  const account = isAdmin ? [...ACCOUNT, ...ADMIN] : ACCOUNT;
  const [search, setSearch] = useState("");
  const due = useMemo(() => dueReviews(reviews).length, [reviews]);

  const frameless = pathname.startsWith("/practice") || pathname.startsWith("/login") || /^\/mock-exams\/.+/.test(pathname);
  if (frameless) return <>{children}</>;

  const name = profile.name || email?.split("@")[0] || "estudante";

  const sidebarItem = (i: NavItem) => {
    const on = isActive(pathname, i.href);
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={on ? "page" : undefined}
        className={cx(
          "flex items-center gap-2.5 rounded-button px-2.5 py-2 text-[13px] transition-colors",
          on ? "border border-line bg-surface font-semibold text-ink shadow-xs" : "border border-transparent font-medium text-ink-2 hover:bg-subtle hover:text-ink"
        )}
      >
        {i.label}
        {i.counter && due > 0 && (
          <span className="ml-auto rounded-tag border border-line-strong px-1.5 text-[11px] font-semibold text-ink-strong">{due}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-dvh lg:p-6">
      <div className="mx-auto flex min-h-dvh max-w-[1360px] flex-col overflow-hidden bg-surface lg:min-h-[calc(100dvh-48px)] lg:flex-row lg:rounded-frame lg:border lg:border-line lg:shadow-frame">
        {/* Sidebar (desktop) */}
        <nav aria-label="Navegação principal" className="hidden w-[244px] shrink-0 flex-col gap-5 border-r border-line bg-sidebar px-4 py-5 lg:flex">
          <Link href="/" className="flex items-center gap-2.5 px-1.5">
            <Logo />
            <span className="text-base font-bold">Rumo ao TJSP</span>
          </Link>
          <div className="flex items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-[13px] font-bold text-brand-700">{name[0]?.toUpperCase()}</span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-semibold capitalize">{name}</span>
              <span className="text-xs text-honey">Escrevente · Vunesp</span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-ink-3">ESTUDO</span>
            {STUDY.map(sidebarItem)}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-ink-3">MATERIAL</span>
            {MATERIAL.map(sidebarItem)}
            <a href={profile.notebooklm.geral || "https://notebooklm.google.com"} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-button border border-transparent px-2.5 py-2 text-[13px] font-medium text-ink-2 hover:bg-subtle hover:text-ink">
              Áudios (NotebookLM) <span className="sr-only">(abre em nova aba)</span>
            </a>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-ink-3">CONTA</span>
            {account.map(sidebarItem)}
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top menu (tablet) */}
          <nav aria-label="Navegação" className="hidden items-center gap-3 overflow-x-auto border-b border-line bg-sidebar px-4 py-2.5 sm:flex lg:hidden">
            <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Rumo ao TJSP — início">
              <Logo />
            </Link>
            {[...STUDY, ...MATERIAL, ...account].map((i) => {
              const on = isActive(pathname, i.href);
              return (
                <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={cx("shrink-0 rounded-button px-2.5 py-2 text-[13px] whitespace-nowrap", on ? "border border-line bg-surface font-semibold shadow-xs" : "font-medium text-ink-2")}>
                  {i.label}
                  {i.counter && due > 0 ? ` (${due})` : ""}
                </Link>
              );
            })}
          </nav>

          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-7 sm:py-4">
            <div className="flex flex-col">
              <span className="text-xs text-ink-3">Olá,</span>
              <span className="text-[15px] font-semibold">
                <span className="capitalize">{name}</span>
                <span className="hidden sm:inline"> · {longDate(today())}</span>
              </span>
            </div>
            <form
              role="search"
              className="hidden h-[38px] w-60 items-center gap-2 rounded-button border border-line pl-3 pr-2 sm:flex"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/syllabus?q=${encodeURIComponent(search)}`);
              }}
            >
              <label htmlFor="search" className="sr-only">Buscar no edital</label>
              <input id="search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar artigo, tópico…" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-3" />
            </form>
          </header>

          {error && (
            <div role="alert" className="border-b border-danger-line bg-danger-bg px-4 py-2 text-[13px] text-danger sm:px-7">{error}</div>
          )}

          <main className="flex-1 px-4 pb-28 pt-5 sm:px-7 sm:pb-10 sm:pt-6">{children}</main>

          {/* Bottom tab bar (phone) */}
          <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 sm:hidden">
            {PHONE.map((i) => {
              const on = isActive(pathname, i.href);
              const Icon = i.Icon!;
              return (
                <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={cx("relative flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px]", on ? "font-bold text-brand-700" : "font-semibold text-ink-3")}>
                  <Icon />
                  {i.short}
                  {i.counter && due > 0 && <span className="absolute right-3 top-0 rounded-full bg-brand-700 px-1.5 text-[10px] font-bold text-white">{due}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
