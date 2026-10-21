import { BLOCKS, SUBJECTS, TOPICS, TRAPS, subjectById } from "./content";
import type { Answer, Priority, Review, Score, TopicProgress } from "./types";
import { today, toIsoDate } from "./dates";

export function rate(s: Score | undefined, minimum = 1): number | null {
  if (!s || s.total < minimum) return null;
  return s.correct / s.total;
}

function add(map: Map<string, Score>, key: string, correct: boolean) {
  const s = map.get(key) ?? { correct: 0, total: 0 };
  s.total += 1;
  if (correct) s.correct += 1;
  map.set(key, s);
}

export function scores(answers: Answer[]) {
  const bySubject = new Map<string, Score>();
  const byTopic = new Map<string, Score>();
  const byBlock = new Map<string, Score>();
  const byTrap = new Map<string, Score>();
  const overall: Score = { correct: 0, total: 0 };
  const sure: Score = { correct: 0, total: 0 };
  const causes: Record<string, number> = { didnt_know: 0, confused: 0, careless: 0 };

  for (const a of answers) {
    overall.total += 1;
    if (a.correct) overall.correct += 1;
    add(bySubject, a.subject_id, a.correct);
    add(byTopic, a.topic_id, a.correct);
    const block = subjectById[a.subject_id]?.block;
    if (block) add(byBlock, block, a.correct);
    for (const t of a.traps) if (t !== "sem_pegadinha") add(byTrap, t, a.correct);
    if (a.confidence === "sure") {
      sure.total += 1;
      if (a.correct) sure.correct += 1;
    }
    if (!a.correct && a.error_cause) causes[a.error_cause] += 1;
  }
  return { bySubject, byTopic, byBlock, byTrap, overall, sure, causes };
}

/** Expected score in the 70-question exam, using the hit rate of each subject. */
export function projectedScore(bySubject: Map<string, Score>) {
  let points = 0;
  let covered = 0;
  for (const s of SUBJECTS) {
    const r = rate(bySubject.get(s.id), 5);
    if (r === null) continue;
    points += r * s.exam_questions;
    covered += s.exam_questions;
  }
  if (covered < 35) return null;
  return Math.round((points / covered) * 70);
}

export function blockStatus(blockId: string, r: number | null) {
  const block = BLOCKS.find((b) => b.id === blockId)!;
  if (r === null) return { label: "Sem dados", tone: "neutral" as const };
  if (block.minimum === 0) return { label: "Classifica", tone: "brand" as const };
  if (r >= 0.62) return { label: "Seguro", tone: "success" as const };
  if (r >= 0.5) return { label: "Atenção", tone: "danger" as const };
  return { label: "Abaixo do corte", tone: "danger" as const };
}

export type Mastery = "mastered" | "in_progress" | "not_started";

export function topicMastery(topicId: string, answers: Answer[], progress: TopicProgress | undefined): Mastery {
  if (progress?.mastered) return "mastered";
  const ofTopic = answers.filter((a) => a.topic_id === topicId);
  const last = ofTopic.slice(-10);
  if (last.length >= 5 && last.filter((a) => a.correct).length / last.length >= 0.8) return "mastered";
  if (ofTopic.length > 0 || progress?.guide_read) return "in_progress";
  return "not_started";
}

export function dueReviews(reviews: Review[], day = today()) {
  return reviews.filter((r) => r.due_date && r.due_date <= day).map((r) => r.question_id);
}

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

export interface PriorityRow {
  topic: string;
  subject: string;
  occurrences: number;
  years: number;
  hitRate: number | null;
  answered: number;
  score: number;
  level: Priority;
}

/** Topic ranking: how often it is tested × syllabus weight × how much the student still misses. */
export function priorities(byTopic: Map<string, Score>): PriorityRow[] {
  const rows = TOPICS.map((t) => {
    const s = byTopic.get(t.id);
    const hitRate = rate(s, 3);
    const weight = PRIORITY_WEIGHT[t.priority] ?? PRIORITY_WEIGHT.medium;
    const weakness = hitRate === null ? 0.55 : 1 - hitRate;
    const score = weight * (1 + t.occurrences / 4) * weakness;
    return {
      topic: t.id,
      subject: t.subject,
      occurrences: t.occurrences,
      years: t.years.length,
      hitRate,
      answered: s?.total ?? 0,
      score,
      level: "low" as Priority,
    };
  }).sort((a, b) => b.score - a.score);
  const max = rows[0]?.score || 1;
  for (const r of rows) r.level = r.score >= max * 0.6 ? "high" : r.score >= max * 0.35 ? "medium" : "low";
  return rows;
}

export function weakestTraps(byTrap: Map<string, Score>) {
  return TRAPS.filter((t) => t.id !== "sem_pegadinha")
    .map((t) => {
      const s = byTrap.get(t.id);
      return { ...t, total: s?.total ?? 0, errors: s ? s.total - s.correct : 0, errorRate: s && s.total >= 3 ? (s.total - s.correct) / s.total : null };
    })
    .filter((t) => t.errorRate !== null)
    .sort((a, b) => (b.errorRate ?? 0) - (a.errorRate ?? 0));
}

export function studyStreak(answers: Answer[]) {
  const days = new Set(answers.map((a) => toIsoDate(new Date(a.created_at))));
  let n = 0;
  const d = new Date();
  // counts today if the student already studied; otherwise starts from yesterday
  if (!days.has(toIsoDate(d))) d.setDate(d.getDate() - 1);
  while (days.has(toIsoDate(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function answersOn(answers: Answer[], day = today()) {
  return answers.filter((a) => toIsoDate(new Date(a.created_at)) === day);
}
