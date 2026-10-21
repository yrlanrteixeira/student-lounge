import { INDEX, TOPICS, fetchQuestions, lawsOf, subjectById, yearLabel } from "./content";

const PRIORITY_LABEL = { high: "alta", medium: "média", low: "baixa" } as const;

/** Builds a subject's .md to upload as a NotebookLM source (audio, quiz, flashcards). */
export async function notebookSummary(subjectId: string) {
  const s = subjectById[subjectId];
  if (!s) throw new Error("Matéria não encontrada");
  const topics = TOPICS.filter((t) => t.subject === subjectId);
  const examplesByTopic = new Map(topics.map((t) => [t.id, INDEX.filter((q) => q.topic === t.id && q.status === "ok").slice(-2).map((q) => q.id)]));
  const questions = new Map((await fetchQuestions([...examplesByTopic.values()].flat())).map((q) => [q.id, q]));

  const lines: string[] = [];
  lines.push(`# ${s.name} — TJ-SP Escrevente (Vunesp)`, "");
  lines.push(`Bloco ${s.block} · ${s.exam_questions} questões na prova.`, "");
  lines.push("## Visão geral", "", s.overview, "");
  const laws = lawsOf(subjectId);
  if (laws.length) {
    lines.push("## Lei seca cobrada", "");
    for (const l of laws) lines.push(`- ${l.name}${l.excerpt ? ` — ${l.excerpt}` : ""}`);
    lines.push("");
  }
  for (const t of topics) {
    lines.push(`## ${t.name}`, "", `Edital: ${t.syllabus_ref}. Caiu ${t.occurrences} vez(es) nas provas anteriores. Prioridade: ${PRIORITY_LABEL[t.priority]}.`, "");
    if (t.how_tested) lines.push("### Como a Vunesp cobra", "", t.how_tested, "");
    if (t.memorize.length) lines.push("### Decore", "", ...t.memorize.map((m) => `- ${m}`), "");
    if (t.common_traps.length) lines.push("### Pegadinhas recorrentes", "", ...t.common_traps.map((c) => `- ${c}`), "");
    if (t.comparison) lines.push("### Não confunda", "", t.comparison, "");
    const qs = (examplesByTopic.get(t.id) ?? []).map((id) => questions.get(id)).filter((q) => q !== undefined);
    if (qs.length) {
      lines.push("### Questões reais comentadas", "");
      for (const q of qs) {
        lines.push(`**TJSP ${yearLabel(q.year)}, questão ${q.number}.** ${q.statement}`, "");
        for (const [letter, text] of Object.entries(q.options)) lines.push(`- (${letter}) ${text}`);
        lines.push("", `Gabarito: ${q.answer}. ${q.explanation}${q.trap_note ? ` Pegadinha: ${q.trap_note}` : ""}`, "");
      }
    }
  }
  return lines.join("\n");
}

export function downloadFile(name: string, content: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
