"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useContent } from "@/lib/data/ContentProvider";
import { browserClient } from "@/lib/supabase/client";
import { ButtonLink, cx } from "@/components/ui";

const LINKS = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/questoes", label: "Questões" },
  { href: "/admin/importar", label: "Importar" },
  { href: "/admin/reportes", label: "Reportes", badge: true },
  { href: "/admin/topicos", label: "Tópicos" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useContent();
  const pathname = usePathname();
  const [openReports, setOpenReports] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    browserClient()
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .then(({ count }) => setOpenReports(count ?? 0));
  }, [isAdmin, pathname]);

  if (!isAdmin)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <p className="text-base font-semibold">Esta área é só para administradores.</p>
        <ButtonLink href="/">Voltar para Hoje</ButtonLink>
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Administração" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1 pb-2">
        {LINKS.map((l) => {
          const on = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={cx("flex shrink-0 items-center gap-1.5 rounded-button px-3 py-2 text-[13px] whitespace-nowrap", on ? "bg-brand-50 font-semibold text-brand-700" : "font-medium text-ink-2 hover:bg-subtle")}
            >
              {l.label}
              {l.badge && openReports > 0 && <span className="rounded-full bg-brand-700 px-1.5 text-[11px] font-bold text-white">{openReports}</span>}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
