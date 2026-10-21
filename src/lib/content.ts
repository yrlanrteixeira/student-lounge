import { browserClient } from "./supabase/client";
import { SUPABASE_URL } from "./supabase/config";
import type { Exam, Law, Question, QuestionIndex, Subject, Topic, Trap } from "./types";

/*
 * Content comes from Supabase and lives in these bindings, filled by ContentProvider before any
 * page renders. Since they are `export let`, importers always see the current value.
 */
export let EXAM: Exam = { name: "", board: "", registration: "", exam_date: "", blocks: [], essay: {} };
export let SUBJECTS: Subject[] = [];
export let TOPICS: Topic[] = [];
export let TRAPS: Trap[] = [];
export let LAWS: Law[] = [];
export let INDEX: QuestionIndex[] = [];

export let subjectById: Record<string, Subject> = {};
export let topicById: Record<string, Topic> = {};
export let trapById: Record<string, Trap> = {};
export let indexById: Record<string, QuestionIndex> = {};

export interface Content {
  exam: Exam;
  subjects: Subject[];
  topics: Topic[];
  traps: Trap[];
  laws: Law[];
  index: QuestionIndex[];
}

export function setContent(c: Content) {
  EXAM = c.exam;
  SUBJECTS = c.subjects;
  TOPICS = c.topics;
  TRAPS = c.traps;
  LAWS = c.laws;
  INDEX = c.index;
  subjectById = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));
  topicById = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
  trapById = Object.fromEntries(TRAPS.map((t) => [t.id, t]));
  indexById = Object.fromEntries(INDEX.map((q) => [q.id, q]));
}

/** PostgREST returns at most 1000 rows per call. */
export async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await query(from, from + page - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return rows;
}

export async function loadContent(): Promise<Content> {
  const sb = browserClient();
  const [exam, subjects, topics, traps, laws, index] = await Promise.all([
    sb.from("exam").select("name, board, registration, exam_date, blocks, essay").maybeSingle(),
    sb.from("subjects").select("id, name, block, exam_questions, color, overview, position").order("position"),
    sb.from("topics").select("id, subject, name, short_name, syllabus_ref, occurrences, years, priority, how_tested, memorize, common_traps, comparison, position").order("position"),
    sb.from("traps").select("id, name, description, position").order("position"),
    sb.from("laws").select("subject, name, url, excerpt, position").order("position"),
    fetchAll<QuestionIndex>((from, to) => sb.from("questions").select("id, year, subject, topic, traps, difficulty, status").order("year").order("number").order("id").range(from, to)),
  ]);
  for (const r of [exam, subjects, topics, traps, laws]) if (r.error) throw r.error;
  return {
    exam: (exam.data as Exam | null) ?? EXAM,
    subjects: subjects.data as Subject[],
    topics: topics.data as Topic[],
    traps: traps.data as Trap[],
    laws: laws.data as Law[],
    index,
  };
}

/** Full questions, in the order of the requested ids. */
export async function fetchQuestions(ids: string[]): Promise<Question[]> {
  const sb = browserClient();
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
  const res = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await sb.from("questions").select("*").in("id", chunk);
      if (error) throw error;
      return data as Question[];
    })
  );
  const byId = new Map(res.flat().map((q) => [q.id, q]));
  return ids.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
}

export const IMAGE_BUCKET = "questions";

export function imageUrl(image: string | null | undefined) {
  if (!image) return null;
  if (/^https?:\/\//.test(image)) return image;
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${image.replace(/^\/+/, "")}`;
}

export const BLOCKS = [
  { id: "I", name: "Português", questions: 16, minimum: 8 },
  { id: "II", name: "Direito", questions: 30, minimum: 15 },
  { id: "III", name: "Gerais", questions: 24, minimum: 0 },
] as const;

export function subjectName(id: string) {
  return subjectById[id]?.name ?? id;
}

export function topicName(id: string) {
  return topicById[id]?.name ?? id;
}

export function lawsOf(subject: string) {
  return LAWS.filter((l) => l.subject === subject);
}

/** Questions worth practicing today (skips annulled ones and expired current affairs). */
export function isTrainable(q: QuestionIndex) {
  if (q.status === "annulled") return false;
  if (q.status === "outdated" && q.subject === "atualidades_pcd") return false;
  return true;
}

export function yearLabel(year: string) {
  return year === "2024r" ? "2024 (reaplicação)" : year;
}

/** Exam years in the bank, newest first. */
export function examYears() {
  // newest year first; within a year the original exam comes before the re-run ("2024" before "2024r")
  return [...new Set(INDEX.map((q) => q.year))].sort((a, b) => parseInt(b) - parseInt(a) || a.localeCompare(b));
}
