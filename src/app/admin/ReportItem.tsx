"use client";

import Link from "next/link";
import { useState } from "react";
import { REASON_LABEL, REPORT_STATUS_LABEL, describeDbError } from "@/lib/admin";
import { browserClient } from "@/lib/supabase/client";
import type { Report, ReportStatus } from "@/lib/types";
import { Button, Notice, Tag, inputClasses } from "@/components/ui";

const STATUS_TONE: Record<ReportStatus, "brand" | "success" | "neutral"> = { open: "brand", resolved: "success", dismissed: "neutral" };

export interface ReportWithQuestion extends Report {
  question?: { statement: string; answer: string } | null;
}

/** One report with the admin actions; used in the reports queue and on the question editor. */
export function ReportItem({ report, showQuestion, onChanged }: { report: ReportWithQuestion; showQuestion?: boolean; onChanged: (r: Report) => void }) {
  const [note, setNote] = useState(report.admin_note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (status: ReportStatus) => {
    setSaving(true);
    setError(null);
    const fields = { status, admin_note: note.trim(), resolved_at: status === "open" ? null : new Date().toISOString() };
    const { error } = await browserClient().from("reports").update(fields).eq("id", report.id);
    setSaving(false);
    if (error) setError(describeDbError(error));
    else onChanged({ ...report, ...fields });
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={STATUS_TONE[report.status]}>{REPORT_STATUS_LABEL[report.status]}</Tag>
        <span className="text-sm font-semibold">{REASON_LABEL[report.reason]}</span>
        <span className="text-xs text-ink-3">{new Date(report.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
      </div>
      {showQuestion && (
        <p className="text-[13px] text-ink-2">
          <Link href={`/admin/questoes/${encodeURIComponent(report.question_id)}`} className="font-semibold text-brand-700 hover:underline">{report.question_id}</Link>
          {report.question && (
            <>
              {" "}· gabarito {report.question.answer} · <span className="line-clamp-2 inline">{report.question.statement}</span>
            </>
          )}
        </p>
      )}
      {report.details ? <p className="whitespace-pre-line text-[13px] leading-relaxed">{report.details}</p> : <p className="text-[13px] text-ink-3">Sem detalhes.</p>}
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Nota interna
        <input className={inputClasses} value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que foi feito (só administradores veem)" />
      </label>
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        {showQuestion && (
          <Link href={`/admin/questoes/${encodeURIComponent(report.question_id)}`} className="inline-flex min-h-8 items-center px-1 text-xs font-semibold text-brand-700 hover:underline">
            Editar questão
          </Link>
        )}
        {report.status === "open" ? (
          <>
            <Button size="s" disabled={saving} onClick={() => save("resolved")}>Marcar resolvido</Button>
            <Button size="s" variant="secondary" disabled={saving} onClick={() => save("dismissed")}>Descartar</Button>
          </>
        ) : (
          <Button size="s" variant="secondary" disabled={saving} onClick={() => save("open")}>Reabrir</Button>
        )}
        {note.trim() !== report.admin_note && <Button size="s" variant="secondary" disabled={saving} onClick={() => save(report.status)}>Salvar nota</Button>}
      </div>
    </div>
  );
}
