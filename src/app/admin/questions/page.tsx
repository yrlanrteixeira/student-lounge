"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SUBJECTS, TOPICS, examYears, subjectName, topicById, yearLabel } from "@/lib/content";
import { STATUS_LABEL, describeDbError } from "@/lib/admin";
import { browserClient } from "@/lib/supabase/client";
import type { QuestionStatus } from "@/lib/types";
import { ButtonLink, Button, Card, EmptyState, Loading, Notice, Tag, inputClasses } from "@/components/ui";
import { AdminGuard } from "../AdminGuard";

const PAGE_SIZE = 50;

interface Row {
  id: string;
  year: string;
  number: number;
  subject: string;
  topic: string;
  status: QuestionStatus;
  needs_image: boolean;
  image: string | null;
}

const STATUS_TONE: Record<QuestionStatus, "neutral" | "danger" | "honey" | "lilac"> = {
  ok: "neutral",
  outdated: "honey",
  annulled: "danger",
  off_syllabus: "lilac",
  disputed_key: "danger",
};

export default function AdminQuestions() {
  return (
    <AdminGuard>
      <Suspense fallback={<Loading />}>
        <QuestionList />
      </Suspense>
    </AdminGuard>
  );
}

function QuestionList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const subject = params.get("subject") ?? "";
  const topic = params.get("topic") ?? "";
  const status = params.get("status") ?? "";
  const year = params.get("year") ?? "";
  const image = params.get("image") ?? "";
  const report = params.get("report") ?? "";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);

  const [search, setSearch] = useState(q);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const setParam = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("pagina" in changes)) next.delete("pagina");
    router.replace(`${pathname}?${next}`);
  };

  // Debounced text search.
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => setParam({ q: search.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setRows(null);
      setError(null);
      const sb = browserClient();
      let query = sb.from("questions").select("id, year, number, subject, topic, status, needs_image, image", { count: "exact" });
      if (subject) query = query.eq("subject", subject);
      if (topic) query = query.eq("topic", topic);
      if (status) query = query.eq("status", status);
      if (year) query = query.eq("year", year);
      if (image === "missing") query = query.eq("needs_image", true).is("image", null);
      if (report === "open") {
        const { data, error } = await sb.from("reports").select("question_id").eq("status", "open");
        if (error) throw error;
        query = query.in("id", [...new Set((data ?? []).map((r) => r.question_id as string))]);
      }
      // Commas and parentheses would break PostgREST's or() syntax.
      const term = q.replace(/[,()%]/g, " ").trim();
      if (term) query = query.or(`id.ilike.%${term}%,statement.ilike.%${term}%`);
      const from = (page - 1) * PAGE_SIZE;
      const { data, count, error } = await query.order("year", { ascending: false }).order("number").order("id").range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      if (!alive) return;
      setRows((data ?? []) as Row[]);
      setTotal(count ?? 0);
    })().catch((e) => alive && setError(describeDbError(e)));
    return () => {
      alive = false;
    };
  }, [subject, topic, status, year, image, report, q, page]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const select = "h-10 rounded-button border border-line-strong bg-surface px-3 text-[13px] font-normal";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold">Questões</h1>
          <p className="text-sm text-ink-2">{rows ? `${total} questões com esses filtros` : "Buscando…"}</p>
        </div>
        <ButtonLink href="/admin/questions/new">Nova questão</ButtonLink>
      </header>

      <Card className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 p-5">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold sm:col-span-2">
          Buscar no id ou no enunciado
          <input type="search" className={inputClasses} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ex.: 2025-012 ou peculato" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Matéria
          <select className={select} value={subject} onChange={(e) => setParam({ subject: e.target.value, topic: "" })}>
            <option value="">Todas</option>
            {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Tópico
          <select className={select} value={topic} disabled={!subject} onChange={(e) => setParam({ topic: e.target.value })}>
            <option value="">Todos</option>
            {TOPICS.filter((t) => t.subject === subject).map((t) => <option key={t.id} value={t.id}>{t.short_name || t.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Situação
          <select className={select} value={status} onChange={(e) => setParam({ status: e.target.value })}>
            <option value="">Todas</option>
            {(Object.keys(STATUS_LABEL) as QuestionStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Prova
          <select className={select} value={year} onChange={(e) => setParam({ year: e.target.value })}>
            <option value="">Todas</option>
            {examYears().map((y) => <option key={y} value={y}>{yearLabel(y)}</option>)}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-2 text-[13px] font-semibold">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={image === "missing"} onChange={(e) => setParam({ image: e.target.checked ? "missing" : "" })} />
            Sem a imagem necessária
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={report === "open"} onChange={(e) => setParam({ report: e.target.checked ? "open" : "" })} />
            Com reporte aberto
          </label>
        </div>
      </Card>

      {error && <Notice tone="danger">{error}</Notice>}

      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhuma questão encontrada">Mude os filtros ou cadastre uma nova.</EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-card border border-line">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/questions/${encodeURIComponent(r.id)}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-sidebar">
                <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
                  <span className="text-sm font-semibold">
                    {r.id} <span className="font-normal text-ink-3">· TJSP {yearLabel(r.year)} · Q{r.number}</span>
                  </span>
                  <span className="truncate text-xs text-ink-3">
                    {subjectName(r.subject)} · {topicById[r.topic]?.short_name || topicById[r.topic]?.name || r.topic}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {r.needs_image && !r.image && <Tag tone="trap">Sem imagem</Tag>}
                  <Tag tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Tag>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>Anterior</Button>
          <span className="text-[13px] text-ink-2">Página {page} de {pages}</span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setParam({ page: String(page + 1) })}>Próxima</Button>
        </nav>
      )}
    </div>
  );
}
