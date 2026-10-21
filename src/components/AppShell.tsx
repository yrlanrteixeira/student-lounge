"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useContent } from "@/lib/data/ContentProvider";
import { useUserData } from "@/lib/data/UserDataProvider";
import { dueReviews } from "@/lib/stats";
import { longDate, today } from "@/lib/dates";
import { DiagnosisIcon, QuestionsIcon, ReviewIcon, SearchIcon, SyllabusIcon, TodayIcon, Logo } from "./icons";
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

// Translucent "material" used by the top bar and the phone tab bar.
const GLASS = "bg-surface/75 backdrop-blur-xl backdrop-saturate-150";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="px-3 pb-1 text-[12px] font-semibold text-ink-3">{children}</span>;
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
          "flex items-center gap-2.5 rounded-[8px] px-3 py-[7px] text-[14px] transition-colors",
          on ? "bg-line/80 font-semibold text-ink" : "text-ink-strong hover:bg-line/50"
        )}
      >
        {i.label}
        {i.counter && due > 0 && (
          <span className="ml-auto min-w-5 rounded-pill bg-brand-700 px-1.5 text-center text-[11px] font-semibold leading-5 text-white">{due}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-dvh bg-surface">
      {/* Sidebar (desktop) */}
      <nav aria-label="Navegação principal" className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-sidebar px-3 py-5 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-3">
          <Logo />
          <span className="text-[17px] font-semibold tracking-tight">Rumo ao TJSP</span>
        </Link>
        <div className="flex items-center gap-3 px-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-[14px] font-semibold text-white">{name[0]?.toUpperCase()}</span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-semibold capitalize">{name}</span>
            <span className="text-[12px] text-ink-2">Escrevente · Vunesp</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <SectionLabel>Estudo</SectionLabel>
          {STUDY.map(sidebarItem)}
        </div>
        <div className="flex flex-col gap-0.5">
          <SectionLabel>Material</SectionLabel>
          {MATERIAL.map(sidebarItem)}
          <a href={profile.notebooklm.geral || "https://notebooklm.google.com"} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-[8px] px-3 py-[7px] text-[14px] text-ink-strong transition-colors hover:bg-line/50">
            Áudios (NotebookLM) <span aria-hidden className="text-ink-3">↗</span>
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </div>
        <div className="flex flex-col gap-0.5">
          <SectionLabel>Conta</SectionLabel>
          {account.map(sidebarItem)}
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className={cx("sticky top-0 z-20 border-b border-line/80", GLASS)}>
          {/* Top menu (tablet) */}
          <nav aria-label="Navegação" className="hidden items-center gap-1 overflow-x-auto border-b border-line/80 px-4 py-2 sm:flex lg:hidden">
            <Link href="/" className="mr-2 flex shrink-0 items-center" aria-label="Rumo ao TJSP, início">
              <Logo className="h-7 w-7 text-ink" />
            </Link>
            {[...STUDY, ...MATERIAL, ...account].map((i) => {
              const on = isActive(pathname, i.href);
              return (
                <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={cx("shrink-0 whitespace-nowrap rounded-pill px-3 py-1.5 text-[13px] transition-colors", on ? "bg-ink font-medium text-white" : "text-ink-strong hover:bg-line/60")}>
                  {i.label}
                  {i.counter && due > 0 ? ` (${due})` : ""}
                </Link>
              );
            })}
          </nav>

          <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <div className="flex flex-col">
              <span className="text-[12px] text-ink-2">Olá,</span>
              <span className="text-[15px] font-semibold">
                <span className="capitalize">{name}</span>
                <span className="hidden font-normal text-ink-2 sm:inline"> · {longDate(today())}</span>
              </span>
            </div>
            <form
              role="search"
              className="hidden h-9 w-64 items-center gap-2 rounded-button bg-subtle px-3 transition-shadow focus-within:ring-4 focus-within:ring-brand-600/15 sm:flex"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/syllabus?q=${encodeURIComponent(search)}`);
              }}
            >
              <SearchIcon className="h-4 w-4 shrink-0 text-ink-3" />
              <label htmlFor="search" className="sr-only">Buscar no edital</label>
              <input id="search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar artigo, tópico…" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-3 focus-visible:outline-none" />
            </form>
          </header>
        </div>

        {error && (
          <div role="alert" className="border-b border-danger-line bg-danger-bg px-4 py-2 text-[13px] text-danger-ink sm:px-8">{error}</div>
        )}

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-6 sm:px-8 sm:pb-12 sm:pt-8">{children}</main>

        {/* Bottom tab bar (phone) */}
        <nav aria-label="Navegação" className={cx("fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line/80 px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 sm:hidden", GLASS)}>
          {PHONE.map((i) => {
            const on = isActive(pathname, i.href);
            const Icon = i.Icon!;
            return (
              <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={cx("relative flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px] font-medium", on ? "text-brand-700" : "text-ink-3")}>
                <Icon />
                {i.short}
                {i.counter && due > 0 && <span className="absolute right-3 top-0 min-w-[18px] rounded-pill bg-danger-500 px-1 text-center text-[10px] font-semibold leading-[18px] text-white">{due}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
