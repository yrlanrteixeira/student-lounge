"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { REPORT_STATUS_LABEL, describeDbError } from "@/lib/admin";
import { browserClient } from "@/lib/supabase/client";
import type { ReportStatus } from "@/lib/types";
import { EmptyState, Loading, Notice, cx } from "@/components/ui";
import { AdminGuard } from "../AdminGuard";
import { ReportItem, type ReportWithQuestion } from "../ReportItem";

// The URL keeps PT values; the DB uses the EN status.
const FILTERS: { key: string; status: ReportStatus | null; label: string }[] = [
  { key: "aberto", status: "open", label: REPORT_STATUS_LABEL.open },
  { key: "resolvido", status: "resolved", label: REPORT_STATUS_LABEL.resolved },
  { key: "descartado", status: "dismissed", label: REPORT_STATUS_LABEL.dismissed },
  { key: "todos", status: null, label: "Todos" },
];

export default function AdminReports() {
  return (
    <AdminGuard>
      <Suspense fallback={<Loading />}>
        <ReportQueue />
      </Suspense>
    </AdminGuard>
  );
}

function ReportQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filter = FILTERS.find((f) => f.key === params.get("status")) ?? FILTERS[0];
  const [reports, setReports] = useState<ReportWithQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setReports(null);
    let query = browserClient().from("reports").select("*, question:questions(statement, answer)").order("created_at", { ascending: false }).limit(200);
    if (filter.status) query = query.eq("status", filter.status);
    query.then(({ data, error }) => {
      if (!alive) return;
      if (error) setError(describeDbError(error));
      else setReports((data ?? []) as ReportWithQuestion[]);
    });
    return () => {
      alive = false;
    };
  }, [filter.status]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold">Reportes</h1>
        <p className="text-sm text-ink-2">Problemas apontados por quem estuda. Corrija a questão e depois marque o reporte como resolvido.</p>
      </header>

      <div role="group" aria-label="Filtrar por situação" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={f.key === filter.key}
            onClick={() => router.replace(`${pathname}?status=${f.key}`)}
            className={cx("min-h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors", f.key === filter.key ? "border-brand-700 bg-brand-50 text-brand-700" : "border-line-strong bg-surface text-ink-strong hover:bg-sidebar")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      {!reports ? (
        <Loading />
      ) : reports.length === 0 ? (
        <EmptyState title="Nenhum reporte aqui">{filter.status === "open" ? "Quando alguém apontar um problema numa questão, ele aparece nesta lista." : "Mude o filtro para ver outros."}</EmptyState>
      ) : (
        <div className="flex flex-col divide-y divide-line rounded-card border border-line">
          {reports.map((r) => (
            <ReportItem
              key={r.id}
              report={r}
              showQuestion
              onChanged={(n) => setReports((list) => (list ?? []).map((x) => (x.id === n.id ? { ...x, ...n } : x)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
