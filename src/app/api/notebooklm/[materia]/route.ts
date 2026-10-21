import { GUIA, todasQuestoes } from "@/lib/conteudo-server";
import { materiaPorId, rotuloAno } from "@/lib/conteudo";
import { LEI_SECA } from "@/lib/leis";

/** Gera um .md por matéria para subir como fonte no NotebookLM (áudio, quiz, flashcards). */
export async function GET(_req: Request, { params }: { params: Promise<{ materia: string }> }) {
  const { materia } = await params;
  const m = materiaPorId[materia];
  const guia = GUIA.find((g) => g.materia === materia);
  if (!m || !guia) return new Response("Matéria não encontrada", { status: 404 });

  const linhas: string[] = [];
  linhas.push(`# ${m.nome} — TJ-SP Escrevente (Vunesp)`, "");
  linhas.push(`Bloco ${m.bloco} · ${m.questoes_2026} questões na prova de 14/03/2027.`, "");
  linhas.push("## Visão geral", "", guia.visao_geral, "");
  const leis = LEI_SECA[materia] ?? [];
  if (leis.length) {
    linhas.push("## Lei seca cobrada", "");
    for (const l of leis) linhas.push(`- ${l.nome}${l.trecho ? ` — ${l.trecho}` : ""}`);
    linhas.push("");
  }
  for (const t of guia.topicos) {
    linhas.push(`## ${t.nome}`, "", `Edital: ${t.edital}. Caiu ${t.incidencia} vez(es) nas provas de 2017 a 2025. Prioridade: ${t.prioridade}.`, "");
    if (t.como_cai) linhas.push("### Como a Vunesp cobra", "", t.como_cai, "");
    if (t.decorar.length) linhas.push("### Decore", "", ...t.decorar.map((d) => `- ${d}`), "");
    if (t.pegadinhas_recorrentes.length) linhas.push("### Pegadinhas recorrentes", "", ...t.pegadinhas_recorrentes.map((d) => `- ${d}`), "");
    if (t.comparativo) linhas.push("### Não confunda", "", t.comparativo, "");
    const qs = todasQuestoes().filter((q) => q.topico === t.topico && q.status === "ok").slice(-2);
    if (qs.length) {
      linhas.push("### Questões reais comentadas", "");
      for (const q of qs) {
        linhas.push(`**TJSP ${rotuloAno(q.ano)}, questão ${q.numero}.** ${q.enunciado}`, "");
        for (const [l, txt] of Object.entries(q.alternativas)) linhas.push(`- (${l}) ${txt}`);
        linhas.push("", `Gabarito: ${q.gabarito}. ${q.explicacao}${q.pegadinha ? ` Pegadinha: ${q.pegadinha}` : ""}`, "");
      }
    }
  }

  return new Response(linhas.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="tjsp-${materia}.md"`,
    },
  });
}
