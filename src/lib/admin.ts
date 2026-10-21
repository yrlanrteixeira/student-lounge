import { EXAM, INDEX, SUBJECTS, TOPICS, TRAPS, fetchAll, fetchQuestions } from "./content";
import { browserClient } from "./supabase/client";
import type { Exam, Law, Question, QuestionStatus, ReportReason, ReportStatus, Subject, Topic, Trap } from "./types";

/* ---------------- Import / export format ---------------- */

// Importable columns per section: exactly the DB column names, without timestamps.
export const COLUMNS = {
  exam: ["name", "board", "registration", "exam_date", "blocks", "essay"],
  subjects: ["id", "name", "block", "exam_questions", "color", "overview", "position"],
  traps: ["id", "name", "description", "position"],
  topics: ["id", "subject", "name", "short_name", "syllabus_ref", "occurrences", "years", "priority", "how_tested", "memorize", "common_traps", "comparison", "position"],
  laws: ["subject", "name", "url", "excerpt", "position"],
  questions: [
    "id", "year", "number", "source", "subject", "topic", "subtopic", "legal_refs", "passage", "statement", "options", "answer", "difficulty",
    "traps", "trap_note", "explanation", "distractors", "tip", "status", "status_note", "needs_image", "image", "page", "page_side",
  ],
} as const;

export type Section = keyof typeof COLUMNS;
type Row = Record<string, unknown>;

export interface ImportPayload {
  exam?: Partial<Exam>;
  subjects?: Partial<Subject>[];
  traps?: Partial<Trap>[];
  topics?: Partial<Topic>[];
  laws?: Partial<Law>[];
  questions?: Partial<Question>[];
}

export const SECTION_LABEL: Record<Section, string> = {
  exam: "edital",
  subjects: "matérias",
  traps: "pegadinhas",
  topics: "tópicos",
  laws: "leis",
  questions: "questões",
};

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  ok: "Ok",
  outdated: "Desatualizada",
  annulled: "Anulada",
  off_syllabus: "Fora do edital",
  disputed_key: "Gabarito em dúvida",
};

export const PRIORITY_LABEL = { high: "Alta", medium: "Média", low: "Baixa" } as const;

export const REASON_LABEL: Record<ReportReason, string> = {
  answer_key: "Gabarito errado",
  statement: "Enunciado com problema",
  explanation: "Explicação errada ou incompleta",
  outdated: "Questão desatualizada",
  image: "Imagem faltando ou ilegível",
  other: "Outro",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = { open: "Aberto", resolved: "Resolvido", dismissed: "Descartado" };

export const ID_PATTERN = {
  subjects: /^[a-z0-9_]+$/,
  traps: /^[a-z0-9_]+$/,
  topics: /^[a-z0-9_]+\.[a-z0-9_]+$/,
  questions: /^[A-Za-z0-9_-]+$/,
} as const;

const LETTERS = ["A", "B", "C", "D", "E"];
const STATUSES = Object.keys(STATUS_LABEL);
const PRIORITIES = ["high", "medium", "low"];
const BLOCKS = ["I", "II", "III"];

/* ---------------- Defaults (schema defaults, so every upserted row has the same keys) ---------------- */

export function normalizeQuestion(q: Partial<Question>): Question {
  return {
    id: q.id ?? "",
    year: q.year ?? "",
    number: q.number ?? 0,
    source: q.source ?? "",
    subject: q.subject ?? "",
    topic: q.topic ?? "",
    subtopic: q.subtopic ?? "",
    legal_refs: q.legal_refs ?? "",
    passage: q.passage ?? null,
    statement: q.statement ?? "",
    options: q.options ?? {},
    answer: q.answer ?? "A",
    difficulty: q.difficulty ?? 2,
    traps: q.traps ?? [],
    trap_note: q.trap_note ?? "",
    explanation: q.explanation ?? "",
    distractors: q.distractors ?? {},
    tip: q.tip ?? "",
    status: q.status ?? "ok",
    status_note: q.status_note ?? "",
    needs_image: q.needs_image ?? false,
    image: q.image ?? null,
    page: q.page ?? null,
    page_side: q.page_side ?? null,
  };
}

export function normalizeTopic(t: Partial<Topic>): Topic {
  return {
    id: t.id ?? "",
    subject: t.subject ?? "",
    name: t.name ?? "",
    short_name: t.short_name ?? "",
    syllabus_ref: t.syllabus_ref ?? "",
    occurrences: t.occurrences ?? 0,
    years: t.years ?? [],
    priority: t.priority ?? "medium",
    how_tested: t.how_tested ?? "",
    memorize: t.memorize ?? [],
    common_traps: t.common_traps ?? [],
    comparison: t.comparison ?? "",
    position: t.position ?? nextPosition(TOPICS),
  };
}

function normalizeSubject(s: Partial<Subject>): Subject {
  return {
    id: s.id ?? "",
    name: s.name ?? "",
    block: s.block ?? "III",
    exam_questions: s.exam_questions ?? 0,
    color: s.color ?? "#C11574",
    overview: s.overview ?? "",
    position: s.position ?? nextPosition(SUBJECTS),
  };
}

function normalizeTrap(t: Partial<Trap>): Trap {
  return { id: t.id ?? "", name: t.name ?? "", description: t.description ?? "", position: t.position ?? nextPosition(TRAPS) };
}

function nextPosition(rows: { position: number }[]) {
  return rows.reduce((m, r) => Math.max(m, r.position), -1) + 1;
}

/** Keeps only importable columns (drops timestamps and anything unknown). */
function pick<T>(row: T, section: Section): T {
  const out: Row = {};
  for (const c of COLUMNS[section]) if ((row as Row)[c] !== undefined) out[c] = (row as Row)[c];
  return out as T;
}

/* ---------------- Validation ---------------- */

export interface ImportCounts {
  created: number;
  updated: number;
}

export interface ImportCheck {
  errors: string[];
  counts: Partial<Record<Section, ImportCounts>>;
  payload: ImportPayload;
}

const isStr = (v: unknown) => typeof v === "string";
const isInt = (v: unknown) => typeof v === "number" && Number.isInteger(v);
const isStrArray = (v: unknown) => Array.isArray(v) && v.every(isStr);
const isObj = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);

export function parseImport(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON inválido: ${(e as Error).message}`);
  }
}

/** Validates against the loaded content plus whatever the same payload defines. */
export function validateImport(raw: unknown): ImportCheck {
  const errors: string[] = [];
  const counts: ImportCheck["counts"] = {};

  if (Array.isArray(raw)) raw = { questions: raw };
  if (!isObj(raw)) return { errors: ["O arquivo precisa ser uma lista de questões ou um objeto com as seções exam, subjects, traps, topics, laws e questions."], counts, payload: {} };

  for (const k of Object.keys(raw)) {
    if (!(k in COLUMNS)) errors.push(`Seção desconhecida: "${k}". Use exam, subjects, traps, topics, laws ou questions.`);
  }
  const payload = raw as ImportPayload;

  const sectionRows = (section: Exclude<Section, "exam">): Row[] => {
    const v = (raw as Row)[section];
    if (v === undefined) return [];
    if (!Array.isArray(v)) {
      errors.push(`A seção "${section}" precisa ser uma lista.`);
      return [];
    }
    return v as Row[];
  };

  const where = (section: Section, i: number, row: Row) => `${SECTION_LABEL[section]}[${i}]${isStr(row.id) && row.id ? ` (${row.id})` : ""}`;

  const checkKeys = (section: Section, i: number, row: Row) => {
    for (const k of Object.keys(row)) {
      if (!(COLUMNS[section] as readonly string[]).includes(k)) errors.push(`${where(section, i, row)}: campo desconhecido "${k}".`);
    }
  };

  const checkIds = (section: Exclude<Section, "exam" | "laws">, rows: Row[], existing: Set<string>) => {
    const seen = new Set<string>();
    let created = 0;
    let updated = 0;
    rows.forEach((row, i) => {
      if (!isObj(row)) {
        errors.push(`${SECTION_LABEL[section]}[${i}]: cada item precisa ser um objeto.`);
        return;
      }
      checkKeys(section, i, row);
      const id = row.id;
      if (!isStr(id) || !ID_PATTERN[section].test(id)) {
        errors.push(`${where(section, i, row)}: id ausente ou inválido.`);
        return;
      }
      if (seen.has(id)) errors.push(`${where(section, i, row)}: id repetido no arquivo.`);
      seen.add(id);
      if (existing.has(id)) updated++;
      else created++;
    });
    if (rows.length) counts[section] = { created, updated };
    return seen;
  };

  // Subjects
  const subjects = sectionRows("subjects");
  const subjectIds = new Set([...SUBJECTS.map((s) => s.id), ...checkIds("subjects", subjects, new Set(SUBJECTS.map((s) => s.id)))]);
  subjects.forEach((s, i) => {
    if (!isObj(s)) return;
    const isNew = !SUBJECTS.some((x) => x.id === s.id);
    if (isNew && (!isStr(s.name) || !s.name)) errors.push(`${where("subjects", i, s)}: falta "name".`);
    if (s.block !== undefined && !BLOCKS.includes(s.block as string)) errors.push(`${where("subjects", i, s)}: "block" precisa ser I, II ou III.`);
    if (isNew && s.block === undefined) errors.push(`${where("subjects", i, s)}: falta "block".`);
    if (s.exam_questions !== undefined && (!isInt(s.exam_questions) || (s.exam_questions as number) < 0)) errors.push(`${where("subjects", i, s)}: "exam_questions" precisa ser um inteiro ≥ 0.`);
  });

  // Traps
  const traps = sectionRows("traps");
  const trapIds = new Set([...TRAPS.map((t) => t.id), ...checkIds("traps", traps, new Set(TRAPS.map((t) => t.id)))]);
  traps.forEach((t, i) => {
    if (isObj(t) && !TRAPS.some((x) => x.id === t.id) && (!isStr(t.name) || !t.name)) errors.push(`${where("traps", i, t)}: falta "name".`);
  });

  // Topics
  const topics = sectionRows("topics");
  checkIds("topics", topics, new Set(TOPICS.map((t) => t.id)));
  const topicSubject = new Map(TOPICS.map((t) => [t.id, t.subject]));
  topics.forEach((t, i) => {
    if (!isObj(t) || !isStr(t.id)) return;
    const isNew = !topicSubject.has(t.id as string);
    const subject = (t.subject as string | undefined) ?? topicSubject.get(t.id as string);
    if (!subject) errors.push(`${where("topics", i, t)}: falta "subject".`);
    else if (!subjectIds.has(subject)) errors.push(`${where("topics", i, t)}: matéria "${subject}" não existe.`);
    if (isNew && (!isStr(t.name) || !t.name)) errors.push(`${where("topics", i, t)}: falta "name".`);
    if (t.priority !== undefined && !PRIORITIES.includes(t.priority as string)) errors.push(`${where("topics", i, t)}: "priority" precisa ser high, medium ou low.`);
    for (const k of ["years", "memorize", "common_traps"]) if (t[k] !== undefined && !isStrArray(t[k])) errors.push(`${where("topics", i, t)}: "${k}" precisa ser uma lista de textos.`);
    if (t.occurrences !== undefined && !isInt(t.occurrences)) errors.push(`${where("topics", i, t)}: "occurrences" precisa ser um inteiro.`);
    if (subject) topicSubject.set(t.id as string, subject);
  });

  // Laws
  const laws = sectionRows("laws");
  laws.forEach((l, i) => {
    if (!isObj(l)) return errors.push(`leis[${i}]: cada item precisa ser um objeto.`);
    checkKeys("laws", i, l);
    if (!isStr(l.subject) || !subjectIds.has(l.subject as string)) errors.push(`leis[${i}]: matéria "${String(l.subject)}" não existe.`);
    if (!isStr(l.name) || !l.name) errors.push(`leis[${i}]: falta "name".`);
    if (!isStr(l.url) || !/^https?:\/\//.test(l.url as string)) errors.push(`leis[${i}]: "url" precisa começar com http:// ou https://.`);
  });
  if (laws.length) counts.laws = { created: laws.length, updated: 0 };

  // Exam
  const exam = (raw as Row).exam;
  if (exam !== undefined) {
    if (!isObj(exam)) errors.push(`A seção "exam" precisa ser um objeto.`);
    else {
      for (const k of Object.keys(exam)) if (!(COLUMNS.exam as readonly string[]).includes(k)) errors.push(`edital: campo desconhecido "${k}".`);
      if (exam.exam_date !== undefined && (!isStr(exam.exam_date) || !/^\d{4}-\d{2}-\d{2}$/.test(exam.exam_date as string))) errors.push(`edital: "exam_date" precisa estar no formato AAAA-MM-DD.`);
      if (exam.blocks !== undefined && !Array.isArray(exam.blocks)) errors.push(`edital: "blocks" precisa ser uma lista.`);
      counts.exam = { created: 0, updated: 1 };
    }
  }

  // Questions
  const questions = sectionRows("questions");
  const known = new Map(INDEX.map((q) => [q.id, q]));
  checkIds("questions", questions, new Set(known.keys()));
  questions.forEach((q, i) => {
    if (!isObj(q) || !isStr(q.id)) return;
    const w = where("questions", i, q);
    const prev = known.get(q.id as string);
    const isNew = !prev;
    if (isNew) {
      for (const k of ["year", "subject", "topic", "statement", "options", "answer"]) if (q[k] === undefined || q[k] === "") errors.push(`${w}: falta "${k}".`);
    }
    const subject = (q.subject as string | undefined) ?? prev?.subject;
    const topic = (q.topic as string | undefined) ?? prev?.topic;
    if (subject && !subjectIds.has(subject)) errors.push(`${w}: matéria "${subject}" não existe.`);
    if (topic) {
      const ts = topicSubject.get(topic);
      if (!ts) errors.push(`${w}: tópico "${topic}" não existe.`);
      else if (subject && ts !== subject) errors.push(`${w}: o tópico "${topic}" é da matéria "${ts}", não de "${subject}".`);
    }
    if (q.statement !== undefined && (!isStr(q.statement) || !(q.statement as string).trim())) errors.push(`${w}: "statement" não pode ficar vazio.`);
    if (q.answer !== undefined && !(isStr(q.answer) && [...LETTERS, "N"].includes(q.answer as string))) errors.push(`${w}: "answer" precisa ser A, B, C, D, E ou N (anulada).`);
    if (q.options !== undefined) {
      if (!isObj(q.options)) errors.push(`${w}: "options" precisa ser um objeto como {"A": "…", "B": "…"}.`);
      else {
        const keys = Object.keys(q.options);
        if (keys.length < 2) errors.push(`${w}: "options" precisa de pelo menos 2 alternativas.`);
        if (keys.some((k) => !LETTERS.includes(k))) errors.push(`${w}: as alternativas só podem usar as letras A a E.`);
        if (Object.values(q.options).some((v) => !isStr(v))) errors.push(`${w}: o texto de cada alternativa precisa ser um texto.`);
        if (isStr(q.answer) && q.answer !== "N" && !keys.includes(q.answer as string)) errors.push(`${w}: o gabarito "${q.answer}" não está entre as alternativas.`);
      }
    }
    if (q.distractors !== undefined && !isObj(q.distractors)) errors.push(`${w}: "distractors" precisa ser um objeto por letra.`);
    if (q.difficulty !== undefined && !(isInt(q.difficulty) && (q.difficulty as number) >= 1 && (q.difficulty as number) <= 3)) errors.push(`${w}: "difficulty" precisa ser 1, 2 ou 3.`);
    if (q.status !== undefined && !STATUSES.includes(q.status as string)) errors.push(`${w}: "status" precisa ser ${STATUSES.join(", ")}.`);
    if (q.traps !== undefined) {
      if (!isStrArray(q.traps)) errors.push(`${w}: "traps" precisa ser uma lista de ids.`);
      else for (const t of q.traps as string[]) if (!trapIds.has(t)) errors.push(`${w}: pegadinha "${t}" não existe.`);
    }
    if (q.number !== undefined && !isInt(q.number)) errors.push(`${w}: "number" precisa ser um inteiro.`);
    if (q.year !== undefined && !isStr(q.year)) errors.push(`${w}: "year" precisa ser texto, como "2025".`);
    if (q.needs_image !== undefined && typeof q.needs_image !== "boolean") errors.push(`${w}: "needs_image" precisa ser true ou false.`);
  });

  if (!Object.keys(counts).length && !errors.length) errors.push("O arquivo não tem nada para importar.");
  return { errors, counts, payload };
}

/* ---------------- Apply ---------------- */

/** Existing rows are merged with the payload, so fields left out of the file keep their current value. */
export async function applyImport(payload: ImportPayload, onProgress?: (message: string) => void) {
  const sb = browserClient();
  const step = async (label: string, run: () => PromiseLike<{ error: unknown }>) => {
    onProgress?.(label);
    const { error } = await run();
    if (error) throw new Error(`${label}: ${describeDbError(error)}`);
  };

  if (payload.subjects?.length) {
    const rows = payload.subjects.map((s, i) => pick(normalizeSubject({ position: nextPosition(SUBJECTS) + i, ...SUBJECTS.find((x) => x.id === s.id), ...s }), "subjects"));
    await step("Salvando matérias", () => sb.from("subjects").upsert(rows));
  }
  if (payload.traps?.length) {
    const rows = payload.traps.map((t, i) => pick(normalizeTrap({ position: nextPosition(TRAPS) + i, ...TRAPS.find((x) => x.id === t.id), ...t }), "traps"));
    await step("Salvando pegadinhas", () => sb.from("traps").upsert(rows));
  }
  if (payload.topics?.length) {
    const rows = payload.topics.map((t, i) => pick(normalizeTopic({ position: nextPosition(TOPICS) + i, ...TOPICS.find((x) => x.id === t.id), ...t }), "topics"));
    await step("Salvando tópicos", () => sb.from("topics").upsert(rows));
  }
  if (payload.laws?.length) {
    const bySubject = new Map<string, Partial<Law>[]>();
    for (const l of payload.laws) bySubject.set(l.subject!, [...(bySubject.get(l.subject!) ?? []), l]);
    for (const [subject, list] of bySubject) {
      await step(`Trocando as leis de ${subject}`, () => sb.from("laws").delete().eq("subject", subject));
      const rows = list.map((l, i) => ({ subject, name: l.name!, url: l.url!, excerpt: l.excerpt ?? "", position: l.position ?? i }));
      await step(`Salvando as leis de ${subject}`, () => sb.from("laws").insert(rows));
    }
  }
  if (payload.exam) {
    const row = pick({ ...EXAM, ...payload.exam, id: 1 } as Row, "exam");
    await step("Salvando o edital", () => sb.from("exam").upsert({ id: 1, ...row }));
  }
  if (payload.questions?.length) {
    const existingIds = payload.questions.map((q) => q.id!).filter((id) => INDEX.some((x) => x.id === id));
    onProgress?.("Lendo as questões que já existem");
    const existing = new Map((await fetchQuestions(existingIds)).map((q) => [q.id, q]));
    const rows = payload.questions.map((q) => pick(normalizeQuestion({ ...existing.get(q.id!), ...q }), "questions"));
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      await step(`Salvando questões ${i + 1} a ${i + chunk.length} de ${rows.length}`, () => sb.from("questions").upsert(chunk, { onConflict: "id" }));
    }
  }
  onProgress?.("Concluído");
}

/** Same format accepted by the import, so export → edit → import round-trips. */
export async function exportContent(): Promise<ImportPayload> {
  const sb = browserClient();
  const cols = (s: Section) => COLUMNS[s].join(", ");
  const [exam, subjects, traps, topics, laws, questions] = await Promise.all([
    sb.from("exam").select(cols("exam")).maybeSingle(),
    sb.from("subjects").select(cols("subjects")).order("position"),
    sb.from("traps").select(cols("traps")).order("position"),
    sb.from("topics").select(cols("topics")).order("position"),
    sb.from("laws").select(cols("laws")).order("subject").order("position"),
    // A dynamic column list makes supabase-js lose the row type; the shape is COLUMNS.questions.
    fetchAll<Question>((from, to) => sb.from("questions").select(cols("questions")).order("year").order("number").order("id").range(from, to) as unknown as PromiseLike<{ data: Question[] | null; error: unknown }>),
  ]);
  for (const r of [exam, subjects, traps, topics, laws]) if (r.error) throw new Error(describeDbError(r.error));
  return {
    exam: (exam.data ?? undefined) as Partial<Exam> | undefined,
    subjects: subjects.data as unknown as Subject[],
    traps: traps.data as unknown as Trap[],
    topics: topics.data as unknown as Topic[],
    laws: laws.data as unknown as Law[],
    questions,
  };
}

export const TEMPLATE: ImportPayload = {
  topics: [
    {
      id: "pen.exemplo",
      subject: "penal",
      name: "Nome completo do tópico, como no edital",
      short_name: "Nome curto",
      syllabus_ref: "item 1",
      occurrences: 0,
      years: [],
      priority: "medium",
      how_tested: "Como a Vunesp cobra este assunto.",
      memorize: ["Ponto para decorar 1", "Ponto para decorar 2"],
      common_traps: ["Pegadinha que se repete"],
      comparison: "| Instituto | Regra |\n|---|---|\n| A | … |\n| B | … |",
    },
  ],
  questions: [
    {
      id: "2026-001",
      year: "2026",
      number: 1,
      source: "Simulado próprio",
      subject: "penal",
      topic: "pen.exemplo",
      subtopic: "Subtópico",
      legal_refs: "CP, art. 312",
      passage: null,
      statement: "Enunciado da questão.",
      options: { A: "Alternativa A", B: "Alternativa B", C: "Alternativa C", D: "Alternativa D", E: "Alternativa E" },
      answer: "C",
      difficulty: 2,
      traps: ["regra_excecao"],
      trap_note: "Uma frase sobre a armadilha.",
      explanation: "Por que a correta está correta.",
      distractors: { A: "Por que A está errada.", B: "…", D: "…", E: "…" },
      tip: "Macete opcional.",
      status: "ok",
      status_note: "",
      needs_image: false,
    },
  ],
};

/* ---------------- Errors ---------------- */

export function describeDbError(error: unknown): string {
  const e = error as { code?: string; message?: string; details?: string };
  switch (e?.code) {
    case "23503":
      return `Referência inválida: confira matéria, tópico e pegadinhas, ou se o item ainda é usado por outro. (${e.message})`;
    case "23505":
      return "Já existe um item com esse id.";
    case "23514":
      return `Valor fora do permitido. (${e.message})`;
    case "42501":
      return "Sem permissão: só administradores podem alterar o conteúdo.";
    default:
      return e?.message ?? String(error);
  }
}
