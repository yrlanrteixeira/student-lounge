"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { INDEX, SUBJECTS, TOPICS } from "@/lib/content";
import { STATUS_LABEL, TEMPLATE, describeDbError, exportContent } from "@/lib/admin";
import { downloadFile } from "@/lib/notebooklm";
import { browserClient } from "@/lib/supabase/client";
import type { QuestionStatus } from "@/lib/types";
import { Button, ButtonLink, Card, Heading, Notice } from "@/components/ui";
import { AdminGuard } from "./AdminGuard";

export default function AdminHome() {
  return (
    <AdminGuard>
      <Dashboard />
    </AdminGuard>
  );
}

function Dashboard() {
  const [openReports, setOpenReports] = useState<number | null>(null);
  const [missingImages, setMissingImages] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = browserClient();
    sb.from("reports").select("id", { count: "exact", head: true }).eq("status", "open").then(({ count }) => setOpenReports(count ?? 0));
    sb.from("questions").select("id", { count: "exact", head: true }).eq("needs_image", true).is("image", null).then(({ count }) => setMissingImages(count ?? 0));
  }, []);

  const byStatus = INDEX.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.status]: (acc[q.status] ?? 0) + 1 }), {});

  const exportAll = async () => {
    setExporting(true);
    setError(null);
    try {
      const payload = await exportContent();
      downloadFile(`rumo-tjsp-conteudo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
    } catch (e) {
      setError(describeDbError(e));
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    { label: "Questões", value: INDEX.length, href: "/admin/questoes" },
    { label: "Reportes abertos", value: openReports ?? "…", href: "/admin/reportes" },
    { label: "Sem a imagem necessária", value: missingImages ?? "…", href: "/admin/questoes?imagem=sem" },
    { label: "Tópicos", value: TOPICS.length, href: "/admin/topicos" },
    { label: "Matérias", value: SUBJECTS.length },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold">Administração do conteúdo</h1>
        <p className="text-sm text-ink-2">Tudo o que está aqui fica no Supabase. O que você muda aparece para quem estuda assim que a página for recarregada.</p>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
        {stats.map((s) => {
          const body = (
            <>
              <span className="text-xs text-ink-3">{s.label}</span>
              <span className="text-2xl font-bold">{s.value}</span>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="flex flex-col gap-1 rounded-card border border-line px-4 py-3.5 transition-colors hover:bg-sidebar">
              {body}
            </Link>
          ) : (
            <div key={s.label} className="flex flex-col gap-1 rounded-card border border-line px-4 py-3.5">
              {body}
            </div>
          );
        })}
      </div>

      <Card className="flex flex-col gap-3 p-5">
        <Heading>Questões por situação</Heading>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          {(Object.keys(STATUS_LABEL) as QuestionStatus[]).map((s) => (
            <li key={s}>
              <Link href={`/admin/questoes?status=${s}`} className="hover:underline">
                {STATUS_LABEL[s]}: <strong>{byStatus[s] ?? 0}</strong>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <Heading>Como alimentar e tratar o conteúdo</Heading>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-[13px] leading-relaxed text-ink-strong">
          <li>
            <strong>Alimentar:</strong> para muitas questões de uma vez, use <Link href="/admin/importar" className="font-semibold text-brand-700 hover:underline">Importar</Link> com um arquivo JSON no formato do modelo. Para uma questão só, use <Link href="/admin/questoes/nova" className="font-semibold text-brand-700 hover:underline">Nova questão</Link>.
          </li>
          <li>
            <strong>Tratar:</strong> quem estuda aponta problemas pelo botão “Reportar problema”. Eles aparecem em <Link href="/admin/reportes" className="font-semibold text-brand-700 hover:underline">Reportes</Link>; corrija a questão e marque como resolvido.
          </li>
          <li>
            <strong>Tirar de circulação:</strong> em vez de apagar, mude a situação da questão para “Anulada”, “Desatualizada” ou “Fora do edital”. Anuladas não entram mais nos treinos.
          </li>
          <li>
            <strong>Guia:</strong> o texto de cada tópico do edital mastigado se edita em <Link href="/admin/topicos" className="font-semibold text-brand-700 hover:underline">Tópicos</Link>.
          </li>
        </ol>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <Heading>Backup</Heading>
        <p className="text-[13px] text-ink-2">O arquivo exportado tem todo o conteúdo no mesmo formato aceito pela importação. Dá para editar e importar de volta.</p>
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportAll} disabled={exporting}>{exporting ? "Exportando…" : "Exportar conteúdo (JSON)"}</Button>
          <Button variant="secondary" onClick={() => downloadFile("modelo-importacao.json", JSON.stringify(TEMPLATE, null, 2), "application/json")}>
            Baixar modelo de importação
          </Button>
          <ButtonLink href="/admin/importar" variant="secondary">Importar</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
